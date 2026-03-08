// Built-in notification tone definitions using Web Audio API synthesis
export interface ToneDefinition {
  id: string;
  name: string;
  icon: string; // emoji
  play: (ctx: AudioContext) => void;
}

// Chime - ascending major chord (C5, E5, G5)
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const frequencies = [523.25, 659.25, 783.99];
  const durations = [0.12, 0.12, 0.25];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    const t = now + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + durations[i] + 0.3);
    osc.start(t);
    osc.stop(t + durations[i] + 0.35);
  });
}

// Bell - single resonant tone
function playBell(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.5);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  osc.start(now);
  osc.stop(now + 0.85);
}

// Ding - short bright ping
function playDing(ctx: AudioContext) {
  const now = ctx.currentTime;
  [1318.5, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    const t = now + i * 0.08;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// Pop - bubbly pop sound
function playPop(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc.start(now);
  osc.stop(now + 0.2);
}

// Soft - gentle descending two-tone
function playSoft(ctx: AudioContext) {
  const now = ctx.currentTime;
  [698.46, 523.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    const t = now + i * 0.15;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

// Alert - urgent double beep
function playAlert(ctx: AudioContext) {
  const now = ctx.currentTime;
  [0, 0.18].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now + delay);
    const t = now + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.08);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

export const BUILT_IN_TONES: ToneDefinition[] = [
  { id: 'chime', name: 'Chime', icon: '🎵', play: playChime },
  { id: 'bell', name: 'Bell', icon: '🔔', play: playBell },
  { id: 'ding', name: 'Ding', icon: '✨', play: playDing },
  { id: 'pop', name: 'Pop', icon: '💬', play: playPop },
  { id: 'soft', name: 'Soft', icon: '🌙', play: playSoft },
  { id: 'alert', name: 'Alert', icon: '🚨', play: playAlert },
];

// Preference storage
const TONE_KEY = (userId: string) => `mess_manager_pref_notification_tone_${userId}`;
const CUSTOM_TONE_KEY = (userId: string) => `mess_manager_pref_custom_tone_${userId}`;

export function getSelectedToneId(userId?: string | null): string {
  if (!userId) return 'chime';
  try {
    return localStorage.getItem(TONE_KEY(userId)) || 'chime';
  } catch {
    return 'chime';
  }
}

export function setSelectedToneId(userId: string, toneId: string): void {
  try {
    localStorage.setItem(TONE_KEY(userId), toneId);
  } catch {
    // ignore
  }
}

export function getCustomToneData(userId?: string | null): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(CUSTOM_TONE_KEY(userId));
  } catch {
    return null;
  }
}

export function setCustomToneData(userId: string, dataUrl: string): void {
  try {
    localStorage.setItem(CUSTOM_TONE_KEY(userId), dataUrl);
  } catch {
    // ignore - might exceed storage quota
  }
}

export function removeCustomTone(userId: string): void {
  try {
    localStorage.removeItem(CUSTOM_TONE_KEY(userId));
    // If custom was selected, fall back to chime
    if (getSelectedToneId(userId) === 'custom') {
      setSelectedToneId(userId, 'chime');
    }
  } catch {
    // ignore
  }
}
