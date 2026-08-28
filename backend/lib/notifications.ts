import { prisma } from './prisma';
import { sendSMS, sendOrderConfirmationSMS, sendPaymentConfirmedSMS, sendShippingSMS, sendDeliverySMS, sendOTPSMS, sendCustomRequestSMS, sendRepairRequestSMS } from './sms';
import { sendPushNotification, sendMulticastPushNotification, getOrderPushContent, OrderPushData } from './push';
import logger from './logger';

export type NotificationChannel = 'SMS' | 'PUSH' | 'BOTH';

interface NotificationOptions {
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PROMO' | 'SYSTEM' | 'REPAIR' | 'CUSTOM';
  channel?: NotificationChannel;
  data?: Record<string, string>;
  orderId?: string;
}

function getPushTokens(user: { pushTokens: any }): string[] {
  try {
    const tokens = user.pushTokens;
    if (Array.isArray(tokens)) return tokens;
    if (typeof tokens === 'string') return JSON.parse(tokens);
    return [];
  } catch {
    return [];
  }
}

export async function createNotification(options: NotificationOptions) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: options.userId,
        title: options.title,
        message: options.message,
        type: options.type,
        read: false,
      },
    });

    await sendNotificationToUser({
      userId: options.userId,
      title: options.title,
      body: options.message,
      data: options.data,
      channel: options.channel || 'BOTH',
    });

    return notification;
  } catch (error) {
    logger.error({ err: error }, 'Create notification error');
    throw error;
  }
}

async function sendNotificationToUser(options: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channel: NotificationChannel;
}) {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: { phone: true, pushTokens: true },
  });

  if (!user) return;

  const { phone, pushTokens } = user;
  const tokens = getPushTokens({ pushTokens });

  if (options.channel === 'SMS' || options.channel === 'BOTH') {
    if (phone) {
      await sendSMS({ to: phone, message: `${options.title}\n${options.body}` });
    }
  }

  if (options.channel === 'PUSH' || options.channel === 'BOTH') {
    if (tokens.length > 0) {
      await sendMulticastPushNotification(tokens, options.title, options.body, options.data);
    }
  }
}

export async function notifyOrderStatusChange(
  orderId: string,
  status: 'CONFIRMED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } },
  });

  if (!order || !order.user) return;

  const pushData: OrderPushData = { orderId, orderNumber: order.orderNumber, type: status };
  const { title, body, clickAction } = getOrderPushContent(pushData);

  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: 'ORDER',
    channel: 'BOTH',
    data: { orderId, orderNumber: order.orderNumber, status, clickAction },
    orderId,
  });

  if (order.user.phone) {
    switch (status) {
      case 'CONFIRMED':
        await sendOrderConfirmationSMS(order.user.phone, order.orderNumber, order.totalAmount);
        break;
      case 'PAID':
        await sendPaymentConfirmedSMS(order.user.phone, order.orderNumber);
        break;
      case 'SHIPPED':
        await sendShippingSMS(order.user.phone, order.orderNumber);
        break;
      case 'DELIVERED':
        await sendDeliverySMS(order.user.phone, order.orderNumber);
        break;
    }
  }
}

export async function notifyPaymentInitiated(userId: string, orderNumber: string, paymentUrl: string) {
  await createNotification({
    userId,
    title: 'Paiement en attente',
    message: `Completez le paiement pour la commande ${orderNumber}`,
    type: 'ORDER',
    channel: 'BOTH',
    data: { orderNumber, paymentUrl, action: 'pay' },
  });
}

export async function notifyCustomRequest(userId: string, requestId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, pushTokens: true },
  });

  await createNotification({
    userId,
    title: 'Demande sur-mesure reçue',
    message: `Votre demande ${requestId} a été prise en compte. Notre équipe vous contactera sous 24h.`,
    type: 'CUSTOM',
    channel: 'BOTH',
    data: { requestId, type: 'custom' },
  });

  if (user?.phone) {
    await sendCustomRequestSMS(user.phone, requestId);
  }
}

export async function notifyRepairRequest(userId: string, requestId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, pushTokens: true },
  });

  await createNotification({
    userId,
    title: 'Demande de réparation reçue',
    message: `Votre demande ${requestId} a été enregistrée. Nous vous contacterons pour organiser le dépôt.`,
    type: 'REPAIR',
    channel: 'BOTH',
    data: { requestId, type: 'repair' },
  });

  if (user?.phone) {
    await sendRepairRequestSMS(user.phone, requestId);
  }
}

export async function sendOTPNotification(phone: string, code: string) {
  return sendOTPSMS(phone, code);
}

export async function notifyPromo(userIds: string[], title: string, message: string, couponCode?: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, phone: true, pushTokens: true },
  });

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title,
      message,
      type: 'PROMO',
      channel: 'BOTH',
      data: { couponCode, type: 'promo' },
    });
  }
}

export async function registerPushToken(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushTokens: true },
  });

  const tokens = getPushTokens({ pushTokens: user?.pushTokens });
  if (!tokens.includes(token)) {
    tokens.push(token);
    await prisma.user.update({
      where: { id: userId },
      data: { pushTokens: JSON.stringify(tokens) },
    });
  }
}

export async function unregisterPushToken(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushTokens: true },
  });

  const tokens = getPushTokens({ pushTokens: user?.pushTokens }).filter(t => t !== token);
  await prisma.user.update({
    where: { id: userId },
    data: { pushTokens: JSON.stringify(tokens) },
  });
}