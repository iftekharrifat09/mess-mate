import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  toBanglaDate,
  toBanglaDigits,
  toHijriDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  ENGLISH_MONTHS,
  DAY_NAMES,
} from '@/lib/dateConversions';

// ─── Types ───
interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface LocationInfo {
  name: string;
  lat: number;
  lon: number;
  status: 'detecting' | 'resolved' | 'fallback' | 'error';
}

interface RamadanTimes {
  fajr: string;
  maghrib: string;
  date: Date;
  loading: boolean;
}

// ─── Helpers ───
const PRAYER_KEYS: (keyof PrayerTimes)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = ['🌙', '☀️', '🌤️', '🌅', '🌃'];

function to12h(t: string): string {
  const [h24, m] = t.split(':').map(Number);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isRamadan(date: Date): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(date);
    const m = parts.find((p) => p.type === 'month');
    return m ? parseInt(m.value) === 9 : false;
  } catch { return false; }
}

function getHijriDayNum(date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric' }).formatToParts(date);
    const d = parts.find((p) => p.type === 'day');
    return d ? parseInt(d.value) : null;
  } catch { return null; }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getActivePrayer(timings: PrayerTimes): number {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const mins = PRAYER_KEYS.map((k) => {
    const [h, m] = timings[k].split(':').map(Number);
    return h * 60 + m;
  });
  let active = -1;
  for (let i = mins.length - 1; i >= 0; i--) {
    if (nowMins >= mins[i]) { active = i; break; }
  }
  return active === -1 ? mins.length - 1 : active;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateLabel(date: Date, today: Date): string {
  if (isSameDay(date, today)) return 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Stagger variants
const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.012, delayChildren: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const cellVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

// ─── Component ───
export default function CalendarModal() {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [location, setLocation] = useState<LocationInfo>({
    name: 'Detecting…', lat: 23.8103, lon: 90.4125, status: 'detecting',
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [ramadanToday, setRamadanToday] = useState(false);
  const [ramadanTimes, setRamadanTimes] = useState<RamadanTimes | null>(null);
  const [countdown, setCountdown] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationDetectedRef = useRef(false);
  const locationRef = useRef(location);
  locationRef.current = location;

  const todayBangla = useMemo(() => toBanglaDate(today), []);
  const todayHijri = useMemo(() => toHijriDate(today), []);

  const fetchPrayerTimes = useCallback(async (lat: number, lon: number) => {
    setPrayerLoading(true);
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=1`);
      const data = await res.json();
      const t = data.data.timings as PrayerTimes;
      setPrayerTimes(t);
      const isRam = isRamadan(today);
      setRamadanToday(isRam);
      if (isRam) setRamadanTimes({ fajr: t.Fajr, maghrib: t.Maghrib, date: today, loading: false });
    } catch { setPrayerTimes(null); }
    finally { setPrayerLoading(false); }
  }, []);

  const fetchRamadanForDate = useCallback(async (date: Date) => {
    if (!isRamadan(date)) { setRamadanTimes(null); return; }
    const { lat, lon } = locationRef.current;
    setRamadanTimes({ fajr: '', maghrib: '', date, loading: true });
    const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}&method=1`);
      const data = await res.json();
      const t = data.data.timings;
      setRamadanTimes({ fajr: t.Fajr, maghrib: t.Maghrib, date, loading: false });
    } catch { setRamadanTimes(null); }
  }, []);

  const onDayClick = useCallback((day: number) => {
    const clicked = new Date(viewYear, viewMonth, day);
    setSelectedDate(clicked);
    if (isRamadan(clicked)) {
      if (isSameDay(clicked, today) && prayerTimes)
        setRamadanTimes({ fajr: prayerTimes.Fajr, maghrib: prayerTimes.Maghrib, date: clicked, loading: false });
      else fetchRamadanForDate(clicked);
    } else setRamadanTimes(null);
  }, [viewYear, viewMonth, prayerTimes, fetchRamadanForDate]);

  const detectLocation = useCallback(() => {
    if (locationDetectedRef.current) return;
    locationDetectedRef.current = true;
    if (!navigator.geolocation) {
      setLocation({ name: 'Dhaka, Bangladesh', lat: 23.8103, lon: 90.4125, status: 'fallback' });
      fetchPrayerTimes(23.8103, 90.4125);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`);
          const d = await res.json();
          const addr = d.address || {};
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || 'Your location';
          setLocation({ name: `${city}, ${addr.country || ''}`, lat: latitude, lon: longitude, status: 'resolved' });
        } catch {
          setLocation({ name: `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`, lat: latitude, lon: longitude, status: 'resolved' });
        }
        fetchPrayerTimes(latitude, longitude);
      },
      () => { setLocation({ name: 'Dhaka, Bangladesh', lat: 23.8103, lon: 90.4125, status: 'fallback' }); fetchPrayerTimes(23.8103, 90.4125); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchPrayerTimes]);

  useEffect(() => { if (open) detectLocation(); }, [open, detectLocation]);

  // Countdown
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!ramadanToday || !prayerTimes || !ramadanTimes || !isSameDay(ramadanTimes.date, today)) { setCountdown(''); return; }
    const tick = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const [fh, fm] = prayerTimes.Fajr.split(':').map(Number);
      const [mh, mm] = prayerTimes.Maghrib.split(':').map(Number);
      let label = '', targetTime = '';
      if (nowMins < fh * 60 + fm) { label = 'Sehri ends in'; targetTime = prayerTimes.Fajr; }
      else if (nowMins < mh * 60 + mm) { label = 'Iftar in'; targetTime = prayerTimes.Maghrib; }
      else { setCountdown('Ramadan Mubarak — Iftar time has passed'); return; }
      const [th, tm] = targetTime.split(':').map(Number);
      const target = new Date(); target.setHours(th, tm, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setCountdown(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${label}: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [ramadanToday, prayerTimes, ramadanTimes]);

  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days: Array<{
      day: number; banglaDay: string; banglaMonth: string; hijriText: string;
      isToday: boolean; isFriday: boolean; isSelected: boolean; isRamadan: boolean;
    }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const bangla = toBanglaDate(date);
      const hijri = toHijriDate(date);
      const isT = isSameDay(date, today);
      days.push({
        day: d,
        banglaDay: toBanglaDigits(bangla.day),
        banglaMonth: bangla.month,
        hijriText: `${hijri.month} ${hijri.day}`,
        isToday: isT,
        isFriday: date.getDay() === 5,
        isSelected: isSameDay(date, selectedDate) && !isT,
        isRamadan: isRamadan(date),
      });
    }
    const fd = new Date(viewYear, viewMonth, 1);
    const ld = new Date(viewYear, viewMonth, daysInMonth);
    const bf = toBanglaDate(fd), bl = toBanglaDate(ld);
    const hf = toHijriDate(fd), hl = toHijriDate(ld);
    const banglaRange = bf.month === bl.month
      ? `${toBanglaDigits(bf.day)}-${toBanglaDigits(bl.day)} ${bf.month} ${toBanglaDigits(bf.year)} বঙ্গাব্দ`
      : `${toBanglaDigits(bf.day)} ${bf.month} - ${toBanglaDigits(bl.day)} ${bl.month} ${toBanglaDigits(bl.year)} বঙ্গাব্দ`;
    const hijriRange = hf.month === hl.month
      ? `${hf.month} ${hf.day}-${hl.day}, ${hf.year} AH`
      : `${hf.month} ${hf.day} - ${hl.month} ${hl.day}, ${hl.year} AH`;
    return { days, firstDay, banglaRange, hijriRange };
  }, [viewYear, viewMonth, selectedDate]);

  const goToPrev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(p => p - 1); } else setViewMonth(p => p - 1); };
  const goToNext = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(p => p + 1); } else setViewMonth(p => p + 1); };
  const goToToday = () => {
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(today);
    if (ramadanToday && prayerTimes) setRamadanTimes({ fajr: prayerTimes.Fajr, maghrib: prayerTimes.Maghrib, date: today, loading: false });
  };

  const activePrayer = prayerTimes ? getActivePrayer(prayerTimes) : -1;
  const ramadanHijriDay = ramadanTimes ? getHijriDayNum(ramadanTimes.date) : null;
  const isSelectedToday = ramadanTimes ? isSameDay(ramadanTimes.date, today) : false;
  const isSelectedPast = ramadanTimes ? ramadanTimes.date < today && !isSelectedToday : false;
  const isSelectedFuture = ramadanTimes ? ramadanTimes.date > today : false;
  const sehriLabel = isSelectedPast ? 'Sehri was' : isSelectedFuture ? 'Sehri will be' : 'Sehri ends';
  const iftarLabel = isSelectedPast ? 'Iftar was' : isSelectedFuture ? 'Iftar will be' : 'Iftar time';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div
          className="relative"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary via-gold to-primary opacity-30 blur-sm"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Sparkle dots */}
          <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-primary"
            animate={{
              scale: [1, 0.7, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
          <Button
            variant="outline"
            size="icon"
            className="relative h-9 w-9 border-primary/50 bg-card hover:bg-primary/10 hover:border-primary shadow-lg shadow-primary/20"
            title="Calendar"
            aria-label="Open 3-in-1 calendar"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CalendarDays className="h-4 w-4 text-primary" />
            </motion.div>
          </Button>
        </motion.div>
      </DialogTrigger>

      <DialogContent hideCloseButton className="w-[calc(100vw-0.5rem)] max-w-[760px] max-h-[94vh] overflow-y-auto p-0 gap-0 bg-card border-border shadow-2xl shadow-primary/5">

        {/* ═══ Header ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative px-3 py-4 sm:px-6 sm:py-6 border-b border-border bg-gradient-to-br from-secondary/80 via-card to-secondary/40 overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[120px] bg-primary/[0.04] rounded-full blur-[60px] pointer-events-none" />

          <DialogHeader className="space-y-2 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shrink-0" onClick={goToPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </motion.div>

              <div className="text-center flex-1 min-w-0 px-1">
                <DialogTitle className="text-lg sm:text-3xl font-bold text-foreground tracking-tight">
                  {ENGLISH_MONTHS[viewMonth]} {viewYear}
                </DialogTitle>
                <motion.p
                  key={`bn-${viewMonth}-${viewYear}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[0.6rem] sm:text-sm font-semibold text-success mt-1 tracking-wide leading-tight truncate"
                >
                  {calendarData.banglaRange}
                </motion.p>
                <motion.p
                  key={`hi-${viewMonth}-${viewYear}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[0.55rem] sm:text-xs font-semibold text-warning tracking-wide leading-tight truncate"
                >
                  {calendarData.hijriRange}
                </motion.p>
              </div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shrink-0" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </DialogHeader>

          {/* Today strip */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-3 rounded-xl border border-border bg-background/70 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2.5 flex items-center gap-3"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-bold text-primary">{today.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6rem] sm:text-xs font-bold text-success leading-tight truncate">
                আজ: {toBanglaDigits(todayBangla.day)} {todayBangla.month} {toBanglaDigits(todayBangla.year)} বঙ্গাব্দ
              </p>
              <p className="text-[0.55rem] sm:text-xs font-bold text-warning leading-tight truncate">
                {todayHijri.month} {todayHijri.day}, {todayHijri.year} AH
              </p>
            </div>
          </motion.div>

          {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-2">
              <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground hover:text-foreground" onClick={goToToday}>
                ← Go to today
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* ═══ Day headers ═══ */}
        <div className="grid grid-cols-7 px-2 sm:px-5 pt-3 sm:pt-4">
          {DAY_NAMES.map((name) => (
            <div key={name} className={`text-center text-[0.5rem] sm:text-[0.7rem] font-semibold tracking-[0.15em] uppercase py-1.5 ${name === 'Fri' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {name}
            </div>
          ))}
        </div>

        {/* ═══ Calendar grid ═══ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            variants={gridContainerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-7 gap-[3px] sm:gap-1.5 px-2 sm:px-5 pb-3 sm:pb-4 pt-1"
          >
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[48px] sm:min-h-[76px]" />
            ))}

            {calendarData.days.map((day) => (
              <motion.div
                key={day.day}
                variants={cellVariants}
                onClick={() => onDayClick(day.day)}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  min-h-[48px] sm:min-h-[76px] rounded-lg sm:rounded-xl p-1 sm:p-2
                  flex flex-col cursor-pointer relative overflow-hidden
                  transition-shadow duration-300
                  ${day.isToday
                    ? 'bg-primary/15 border-2 border-primary/50 shadow-[0_0_16px_hsl(var(--primary)/0.25),inset_0_1px_0_hsl(var(--primary)/0.15)]'
                    : day.isSelected
                    ? 'bg-info/10 border border-info/40 shadow-[0_0_10px_hsl(var(--info)/0.15)]'
                    : 'bg-secondary/40 border border-transparent hover:bg-secondary/80 hover:border-border/60 hover:shadow-md'
                  }
                `}
              >
                {/* Today pulsing dot */}
                {day.isToday && (
                  <motion.div
                    className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                {/* Ramadan crescent */}
                {day.isRamadan && (
                  <span className="absolute top-0.5 right-0.5 text-[0.5rem] sm:text-[0.65rem] text-gold drop-shadow-[0_0_2px_hsl(var(--gold)/0.6)]">☽</span>
                )}

                {/* English date */}
                <span className={`font-bold text-[0.7rem] sm:text-xl leading-none ${
                  day.isToday ? 'text-primary' : day.isSelected ? 'text-info' : day.isFriday ? 'text-destructive' : 'text-foreground'
                }`}>
                  {day.day}
                </span>

                {/* Bangla date — bolder */}
                <span className="text-[0.4rem] sm:text-[0.65rem] font-bold text-success leading-tight mt-0.5 truncate">
                  {day.banglaDay} {day.banglaMonth}
                </span>

                {/* Hijri date — bolder */}
                <span className="text-[0.36rem] sm:text-[0.58rem] font-semibold text-warning leading-tight truncate">
                  {day.hijriText}
                </span>

                {/* Today label */}
                {day.isToday && (
                  <span className="hidden sm:block text-[0.45rem] font-bold text-primary/70 uppercase tracking-wider mt-auto">
                    Today
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* ═══ Legend ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center flex-wrap gap-3 sm:gap-5 px-3 pb-3 sm:pb-4 text-[0.55rem] sm:text-xs text-muted-foreground"
        >
          {[
            { color: 'bg-success', label: 'বাংলা' },
            { color: 'bg-warning', label: 'Hijri' },
            { color: 'bg-primary', label: 'Today' },
            { color: 'bg-destructive', label: 'Friday' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${color} inline-block`} />
              {label}
            </span>
          ))}
        </motion.div>

        {/* ═══ Ramadan Banner ═══ */}
        <AnimatePresence mode="wait">
          {ramadanTimes && (
            <motion.div
              key={`ram-${ramadanTimes.date.toDateString()}`}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mx-2 sm:mx-5 mb-3 sm:mb-4 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] to-gold/[0.02] p-3 sm:p-5 relative overflow-hidden"
            >
              {/* Decorative crescent */}
              <div className="absolute -top-4 -right-4 text-[4rem] sm:text-[5rem] text-gold/[0.06] pointer-events-none select-none">☽</div>

              <div className="flex items-center gap-2 mb-3 sm:mb-4 relative z-10">
                <motion.span
                  className="text-xl sm:text-2xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >☽</motion.span>
                <h3 className="text-sm sm:text-lg font-bold text-gold tracking-wide">Ramadan Mubarak</h3>
                <span className="ml-auto text-[0.55rem] sm:text-xs text-gold/50 italic">
                  {ramadanHijriDay ? `${ordinal(ramadanHijriDay)} of Ramadan` : ''}
                  {!isSelectedToday && ` · ${formatDateLabel(ramadanTimes.date, today)}`}
                </span>
              </div>

              {ramadanTimes.loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-gold/50" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 relative z-10">
                    {[
                      { icon: '🌙', label: sehriLabel, time: ramadanTimes.fajr, sub: 'Before Fajr Adhan' },
                      { icon: '🌅', label: iftarLabel, time: ramadanTimes.maghrib, sub: 'At Maghrib Adhan' },
                    ].map((item) => (
                      <motion.div
                        key={item.label}
                        whileHover={{ scale: 1.03 }}
                        className="rounded-xl border border-gold/20 bg-gold/[0.06] backdrop-blur-sm px-3 py-2.5 sm:px-5 sm:py-4 flex items-center gap-2.5 sm:gap-4"
                      >
                        <span className="text-2xl sm:text-3xl shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-[0.5rem] sm:text-[0.7rem] uppercase tracking-[0.15em] text-gold/50 font-medium">{item.label}</div>
                          <div className="text-base sm:text-xl font-bold text-foreground tabular-nums">{to12h(item.time)}</div>
                          <div className="text-[0.45rem] sm:text-[0.65rem] text-muted-foreground">{item.sub}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {isSelectedToday && countdown && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center mt-3 pt-3 border-t border-gold/10 text-[0.65rem] sm:text-sm text-gold/50"
                    >
                      <span className="text-gold font-bold tabular-nums tracking-wider">{countdown}</span>
                    </motion.div>
                  )}

                  {!isSelectedToday && (
                    <div className="text-center mt-3 pt-3 border-t border-gold/10">
                      <Button variant="ghost" size="sm" className="text-[0.6rem] sm:text-xs h-6 text-gold/50 hover:text-gold" onClick={goToToday}>
                        ← Back to today
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Prayer Times + Location ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-3 px-2 sm:px-5 pb-4 sm:pb-5"
        >
          {/* Location */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/40 to-secondary/20 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
              <MapPin className="h-3.5 w-3.5 text-info" />
            </div>
            <div className="min-w-0">
              <div className="text-[0.5rem] sm:text-[0.6rem] text-muted-foreground uppercase tracking-[0.15em] font-medium">Prayer times for</div>
              <div className="text-xs sm:text-sm font-bold text-foreground truncate">{location.name}</div>
              {location.status === 'detecting' && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                  <span className="text-[0.5rem] text-muted-foreground">Locating…</span>
                </div>
              )}
              {location.status === 'resolved' && <span className="text-[0.5rem] text-success font-medium">✓ Live location</span>}
              {location.status === 'fallback' && <span className="text-[0.5rem] text-warning font-medium">Default location</span>}
            </div>
          </div>

          {/* Prayer pills */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/40 to-secondary/20 px-3 py-2.5 sm:px-5 sm:py-4">
            <div className="text-[0.5rem] sm:text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 sm:mb-3">
              Today's Prayer Times
            </div>
            {prayerLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : prayerTimes ? (
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {PRAYER_KEYS.map((key, i) => (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.08, y: -2 }}
                    className={`rounded-lg sm:rounded-xl px-1 py-2 sm:px-2.5 sm:py-3 text-center transition-all duration-300 ${
                      i === activePrayer
                        ? 'bg-primary/15 border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                        : 'bg-background/40 border border-transparent hover:border-border/40'
                    }`}
                  >
                    <div className="text-base sm:text-lg mb-1">{PRAYER_ICONS[i]}</div>
                    <div className={`text-[0.45rem] sm:text-[0.65rem] uppercase tracking-wider font-semibold mb-0.5 ${i === activePrayer ? 'text-primary' : 'text-muted-foreground'}`}>
                      {key}
                    </div>
                    <div className={`text-[0.55rem] sm:text-xs font-bold tabular-nums ${i === activePrayer ? 'text-primary' : 'text-foreground'}`}>
                      {to12h(prayerTimes[key])}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Could not load prayer times</p>
            )}
          </div>

          {/* Close Button */}
          <DialogClose asChild>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center pt-2 pb-1"
            >
              <Button
                variant="outline"
                className="gap-2 px-6 border-border/60 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
                Close Calendar
              </Button>
            </motion.div>
          </DialogClose>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
