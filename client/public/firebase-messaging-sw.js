importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

let firebaseConfig = {};

try {
  firebaseConfig = self.FIREBASE_CONFIG || {};
} catch (e) {
  console.warn('Firebase config not available in SW');
}

if (Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('Background push received:', payload);

    const notificationTitle = payload.notification?.title || 'SaTouba';
    const notificationOptions = {
      body: payload.notification?.body || 'Nouvelle notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      image: payload.notification?.image,
      data: payload.data,
      actions: [
        { action: 'view', title: 'Voir' },
        { action: 'dismiss', title: 'Fermer' },
      ],
      requireInteraction: true,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

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
} else {
  console.warn('Firebase config missing, background messaging disabled');
}