import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  } catch {
    return false;
  }
}

function getHijriDayNum(date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric' }).formatToParts(date);
    const d = parts.find((p) => p.type === 'day');
    return d ? parseInt(d.value) : null;
  } catch {
    return null;
  }
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
    if (nowMins >= mins[i]) {
      active = i;
      break;
    }
  }
  return active === -1 ? mins.length - 1 : active;
}

// ─── Component ───
export default function CalendarModal() {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Location & prayer state
  const [location, setLocation] = useState<LocationInfo>({
    name: 'Detecting…',
    lat: 23.8103,
    lon: 90.4125,
    status: 'detecting',
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [ramadanToday, setRamadanToday] = useState(false);
  const [countdown, setCountdown] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationDetectedRef = useRef(false);

  // Bangla / Hijri for today
  const todayBangla = useMemo(() => toBanglaDate(today), []);
  const todayHijri = useMemo(() => toHijriDate(today), []);

  // ─── Location detection ───
  const fetchPrayerTimes = useCallback(async (lat: number, lon: number) => {
    setPrayerLoading(true);
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=1`);
      const data = await res.json();
      const t = data.data.timings as PrayerTimes;
      setPrayerTimes(t);
      setRamadanToday(isRamadan(today));
    } catch {
      setPrayerTimes(null);
    } finally {
      setPrayerLoading(false);
    }
  }, []);

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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          const d = await res.json();
          const addr = d.address || {};
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || 'Your location';
          const country = addr.country || '';
          setLocation({ name: `${city}, ${country}`, lat: latitude, lon: longitude, status: 'resolved' });
        } catch {
          setLocation({ name: `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`, lat: latitude, lon: longitude, status: 'resolved' });
        }
        fetchPrayerTimes(latitude, longitude);
      },
      () => {
        setLocation({ name: 'Dhaka, Bangladesh', lat: 23.8103, lon: 90.4125, status: 'fallback' });
        fetchPrayerTimes(23.8103, 90.4125);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchPrayerTimes]);

  // Detect location when modal opens
  useEffect(() => {
    if (open) detectLocation();
  }, [open, detectLocation]);

  // Ramadan countdown
  useEffect(() => {
    if (!ramadanToday || !prayerTimes) return;
    if (countdownRef.current) clearInterval(countdownRef.current);

    const tick = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const [fh, fm] = prayerTimes.Fajr.split(':').map(Number);
      const [mh, mm] = prayerTimes.Maghrib.split(':').map(Number);
      const fajrMins = fh * 60 + fm;
      const maghribMins = mh * 60 + mm;

      let label = '';
      let targetTime = '';

      if (nowMins < fajrMins) {
        label = 'Sehri ends in';
        targetTime = prayerTimes.Fajr;
      } else if (nowMins < maghribMins) {
        label = 'Iftar in';
        targetTime = prayerTimes.Maghrib;
      } else {
        setCountdown('Ramadan Mubarak — Iftar time has passed');
        return;
      }

      const [th, tm] = targetTime.split(':').map(Number);
      const target = new Date();
      target.setHours(th, tm, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${label}: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [ramadanToday, prayerTimes]);

  // ─── Calendar data ───
  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    const days: Array<{
      day: number;
      banglaDay: string;
      banglaMonth: string;
      hijriText: string;
      isToday: boolean;
      isFriday: boolean;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const bangla = toBanglaDate(date);
      const hijri = toHijriDate(date);
      const dayOfWeek = date.getDay();
      days.push({
        day: d,
        banglaDay: toBanglaDigits(bangla.day),
        banglaMonth: bangla.month,
        hijriText: `${hijri.month} ${hijri.day}`,
        isToday: d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear(),
        isFriday: dayOfWeek === 5,
      });
    }

    const firstDayDate = new Date(viewYear, viewMonth, 1);
    const lastDayDate = new Date(viewYear, viewMonth, daysInMonth);
    const banglaFirst = toBanglaDate(firstDayDate);
    const banglaLast = toBanglaDate(lastDayDate);
    const hijriFirst = toHijriDate(firstDayDate);
    const hijriLast = toHijriDate(lastDayDate);

    const banglaRange =
      banglaFirst.month === banglaLast.month
        ? `${toBanglaDigits(banglaFirst.day)}-${toBanglaDigits(banglaLast.day)} ${banglaFirst.month} ${toBanglaDigits(banglaFirst.year)} বঙ্গাব্দ`
        : `${toBanglaDigits(banglaFirst.day)} ${banglaFirst.month} - ${toBanglaDigits(banglaLast.day)} ${banglaLast.month} ${toBanglaDigits(banglaLast.year)} বঙ্গাব্দ`;

    const hijriRange =
      hijriFirst.month === hijriLast.month
        ? `${hijriFirst.month} ${hijriFirst.day}-${hijriLast.day}, ${hijriFirst.year} AH`
        : `${hijriFirst.month} ${hijriFirst.day} - ${hijriLast.month} ${hijriLast.day}, ${hijriLast.year} AH`;

    return { days, firstDay, banglaRange, hijriRange };
  }, [viewYear, viewMonth]);

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((p) => p - 1); }
    else setViewMonth((p) => p - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((p) => p + 1); }
    else setViewMonth((p) => p + 1);
  };
  const goToToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const activePrayer = prayerTimes ? getActivePrayer(prayerTimes) : -1;
  const hijriDay = getHijriDayNum(today);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 border-border hover:bg-secondary" title="Calendar" aria-label="Open 3-in-1 calendar">
          <CalendarDays className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-[760px] max-h-[94vh] overflow-y-auto p-0 gap-0 bg-card border-border">
        {/* ─── Header ─── */}
        <div className="relative px-2.5 py-3 sm:px-5 sm:py-5 border-b border-border bg-secondary/50">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" onClick={goToPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center flex-1 min-w-0 px-1">
                <DialogTitle className="text-base sm:text-2xl font-bold text-foreground truncate">
                  {ENGLISH_MONTHS[viewMonth]} {viewYear}
                </DialogTitle>
                <p className="text-[0.5rem] sm:text-xs text-success mt-0.5 tracking-wide leading-tight truncate">
                  {calendarData.banglaRange}
                </p>
                <p className="text-[0.5rem] sm:text-xs text-warning tracking-wide leading-tight truncate">
                  {calendarData.hijriRange}
                </p>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Today's date strip */}
          <div className="mt-2 rounded-lg border border-border bg-background/60 px-2 py-1.5 sm:px-3 sm:py-2">
            <p className="text-[0.55rem] sm:text-xs text-success leading-tight truncate">
              আজ: {toBanglaDigits(todayBangla.day)} {todayBangla.month} {toBanglaDigits(todayBangla.year)} বঙ্গাব্দ
            </p>
            <p className="text-[0.55rem] sm:text-xs text-warning leading-tight truncate">
              Hijri: {todayHijri.month} {todayHijri.day}, {todayHijri.year} AH
            </p>
          </div>

          {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
            <div className="text-center mt-1.5">
              <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={goToToday}>
                Go to today
              </Button>
            </div>
          )}
        </div>

        {/* ─── Day headers ─── */}
        <div className="grid grid-cols-7 px-1.5 sm:px-4 pt-2 sm:pt-3">
          {DAY_NAMES.map((name) => (
            <div key={name} className={`text-center text-[0.5rem] sm:text-xs font-medium tracking-wider uppercase py-1 ${name === 'Fri' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {name}
            </div>
          ))}
        </div>

        {/* ─── Calendar grid ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-7 gap-[2px] sm:gap-1 px-1.5 sm:px-4 pb-2 sm:pb-3 pt-1"
          >
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[44px] sm:min-h-[70px]" />
            ))}
            {calendarData.days.map((day) => (
              <div
                key={day.day}
                className={`min-h-[44px] sm:min-h-[70px] rounded-md sm:rounded-xl p-0.5 sm:p-2 flex flex-col transition-colors duration-200 ${
                  day.isToday
                    ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                    : 'bg-secondary/50 border border-transparent hover:bg-secondary hover:border-border/60'
                }`}
              >
                <span className={`font-bold text-[0.65rem] sm:text-lg leading-none ${day.isToday ? 'text-primary' : day.isFriday ? 'text-destructive' : 'text-foreground'}`}>
                  {day.day}
                </span>
                <span className="text-[0.35rem] sm:text-[0.6rem] text-success leading-tight mt-0.5 opacity-90 truncate">
                  {day.banglaDay} {day.banglaMonth}
                </span>
                <span className="text-[0.32rem] sm:text-[0.55rem] text-warning leading-tight opacity-80 truncate">
                  {day.hijriText}
                </span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* ─── Legend ─── */}
        <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 px-3 pb-2 sm:pb-3 text-[0.5rem] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success inline-block" /> Bangla</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-warning inline-block" /> Hijri</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary inline-block" /> Today</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-destructive inline-block" /> Friday</span>
        </div>

        {/* ─── Ramadan Banner ─── */}
        {ramadanToday && prayerTimes && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-2 sm:mx-4 mb-2 sm:mb-3 rounded-xl border border-gold/30 bg-gold/5 p-3 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="text-lg">☽</span>
              <h3 className="text-sm sm:text-base font-bold text-gold">Ramadan Mubarak</h3>
              {hijriDay && (
                <span className="ml-auto text-[0.6rem] sm:text-xs text-gold/60 italic">
                  {ordinal(hijriDay)} of Ramadan
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Sehri */}
              <div className="rounded-lg border border-gold/25 bg-gold/[0.08] px-2.5 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl shrink-0">🌙</span>
                <div className="min-w-0">
                  <div className="text-[0.5rem] sm:text-[0.65rem] uppercase tracking-wider text-gold/60">Sehri ends</div>
                  <div className="text-sm sm:text-lg font-semibold text-foreground tabular-nums">{to12h(prayerTimes.Fajr)}</div>
                  <div className="text-[0.45rem] sm:text-[0.6rem] text-muted-foreground">Before Fajr</div>
                </div>
              </div>
              {/* Iftar */}
              <div className="rounded-lg border border-gold/25 bg-gold/[0.08] px-2.5 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl shrink-0">🌅</span>
                <div className="min-w-0">
                  <div className="text-[0.5rem] sm:text-[0.65rem] uppercase tracking-wider text-gold/60">Iftar time</div>
                  <div className="text-sm sm:text-lg font-semibold text-foreground tabular-nums">{to12h(prayerTimes.Maghrib)}</div>
                  <div className="text-[0.45rem] sm:text-[0.6rem] text-muted-foreground">At Maghrib</div>
                </div>
              </div>
            </div>

            {countdown && (
              <div className="text-center mt-2 pt-2 border-t border-gold/10 text-[0.6rem] sm:text-xs text-gold/60">
                <span className="text-gold font-medium tabular-nums">{countdown}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Prayer Times + Location ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-3 px-2 sm:px-4 pb-3 sm:pb-4">
          {/* Location */}
          <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info shrink-0" />
            <div className="min-w-0">
              <div className="text-[0.5rem] sm:text-[0.6rem] text-muted-foreground uppercase tracking-wider">Prayer times for</div>
              <div className="text-xs sm:text-sm font-medium text-foreground truncate">{location.name}</div>
              {location.status === 'detecting' && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                  <span className="text-[0.5rem] text-muted-foreground">Locating…</span>
                </div>
              )}
              {location.status === 'resolved' && (
                <span className="text-[0.5rem] text-success">✓ Live</span>
              )}
              {location.status === 'fallback' && (
                <span className="text-[0.5rem] text-warning">Default location</span>
              )}
            </div>
          </div>

          {/* Prayer pills */}
          <div className="rounded-lg border border-border bg-secondary/30 px-2 py-2 sm:px-4 sm:py-3">
            <div className="text-[0.5rem] sm:text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1.5 sm:mb-2">
              Today's Prayer Times
            </div>
            {prayerLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : prayerTimes ? (
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {PRAYER_KEYS.map((key, i) => (
                  <div
                    key={key}
                    className={`rounded-md sm:rounded-lg px-1 py-1.5 sm:px-2 sm:py-2.5 text-center transition-colors ${
                      i === activePrayer
                        ? 'bg-primary/15 border border-primary/30'
                        : 'bg-background/50 border border-transparent'
                    }`}
                  >
                    <div className="text-sm sm:text-base mb-0.5">{PRAYER_ICONS[i]}</div>
                    <div className={`text-[0.45rem] sm:text-[0.6rem] uppercase tracking-wider mb-0.5 ${i === activePrayer ? 'text-primary' : 'text-muted-foreground'}`}>
                      {key}
                    </div>
                    <div className={`text-[0.55rem] sm:text-xs font-medium tabular-nums ${i === activePrayer ? 'text-primary' : 'text-foreground'}`}>
                      {to12h(prayerTimes[key])}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Could not load prayer times</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
