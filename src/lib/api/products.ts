import { Product } from '../../types';
import { apiGet } from '../apiClient';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchProducts(params?: {
  category?: string;
  search?: string;
  isBestSeller?: boolean;
  isPromo?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.search) query.append('search', params.search);
  if (params?.isBestSeller) query.append('isBestSeller', 'true');
  if (params?.isPromo) query.append('isPromo', 'true');
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.sort) query.append('sort', params.sort);

  const qs = query.toString();
  return apiGet<PaginatedResponse<Product>>(`/api/products${qs ? `?${qs}` : ''}`);
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  return apiGet<Product>(`/api/products/${slug}`);
}
