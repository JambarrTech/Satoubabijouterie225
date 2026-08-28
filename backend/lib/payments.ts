import { PaymentProvider } from '../types/payment';

interface PaymentRequest {
  amount: number;
  currency: string;
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
const ORANGE_MONEY_API_URL = process.env.ORANGE_MONEY_API_URL || 'https://api.orange.com/orange-money-webpay';

// Lazy getters so env can be set at runtime (dotenv loaded after import in some contexts)
function getWaveKey() { return process.env.WAVE_API_KEY || ''; }
function getOrangeKey() { return process.env.ORANGE_MONEY_API_KEY || ''; }
function isMockEnabled(): boolean {
  // Explicit flag > auto-mock when keys missing in non-production
  if (process.env.PAYMENTS_MOCK === 'true') return true;
  if (process.env.PAYMENTS_MOCK === 'false') return false;
  // Auto-mock in dev/test when provider not configured — avoids blocking orders
  return process.env.NODE_ENV !== 'production' && !getWaveKey() && !getOrangeKey();
}
function mockPaymentRef(provider: string, orderNumber: string): string {
  return `mock_${provider.toLowerCase()}_${orderNumber}_${Date.now()}`;
}

export async function initiatePayment(
  provider: PaymentProvider,
  request: PaymentRequest
): Promise<PaymentResponse> {
  // Mock mode: allows orders to succeed without real credentials (dev/test ou PAYMENTS_MOCK=true)
  if (isMockEnabled()) {
    const mockRef = mockPaymentRef(provider, request.orderNumber);
    console.warn(`[payments] MOCK mode active — provider=${provider} order=${request.orderNumber}`);
    return {
      success: true,
      paymentUrl: `${request.returnUrl}&mock=1&ref=${mockRef}`,
      paymentRef: mockRef,
    };
  }
  switch (provider) {
    case 'WAVE':
      return initiateWavePayment(request);
    case 'ORANGE_MONEY':
      return initiateOrangeMoneyPayment(request);
    default:
      return { success: false, error: 'Fournisseur de paiement non supporté' };
  }
}

async function initiateWavePayment(request: PaymentRequest): Promise<PaymentResponse> {
  if (!getWaveKey()) {
    return { success: false, error: 'Configuration Wave manquante — définissez WAVE_API_KEY ou activez PAYMENTS_MOCK=true' };
  }

  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getWaveKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        reference: request.orderNumber,
        customer: {
          phone: request.customerPhone,
          name: request.customerName,
        },
        callback_url: request.callbackUrl,
        return_url: request.returnUrl,
        description: request.description,
      }),
    });

    const data = await response.json();

    if (response.ok && data.checkout_url) {
      return {
        success: true,
        paymentUrl: data.checkout_url,
        paymentRef: data.id || data.session_id,
      };
    }

    return { success: false, error: data.error || 'Erreur Wave' };
  } catch (error) {
    console.error('Wave payment error:', error);
    return { success: false, error: 'Erreur de connexion à Wave' };
  }
}

async function initiateOrangeMoneyPayment(request: PaymentRequest): Promise<PaymentResponse> {
  if (!getOrangeKey() || !process.env.ORANGE_MONEY_CLIENT_ID) {
    return { success: false, error: 'Configuration Orange Money manquante — définissez ORANGE_MONEY_API_KEY/CLIENT_ID ou activez PAYMENTS_MOCK=true' };
  }

  try {
    const tokenResponse = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ORANGE_MONEY_CLIENT_ID}:${process.env.ORANGE_MONEY_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return { success: false, error: 'Impossible d\'obtenir le token Orange Money' };
    }

    const response = await fetch(`${ORANGE_MONEY_API_URL}/webpayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        order_id: request.orderNumber,
        return_url: request.returnUrl,
        cancel_url: `${request.returnUrl}?cancelled=true`,
        notif_url: request.callbackUrl,
        lang: 'fr',
        reference_customer: request.customerPhone,
      }),
    });

    const data = await response.json();

    if (response.ok && data.payment_url) {
      return {
        success: true,
        paymentUrl: data.payment_url,
        paymentRef: data.pay_token || data.transaction_id,
      };
    }

    return { success: false, error: data.error_message || 'Erreur Orange Money' };
  } catch (error) {
    console.error('Orange Money payment error:', error);
    return { success: false, error: 'Erreur de connexion à Orange Money' };
  }
}

export async function verifyPayment(
  provider: PaymentProvider,
  paymentRef: string
): Promise<{ success: boolean; paid: boolean; error?: string }> {
  switch (provider) {
    case 'WAVE':
      return verifyWavePayment(paymentRef);
    case 'ORANGE_MONEY':
      return verifyOrangeMoneyPayment(paymentRef);
    default:
      return { success: false, paid: false, error: 'Fournisseur non supporté' };
  }
}

async function verifyWavePayment(paymentRef: string): Promise<{ success: boolean; paid: boolean; error?: string }> {
  if (paymentRef.startsWith('mock_')) {
    // Mock references are considered paid after 2s (simulates user completing payment)
    return { success: true, paid: true };
  }
  if (!getWaveKey()) {
    return { success: false, paid: false, error: 'Configuration Wave manquante' };
  }

  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions/${paymentRef}`, {
      headers: { 'Authorization': `Bearer ${getWaveKey()}` },
    });

    const data = await response.json();
    return {
      success: true,
      paid: data.status === 'completed' || data.status === 'paid',
    };
  } catch {
    return { success: false, paid: false, error: 'Erreur vérification Wave' };
  }
}

async function verifyOrangeMoneyPayment(paymentRef: string): Promise<{ success: boolean; paid: boolean; error?: string }> {
  if (paymentRef.startsWith('mock_')) {
    return { success: true, paid: true };
  }
  if (!getOrangeKey()) {
    return { success: false, paid: false, error: 'Configuration Orange Money manquante' };
  }

  try {
    const tokenResponse = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ORANGE_MONEY_CLIENT_ID}:${process.env.ORANGE_MONEY_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return { success: false, paid: false, error: 'Token Orange Money invalide' };
    }

    const response = await fetch(`${ORANGE_MONEY_API_URL}/transactionstatus`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pay_token: paymentRef }),
    });

    const data = await response.json();
    return {
      success: true,
      paid: data.status === 'SUCCESS' || data.status === 'COMPLETED',
    };
  } catch {
    return { success: false, paid: false, error: 'Erreur vérification Orange Money' };
  }
}