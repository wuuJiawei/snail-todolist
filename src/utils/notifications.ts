import { isTauriRuntime } from "@/utils/runtime";

type WebPermission = "default" | "denied" | "granted";

export async function ensureNotificationPermission(): Promise<WebPermission> {
  // Prefer Tauri notification API when available
  if (isTauriRuntime()) {
    try {
      // Use Tauri v2 notification plugin
      const mod = await import("@tauri-apps/plugin-notification");
      const granted = await mod.isPermissionGranted();
      if (granted) return "granted";
      const req = await mod.requestPermission();
      return req ? "granted" : "denied";
    } catch {
      // Fallback to Web Notifications
    }
  }

  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

export async function sendNotification(options: {
  title: string;
  body?: string;
  tag?: string;
  icon?: string;
}): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const mod = await import("@tauri-apps/plugin-notification");
      await mod.sendNotification({ title: options.title, body: options.body });
      return;
    } catch {
      // Fallback to Web Notifications
    }
  }

  if ("Notification" in window && Notification.permission === "granted") {
    // Best-effort browser notification
    new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon || "/favicon.ico",
    });
  }
}


