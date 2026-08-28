import { Category } from '../../types';
import { apiGet } from '../apiClient';

export async function fetchCategories(): Promise<Category[]> {
  return apiGet<Category[]>('/api/categories');
}
