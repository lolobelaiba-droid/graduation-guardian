/**
 * Date format configuration and utilities for certificates
 * Supports multiple predefined formats + custom pattern
 */

// Predefined date format presets
export interface DateFormatPreset {
  id: string;
  label_ar: string;
  label_fr: string;
  example_ar: string;
  example_fr: string;
  pattern: string; // Pattern tokens: DD, MM, YYYY, MMMM (month name)
}

export const DATE_FORMAT_PRESETS: DateFormatPreset[] = [
  {
    id: 'dd_mm_yyyy_slash',
    label_ar: 'يوم/شهر/سنة (أرقام)',
    label_fr: 'JJ/MM/AAAA',
    example_ar: '15/08/2024',
    example_fr: '15/08/2024',
    pattern: 'DD/MM/YYYY',
  },
  {
    id: 'dd_mmmm_yyyy',
    label_ar: 'يوم شهر سنة (اسم الشهر)',
    label_fr: 'JJ Mois AAAA',
    example_ar: '15 أوت 2024',
    example_fr: '15 Août 2024',
    pattern: 'DD MMMM YYYY',
  },
  {
    id: 'yyyy_mm_dd_slash',
    label_ar: 'سنة/شهر/يوم',
    label_fr: 'AAAA/MM/JJ',
    example_ar: '2024/08/15',
    example_fr: '2024/08/15',
    pattern: 'YYYY/MM/DD',
  },
  {
    id: 'dd_mm_yyyy_dash',
    label_ar: 'يوم-شهر-سنة',
    label_fr: 'JJ-MM-AAAA',
    example_ar: '15-08-2024',
    example_fr: '15-08-2024',
    pattern: 'DD-MM-YYYY',
  },
  {
    id: 'yyyy_mm_dd_dash',
    label_ar: 'سنة-شهر-يوم',
    label_fr: 'AAAA-MM-JJ',
    example_ar: '2024-08-15',
    example_fr: '2024-08-15',
    pattern: 'YYYY-MM-DD',
  },
  {
    id: 'mmmm_dd_yyyy',
    label_ar: 'شهر يوم سنة',
    label_fr: 'Mois JJ AAAA',
    example_ar: 'أوت 15 2024',
    example_fr: 'Août 15 2024',
    pattern: 'MMMM DD YYYY',
  },
  {
    id: 'custom',
    label_ar: 'صيغة مخصصة',
    label_fr: 'Format personnalisé',
    example_ar: '...',
    example_fr: '...',
    pattern: '',
  },
];

// Date format settings structure
export interface DateFormatSettings {
  birthDateFormat: string; // Preset ID or 'custom'
  birthDateCustomPattern: string;
  defenseDateFormat: string;
  defenseDateCustomPattern: string;
  certificateDateFormat: string;
  certificateDateCustomPattern: string;
}

export const DEFAULT_DATE_FORMAT_SETTINGS: DateFormatSettings = {
  birthDateFormat: 'dd_mm_yyyy_slash',
  birthDateCustomPattern: 'DD/MM/YYYY',
  defenseDateFormat: 'dd_mmmm_yyyy',
  defenseDateCustomPattern: 'DD MMMM YYYY',
  certificateDateFormat: 'dd_mm_yyyy_slash',
  certificateDateCustomPattern: 'DD/MM/YYYY',
};

// Arabic month names
const arabicMonths: Record<number, string> = {
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

// French month names
const frenchMonths: Record<number, string> = {
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
 * Format a date according to a pattern
 * Pattern tokens:
 * - DD: Day (2 digits)
 * - MM: Month number (2 digits)
 * - MMMM: Month name (Arabic or French)
 * - YYYY: Full year (4 digits)
 */
export function formatDateWithPattern(
  date: Date | string,
  pattern: string,
  isArabic: boolean = false
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear());
  const monthNum = dateObj.getMonth() + 1;
  const monthName = isArabic ? arabicMonths[monthNum] : frenchMonths[monthNum];

  let result = pattern;
  result = result.replace(/YYYY/g, year);
  result = result.replace(/MMMM/g, monthName);
  result = result.replace(/MM/g, month);
  result = result.replace(/DD/g, day);

  return result;
}

/**
 * Get effective pattern from settings for a date field
 */
export function getEffectiveDatePattern(
  formatId: string,
  customPattern: string
): string {
  if (formatId === 'custom') {
    return customPattern || 'DD/MM/YYYY';
  }
  const preset = DATE_FORMAT_PRESETS.find((p) => p.id === formatId);
  return preset?.pattern || 'DD/MM/YYYY';
}

/**
 * Generate a preview of the date format
 */
export function getFormatPreview(
  pattern: string,
  isArabic: boolean = false
): string {
  const sampleDate = new Date(2024, 7, 15); // 15 August 2024
  return formatDateWithPattern(sampleDate, pattern, isArabic);
}
