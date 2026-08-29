import { describe, it, expect, vi } from 'vitest';
import { safeJsonParse, calculateCartTotal, formatCartItems } from '../lib/helpers';

// Mock prisma for calculateCartTotal
vi.mock('../lib/prisma', () => ({
  prisma: {
    storeSettings: {
      findMany: vi.fn().mockResolvedValue([
        { key: 'shipping_fee', value: '2000' },
        { key: 'free_shipping_threshold', value: '50000' },
      ]),
    },
  },
}));

describe('safeJsonParse', () => {
  it('returns null for null input', () => {
    expect(safeJsonParse(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(safeJsonParse(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeJsonParse('')).toBeNull();
  });

  it('returns the object as-is if already an object', () => {
    const obj = { foo: 'bar' };
    expect(safeJsonParse(obj as any)).toBe(obj);
  });

  it('parses valid JSON string', () => {
    expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('invalid', 'fallback')).toBe('fallback');
  });

  it('returns fallback for non-string non-object', () => {
    expect(safeJsonParse(123 as any, 'fallback')).toBe('fallback');
  });

  it('returns default fallback (null) for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull();
  });
});

describe('calculateCartTotal', () => {
  it('calculates total with no shipping fee for small orders', async () => {
    const items = [{ product: { price: 10000 }, quantity: 2 }];
    const result = await calculateCartTotal(null, items);
    expect(result.subtotal).toBe(20000);
    expect(result.shippingFee).toBe(2000);
    expect(result.total).toBe(22000);
  });

  it('calculates free shipping above threshold', async () => {
    const items = [{ product: { price: 60000 }, quantity: 1 }];
    const result = await calculateCartTotal(null, items);
    expect(result.subtotal).toBe(60000);
    expect(result.shippingFee).toBe(0);
    expect(result.total).toBe(60000);
  });

  it('calculates zero shipping for empty cart', async () => {
    const result = await calculateCartTotal(null, []);
    expect(result.subtotal).toBe(0);
    expect(result.shippingFee).toBe(0);
    expect(result.total).toBe(0);
  });

  it('calculates total for multiple items', async () => {
    const items = [
      { product: { price: 15000 }, quantity: 2 },
      { product: { price: 30000 }, quantity: 1 },
    ];
    const result = await calculateCartTotal(null, items);
    expect(result.subtotal).toBe(60000);
    expect(result.shippingFee).toBe(0);
    expect(result.total).toBe(60000);
  });
});

describe('formatCartItems', () => {
  it('parses images JSON string into array', () => {
    const items = [{ product: { images: '["img1.jpg"]' } }];
    const result = formatCartItems(items as any);
    expect(result[0].product.images).toEqual(['img1.jpg']);
  });

  it('keeps images as-is if already an array', () => {
    const items = [{ product: { images: ['img1.jpg'] } }];
    const result = formatCartItems(items as any);
    expect(result[0].product.images).toEqual(['img1.jpg']);
  });

  it('handles null images', () => {
    const items = [{ product: { images: null } }];
    const result = formatCartItems(items as any);
    expect(result[0].product.images).toBeNull();
  });
});
