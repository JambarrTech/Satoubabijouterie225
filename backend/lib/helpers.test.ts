import { describe, it, expect } from 'vitest';

function safeJsonParse(str: string | null, fallback: any = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns fallback for null', () => {
    expect(safeJsonParse(null)).toBeNull();
    expect(safeJsonParse(null, [])).toEqual([]);
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull();
    expect(safeJsonParse('not json', [])).toEqual([]);
    expect(safeJsonParse('undefined')).toBeNull();
  });

  it('parses arrays', () => {
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('parses nested objects', () => {
    const input = JSON.stringify({ items: [{ id: 1, name: 'test' }] });
    expect(safeJsonParse(input)).toEqual({ items: [{ id: 1, name: 'test' }] });
  });
});

describe('Cart Total Calculation', () => {
  function calculateCartTotal(cart: any, cartItems: any[]) {
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += item.product.price * item.quantity;
    }
    let discount = 0;
    if (cart.couponCode === 'TEST10') {
      discount = Math.round(subtotal * 0.1);
    }
    const shippingFee = subtotal > 200000 ? 0 : (subtotal > 0 ? 5000 : 0);
    const total = Math.max(0, subtotal - discount + shippingFee);
    return { subtotal, discount, shippingFee, total };
  }

  it('calculates subtotal correctly', () => {
    const items = [
      { product: { price: 10000 }, quantity: 2 },
      { product: { price: 5000 }, quantity: 1 },
    ];
    const result = calculateCartTotal({ couponCode: null }, items);
    expect(result.subtotal).toBe(25000);
  });

  it('applies 10% discount with coupon', () => {
    const items = [{ product: { price: 100000 }, quantity: 1 }];
    const result = calculateCartTotal({ couponCode: 'TEST10' }, items);
    expect(result.discount).toBe(10000);
  });

  it('applies free shipping above threshold', () => {
    const items = [{ product: { price: 300000 }, quantity: 1 }];
    const result = calculateCartTotal({ couponCode: null }, items);
    expect(result.shippingFee).toBe(0);
  });

  it('charges shipping below threshold', () => {
    const items = [{ product: { price: 50000 }, quantity: 1 }];
    const result = calculateCartTotal({ couponCode: null }, items);
    expect(result.shippingFee).toBe(5000);
  });

  it('total is never negative', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const result = calculateCartTotal({ couponCode: 'TEST10' }, items);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
