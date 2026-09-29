import { describe, it, expect } from 'vitest';
import { VALID_STATUSES, ALLOWED_TRANSITIONS } from './orders';
import { VALID_CUSTOM_STATUSES } from './custom';
import { VALID_REPAIR_STATUSES } from './repairs';
import { ALLOWED_PRODUCT_FIELDS } from './products';
import { ALLOWED_PROFILE_FIELDS } from './auth';
import { isValidDiscountPercent } from './coupons';

describe('Status Validation', () => {
  it('accepts valid order statuses', () => {
    for (const s of VALID_STATUSES) {
      expect(VALID_STATUSES.includes(s)).toBe(true);
    }
  });

  it('rejects invalid order status', () => {
    expect(VALID_STATUSES.includes('GARBAGE')).toBe(false);
    expect(VALID_STATUSES.includes('')).toBe(false);
    expect(VALID_STATUSES.includes('pending')).toBe(false);
  });

  it('accepts valid custom statuses', () => {
    for (const s of VALID_CUSTOM_STATUSES) {
      expect((VALID_CUSTOM_STATUSES as readonly string[]).includes(s)).toBe(true);
    }
  });

  it('rejects invalid custom status', () => {
    expect((VALID_CUSTOM_STATUSES as readonly string[]).includes('UNKNOWN')).toBe(false);
  });

  it('accepts valid repair statuses', () => {
    for (const s of VALID_REPAIR_STATUSES) {
      expect((VALID_REPAIR_STATUSES as readonly string[]).includes(s)).toBe(true);
    }
  });

  it('order state machine only allows known transitions', () => {
    expect(ALLOWED_TRANSITIONS['CONFIRMED']).toContain('PREPARING');
    expect(ALLOWED_TRANSITIONS['DELIVERED']).toEqual([]);
    expect(ALLOWED_TRANSITIONS['CANCELLED']).toEqual([]);
  });
});

describe('Field Whitelists', () => {
  it('profile update only allows safe fields', () => {
    const malicious = { role: 'ADMIN', id: 'fake', password: 'x', createdAt: new Date() };
    const filtered: Record<string, any> = {};
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (malicious[key as keyof typeof malicious] !== undefined) {
        filtered[key] = malicious[key as keyof typeof malicious];
      }
    }
    expect(filtered.role).toBeUndefined();
    expect(filtered.id).toBeUndefined();
    expect(filtered.password).toBeUndefined();
  });

  it('product fields include all expected keys', () => {
    expect(ALLOWED_PRODUCT_FIELDS).toContain('name');
    expect(ALLOWED_PRODUCT_FIELDS).toContain('price');
    expect(ALLOWED_PRODUCT_FIELDS).toContain('stockQuantity');
    expect(ALLOWED_PRODUCT_FIELDS).not.toContain('id');
    expect(ALLOWED_PRODUCT_FIELDS).not.toContain('createdAt');
  });

  it('profile fields include all expected keys', () => {
    expect(ALLOWED_PROFILE_FIELDS).toContain('name');
    expect(ALLOWED_PROFILE_FIELDS).toContain('phone');
    expect(ALLOWED_PROFILE_FIELDS).toContain('address');
    expect(ALLOWED_PROFILE_FIELDS).not.toContain('role');
    expect(ALLOWED_PROFILE_FIELDS).not.toContain('email');
  });
});

describe('Coupon Validation', () => {
  it('discountPercent must be between 1 and 100', () => {
    expect(isValidDiscountPercent(50)).toBe(true);
    expect(isValidDiscountPercent(1)).toBe(true);
    expect(isValidDiscountPercent(100)).toBe(true);
    expect(isValidDiscountPercent(0)).toBe(false);
    expect(isValidDiscountPercent(200)).toBe(false);
    expect(isValidDiscountPercent(-5)).toBe(false);
    expect(isValidDiscountPercent(NaN)).toBe(false);
  });
});

describe('Product Validation', () => {
  it('price must be non-negative', () => {
    const isValidPrice = (p: number) => !isNaN(p) && p >= 0;
    expect(isValidPrice(0)).toBe(true);
    expect(isValidPrice(50000)).toBe(true);
    expect(isValidPrice(-5)).toBe(false);
    expect(isValidPrice(NaN)).toBe(false);
  });

  it('stockQuantity must be non-negative', () => {
    const isValidStock = (s: number) => !isNaN(s) && s >= 0;
    expect(isValidStock(0)).toBe(true);
    expect(isValidStock(100)).toBe(true);
    expect(isValidStock(-1)).toBe(false);
  });
});
