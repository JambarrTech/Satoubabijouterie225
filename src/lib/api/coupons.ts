import { Coupon } from '../../types';
import { apiGet } from '../apiClient';

export async function fetchCoupons(): Promise<Coupon[]> {
  return apiGet<Coupon[]>('/api/coupons');
}
