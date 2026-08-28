import { Product } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export async function fetchFavorites(): Promise<Product[]> {
  return apiGet<Product[]>('/api/favorites');
}

export async function toggleFavorite(productId: string): Promise<{ favorites: string[] }> {
  return apiPost<{ favorites: string[] }>(`/api/favorites/${productId}`);
}
