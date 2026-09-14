import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[RegretBuddy] Firebase Messaging is not supported in this browser");
      return null;
    }
    const app = getFirebaseApp();
    return getMessaging(app);
  } catch (err) {
    console.warn("[RegretBuddy] Failed to initialize Firebase Messaging:", err);
    return null;
  }
}

/**
 * Request FCM Token from Firebase Cloud Messaging.
 * Requires browser notification permission and a VAPID key.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[RegretBuddy] Notification permission denied");
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
      vapidKey: vapidKey || undefined,
    });

    if (token) {
      console.log("[RegretBuddy] FCM Token retrieved successfully:", token);
      return token;
    } else {
      console.warn("[RegretBuddy] No FCM registration token available");
      return null;
    }
  } catch (err) {
    console.error("[RegretBuddy] Error retrieving FCM token:", err);
    return null;
  }
}

/**
 * Register foreground message listener for active tab notifications
 */
export async function onForegroundMessage(
  callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => { };

  return onMessage(messaging, (payload) => {
    console.log("[RegretBuddy] Foreground FCM message received:", payload);
    callback({
      title: payload.notification?.title || payload.data?.title || "Regret Buddy Alert",
      body: payload.notification?.body || payload.data?.body || "You have pending obligations.",
      data: payload.data as Record<string, string> | undefined,
    });
  });
}
