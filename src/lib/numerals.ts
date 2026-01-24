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

/**
 * Format a date for certificates (day/month/year) with Western numerals
 */
export function formatCertificateDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use Gregorian calendar with Arabic locale
  const formatted = dateObj.toLocaleDateString('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return toWesternNumerals(formatted);
}
