import { apiGet, apiPut } from '../apiClient';

export interface StoreSettings {
  brand_name: string;
  tagline: string;
  description: string;
  address: string;
  phone_main: string;
  phone_secondary: string;
  phone_tertiary: string;
  whatsapp: string;
  instagram: string;
  opening_hours: string;
  currency: string;
  shipping_fee: number;
  free_shipping_threshold: number;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  return apiGet<StoreSettings>('/api/store-settings');
}

export async function updateStoreSettings(settings: Record<string, string>): Promise<StoreSettings> {
  return apiPut<StoreSettings>('/api/store-settings', settings);
}