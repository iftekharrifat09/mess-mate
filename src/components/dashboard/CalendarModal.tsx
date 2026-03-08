import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
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

export default function CalendarModal() {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayBangla = useMemo(() => toBanglaDate(today), [today]);
  const todayHijri = useMemo(() => toHijriDate(today), [today]);

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
        isToday:
          d === today.getDate() &&
          viewMonth === today.getMonth() &&
          viewYear === today.getFullYear(),
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
  }, [viewYear, viewMonth, today]);

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
      return;
    }
    setViewMonth((prev) => prev - 1);
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
      return;
    }
    setViewMonth((prev) => prev + 1);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-border hover:bg-secondary"
          title="Calendar"
          aria-label="Open 3-in-1 calendar"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1rem)] max-w-[760px] max-h-[92vh] overflow-y-auto p-0 gap-0 bg-card border-border">
        <div className="relative px-2.5 py-3 sm:px-5 sm:py-5 border-b border-border bg-secondary/50">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                onClick={goToPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center flex-1 min-w-0 px-1">
                <DialogTitle className="text-base sm:text-2xl font-bold text-foreground truncate">
                  {ENGLISH_MONTHS[viewMonth]} {viewYear}
                </DialogTitle>
                <p className="text-[0.55rem] sm:text-xs text-muted-foreground mt-0.5 tracking-wide leading-tight">
                  {calendarData.banglaRange}
                </p>
                <p className="text-[0.55rem] sm:text-xs text-muted-foreground tracking-wide leading-tight">
                  {calendarData.hijriRange}
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-2 rounded-lg border border-border bg-background/60 px-2 py-1.5 sm:px-3 sm:py-2">
            <p className="text-[0.6rem] sm:text-xs text-success leading-tight truncate">
              আজ: {toBanglaDigits(todayBangla.day)} {todayBangla.month} {toBanglaDigits(todayBangla.year)} বঙ্গাব্দ
            </p>
            <p className="text-[0.6rem] sm:text-xs text-warning leading-tight truncate">
              Today Hijri: {todayHijri.month} {todayHijri.day}, {todayHijri.year} AH
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

        <div className="grid grid-cols-7 px-1.5 sm:px-4 pt-2 sm:pt-3">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className={`text-center text-[0.52rem] sm:text-xs font-medium tracking-wider uppercase py-1 ${
                name === 'Fri' ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-7 gap-0.5 sm:gap-1 px-1.5 sm:px-4 pb-3 sm:pb-4 pt-1"
          >
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[46px] sm:min-h-[72px]" />
            ))}

            {calendarData.days.map((day) => (
              <div
                key={day.day}
                className={`min-h-[46px] sm:min-h-[72px] rounded-md sm:rounded-xl p-1 sm:p-2 flex flex-col gap-0 transition-colors duration-200 ${
                  day.isToday
                    ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                    : 'bg-secondary/50 border border-transparent hover:bg-secondary hover:border-border/60'
                }`}
              >
                <span
                  className={`font-bold text-xs sm:text-lg leading-none ${
                    day.isToday ? 'text-primary' : day.isFriday ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {day.day}
                </span>
                <span className="text-[0.38rem] sm:text-[0.62rem] text-success leading-tight mt-0.5 opacity-90 truncate">
                  {day.banglaDay} {day.banglaMonth}
                </span>
                <span className="text-[0.36rem] sm:text-[0.58rem] text-warning leading-tight opacity-80 truncate">
                  {day.hijriText}
                </span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 px-3 pb-3 sm:pb-4 text-[0.55rem] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success inline-block" />
            Bangla
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-warning inline-block" />
            Hijri
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary inline-block" />
            Today
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-destructive inline-block" />
            Friday
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
