const keyFor = (userId: string) => `mess_manager_pref_notification_sound_${userId}`;

export const NOTIFICATION_SOUND_PREF_EVENT = 'mess_manager:notification_sound_pref_changed';

export function getNotificationSoundEnabled(userId?: string | null): boolean {
  if (!userId) return true;

  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw === null) return true; // default: enabled
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(userId: string, enabled: boolean): void {
  try {
    localStorage.setItem(keyFor(userId), enabled ? '1' : '0');
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_SOUND_PREF_EVENT, {
        detail: { userId, enabled },
      })
    );
  } catch {
    // ignore
  }
}
