importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBzJDDPxsHbwARgfq_IKiMPg7w9_uI2s0s",
  projectId: "tienda-38d40",
  messagingSenderId: "887130100035",
  appId: "1:887130100035:web:fe5f74bf4379ea9ffcdff6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [300, 100, 300, 100, 300], // Más intensidad de vibración
    requireInteraction: true, // Que no se oculte sola tan rápido
    data: { url: payload.data?.link || "/" }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
