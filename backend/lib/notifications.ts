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

    return notification;
  } catch (error) {
    logger.error({ err: error }, 'Create notification error');
    throw error;
  }
}

// --- Order notifications ---

export async function notifyNewOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      items: true,
    },
  });

  if (!order) return;

  // 1. Notify customer: confirmation in-app (dedicated SMS sent below)
  const title = 'Commande confirmee';
  const body = `Votre commande ${order.orderNumber} a ete confirmee. Nos artisans commencent la fabrication.`;

  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: 'ORDER',
    channel: 'PUSH',
    data: { orderId: order.id, orderNumber: order.orderNumber, status: 'CONFIRMED' },
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
    select: { id: true, phone: true },
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
    include: { user: { select: { id: true, phone: true } } },
  });

  if (!order || !order.user) return;

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'Commande confirmee',
    PREPARING: 'En cours de fabrication',
    SHIPPED: 'Commande expediee',
    DELIVERED: 'Livree avec succes',
    CANCELLED: 'Commande annulee',
  };

  const title = statusLabels[status] || 'Statut mis a jour';
  const body = `Votre commande ${order.orderNumber}: ${statusLabels[status] || status}.`;

  // Create in-app notification (dedicated SMS sent below)
  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: 'ORDER',
    channel: 'PUSH',
    data: { orderId: order.id, orderNumber: order.orderNumber, status },
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
    select: { name: true, phone: true },
  });

  // 1. Notify customer: in-app + SMS
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
    select: { id: true, phone: true },
  });

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
    select: { name: true, phone: true },
  });

  // 1. Notify customer: in-app + SMS
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
    select: { id: true, phone: true },
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
    include: { user: { select: { id: true, phone: true } } },
  });

  if (!request || !request.user) return;

  const statusLabels: Record<string, string> = {
    RECEIVED: 'Reparation recue',
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
    include: { user: { select: { id: true, phone: true } } },
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
    select: { id: true },
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