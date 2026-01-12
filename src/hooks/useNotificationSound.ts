import { useCallback, useRef } from 'react';

// Simple notification sound using Web Audio API
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume context if suspended (required for some browsers)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const currentTime = ctx.currentTime;

      // Create oscillator for the main tone
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant notification sound - two-tone chime
      oscillator.frequency.setValueAtTime(880, currentTime); // A5
      oscillator.frequency.setValueAtTime(1318.5, currentTime + 0.1); // E6

      oscillator.type = 'sine';

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.12);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.4);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + 0.4);

      // Second chime for pleasant effect
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);

      oscillator2.frequency.setValueAtTime(1318.5, currentTime + 0.15); // E6
      oscillator2.type = 'sine';

      gainNode2.gain.setValueAtTime(0, currentTime + 0.15);
      gainNode2.gain.linearRampToValueAtTime(0.2, currentTime + 0.17);
      gainNode2.gain.linearRampToValueAtTime(0, currentTime + 0.5);

      oscillator2.start(currentTime + 0.15);
      oscillator2.stop(currentTime + 0.5);

    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
}
