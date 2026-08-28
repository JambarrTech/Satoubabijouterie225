/**
 * SaTouba — Paiement exclusif Wave Business
 * Le montant est TOUJOURS calculé côté serveur (calculateCartTotal) et verrouillé
 * dans la session Wave Checkout. Le client ne peut pas le modifier.
 */
export type PaymentProvider = 'WAVE';

export interface PaymentInitRequest {
  amount: number; // Montant total verrouillé (FCFA), calculé serveur
  currency: string; // XOF
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
  callbackUrl: string; // Webhook serveur → vérification
  returnUrl: string; // Retour client après paiement
  description: string;
}

export interface PaymentInitResponse {
  success: boolean;
  paymentUrl?: string; // Lien Wave Business (montant non modifiable)
  paymentRef?: string; // Référence session Wave
  error?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paid: boolean;
  error?: string;
}