importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && event.data.config) {
    const config = event.data.config;
    if (config.apiKey && !messaging) {
      try {
        firebase.initializeApp(config);
        messaging = firebase.messaging();
        messaging.onBackgroundMessage((payload) => {
          console.log('Background push received:', payload);
          const title = payload.notification?.title || 'SaTouba';
          const options = {
            body: payload.notification?.body || 'Nouvelle notification',
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            image: payload.notification?.image,
            data: payload.data,
            actions: [{ action: 'view', title: 'Voir' }, { action: 'dismiss', title: 'Fermer' }],
            requireInteraction: true,
          };
          self.registration.showNotification(title, options);
        });
        console.log('Firebase initialized in SW via postMessage');
      } catch (e) {
        console.error('Firebase init error in SW:', e);
      }
    }
  }
});

try {
  const fallbackConfig = self.FIREBASE_CONFIG;
  if (fallbackConfig && fallbackConfig.apiKey && !messaging) {
    firebase.initializeApp(fallbackConfig);
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log('Background push received:', payload);
      const title = payload.notification?.title || 'SaTouba';
      const options = {
        body: payload.notification?.body || 'Nouvelle notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        image: payload.notification?.image,
        data: payload.data,
        actions: [{ action: 'view', title: 'Voir' }, { action: 'dismiss', title: 'Fermer' }],
        requireInteraction: true,
      };
      self.registration.showNotification(title, options);
    });
  }
} catch (e) {}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.clickAction || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
    );
  }
});
