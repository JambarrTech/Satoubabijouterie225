import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, type Messaging, isSupported, getToken, onMessage } from "firebase/messaging";

const FIREBASE_DEFAULTS = {
  apiKey: "AIzaSyB6tBRmQR69BzDMgz5yRbWgtVEVEtO6I3U",
  authDomain: "plateformesatouba.firebaseapp.com",
  projectId: "plateformesatouba",
  storageBucket: "plateformesatouba.firebasestorage.app",
  messagingSenderId: "758245641576",
  appId: "1:758245641576:web:b035eddece1f23b6fc5add",
  measurementId: "G-BT229N1P1E",
};

const getFirebaseConfig = () => {
  const envCfg = {
    apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
    authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
    measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  if (!envCfg.apiKey) return FIREBASE_DEFAULTS;
  return envCfg;
};

const firebaseConfig = getFirebaseConfig();

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export async function initFirebase(): Promise<{ app: FirebaseApp; messaging: Messaging } | null> {
  if (app && messaging) return { app, messaging };

  const supported = await isSupported();
  if (!supported) return null;

  if (!firebaseConfig.apiKey) return null;

  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  messaging = getMessaging(app);

  return { app, messaging };
}

export async function getFCMToken(): Promise<string | null> {
  const init = await initFirebase();
  if (!init) return null;

  const { messaging } = init;
  const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;

  try {
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (!messaging) return null;
  return onMessage(messaging, callback);
}

export { messaging };