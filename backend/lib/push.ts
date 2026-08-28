import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

function initFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase credentials not configured, push notifications disabled');
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
    console.log('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('Firebase init error:', error);
    return null;
  }
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

export async function sendPushNotification(message: PushMessage): Promise<PushResponse> {
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
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          image: message.imageUrl,
          actions: [
            { action: 'view', title: 'Voir' },
          ],
        },
      },
    });

    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('Push notification error:', error);
    if (error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'Token invalide ou expiré' };
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
    return { success: 0, failed: tokens.length, errors: ['Firebase not initialized'] };
  }

  if (tokens.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  try {
    const messaging = admin.messaging(app);
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body, imageUrl },
      data: data || {},
      android: {
        priority: 'high',
        notification: { channelId: 'satouba_default', icon: 'ic_notification', color: '#0B5D1E' },
      },
      apns: {
        payload: { aps: { alert: { title, body }, badge: 1, sound: 'default' } },
      },
    });

    const errors: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        errors.push(`Token ${idx}: ${resp.error?.message}`);
      }
    });

    return {
      success: response.successCount,
      failed: response.failureCount,
      errors,
    };
  } catch (error: any) {
    console.error('Multicast push error:', error);
    return { success: 0, failed: tokens.length, errors: [error.message] };
  }
}

export async function sendTopicPushNotification(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushResponse> {
  const app = initFirebase();
  if (!app) {
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const messaging = admin.messaging(app);
    const response = await messaging.send({
      topic,
      notification: { title, body },
      data: data || {},
    });
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('Topic push error:', error);
    return { success: false, error: error.message };
  }
}

export async function subscribeToTopic(tokens: string[], topic: string): Promise<{ success: number; failed: number }> {
  const app = initFirebase();
  if (!app) return { success: 0, failed: tokens.length };

  try {
    const messaging = admin.messaging(app);
    const response = await messaging.subscribeToTopic(tokens, topic);
    return { success: response.successCount, failed: response.failureCount };
  } catch {
    return { success: 0, failed: tokens.length };
  }
}

export async function unsubscribeFromTopic(tokens: string[], topic: string): Promise<{ success: number; failed: number }> {
  const app = initFirebase();
  if (!app) return { success: 0, failed: tokens.length };

  try {
    const messaging = admin.messaging(app);
    const response = await messaging.unsubscribeFromTopic(tokens, topic);
    return { success: response.successCount, failed: response.failureCount };
  } catch {
    return { success: 0, failed: tokens.length };
  }
}

export interface OrderPushData {
  orderId: string;
  orderNumber: string;
  type: 'CONFIRMED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export function getOrderPushContent(data: OrderPushData): { title: string; body: string; clickAction: string } {
  switch (data.type) {
    case 'CONFIRMED':
      return {
        title: 'Commande confirmée ✅',
        body: `Votre commande ${data.orderNumber} a été confirmée. Nos artisans commencent la fabrication.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'PAID':
      return {
        title: 'Paiement reçu 💚',
        body: `Paiement validé pour ${data.orderNumber}. Fabrication en cours.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'SHIPPED':
      return {
        title: 'Commande expédiée 🚚',
        body: `Votre commande ${data.orderNumber} est en route. Livraison prévue sous 24-48h.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'DELIVERED':
      return {
        title: 'Livré avec succès 🎉',
        body: `Commande ${data.orderNumber} livrée. Merci pour votre confiance SaTouba !`,
        clickAction: `/commandes/${data.orderId}`,
      };
    case 'CANCELLED':
      return {
        title: 'Commande annulée ❌',
        body: `Votre commande ${data.orderNumber} a été annulée. Contactez-nous pour plus d'infos.`,
        clickAction: `/commandes/${data.orderId}`,
      };
    default:
      return {
        title: 'SaTouba',
        body: `Mise à jour pour votre commande ${data.orderNumber}`,
        clickAction: `/commandes/${data.orderId}`,
      };
  }
}