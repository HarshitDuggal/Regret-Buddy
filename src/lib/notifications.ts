/**
 * Notification utilities — enhanced with vibration, badges, and escalation.
 */

export async function requestPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

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