const BROWSER_NOTIF_KEY = (userId: string) => `mess_manager_pref_browser_notifications_${userId}`;

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

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
