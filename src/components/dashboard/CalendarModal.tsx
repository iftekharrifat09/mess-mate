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

  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days: Array<{
      day: number;
      banglaDay: string;
      banglaMonth: string;
      hijriDay: string;
      hijriMonth: string;
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
        hijriDay: hijri.month + ' ' + hijri.day,
        hijriMonth: hijri.month,
        isToday:
          d === today.getDate() &&
          viewMonth === today.getMonth() &&
          viewYear === today.getFullYear(),
        isFriday: dayOfWeek === 5,
      });
    }

    // Header info
    const firstDayDate = new Date(viewYear, viewMonth, 1);
    const lastDayDate = new Date(viewYear, viewMonth, daysInMonth);
    const banglaFirst = toBanglaDate(firstDayDate);
    const banglaLast = toBanglaDate(lastDayDate);
    const hijriFirst = toHijriDate(firstDayDate);
    const hijriLast = toHijriDate(lastDayDate);

    const banglaRange =
      banglaFirst.month === banglaLast.month
        ? `${toBanglaDigits(banglaFirst.day)}-${toBanglaDigits(banglaLast.day)} ${banglaFirst.month} ${toBanglaDigits(banglaFirst.year)}`
        : `${toBanglaDigits(banglaFirst.day)} ${banglaFirst.month} - ${toBanglaDigits(banglaLast.day)} ${banglaLast.month} ${toBanglaDigits(banglaLast.year)}`;

    const hijriRange =
      hijriFirst.month === hijriLast.month
        ? `${hijriFirst.month} ${hijriFirst.day}-${hijriLast.day}, ${hijriFirst.year} AH`
        : `${hijriFirst.month} ${hijriFirst.day} - ${hijriLast.month} ${hijriLast.day}, ${hijriLast.year} AH`;

    return { days, firstDay, banglaRange, hijriRange };
  }, [viewYear, viewMonth]);

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
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
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card border-border">
        {/* Header */}
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 border-b border-border bg-secondary/50">
          <DialogHeader className="space-y-0">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goToPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center flex-1 px-2">
                <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
                  {ENGLISH_MONTHS[viewMonth]} {viewYear}
                </DialogTitle>
                <p className="text-[0.65rem] sm:text-xs text-muted-foreground mt-1 tracking-wide">
                  {calendarData.banglaRange} · {calendarData.hijriRange}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
            <div className="text-center mt-2">
              <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={goToToday}>
                Go to today
              </Button>
            </div>
          )}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-2 sm:px-4 pt-3">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className={`text-center text-[0.6rem] sm:text-xs font-medium tracking-widest uppercase py-1.5 ${
                name === 'Fri' ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-7 gap-0.5 sm:gap-1 px-2 sm:px-4 pb-4 pt-1"
          >
            {/* Empty cells for offset */}
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[68px]" />
            ))}

            {/* Day cells */}
            {calendarData.days.map((day) => (
              <div
                key={day.day}
                className={`min-h-[52px] sm:min-h-[68px] rounded-lg sm:rounded-xl p-1 sm:p-2 flex flex-col gap-0 transition-colors duration-200 ${
                  day.isToday
                    ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                    : 'bg-secondary/50 border border-transparent hover:bg-secondary hover:border-border/60'
                }`}
              >
                <span
                  className={`font-bold text-sm sm:text-lg leading-none ${
                    day.isToday
                      ? 'text-primary'
                      : day.isFriday
                      ? 'text-destructive'
                      : 'text-foreground'
                  }`}
                >
                  {day.day}
                </span>
                <span className="text-[0.45rem] sm:text-[0.58rem] text-success leading-tight mt-0.5 opacity-90 truncate">
                  {day.banglaDay} {day.banglaMonth}
                </span>
                <span className="text-[0.4rem] sm:text-[0.52rem] text-warning leading-tight opacity-80 truncate">
                  {day.hijriDay}
                </span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 px-4 pb-4 text-[0.6rem] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Bangla
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning inline-block" />
            Hijri
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Today
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
            Friday
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
