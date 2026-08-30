import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging, isSupported, getToken, onMessage, deleteToken } from 'firebase/messaging';

declare global {
  interface Window {
    FIREBASE_CONFIG?: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
      measurementId?: string;
    };
  }
}

const FIREBASE_DEFAULTS = {
  apiKey: 'AIzaSyB6tBRmQR69BzDMgz5yRbWgtVEVEtO6I3U',
  authDomain: 'plateformesatouba.firebaseapp.com',
  projectId: 'plateformesatouba',
  storageBucket: 'plateformesatouba.firebasestorage.app',
  messagingSenderId: '758245641576',
  appId: '1:758245641576:web:b035eddece1f23b6fc5add',
  measurementId: 'G-BT229N1P1E',
};

const getFirebaseConfig = () => {
  if (typeof window !== 'undefined' && (window as any).FIREBASE_CONFIG?.apiKey) {
    return (window as any).FIREBASE_CONFIG;
  }
  // @ts-ignore vite env
  const envCfg = {
    // @ts-ignore
    apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
    // @ts-ignore
    authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    // @ts-ignore
    projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    // @ts-ignore
    storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    // @ts-ignore
    messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    // @ts-ignore
    appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
    // @ts-ignore
    measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  // Fallback to defaults if env vars are empty (build without .env)
  if (!envCfg.apiKey) return FIREBASE_DEFAULTS;
  return envCfg;
};

const firebaseConfig = getFirebaseConfig();

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export async function initFirebase(): Promise<{ app: FirebaseApp; messaging: Messaging } | null> {
  if (app && messaging) return { app, messaging };

  const supported = await isSupported();
  if (!supported) {
    console.warn('Firebase messaging not supported in this browser');
    return null;
  }

  if (!firebaseConfig.apiKey) {
    console.warn('Firebase config missing');
    return null;
  }

  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  messaging = getMessaging(app);

  return { app, messaging };
}

export async function getFCMToken(): Promise<string | null> {
  const init = await initFirebase();
  if (!init) return null;

  const { messaging } = init;
  // @ts-ignore
  const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;

  try {
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (!messaging) return null;
  return onMessage(messaging, callback);
}

export async function deleteFCMToken(): Promise<boolean> {
  const init = await initFirebase();
  if (!init) return false;

  try {
    await deleteToken(init.messaging);
    return true;
  } catch {
    return false;
  }
}

export { messaging };
