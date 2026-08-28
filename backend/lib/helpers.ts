import { prisma } from './prisma';

export function safeJsonParse(value: string | null | undefined | object, fallback: any = null) {
  if (value === null || value === undefined) return fallback;
  // Prisma Json fields may already return object/array (when type is Json)
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function calculateCartTotal(cart: any, cartItems: any[]) {
  let subtotal = 0;
  for (const item of cartItems) {
    subtotal += item.product.price * item.quantity;
  }
  let discount = 0;
  if (cart.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: cart.couponCode,
        isActive: true,
        expiryDate: { gte: new Date() },
      },
    });
    if (coupon) {
      discount = Math.round(subtotal * (coupon.discountPercent / 100));
    }
  }
  const shippingFeeSetting = await prisma.storeSettings.findUnique({ where: { key: 'shipping_fee' } });
  const freeThresholdSetting = await prisma.storeSettings.findUnique({ where: { key: 'free_shipping_threshold' } });
  const shippingFeeValue = shippingFeeSetting ? parseInt(shippingFeeSetting.value) : 5000;
  const freeThreshold = freeThresholdSetting ? parseInt(freeThresholdSetting.value) : 200000;
  const shippingFee = (subtotal - discount) > freeThreshold ? 0 : (subtotal > 0 ? shippingFeeValue : 0);
  const total = Math.max(0, subtotal - discount + shippingFee);
  return { subtotal, discount, shippingFee, total };
}

export function formatCartItems(items: any[]) {
  return items.map(i => ({
    ...i,
    product: { ...i.product, images: safeJsonParse(i.product.images, []) },
  }));
}
