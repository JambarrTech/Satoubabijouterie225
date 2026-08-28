import { Order } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export interface CreateOrderResponse extends Order {
  paymentUrl?: string;
}

export async function fetchOrders(): Promise<Order[]> {
  return apiGet<Order[]>('/api/orders');
}

export async function createOrder(data: {
  shippingAddress: { fullName: string; phone: string; address: string; city: string; notes?: string };
  cartItemIds?: string[]; // 1 ou N articles sélectionnés dans le panier (si omis: tout le panier)
}): Promise<CreateOrderResponse> {
  // paymentMethod est désormais fixe côté serveur (WAVE Business)
  return apiPost<CreateOrderResponse>('/api/orders', data);
}

export async function fetchOrderCallback(orderId: string): Promise<Order> {
  return apiGet<Order>(`/api/orders/callback/${orderId}`);
}

// Relance le paiement d'une commande incomplète (PENDING/FAILED),
// et corrige au passage les infos de livraison si fournies
export async function completeOrderPayment(
  orderId: string,
  shippingAddress: { fullName: string; phone: string; address: string; city: string; notes?: string }
): Promise<CreateOrderResponse> {
  return apiPost<CreateOrderResponse>(`/api/orders/${orderId}/pay`, { shippingAddress });
}
