/**
 * Service Worker for Regret Buddy PWA
 * Handles rich notification display with action buttons
 * and notification click routing.
 */
try {
  importScripts("/firebase-messaging-sw.js");
} catch (e) {
  console.warn("[sw.js] Could not import firebase-messaging-sw.js:", e);
}

// eslint-disable-next-line no-restricted-globals
const sw = self;

// Listen for messages from the main thread to show notifications
sw.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_NOTIFICATION") return;

  const { title, body, icon, badge, actions, vibrate, requireInteraction, tag, data: notifData } = data.payload;

  sw.registration.showNotification(title, {
    body,
    icon: icon || "/devil.png",
    badge: badge || "/devil.png",
    actions: actions || [],
    vibrate: vibrate || [100, 50, 100, 50, 100],
    requireInteraction: requireInteraction ?? true,
    tag: tag || "regret-" + Date.now(),
    data: notifData || {},
  });
});

// Handle notification action clicks
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  let url = "/";

  if (action === "fix-it") {
    url = "/?action=overdue";
  } else if (action === "skip-coward") {
    url = "/?action=skip-all-overdue";
  } else if (notifData.url) {
    url = notifData.url;
  }

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(sw.registration.scope) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open a new window
      return sw.clients.openWindow(url);
    })
  );
});

// Basic install/activate for caching (minimal — next-pwa handles the rest)
sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});
