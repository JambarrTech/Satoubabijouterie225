import { User } from '../../types';
import { apiPost } from '../apiClient';

export async function loginGerant(identifier: string, password: string): Promise<{ user: User; token: string }> {
  const res = await apiPost<{ user: User; token: string }>('/api/auth/login-gerant', { identifier, password });
  return res;
}
