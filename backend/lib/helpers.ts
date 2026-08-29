import { prisma } from './prisma';

export function safeJsonParse(value: string | null | undefined | object, fallback: any = null) {
  if (value === null || value === undefined) return fallback;
  // Prisma Json fields may already return object/array (when type is Json)
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function calculateCartTotal(_cart: any, cartItems: any[]) {
  let subtotal = 0;
  for (const item of cartItems) {
    const price = Number(item.product.price) || 0;
    const qty = Number(item.quantity) || 0;
    subtotal += price * qty;
  }

  const settings = await prisma.storeSettings.findMany({
    where: { key: { in: ['shipping_fee', 'free_shipping_threshold'] } },
  });
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  const shippingFeeValue = parseInt(settingsMap.get('shipping_fee') || '0') || 0;
  const freeThreshold = parseInt(settingsMap.get('free_shipping_threshold') || '0') || 0;
  const shippingFee = subtotal > freeThreshold ? 0 : (subtotal > 0 ? shippingFeeValue : 0);
  const total = subtotal + shippingFee;
  return { subtotal, discount: 0, shippingFee, total };
}

export function formatCartItems(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items.map(i => ({
    ...i,
    product: {
      ...i.product,
      images: safeJsonParse(i.product?.images, []),
      price: Number(i.product?.price) || 0,
      stockQuantity: Number(i.product?.stockQuantity) || 0,
      name: i.product?.name || 'Produit',
    },
  }));
}
