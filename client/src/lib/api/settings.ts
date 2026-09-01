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

let cachedSettings: StoreSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // 60 seconds

export async function fetchStoreSettings(): Promise<StoreSettings> {
  if (cachedSettings && Date.now() < cacheExpiry) {
    return cachedSettings;
  }
  const settings = await apiGet<StoreSettings>('/api/store-settings');
  cachedSettings = settings;
  cacheExpiry = Date.now() + CACHE_TTL;
  return settings;
}

export function invalidateSettingsCache(): void {
  cachedSettings = null;
  cacheExpiry = 0;
}

export async function updateStoreSettings(settings: Record<string, string>): Promise<StoreSettings> {
  const result = await apiPut<StoreSettings>('/api/store-settings', settings);
  invalidateSettingsCache();
  return result;
}