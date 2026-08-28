import { apiGet, apiPost } from '../apiClient';

export interface Like {
  id: string;
  productId: string;
  userId: string;
  user?: { name: string; avatar?: string };
  createdAt: string;
}

export async function fetchLikes(productId: string): Promise<Like[]> {
  return apiGet<Like[]>(`/api/likes/${productId}`);
}

export async function toggleLike(productId: string): Promise<{ liked: boolean; likesCount: number }> {
  return apiPost<{ liked: boolean; likesCount: number }>('/api/likes', { productId });
}