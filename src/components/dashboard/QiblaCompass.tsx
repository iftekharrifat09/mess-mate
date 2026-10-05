import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Ported from the Calendar3 project's Qibla Compass.
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;
const SMOOTHING = 0.15;
const DEFAULT = { lat: 23.8103, lon: 90.4125, name: 'Dhaka, Bangladesh (default)' };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function qiblaBearing(lat: number, lon: number) {
  const kLat = toRad(KAABA_LAT);
  const kLon = toRad(KAABA_LON);
  const pLat = toRad(lat);
  const pLon = toRad(lon);
  const y = Math.sin(kLon - pLon);
  const x = Math.cos(pLat) * Math.tan(kLat) - Math.sin(pLat) * Math.cos(kLon - pLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Shortest-path angular interpolation
function lerpAngle(from: number, to: number, t: number) {
  const diff = ((to - from + 540) % 360) - 180;
  return (from + diff * t + 360) % 360;
}

function QiblaCompassBody() {
  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [placeName, setPlaceName] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const smoothed = useRef(0);
  const raf = useRef(0);
  const target = useRef(0);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      smoothed.current = lerpAngle(smoothed.current, target.current, SMOOTHING);
      setHeading(smoothed.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(raf.current); };
  }, []);

  useEffect(() => {
    const useDefault = () => {
      setBearing(qiblaBearing(DEFAULT.lat, DEFAULT.lon));
      setDistance(distanceKm(DEFAULT.lat, DEFAULT.lon, KAABA_LAT, KAABA_LON));
      setPlaceName(DEFAULT.name);
    };
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      useDefault();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setBearing(qiblaBearing(latitude, longitude));
        setDistance(distanceKm(latitude, longitude, KAABA_LAT, KAABA_LON));
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`)
          .then(r => r.json())
          .then(d => {
            const a = d.address || {};
            const city = a.city || a.town || a.village || a.county || '';
            setPlaceName([city, a.country || ''].filter(Boolean).join(', '));
          })
          .catch(() => setPlaceName(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`));
      },
      useDefault,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const startListening = useCallback(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const wk = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (wk != null) {
        setLive(true);
        target.current = wk;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        setLive(true);
        target.current = 360 - e.alpha;
      }
    };
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute' as keyof WindowEventMap, handler as EventListener, true);
    }
    window.addEventListener('deviceorientation', handler, true);
    return () => {
      window.removeEventListener('deviceorientation', handler, true);
      window.removeEventListener('deviceorientationabsolute' as keyof WindowEventMap, handler as EventListener, true);
    };
  }, []);

  useEffect(() => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      if (typeof DOE.requestPermission === 'function') setNeedsPermission(true);
      else return startListening();
    } catch {
      return startListening();
    }
  }, [startListening]);

  const requestPermission = async () => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> };
    try {
      if ((await DOE.requestPermission()) === 'granted') {
        setNeedsPermission(false);
        startListening();
      } else {
        setError('Compass permission denied');
      }
    } catch {
      setNeedsPermission(false);
      startListening();
    }
  };

  const needle = bearing !== null ? bearing - heading : 0;
  const norm = ((needle % 360) + 360) % 360;
  const facing = norm < 5 || norm > 355;
  const transition = live
    ? { type: 'tween' as const, duration: 0.1, ease: 'linear' as const }
    : { type: 'spring' as const, damping: 40, stiffness: 180 };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {placeName && <p className="text-xs text-muted-foreground text-center">{placeName}</p>}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64" style={{ willChange: 'transform' }}>
        <div className={`absolute inset-0 rounded-full border-[3px] transition-colors duration-500 ${facing ? 'border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)]' : 'border-border'}`} />
        <div className="absolute inset-1.5 rounded-full border border-border/40" />
        <motion.div className="absolute inset-3 rounded-full" style={{ willChange: 'transform' }} animate={{ rotate: -heading }} transition={transition}>
          {Array.from({ length: 36 }).map((_, i) => {
            const major = i % 4 === 0;
            return (
              <div key={i} className="absolute top-0 left-1/2 origin-bottom" style={{ height: '50%', transform: `translateX(-50%) rotate(${i * 10}deg)` }}>
                <div className={`w-px mx-auto ${major ? 'h-3.5 bg-foreground/70' : 'h-1.5 bg-muted-foreground/30'}`} />
              </div>
            );
          })}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[0.65rem] font-bold text-destructive">N</span>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[0.65rem] font-bold text-muted-foreground">S</span>
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold text-muted-foreground">E</span>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold text-muted-foreground">W</span>
        </motion.div>
        <motion.div className="absolute inset-0" style={{ willChange: 'transform' }} animate={{ rotate: needle }} transition={transition}>
          <div className={`absolute left-1/2 -translate-x-1/2 w-[2px] transition-colors duration-500 ${facing ? 'bg-primary' : 'bg-primary/70'}`} style={{ top: '12%', height: '38%' }} />
          <div className={`absolute top-[6%] left-1/2 -translate-x-1/2 transition-transform duration-500 ${facing ? 'scale-125' : 'scale-100'}`}>
            <span className="text-xl drop-shadow-lg">🕋</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 w-[1px] bg-muted-foreground/30" style={{ bottom: '20%', height: '20%' }} />
        </motion.div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-colors duration-500 ${facing ? 'bg-primary border-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.6)]' : 'bg-card border-primary'}`} />
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
      </div>
      <div className="text-center space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <span className={`text-2xl font-bold transition-colors duration-300 ${facing ? 'text-primary' : 'text-foreground'}`}>
            {bearing !== null ? `${bearing.toFixed(1)}°` : '—'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Qibla direction from North</p>
        {distance !== null && <p className="text-xs text-muted-foreground">{distance.toFixed(0)} km to Makkah</p>}
        {facing && live && <p className="text-xs font-medium text-primary animate-fade-in">✓ You are facing the Qibla</p>}
        {needsPermission && (
          <button onClick={requestPermission} className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors active:scale-95">
            Enable Compass
          </button>
        )}
        {!live && !needsPermission && (
          <p className="text-[0.65rem] text-muted-foreground/60 mt-1">On mobile, rotate your device to use live compass</p>
        )}
      </div>
    </div>
  );
}

export default function QiblaCompass() {
  return (
    <>
      <div className="relative px-6 pt-6 pb-2">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <DialogHeader className="relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.5, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }} className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <span className="text-2xl">🕋</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
            <DialogTitle className="text-center text-foreground text-lg">Qibla Compass</DialogTitle>
            <p className="text-center text-[0.65rem] text-muted-foreground mt-1 tracking-widest uppercase">Find the direction of prayer</p>
          </motion.div>
        </DialogHeader>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }} className="px-4 pb-5">
        <QiblaCompassBody />
      </motion.div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }} className="h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </>
  );
}
