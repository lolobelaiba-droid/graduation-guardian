/**
 * Convert Western/Hindi numerals to Arabic-Indic numerals
 * ٠١٢٣٤٥٦٧٨٩
 */
export function toArabicNumerals(input: string | number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return String(input).replace(/[0-9]/g, (digit) => {
    return arabicNumerals[parseInt(digit, 10)];
  });
}

/**
 * Convert Arabic-Indic numerals back to Western numerals
 */
export function toWesternNumerals(input: string): string {
  const arabicToWestern: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  return input.replace(/[٠-٩]/g, (char) => arabicToWestern[char] || char);
}

/**
 * Format a date with Arabic numerals
 */
export function formatDateArabic(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatted = d.toLocaleDateString('ar-SA');
  return toArabicNumerals(formatted);
}
