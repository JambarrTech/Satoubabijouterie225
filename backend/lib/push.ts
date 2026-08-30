import admin from 'firebase-admin';
import { prisma } from './prisma';

let firebaseApp: admin.app.App | null = null;

function initFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Push] Firebase credentials not configured, push notifications disabled');
    console.warn(`[Push] projectId=${!!projectId} clientEmail=${!!clientEmail} privateKey=${!!privateKey}`);
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Push] Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('[Push] Firebase init error:', error);
    return null;
  }
}

export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null;
}

export function getFirebaseDiagnostics(): { initialized: boolean; projectId: boolean; clientEmail: boolean; privateKey: boolean } {
  return {
    initialized: firebaseApp !== null,
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  };
}

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface PushResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendPushNotification(message: PushMessage, userId?: string): Promise<PushResponse> {
  const app = initFirebase();
  if (!app) {
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const messaging = admin.messaging(app);
    const response = await messaging.send({
      token: message.token,
      notification: {
        title: message.title,
        body: message.body,
        imageUrl: message.imageUrl,
      },
      data: message.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'satouba_default',
          icon: 'ic_notification',
          color: '#0B5D1E',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title: message.title, body: message.body },
            badge: 1,
            sound: 'default',
            'content-available': 1,
          },
        },
      },
      webpush: {
        notification: { title: message.title, body: message.body, imageUrl: message.imageUrl },
        data: { title: message.title, body: message.body, imageUrl: message.imageUrl || '', ...message.data },
      },
    });

    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('[Push] Single push error:', error);
    if (error.code === 'messaging/registration-token-not-registered') {
      if (userId) await cleanInvalidTokens(userId, message.token);
      return { success: false, error: 'Token invalide ou expire' };
    }
    return { success: false, error: error.message };
  }
}

export async function sendMulticastPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const app = initFirebase();
  if (!app) {
    console.error('[Push] Firebase not initialized - cannot send push');
    return { success: 0, failed: tokens.length, errors: ['Firebase not initialized'] };
  }

  if (tokens.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  try {
    console.log(`[Push] Sending multicast to ${tokens.length} token(s): title="${title}"`);
    const messaging = admin.messaging(app);
    const response = await messaging.sendEachForMulticast({
      tokens,
      data: { title, body, imageUrl: imageUrl || '', ...data },
      android: {
        priority: 'high',
        notification: { title, body, channelId: 'satouba_default', icon: 'ic_notification', color: '#0B5D1E' },
      },
      apns: {
        payload: { aps: { alert: { title, body }, badge: 1, sound: 'default', 'content-available': 1 } },
      },
      webpush: {
        notification: { title, body, imageUrl: imageUrl || undefined },
        data: { title, body, imageUrl: imageUrl || '', ...data },
      },
    });

    console.log(`[Push] Result: ${response.successCount} success, ${response.failureCount} failed`);

    const errors: string[] = [];
    const invalidTokens: Array<{ token: string }> = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errMsg = resp.error?.message || 'unknown error';
        errors.push(`Token ${idx}: ${errMsg}`);
        console.error(`[Push] Token ${idx} failed:`, errMsg);
        if (resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push({ token: tokens[idx] });
        }
      }
    });

    // Clean invalid tokens
    if (invalidTokens.length > 0) {
      try {
        const invalidTokenStrings = invalidTokens.map(t => t.token);
        const users = await prisma.user.findMany({
          select: { id: true, pushTokens: true },
        });
        for (const user of users) {
          const tokens: string[] = typeof user.pushTokens === 'string'
            ? JSON.parse(user.pushTokens || '[]')
            : Array.isArray(user.pushTokens) ? user.pushTokens : [];
          const cleaned = tokens.filter((t: string) => !invalidTokenStrings.includes(t));
          if (cleaned.length !== tokens.length) {
            await prisma.user.update({
              where: { id: user.id },
              data: { pushTokens: JSON.stringify(cleaned) },
            });
          }
        }
      } catch {}
    }

    return {
      success: response.successCount,
      failed: response.failureCount,
      errors,
    };
  } catch (error: any) {
    console.error('[Push] Multicast push error:', error);
    return { success: 0, failed: tokens.length, errors: [error.message] };
  }
}

export interface OrderPushData {
  orderId: string;
  orderNumber: string;
  type: 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export function getOrderPushContent(data: OrderPushData): { title: string; body: string; clickAction: string } {
  switch (data.type) {
    case 'CONFIRMED':
      return {
        title: 'Commande confirmee',
        body: `Votre commande ${data.orderNumber} a ete confirmee. Nos artisans commencent la fabrication.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'PREPARING':
      return {
        title: 'En cours de fabrication',
        body: `Votre commande ${data.orderNumber} est en cours de preparation par nos artisans.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'SHIPPED':
      return {
        title: 'Commande expediee',
        body: `Votre commande ${data.orderNumber} est en route. Livraison prevue sous 24-48h.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'DELIVERED':
      return {
        title: 'Livre avec succes',
        body: `Commande ${data.orderNumber} livree. Merci pour votre confiance Satouba !`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'CANCELLED':
      return {
        title: 'Commande annulee',
        body: `Votre commande ${data.orderNumber} a ete annulee. Contactez-nous pour plus d'infos.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    default:
      return {
        title: 'Satouba',
        body: `Mise a jour pour votre commande ${data.orderNumber}`,
        clickAction: `/commandes/${data.orderId}`,
      };
  }
}

export async function cleanInvalidTokens(userId: string, invalidToken: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushTokens: true },
    });
    if (!user?.pushTokens) return;
    const tokens: string[] = typeof user.pushTokens === 'string'
      ? JSON.parse(user.pushTokens || '[]')
      : Array.isArray(user.pushTokens) ? user.pushTokens : [];
    const cleaned = tokens.filter((t: string) => t !== invalidToken);
    if (cleaned.length !== tokens.length) {
      await prisma.user.update({
        where: { id: userId },
        data: { pushTokens: JSON.stringify(cleaned) },
      });
    }
  } catch {}
}