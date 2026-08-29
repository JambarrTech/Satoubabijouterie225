import { RepairRequest } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export async function fetchRepairRequests(): Promise<RepairRequest[]> {
  return apiGet<RepairRequest[]>('/api/repairs');
}

export async function createRepairRequest(data: {
  jewelryType: string;
  problemType: string;
  description: string;
  photos?: string[];
  phone: string;
}): Promise<RepairRequest> {
  return apiPost<RepairRequest>('/api/repairs', data);
}
