import { Cart } from '../../types';
import { apiGet, apiPost, apiDelete, apiPut } from '../apiClient';

export async function fetchCart(): Promise<Cart> {
  return apiGet<Cart>('/api/cart');
}

export async function addToCart(productId: string, quantity = 1, selectedSize?: string, selectedMaterial?: string): Promise<Cart> {
  return apiPost<Cart>('/api/cart/items', { productId, quantity, selectedSize, selectedMaterial });
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<Cart> {
  return apiPut<Cart>(`/api/cart/items/${itemId}`, { quantity });
}

export async function removeFromCart(itemId: string): Promise<Cart> {
  return apiDelete<Cart>(`/api/cart/items/${itemId}`);
}

export async function applyCoupon(code: string): Promise<{ success: boolean; cart: Cart; coupon: any }> {
  return apiPost<{ success: boolean; cart: Cart; coupon: any }>('/api/cart/coupon', { code });
}

export async function clearCart(): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>('/api/cart');
}
