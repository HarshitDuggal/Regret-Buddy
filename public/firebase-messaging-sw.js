/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notification payloads for Regret Buddy
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw] Received background message: ", payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || "⚠️ YOU ARE PROCRASTINATING";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "You have overdue obligations. Don't let future self down.",
      icon: payload.notification?.icon || "/devil.png",
      badge: "/devil.png",
      vibrate: [100, 50, 100, 50, 100],
      requireInteraction: true,
      tag: payload.data?.tag || "fcm-regret-nag",
      actions: [
        { action: "fix-it", title: "Fix It" },
        { action: "skip-coward", title: "Skip Like a Coward" },
      ],
      data: payload.data || { url: "/?action=overdue" },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn("[firebase-messaging-sw] SW Firebase initialization fallback: ", e);
}
