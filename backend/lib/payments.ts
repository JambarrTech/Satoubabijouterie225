import { PaymentProvider } from '../types/payment';
import logger from './logger';

/**
 * Wave Business — Lien de paiement avec montant verrouillé
 * Docs: https://developer.wave.com/docs/checkout
 * Le montant est fixé côté serveur et non modifiable par le client sur Wave.
 * Le client choisit librement 1 ou N articles dans son panier avant paiement ;
 * le total est recalculé serveur et passé ici en `amount`.
 */

interface PaymentRequest {
  amount: number; // FCFA, montant total verrouillé (serveur)
  currency: string; // XOF
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
  callbackUrl: string;
  returnUrl: string;
  description: string;
}

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentRef?: string;
  error?: string;
}

const WAVE_API_URL = process.env.WAVE_API_URL || 'https://api.wave.com/v1';
// Compat: supporte WAVE_API_KEY et WAVE_BUSINESS_API_KEY
function getWaveKey(): string {
  return process.env.WAVE_API_KEY || process.env.WAVE_BUSINESS_API_KEY || '';
}
function getWaveBusinessLink(): string {
  return process.env.WAVE_BUSINESS_LINK || '';
}

function isMockEnabled(): boolean {
  // SÉCURITÉ : jamais de paiement simulé en production — cela encaisserait 0 FCFA.
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.PAYMENTS_MOCK === 'true') return true;
  if (process.env.PAYMENTS_MOCK === 'false') return false;
  // Auto-mock en dev/test si aucune clé Wave configurée
  return process.env.NODE_ENV !== 'production' && !getWaveKey() && !getWaveBusinessLink();
}

// En production, refuse de démarrer les paiements sans config Wave réelle.
export function assertWaveConfigured(): boolean {
  if (process.env.NODE_ENV === 'production') {
    if (!getWaveKey() && !getWaveBusinessLink()) {
      logger.error('[Wave Business] FATAL: aucune clé API (WAVE_API_KEY) ni lien statique (WAVE_BUSINESS_LINK) en production — le paiement réel est impossible.');
    }
    if (process.env.PAYMENTS_MOCK === 'true') {
      logger.error('[Wave Business] CRITIQUE: PAYMENTS_MOCK=true est interdit en production. Les commandes ne seraient pas encaissées.');
      return false;
    }
  }
  return true;
}
function mockPaymentRef(orderNumber: string): string {
  return `mock_wave_${orderNumber}_${Date.now()}`;
}

/**
 * Crée un lien Wave Business avec montant verrouillé.
 * Le client ne peut pas modifier le montant sur l'app Wave.
 */
export async function initiatePayment(
  provider: PaymentProvider,
  request: PaymentRequest
): Promise<PaymentResponse> {
  if (provider !== 'WAVE') {
    return { success: false, error: 'Seul Wave Business est disponible' };
  }

  // Sécurité : montant doit être >0 et entier (FCFA)
  if (!request.amount || request.amount <= 0) {
    return { success: false, error: 'Montant invalide' };
  }

  // Double garde : jamais de mock en production
  if (process.env.NODE_ENV === 'production' && isMockEnabled()) {
    logger.error('[Wave Business] TENTATIVE de paiement MOCK en production bloquée.');
    return { success: false, error: 'Paiement non configuré pour la production' };
  }

  if (isMockEnabled()) {
    const mockRef = mockPaymentRef(request.orderNumber);
    logger.warn({ orderNumber: request.orderNumber, amount: request.amount }, '[Wave Business] MOCK mode — lien de paiement simulé (montant verrouillé)');
    return {
      success: true,
      paymentUrl: `${request.returnUrl}&mock=1&ref=${mockRef}&amount=${request.amount}`,
      paymentRef: mockRef,
    };
  }

  // Si un lien Wave Business statique est configuré (ex: https://pay.wave.com/m/M_xxx)
  // On le complète avec les métadonnées commande, mais le montant reste vérifié serveur via webhook
  // Préférence : API Checkout Sessions si clé API présente
  if (getWaveKey()) {
    return initiateWaveCheckoutSession(request);
  }

  if (getWaveBusinessLink()) {
    return initiateWaveBusinessStaticLink(request);
  }

  return {
    success: false,
    error: 'Configuration Wave Business manquante — définissez WAVE_API_KEY ou WAVE_BUSINESS_LINK, ou activez PAYMENTS_MOCK=true en dev',
  };
}

/**
 * Via Wave API Checkout Sessions — montant verrouillé côté Wave.
 * Le client scanne/paye exactement `amount`, non modifiable.
 */
async function initiateWaveCheckoutSession(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getWaveKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        client_reference: request.orderNumber,
        // Wave Checkout verrouille le montant par défaut (non modifiable)
        // `allow_amount_modification: false` explicite si supporté
        allow_amount_modification: false,
        reference: request.orderNumber,
        customer: {
          phone: request.customerPhone,
          name: request.customerName,
        },
        callback_url: request.callbackUrl,
        success_url: request.returnUrl,
        error_url: `${request.returnUrl}&payment=failed`,
        description: request.description,
      }),
    });

    const data: any = await response.json().catch(() => ({}));

    // Wave renvoie checkout_url + id/session_id
    if (response.ok && (data.checkout_url || data.wave_launch_url || data.payment_url)) {
      return {
        success: true,
        paymentUrl: data.checkout_url || data.wave_launch_url || data.payment_url,
        paymentRef: data.id || data.session_id || data.checkout_session_id,
      };
    }

    logger.error({ data, status: response.status }, 'Wave Checkout error');
    return { success: false, error: data.message || data.error || `Erreur Wave Business (${response.status})` };
  } catch (error) {
    logger.error({ err: error }, 'Wave Business connection error');
    return { success: false, error: 'Erreur de connexion à Wave Business' };
  }
}

/**
 * Fallback lien Wave Business statique (si pas d’API key).
 * Le lien de base est enrichi, mais la vérification du montant se fait
 * exclusivement côté serveur (webhook + callback vérifient que paid amount == order.totalAmount).
 */
async function initiateWaveBusinessStaticLink(request: PaymentRequest): Promise<PaymentResponse> {
  const base = getWaveBusinessLink().replace(/\/$/, '');
  // Wave Business links supportent ?amount= & ?client_reference= selon config
  // On génère une ref unique et on laisse Wave afficher le montant verrouillé si configuré côté dashboard
  const ref = mockPaymentRef(request.orderNumber);
  const url = `${base}?amount=${request.amount}&currency=${request.currency}&ref=${encodeURIComponent(request.orderNumber)}&c=${encodeURIComponent(ref)}`;
  logger.warn({ orderNumber: request.orderNumber, amount: request.amount }, '[Wave Business] Static link mode — vérification montant côté serveur requise');
  return {
    success: true,
    paymentUrl: url,
    paymentRef: ref,
  };
}

export async function verifyPayment(
  provider: PaymentProvider,
  paymentRef: string
): Promise<{ success: boolean; paid: boolean; error?: string; amount?: number; currency?: string }> {
  if (provider !== 'WAVE') {
    return { success: false, paid: false, error: 'Fournisseur non supporté — seul Wave est disponible' };
  }
  return verifyWavePayment(paymentRef);
}

async function verifyWavePayment(paymentRef: string): Promise<{ success: boolean; paid: boolean; error?: string; amount?: number; currency?: string }> {
  if (paymentRef.startsWith('mock_wave_') || paymentRef.startsWith('mock_')) {
    // Mock toujours considéré comme payé (simule succès Wave)
    return { success: true, paid: true };
  }

  // Si lien statique sans API, on ne peut pas vérifier via API — le paiement sera validé manuellement par admin
  // ou via webhook Wave Business si configuré. On retourne pending.
  if (!getWaveKey()) {
    logger.warn({ paymentRef }, '[Wave Business] Vérification sans API key — validation manuelle requise');
    return { success: false, paid: false, error: 'Vérification Wave sans API key — validation manuelle admin' };
  }

  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions/${paymentRef}`, {
      headers: { Authorization: `Bearer ${getWaveKey()}` },
    });
    const data: any = await response.json().catch(() => ({}));
    const paid = data.status === 'completed' || data.status === 'paid' || data.payment_status === 'paid' || data.state === 'completed';
    // Montant réellement payé (FCFA) et devise — pour vérifier qu'il correspond au total verrouillé côté serveur.
    const amount = typeof data.amount === 'number' ? data.amount : (typeof data.amount_expected === 'number' ? data.amount_expected : undefined);
    const currency = data.currency || data.currency_code;
    return { success: response.ok, paid, amount, currency };
  } catch {
    return { success: false, paid: false, error: 'Erreur vérification Wave Business' };
  }
}
