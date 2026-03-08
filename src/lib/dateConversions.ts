// Bangla, Hijri and Gregorian date conversion utilities

const banglaMonths = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
];

const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function toUtcDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function getBanglaMonthLengths(banglaYear: number): number[] {
  // Revised Bengali calendar used in Bangladesh:
  // First 6 months = 31 days, next 5 months = 30 days,
  // Falgun = 29 days (30 in leap year)
  const gregorianYearOfFalgun = banglaYear + 594;
  const falgunDays = isGregorianLeapYear(gregorianYearOfFalgun) ? 30 : 29;

  return [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, falgunDays, 30];
}

export function toBanglaDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
}

export function toBanglaDate(date: Date): { day: number; month: string; year: number } {
  // Bangla New Year starts on April 14
  const gregYear = date.getFullYear();
  const thisYearPohelaBoishakh = new Date(gregYear, 3, 14);

  const isOnOrAfterPohelaBoishakh = toUtcDayNumber(date) >= toUtcDayNumber(thisYearPohelaBoishakh);

  const banglaYear = isOnOrAfterPohelaBoishakh ? gregYear - 593 : gregYear - 594;
  const banglaYearStart = isOnOrAfterPohelaBoishakh
    ? thisYearPohelaBoishakh
    : new Date(gregYear - 1, 3, 14);

  let dayOffset = Math.floor((toUtcDayNumber(date) - toUtcDayNumber(banglaYearStart)) / MS_PER_DAY); // 0-based
  const monthLengths = getBanglaMonthLengths(banglaYear);

  let monthIndex = 0;
  while (monthIndex < monthLengths.length && dayOffset >= monthLengths[monthIndex]) {
    dayOffset -= monthLengths[monthIndex];
    monthIndex += 1;
  }

  if (monthIndex >= banglaMonths.length) {
    monthIndex = banglaMonths.length - 1;
    dayOffset = monthLengths[monthIndex] - 1;
  }

  return {
    day: dayOffset + 1,
    month: banglaMonths[monthIndex],
    year: banglaYear,
  };
}

// Hijri (Islamic) calendar conversion - civil approximation
export function toHijriDate(date: Date): { day: number; month: string; year: number } {
  const hijriMonths = [
    'Muh.',
    'Saf.',
    'Rab. I',
    'Rab. II',
    'Jum. I',
    'Jum. II',
    'Raj.',
    'Sha.',
    'Ram.',
    'Shaw.',
    'Dhul-Q.',
    'Dhul-H.',
  ];

  const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
  const y = date.getFullYear() + 4800 - a;
  const m = date.getMonth() + 1 + 12 * a - 3;
  const jd =
    date.getDate() +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hijriMonth = Math.floor((24 * l3) / 709);
  const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  return {
    day: hijriDay,
    month: hijriMonths[hijriMonth - 1] || hijriMonths[0],
    year: hijriYear,
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
