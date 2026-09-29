import { Order } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export interface CreateOrderResponse extends Order {}

export async function fetchOrders(options?: { signal?: AbortSignal }): Promise<Order[]> {
  return apiGet<Order[]>('/api/orders', options as any);
}

export async function createOrder(data: {
  shippingAddress: { fullName: string; phone: string; address: string; city: string; notes?: string };
  cartItemIds?: string[];
  idempotencyKey?: string;
}): Promise<CreateOrderResponse> {
  return apiPost<CreateOrderResponse>('/api/orders', data);
}