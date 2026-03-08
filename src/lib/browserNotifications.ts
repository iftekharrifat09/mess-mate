const BROWSER_NOTIF_KEY = (userId: string) => `mess_manager_pref_browser_notifications_${userId}`;

export type BrowserNotificationAvailability = 'supported' | 'unsupported' | 'insecure';

export function getBrowserNotificationAvailability(): BrowserNotificationAvailability {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  return 'supported';
}

export function getBrowserNotificationsEnabled(userId?: string | null): boolean {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(BROWSER_NOTIF_KEY(userId));
    if (raw === null) return false; // default: disabled (requires opt-in)
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export function setBrowserNotificationsEnabled(userId: string, enabled: boolean): void {
  try {
    localStorage.setItem(BROWSER_NOTIF_KEY(userId), enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

async function requestPermissionCompat(): Promise<NotificationPermission> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (permission: NotificationPermission) => {
      if (!settled) {
        settled = true;
        resolve(permission);
      }
    };

    try {
      const requestPermission = Notification.requestPermission as unknown as (
        callback?: (permission: NotificationPermission) => void
      ) => Promise<NotificationPermission> | void;

      const maybePromise = requestPermission((permission) => finish(permission));

      if (maybePromise && typeof (maybePromise as Promise<NotificationPermission>).then === 'function') {
        (maybePromise as Promise<NotificationPermission>).then(finish).catch(reject);
        return;
      }

      setTimeout(() => finish(Notification.permission), 300);
    } catch (error) {
      reject(error);
    }
  });
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (getBrowserNotificationAvailability() !== 'supported') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const result = await requestPermissionCompat();
    return result === 'granted';
  } catch {
    return Notification.permission === 'granted';
  }
}
