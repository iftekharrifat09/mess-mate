import { useCallback, useRef } from 'react';
import { BUILT_IN_TONES, getSelectedToneId, getCustomToneData } from '@/lib/notificationTones';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const primeNotificationSound = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const ctx = audioContextRef.current;
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return true;
    } catch (error) {
      console.warn('Could not prime notification sound:', error);
      return false;
    }
  }, []);

  const playNotificationSound = useCallback((userId?: string | null) => {
    void (async () => {
      const toneId = getSelectedToneId(userId);

      // Custom uploaded tone
      if (toneId === 'custom') {
        const dataUrl = getCustomToneData(userId);
        if (dataUrl) {
          try {
            const audio = new Audio(dataUrl);
            audio.volume = 0.5;
            await audio.play();
          } catch (e) {
            console.warn('Could not play custom tone:', e);
          }
        }
        return;
      }

      // Built-in tone
      const ready = await primeNotificationSound();
      if (!ready || !audioContextRef.current) return;

      try {
        const tone = BUILT_IN_TONES.find(t => t.id === toneId);
        if (tone) {
          tone.play(audioContextRef.current);
        } else {
          // Fallback to chime
          BUILT_IN_TONES[0].play(audioContextRef.current);
        }
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    })();
  }, [primeNotificationSound]);

  // Preview a specific tone by id
  const previewTone = useCallback((toneId: string, userId?: string | null) => {
    void (async () => {
      if (toneId === 'custom') {
        const dataUrl = getCustomToneData(userId);
        if (dataUrl) {
          try {
            const audio = new Audio(dataUrl);
            audio.volume = 0.5;
            await audio.play();
          } catch (e) {
            console.warn('Could not preview custom tone:', e);
          }
        }
        return;
      }

      const ready = await primeNotificationSound();
      if (!ready || !audioContextRef.current) return;
      const tone = BUILT_IN_TONES.find(t => t.id === toneId);
      if (tone) tone.play(audioContextRef.current);
    })();
  }, [primeNotificationSound]);

  return { playNotificationSound, primeNotificationSound, previewTone };
}
