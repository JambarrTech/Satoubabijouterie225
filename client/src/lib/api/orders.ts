import { Order } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export interface CreateOrderResponse extends Order {}

export async function fetchOrders(): Promise<Order[]> {
  return apiGet<Order[]>('/api/orders');
}

export async function createOrder(data: {
  shippingAddress: { fullName: string; phone: string; address: string; city: string; notes?: string };
  cartItemIds?: string[];
}): Promise<CreateOrderResponse> {
  return apiPost<CreateOrderResponse>('/api/orders', data);
}