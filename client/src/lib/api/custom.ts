import { CustomRequest } from '../../types';
import { apiGet, apiPost } from '../apiClient';

export async function fetchCustomRequests(): Promise<CustomRequest[]> {
  return apiGet<CustomRequest[]>('/api/custom-requests');
}

export async function createCustomRequest(data: {
  jewelryType: string;
  material: string;
  description: string;
  budget?: string;
  referenceImageUrl?: string;
  phone: string;
}): Promise<CustomRequest> {
  return apiPost<CustomRequest>('/api/custom-requests', data);
}
