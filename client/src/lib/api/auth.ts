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

export async function login(identifier: string, password: string): Promise<{ user: User; token: string }> {
  const res = await apiPost<{ user: User; token: string }>('/api/auth/login', { identifier, password });
  return res;
}

export async function register(data: { name: string; identifier: string; password: string; phone?: string }): Promise<{ user: User; token: string }> {
  const res = await apiPost<{ user: User; token: string }>('/api/auth/register', data);
  return res;
}

export async function requestPasswordReset(phone: string): Promise<{ success: boolean; message: string }> {
  const res = await apiPost<{ success: boolean; message: string }>('/api/auth/forgot-password', { phone });
  return res;
}

export async function resetPassword(phone: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await apiPost<{ success: boolean; message: string }>('/api/auth/reset-password', { phone, otp, newPassword });
  return res;
}
