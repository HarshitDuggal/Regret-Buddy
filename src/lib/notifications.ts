/**
 * Notification utilities — enhanced with Service Worker push,
 * vibration, badges, and escalation.
 */

// ── Service Worker Registration ──

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    swRegistration = reg;
    console.log("[RegretBuddy] Service Worker registered");
    return reg;
  } catch (err) {
    console.warn("[RegretBuddy] Service Worker registration failed:", err);
    return null;
  }
}

export function getSwRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}

// ── Permission ──

export async function requestPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (e) {
    console.warn("[RegretBuddy] Notification permission request error:", e);
    return false;
  }
}

// ── Basic Notification (fallback) ──

export function sendNotification(
  title: string,
  body: string,
  options?: { urgent?: boolean; badge?: number }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notif = new Notification(title, {
    body,
    icon: "/devil.png",
    badge: "/devil.png",
    tag: `regret-${Date.now()}`, // Unique tag to allow multiple
    requireInteraction: options?.urgent ?? false,
  });

  // Auto-close after 8 seconds for non-urgent
  if (!options?.urgent) {
    setTimeout(() => notif.close(), 8000);
  }

  // Vibrate on mobile if available
  triggerVibration(options?.urgent ? "heavy" : "light");

  // Update badge count if supported
  if (options?.badge && "setAppBadge" in navigator) {
    (navigator as unknown as { setAppBadge: (count: number) => void }).setAppBadge(
      options.badge
    );
  }
}

// ── Rich Notification via Service Worker (Feature 3.2) ──

export interface RichNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  actions?: Array<{ action: string; title: string }>;
  vibrate?: number[];
  requireInteraction?: boolean;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a rich notification via the Service Worker.
 * Falls back to basic Notification API if SW is unavailable.
 */
export function sendRichNotification(payload: RichNotificationPayload) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;

  const sw = navigator.serviceWorker?.controller;

  if (sw) {
    // Post to Service Worker for rich notification with action buttons
    sw.postMessage({
      type: "SHOW_NOTIFICATION",
      payload,
    });
  } else {
    // Fallback: basic notification without action buttons
    sendNotification(payload.title, payload.body, {
      urgent: payload.requireInteraction,
    });
  }

  triggerVibration(payload.requireInteraction ? "heavy" : "medium");
}

/**
 * Build the procrastination notification payload for overdue tasks.
 * This is the "⚠ YOU ARE PROCRASTINATING" notification from the PRD.
 */
export function buildProcrastinationPayload(
  overdueCount: number,
  firstRegretMessage: string
): RichNotificationPayload {
  return {
    title: "⚠ YOU ARE PROCRASTINATING",
    body: `${overdueCount} task${overdueCount > 1 ? "s" : ""} overdue.\n\nYour regret message:\n"${firstRegretMessage || "You committed to this. Don't let yourself down."}"`,
    icon: "/devil.png",
    badge: "/devil.png",
    actions: [
      { action: "fix-it", title: "Fix It" },
      { action: "skip-coward", title: "Skip Like a Coward" },
    ],
    vibrate: [100, 50, 100, 50, 100],
    requireInteraction: true,
    tag: "procrastination-nag",
    data: { url: "/?action=overdue" },
  };
}

/** Clear app badge */
export function clearBadge() {
  if (
    typeof navigator !== "undefined" &&
    "clearAppBadge" in navigator
  ) {
    (navigator as unknown as { clearAppBadge: () => void }).clearAppBadge();
  }
}

/** Trigger device vibration (mobile only) */
export function triggerVibration(
  intensity: "light" | "medium" | "heavy" = "light"
) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  const patterns: Record<string, number[]> = {
    light: [50],
    medium: [50, 30, 50],
    heavy: [100, 50, 100, 50, 100],
  };

  navigator.vibrate(patterns[intensity]);
}