/**
 * Utility functions for converting numerals to Western Arabic (0-9)
 * and date formatting for certificates
 */

import {
  formatDateWithPattern,
  getPatternFromConfig,
  DEFAULT_DATE_FORMAT_SETTINGS,
  type DateFormatSettings,
} from './dateFormats';

// Map of Hindi/Eastern Arabic numerals to Western Arabic
const hindiToArabicMap: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

/**
 * Convert Hindi/Eastern Arabic numerals to Western Arabic numerals (0123456789)
 */
export function toWesternNumerals(input: string | number): string {
  const str = String(input);
  return str.replace(/[٠-٩]/g, (char) => hindiToArabicMap[char] || char);
}

/**
 * Format a date to locale string with Western Arabic numerals
 * Uses 'en-u-ca-islamic' for Hijri calendar formatting with Western numerals
 */
export function formatDateWithWesternNumerals(
  date: Date | string,
  locale: string = 'ar-EG-u-nu-latn',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format the date
  const formatted = dateObj.toLocaleDateString(locale, options);
  
  // Convert any Hindi numerals to Western Arabic
  return toWesternNumerals(formatted);
}

// Arabic month names (exported for use in dateFormats.ts)
export const arabicMonths: Record<number, string> = {
  1: 'جانفي',
  2: 'فيفري',
  3: 'مارس',
  4: 'أفريل',
  5: 'ماي',
  6: 'جوان',
  7: 'جويلية',
  8: 'أوت',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};

// French month names (exported for use in dateFormats.ts)
export const frenchMonths: Record<number, string> = {
  1: 'Janvier',
  2: 'Février',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Août',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Décembre',
};

/**
 * Format a birth date for certificates using saved format settings
 * @param date - Date to format
 * @param isArabic - If true, format for Arabic context
 * @param formatSettings - Optional format settings (uses defaults if not provided)
 */
export function formatCertificateDate(
  date: Date | string,
  isArabic: boolean = false,
  formatSettings?: DateFormatSettings
): string {
  const settings = formatSettings || DEFAULT_DATE_FORMAT_SETTINGS;
  const pattern = getPatternFromConfig(settings.birthDate, isArabic);
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return toWesternNumerals(String(date));
  }
  
  return formatDateWithPattern(dateObj, pattern, isArabic);
}

/**
 * Format defense date using saved format settings
 * @param date - Date to format
 * @param isArabic - If true, use Arabic month names, otherwise French
 * @param formatSettings - Optional format settings (uses defaults if not provided)
 */
export function formatDefenseDate(
  date: Date | string,
  isArabic: boolean = false,
  formatSettings?: DateFormatSettings
): string {
  const settings = formatSettings || DEFAULT_DATE_FORMAT_SETTINGS;
  const pattern = getPatternFromConfig(settings.defenseDate, isArabic);
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return toWesternNumerals(String(date));
  }
  
  return formatDateWithPattern(dateObj, pattern, isArabic);
}

/**
 * Format certificate issue date using saved format settings
 */
export function formatCertificateIssueDate(
  date: Date | string,
  isArabic: boolean = false,
  formatSettings?: DateFormatSettings
): string {
  const settings = formatSettings || DEFAULT_DATE_FORMAT_SETTINGS;
  const pattern = getPatternFromConfig(settings.certificateDate, isArabic);
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return toWesternNumerals(String(date));
  }
  
  return formatDateWithPattern(dateObj, pattern, isArabic);
}
