export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY';

export interface PaymentInitRequest {
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

export interface PaymentInitResponse {
  success: boolean;
  paymentUrl?: string;
  paymentRef?: string;
  error?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paid: boolean;
  error?: string;
}