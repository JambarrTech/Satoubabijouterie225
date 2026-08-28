import { User } from '../../types';
import { apiGet, apiPut, apiPost } from '../apiClient';

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiGet<User>('/api/auth/me');
  return res;
}

export async function updateCurrentUser(data: Partial<User>): Promise<User> {
  const res = await apiPut<User>('/api/auth/me', data);
  return res;
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await apiPost<{ user: User; token: string }>('/api/auth/login', { email, password });
  return res;
}

export async function register(data: { name: string; email: string; password: string; phone?: string }): Promise<{ user: User; token: string }> {
  const res = await apiPost<{ user: User; token: string }>('/api/auth/register', data);
  return res;
}
