import { Product } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export async function fetchFavorites(options?: Pick<RequestInit, 'signal'>): Promise<Product[]> {
  return apiGet<Product[]>('/api/favorites', options);
}

export async function toggleFavorite(productId: string): Promise<{ favorites: string[] }> {
  return apiPost<{ favorites: string[] }>(`/api/favorites/${productId}`);
}
