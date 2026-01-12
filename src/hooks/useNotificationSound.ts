import { useCallback, useRef } from 'react';

// Simple notification sound using Web Audio API
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

      // Some browsers require a user gesture before resume() will succeed.
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      return true;
    } catch (error) {
      console.warn('Could not prime notification sound:', error);
      return false;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    void (async () => {
      const ready = await primeNotificationSound();
      if (!ready || !audioContextRef.current) return;

      try {
        const ctx = audioContextRef.current;
        const now = ctx.currentTime;

        // Create a pleasant three-tone ascending chime (C5, E5, G5 - major chord)
        const frequencies = [523.25, 659.25, 783.99];
        const durations = [0.12, 0.12, 0.25];

        frequencies.forEach((freq, i) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'triangle'; // Softer, more bell-like tone
          oscillator.frequency.setValueAtTime(freq, now);

          const startTime = now + i * 0.1;
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + durations[i] + 0.3);

          oscillator.start(startTime);
          oscillator.stop(startTime + durations[i] + 0.35);
        });
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    })();
  }, [primeNotificationSound]);

  return { playNotificationSound, primeNotificationSound };
}

