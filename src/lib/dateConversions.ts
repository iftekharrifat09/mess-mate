// Bangla date conversion utilities

const banglaMonths = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
];

const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => banglaDigits[parseInt(d)]);
}

// Bangla calendar conversion (approximate - based on the standard offset method)
export function toBanglaDate(date: Date): { day: number; month: string; year: number } {
  const gregYear = date.getFullYear();
  const gregMonth = date.getMonth() + 1; // 1-12
  const gregDay = date.getDate();

  // Bangla new year starts around April 14
  // Month lengths: Boishakh(31), Jyoishtho(31), Asharh(31), Shrabon(31), Bhadro(31), Ashwin(30),
  //                Kartik(30), Ogrohayon(30), Poush(30), Magh(30), Falgun(30), Choitro(30)
  // In leap years, Falgun has 31 days

  const banglaMonthDays = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30];
  
  // Check if this is a leap year (Bangla leap year follows Gregorian)
  const isLeapYear = (gregYear % 4 === 0 && gregYear % 100 !== 0) || (gregYear % 400 === 0);
  if (isLeapYear) {
    banglaMonthDays[10] = 31; // Falgun gets 31 days
  }

  // Bangla year offset
  let banglaYear = gregYear - 593;
  
  // Day of year calculation for Gregorian
  const gregMonthDays = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = gregDay;
  for (let i = 0; i < gregMonth - 1; i++) {
    dayOfYear += gregMonthDays[i];
  }

  // April 14 is typically day 104 (or 105 in leap year)
  const newYearDay = isLeapYear ? 105 : 104;
  
  let banglaDayOfYear = dayOfYear - newYearDay + 1;
  
  if (banglaDayOfYear <= 0) {
    banglaYear -= 1;
    // Previous year's total days
    const prevLeap = ((gregYear - 1) % 4 === 0 && (gregYear - 1) % 100 !== 0) || ((gregYear - 1) % 400 === 0);
    const prevYearDays = prevLeap ? 366 : 365;
    banglaDayOfYear += prevYearDays;
    // Recalculate with previous year's month lengths
    const prevBanglaMonthDays = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, prevLeap ? 31 : 30, 30];
    let banglaMonth = 0;
    let remaining = banglaDayOfYear;
    for (let i = 0; i < 12; i++) {
      if (remaining <= prevBanglaMonthDays[i]) {
        banglaMonth = i;
        break;
      }
      remaining -= prevBanglaMonthDays[i];
    }
    return { day: remaining, month: banglaMonths[banglaMonth], year: banglaYear };
  }

  let banglaMonth = 0;
  let remaining = banglaDayOfYear;
  for (let i = 0; i < 12; i++) {
    if (remaining <= banglaMonthDays[i]) {
      banglaMonth = i;
      break;
    }
    remaining -= banglaMonthDays[i];
  }

  return { day: remaining, month: banglaMonths[banglaMonth], year: banglaYear };
}

// Hijri (Islamic) calendar conversion - Umm al-Qura approximation
export function toHijriDate(date: Date): { day: number; month: string; year: number } {
  const hijriMonths = [
    'Muh.', 'Saf.', 'Rab. I', 'Rab. II', 'Jum. I', 'Jum. II',
    'Raj.', 'Sha.', 'Ram.', 'Shaw.', 'Dhul-Q.', 'Dhul-H.'
  ];

  // Julian Day Number
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
  const y = date.getFullYear() + 4800 - a;
  const m = (date.getMonth() + 1) + 12 * a - 3;
  const jd = date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Hijri conversion from JD
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hijriMonth = Math.floor((24 * l3) / 709);
  const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  return {
    day: hijriDay,
    month: hijriMonths[hijriMonth - 1] || hijriMonths[0],
    year: hijriYear,
  };
}

// Get days in a month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Get day of week for first day of month (0 = Sunday)
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
