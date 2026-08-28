import { apiGet } from '../apiClient';

export interface MaterialPricing {
  id: string;
  name: string;
  pricePerGram: number;
  type: string;
  description?: string;
}

export async function fetchMaterialPricing(): Promise<MaterialPricing[]> {
  return apiGet<MaterialPricing[]>('/api/material-pricing');
}
