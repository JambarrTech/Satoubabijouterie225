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
  paymentMethod: string;
}): Promise<CreateOrderResponse> {
  return apiPost<CreateOrderResponse>('/api/orders', data);
}

export async function fetchOrderCallback(orderId: string): Promise<Order> {
  return apiGet<Order>(`/api/orders/callback/${orderId}`);
}
