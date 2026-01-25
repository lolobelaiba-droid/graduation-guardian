/**
 * Utility functions for converting numerals to Western Arabic (0-9)
 */

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
  locale: string = 'ar-SA',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format the date
  const formatted = dateObj.toLocaleDateString(locale, options);
  
  // Convert any Hindi numerals to Western Arabic
  return toWesternNumerals(formatted);
}

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
 * Format a date for certificates with Western numerals (for birth dates)
 * @param date - Date to format
 * @param isArabic - If true, format as yyyy/mm/dd (reads day/month/year RTL)
 *                   If false, format as dd/mm/yyyy (reads day/month/year LTR)
 */
export function formatCertificateDate(date: Date | string, isArabic: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return toWesternNumerals(String(date));
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear());
  
  // Arabic: yyyy/mm/dd (reads right-to-left as day/month/year)
  // French: dd/mm/yyyy (reads left-to-right as day/month/year)
  if (isArabic) {
    return `${year}/${month}/${day}`;
  }
  return `${day}/${month}/${year}`;
}

/**
 * Format defense/certificate date with month name
 * Format: day (number) + month (word) + year (number)
 * Example Arabic: "15 أوت 2024"
 * Example French: "15 Août 2024"
 * @param date - Date to format
 * @param isArabic - If true, use Arabic month names, otherwise French
 */
export function formatDefenseDate(date: Date | string, isArabic: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return toWesternNumerals(String(date));
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNum = dateObj.getMonth() + 1;
  const year = String(dateObj.getFullYear());
  
  const monthName = isArabic ? arabicMonths[monthNum] : frenchMonths[monthNum];
  
  // Format: day month year (e.g., "15 أوت 2024" or "15 Août 2024")
  return `${day} ${monthName} ${year}`;
}
