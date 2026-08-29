import { NotificationItem } from '../../types';
import { apiGet, apiPatch } from '../apiClient';

export async function fetchNotifications(): Promise<NotificationItem[]> {
  return apiGet<NotificationItem[]>('/api/notifications');
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiPatch(`/api/notifications/${id}/read`);
}
