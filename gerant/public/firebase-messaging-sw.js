importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

let messaging = null;

function initFirebase(config) {
  if (messaging) return;
  if (!config || !config.apiKey) return;
  try {
    firebase.initializeApp(config);
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log("Background push received:", payload);
      const title = payload.data?.title || payload.notification?.title || "SaTouba";
      const options = {
        body: payload.data?.body || payload.notification?.body || "Nouvelle notification",
        icon: "/logo.jpg",
        badge: "/logo.jpg",
        image: payload.data?.imageUrl || payload.notification?.image,
        data: payload.data,
        actions: [{ action: "view", title: "Voir" }, { action: "dismiss", title: "Fermer" }],
        requireInteraction: true,
      };
      self.registration.showNotification(title, options);
    });
    console.log("Firebase initialized in SW");
  } catch (e) {
    console.error("Firebase init error in SW:", e);
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    initFirebase(event.data.config);
  }
});

self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
  if (!messaging && clients.length > 0) {
    clients[0].postMessage({ type: "REQUEST_FIREBASE_CONFIG" });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.clickAction || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});