import { apiPost } from "./apiClient";
import { getFCMToken, onForegroundMessage, initFirebase } from "./firebase";

let messageListener: (() => void) | null = null;

export async function registerPushNotifications(_userId: string): Promise<boolean> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.warn("Notification permission not granted:", permission);
      return false;
    }

    const token = await getFCMToken();
    if (!token) {
      console.warn("No FCM token available");
      return false;
    }

    await apiPost("/api/push/register", { token });
    console.log("Push token registered with backend (gerant)");
    return true;
  } catch (error) {
    console.error("Failed to register push token:", error);
    return false;
  }
}

export async function unregisterPushNotifications(_userId: string): Promise<boolean> {
  try {
    const token = await getFCMToken();
    if (!token) return true;

    await apiPost("/api/push/unregister", { token });
    console.log("Push token unregistered from backend (gerant)");
    return true;
  } catch (error) {
    console.error("Failed to unregister push token:", error);
    return false;
  }
}

export function setupForegroundHandler(onMessage: (payload: any) => void) {
  if (messageListener) {
    messageListener();
  }
  initFirebase().then((fb) => {
    if (fb?.messaging) {
      const unsub = onForegroundMessage(onMessage);
      if (unsub) messageListener = unsub;
    }
  });
}

export function clearForegroundHandler() {
  if (messageListener) {
    messageListener();
    messageListener = null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.requestPermission();
}