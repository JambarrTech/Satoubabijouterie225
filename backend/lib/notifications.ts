import { prisma } from './prisma';
import {
  sendOrderConfirmationSMS,
  sendShippingSMS,
  sendDeliverySMS,
  sendPreparingSMS,
  sendCancelledSMS,
  sendOTPSMS,
  sendCustomRequestSMS,
  sendRepairRequestSMS,
  sendNewOrderSMS,
  sendRepairStatusSMS,
  sendCustomStatusSMS,
  sendNewRepairToGerantSMS,
  sendNewCustomToGerantSMS,
} from './sms';
import { sendMulticastPushNotification, getOrderPushContent, OrderPushData } from './push';
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
    select: { pushTokens: true },
  });

  if (!user) return;

  const tokens = getPushTokens({ pushTokens: user.pushTokens });

  if (options.channel === 'PUSH' || options.channel === 'BOTH') {
    if (tokens.length > 0) {
      try {
        const result = await sendMulticastPushNotification(tokens, options.title, options.body, options.data);
        if (result.failed > 0) {
          console.warn(`Push: ${result.failed}/${tokens.length} tokens failed`, result.errors);
        }
      } catch (err) {
        console.error('Push notification send error:', err);
      }
    }
  }
}

// --- Order notifications ---

export async function notifyNewOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, phone: true, pushTokens: true } },
      items: true,
    },
  });

  if (!order) return;

  // 1. Notify customer: confirmation in-app + push (dedicated SMS sent below)
  const pushData: OrderPushData = { orderId, orderNumber: order.orderNumber, type: 'CONFIRMED' };
  const { title, body, clickAction } = getOrderPushContent(pushData);

  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: 'ORDER',
    channel: 'PUSH',
    data: { orderId, orderNumber: order.orderNumber, status: 'CONFIRMED', clickAction },
    orderId,
  });

  // Dedicated confirmation SMS
  if (order.user.phone) {
    await sendOrderConfirmationSMS(order.user.phone, order.orderNumber, order.totalAmount);
  }

  // 2. Notify all admins
  await notifyGerantsNewOrder(order);
}

async function notifyGerantsNewOrder(order: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  customerName: string;
  user: { name: string };
  items: Array<{ productName: string; quantity: number }>;
}) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, phone: true, pushTokens: true },
  });

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const itemsList = order.items.map((i) => `${i.productName} x${i.quantity}`).join(', ');

  for (const admin of admins) {
    const title = 'Nouvelle commande';
    const message = `Commande ${order.orderNumber} de ${order.customerName} — ${order.totalAmount.toLocaleString()} FCFA (${itemCount} article${itemCount > 1 ? 's' : ''}). Articles: ${itemsList}.`;

    await createNotification({
      userId: admin.id,
      title,
      message,
      type: 'ORDER',
      channel: 'PUSH',
      data: { orderId: order.id, orderNumber: order.orderNumber, type: 'NEW_ORDER' },
      orderId: order.id,
    });

    // Dedicated SMS to gerant
    if (admin.phone) {
      await sendNewOrderSMS(admin.phone, order.orderNumber, order.customerName, order.totalAmount);
    }
  }
}

export async function notifyOrderStatusChange(
  orderId: string,
  status: 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } },
  });

  if (!order || !order.user) return;

  const pushData: OrderPushData = { orderId, orderNumber: order.orderNumber, type: status };
  const { title, body, clickAction } = getOrderPushContent(pushData);

  // Create in-app notification + push only (no generic SMS — dedicated SMS sent below)
  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: 'ORDER',
    channel: 'PUSH',
    data: { orderId, orderNumber: order.orderNumber, status, clickAction },
    orderId,
  });

  // Dedicated SMS per status
  if (order.user.phone) {
    switch (status) {
      case 'CONFIRMED':
        await sendOrderConfirmationSMS(order.user.phone, order.orderNumber, order.totalAmount);
        break;
      case 'PREPARING':
        await sendPreparingSMS(order.user.phone, order.orderNumber);
        break;
      case 'SHIPPED':
        await sendShippingSMS(order.user.phone, order.orderNumber);
        break;
      case 'DELIVERED':
        await sendDeliverySMS(order.user.phone, order.orderNumber);
        break;
      case 'CANCELLED':
        await sendCancelledSMS(order.user.phone, order.orderNumber);
        break;
    }
  }
}

// --- Custom / Repair ---

export async function notifyCustomRequest(userId: string, requestId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, pushTokens: true },
  });

  // 1. Notify customer: in-app + push + SMS
  await createNotification({
    userId,
    title: 'Demande sur-mesure recue',
    message: `Votre demande ${requestId} a ete prise en compte. Notre equipe vous contactera sous 24h.`,
    type: 'CUSTOM',
    channel: 'PUSH',
    data: { requestId, type: 'custom' },
  });

  if (user?.phone) {
    await sendCustomRequestSMS(user.phone, requestId);
  }

  // 2. Notify all admins
  await notifyGerantsNewCustom(userId, requestId);
}

async function notifyGerantsNewCustom(userId: string, requestId: string) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, phone: true, pushTokens: true },
  });

  // Get the custom request to include details
  const request = await prisma.customRequest.findUnique({
    where: { id: requestId },
    select: { jewelryType: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const customerName = user?.name || 'Client';
  const jewelryType = request?.jewelryType || 'Bijou';

  for (const admin of admins) {
    const title = 'Nouvelle demande sur-mesure';
    const message = `Demande ${requestId} de ${customerName} — ${jewelryType}. Connectez-vous pour gerer.`;

    await createNotification({
      userId: admin.id,
      title,
      message,
      type: 'CUSTOM',
      channel: 'PUSH',
      data: { requestId, type: 'new_custom' },
    });

    if (admin.phone) {
      await sendNewCustomToGerantSMS(admin.phone, requestId, customerName, jewelryType);
    }
  }
}

export async function notifyRepairRequest(userId: string, requestId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, pushTokens: true },
  });

  // 1. Notify customer: in-app + push + SMS
  await createNotification({
    userId,
    title: 'Demande de reparation recue',
    message: `Votre demande ${requestId} a ete enregistree. Nous vous contacterons pour organiser le depot.`,
    type: 'REPAIR',
    channel: 'PUSH',
    data: { requestId, type: 'repair' },
  });

  if (user?.phone) {
    await sendRepairRequestSMS(user.phone, requestId);
  }

  // 2. Notify all admins
  await notifyGerantsNewRepair(userId, requestId);
}

async function notifyGerantsNewRepair(userId: string, requestId: string) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, phone: true, pushTokens: true },
  });

  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { jewelryType: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const customerName = user?.name || 'Client';
  const jewelryType = request?.jewelryType || 'Bijou';

  for (const admin of admins) {
    const title = 'Nouvelle demande de reparation';
    const message = `Demande ${requestId} de ${customerName} — ${jewelryType}. Connectez-vous pour gerer.`;

    await createNotification({
      userId: admin.id,
      title,
      message,
      type: 'REPAIR',
      channel: 'PUSH',
      data: { requestId, type: 'new_repair' },
    });

    if (admin.phone) {
      await sendNewRepairToGerantSMS(admin.phone, requestId, customerName, jewelryType);
    }
  }
}

export async function sendOTPNotification(phone: string, code: string) {
  return sendOTPSMS(phone, code);
}

// --- Repair status change ---

export async function notifyRepairStatusChange(
  requestId: string,
  status: 'RECEIVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
) {
  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } },
  });

  if (!request || !request.user) return;

  const statusLabels: Record<string, string> = {
    RECUE: 'Reparation recue',
    IN_PROGRESS: 'En cours de traitement',
    WAITING_PARTS: 'En attente de pieces',
    COMPLETED: 'Reparation terminee',
    DELIVERED: 'Bijou remis',
    CANCELLED: 'Reparation annulee',
  };

  const title = statusLabels[status] || 'Statut mis a jour';
  const body = `Votre reparation ${requestId}: ${statusLabels[status] || status}.`;

  await createNotification({
    userId: request.user.id,
    title,
    message: body,
    type: 'REPAIR',
    channel: 'PUSH',
    data: { requestId, status, type: 'repair' },
  });

  if (request.user.phone) {
    await sendRepairStatusSMS(request.user.phone, requestId, status);
  }
}

// --- Custom request status change ---

export async function notifyCustomStatusChange(
  requestId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'QUOTE_SENT' | 'APPROVED' | 'COMPLETED' | 'CANCELLED'
) {
  const request = await prisma.customRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } },
  });

  if (!request || !request.user) return;

  const statusLabels: Record<string, string> = {
    PENDING: 'Demande en attente',
    IN_PROGRESS: 'Etude en cours',
    QUOTE_SENT: 'Devis envoye',
    APPROVED: 'Demande approuvee',
    COMPLETED: 'Bijou termine',
    CANCELLED: 'Demande annulee',
  };

  const title = statusLabels[status] || 'Statut mis a jour';
  const body = `Votre demande sur-mesure ${requestId}: ${statusLabels[status] || status}.`;

  await createNotification({
    userId: request.user.id,
    title,
    message: body,
    type: 'CUSTOM',
    channel: 'PUSH',
    data: { requestId, status, type: 'custom' },
  });

  if (request.user.phone) {
    await sendCustomStatusSMS(request.user.phone, requestId, status);
  }
}

export async function notifyPromo(userIds: string[], title: string, message: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, pushTokens: true },
  });

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title,
      message,
      type: 'PROMO',
      channel: 'PUSH',
      data: { type: 'promo' },
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
