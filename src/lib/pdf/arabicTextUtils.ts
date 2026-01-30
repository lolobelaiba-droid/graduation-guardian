/**
 * Centralized Arabic Text Processing Utilities for PDF Generation
 * 
 * This module provides a single, consistent layer for processing all Arabic text
 * before rendering in jsPDF. It handles:
 * - Arabic text shaping (ligatures and contextual forms)
 * - BiDi reordering for correct visual order
 * - Mixed text handling (Arabic + numbers + Latin)
 * - Date formatting with correct component order
 * 
 * IMPORTANT: jsPDF does not support the Unicode BiDi algorithm.
 * All Arabic correctness is controlled at the application level.
 * 
 * Usage:
 *   import { processTextForPdf } from '@/lib/pdf/arabicTextUtils';
 *   const processed = processTextForPdf(text, { language: 'ar' });
 *   doc.text(processed.text, x, y, { align: processed.align });
 */

import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';
import { logger } from '../logger';

// ============================================================================
// CONSTANTS & REGEX PATTERNS
// ============================================================================

/** Regex to detect Arabic characters */
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Regex for numeric dates like 15/08/2024 or 2024/08/15 */
const NUMERIC_DATE_RE = /^\s*(\d{1,4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,4})\s*$/;

/** Regex for dates with dashes like 15-08-2024 */
const DASH_DATE_RE = /^\s*(\d{1,4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,4})\s*$/;

/** Regex for word-based dates like "15 أوت 2024" or "أوت 15 2024" */
const WORD_DATE_RE = /^\s*(\d{1,2})\s+(.+?)\s+(\d{4})\s*$/;
const WORD_DATE_MONTH_FIRST_RE = /^\s*(.+?)\s+(\d{1,2})\s+(\d{4})\s*$/;

/** Initialize BiDi processor */
const bidi = (bidiFactory as any)();

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Language type for field processing */
export type FieldLanguage = 'ar' | 'fr' | 'en' | 'mixed';

/** Options for text processing */
export interface TextProcessingOptions {
  /** The language of the text */
  language: FieldLanguage;
  /** Whether this is a date field (enables special date handling) */
  isDateField?: boolean;
  /** Force RTL direction even for mixed content */
  forceRtl?: boolean;
  /** Text direction for Arabic dates - 'rtl' or 'ltr' (only applies to Arabic date fields) */
  dateTextDirection?: 'rtl' | 'ltr';
}

/** Result of text processing */
export interface ProcessedText {
  /** The processed text ready for jsPDF */
  text: string;
  /** Recommended alignment for jsPDF */
  align: 'left' | 'center' | 'right';
  /** Whether the text was detected as Arabic */
  isArabic: boolean;
  /** Original text before processing */
  original: string;
}

/** Field metadata for language-aware processing */
export interface FieldMetadata {
  value: string;
  language: FieldLanguage;
  fieldKey: string;
  isDate?: boolean;
}

// ============================================================================
// CORE TEXT DETECTION
// ============================================================================

/**
 * Check if text contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  return !!text && ARABIC_REGEX.test(text);
}

/**
 * Check if text is primarily Arabic (more than 30% Arabic chars)
 */
export function isPrimaryArabic(text: string): boolean {
  if (!text) return false;
  const arabicChars = (text.match(ARABIC_REGEX) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && (arabicChars / totalChars) > 0.3;
}

/**
 * Check if text contains Latin characters
 */
export function containsLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/**
 * Check if text contains numbers
 */
export function containsNumbers(text: string): boolean {
  return /\d/.test(text);
}

/**
 * Determine the language type of a text
 */
export function detectLanguage(text: string): FieldLanguage {
  if (!text) return 'en';
  
  const hasArabic = containsArabic(text);
  const hasLatin = containsLatin(text);
  
  if (hasArabic && hasLatin) return 'mixed';
  if (hasArabic) return 'ar';
  return 'en'; // Default to English for Latin/numeric only
}

/**
 * Check if text looks like a date
 */
export function isDateLikeText(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  
  return (
    NUMERIC_DATE_RE.test(trimmed) ||
    DASH_DATE_RE.test(trimmed) ||
    WORD_DATE_RE.test(trimmed) ||
    WORD_DATE_MONTH_FIRST_RE.test(trimmed)
  );
}

// ============================================================================
// ARABIC TEXT SHAPING
// ============================================================================

/**
 * Apply Arabic shaping (ligatures + contextual forms) using arabic-reshaper.
 * This produces Arabic Presentation Forms that jsPDF can draw correctly
 * when the font is embedded with Identity-H encoding.
 */
export function shapeArabicText(text: string): string {
  if (!text) return '';
  if (!containsArabic(text)) return text;
  
  try {
    // arabic-reshaper may be CommonJS or ESM depending on bundler
    const reshaper =
      (ArabicReshaper as any)?.convertArabic 
        ? (ArabicReshaper as any) 
        : (ArabicReshaper as any)?.default;
    
    return reshaper?.convertArabic?.(text) ?? text;
  } catch (error) {
    logger.warn('[ArabicTextUtils] Arabic shaping failed:', error);
    return text;
  }
}

// ============================================================================
// BIDI REORDERING
// ============================================================================

/**
 * Apply BiDi reordering for correct visual order in PDF.
 * 
 * @param text - The text to reorder (should be shaped first for Arabic)
 * @param baseDirection - The base direction ('rtl' or 'ltr')
 * @returns The reordered text for visual rendering
 */
export function applyBidiReorder(text: string, baseDirection: 'rtl' | 'ltr'): string {
  if (!text) return '';
  
  try {
    const info = bidi?.getReorderedInfo?.(text, baseDirection);
    return info?.text ?? text;
  } catch (error) {
    logger.warn('[ArabicTextUtils] BiDi reorder failed:', error);
    return text;
  }
}

/**
 * Full Arabic text preparation: shape + BiDi reorder
 */
export function prepareArabicText(text: string, baseDirection: 'rtl' | 'ltr' = 'rtl'): string {
  const shaped = shapeArabicText(text);
  return applyBidiReorder(shaped, baseDirection);
}

// ============================================================================
// DATE PROCESSING FOR PDF (MANDATORY HARD-CODED SOLUTION)
// ============================================================================

/**
 * Hard-coded Arabic month names for PDF output.
 * These are the ONLY month names used for Arabic PDF rendering.
 */
const ARABIC_MONTHS_PDF = [
  "جانفي",    // January
  "فيفري",    // February
  "مارس",     // March
  "أفريل",    // April
  "ماي",      // May
  "جوان",     // June
  "جويلية",   // July
  "أوت",      // August
  "سبتمبر",   // September
  "أكتوبر",   // October
  "نوفمبر",   // November
  "ديسمبر"    // December
];

/**
 * MANDATORY PDF-ONLY Arabic Date Formatter
 * 
 * This function generates Arabic dates in the EXACT format required by jsPDF.
 * jsPDF is treated as an LTR-only drawing engine - no BiDi, no RTL flags.
 * 
 * The output order is: YEAR DAY MONTH
 * When rendered with align: "right", this produces the correct visual order.
 * 
 * EXPLICITLY FORBIDDEN:
 * - setR2L(true)
 * - direction: rtl
 * - locale-based date formatting
 * - font-based fixes
 * - automatic mixed-text detection
 * 
 * @param date - JavaScript Date object
 * @returns String formatted exactly as jsPDF must receive it
 */
export function formatArabicDateFromDateObject(date: Date): string {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = ARABIC_MONTHS_PDF[date.getMonth()];
  
  // Shape the Arabic month for proper glyph rendering
  const shapedMonth = shapeArabicText(month);
  
  // jsPDF MUST receive this exact order: YEAR DAY MONTH
  return `${year} ${day} ${shapedMonth}`;
}

/**
 * Format an Arabic date string for PDF rendering.
 * 
 * This function takes a date string (from database/UI) and converts it
 * to the exact format jsPDF requires for correct Arabic display.
 * 
 * The input can be:
 * - ISO date: "2024-08-15"
 * - Numeric date: "15/08/2024" or "2024/08/15"
 * - Word date: "15 أوت 2024"
 * 
 * For RTL direction: Output is YEAR DAY SHAPED_MONTH (renders visually as MONTH DAY YEAR from right)
 * For LTR direction: Output is SHAPED_MONTH DAY YEAR (renders visually as DAY MONTH YEAR from left)
 * 
 * @param dateString - The date string from the database or UI
 * @param direction - Text direction: 'rtl' or 'ltr' (default: 'rtl')
 * @returns The formatted string for jsPDF
 */
export function formatArabicDateForPdf(dateString: string, direction: 'rtl' | 'ltr' = 'rtl'): string {
  if (!dateString) return '';
  
  const trimmed = dateString.trim();
  
  // Parse the date to extract day, month, year
  let day: number, month: number, year: string;
  
  // Try to parse as ISO date first (YYYY-MM-DD)
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    year = isoMatch[1];
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  }
  // Try numeric date with slashes: dd/mm/yyyy or yyyy/mm/dd
  else {
    const slashMatch = /^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/.exec(trimmed);
    if (slashMatch) {
      const [, p1, p2, p3] = slashMatch;
      if (p1.length === 4) {
        // yyyy/mm/dd
        year = p1;
        month = parseInt(p2, 10) - 1;
        day = parseInt(p3, 10);
      } else {
        // dd/mm/yyyy
        day = parseInt(p1, 10);
        month = parseInt(p2, 10) - 1;
        year = p3;
      }
    }
    // Try numeric date with dashes: dd-mm-yyyy or yyyy-mm-dd
    else {
      const dashMatch = /^(\d{1,4})-(\d{1,2})-(\d{1,4})$/.exec(trimmed);
      if (dashMatch) {
        const [, p1, p2, p3] = dashMatch;
        if (p1.length === 4) {
          year = p1;
          month = parseInt(p2, 10) - 1;
          day = parseInt(p3, 10);
        } else {
          day = parseInt(p1, 10);
          month = parseInt(p2, 10) - 1;
          year = p3;
        }
      }
      // Try word-based date: "15 أوت 2024"
      else {
        const wordMatch1 = /^(\d{1,2})\s+(.+?)\s+(\d{4})$/.exec(trimmed);
        if (wordMatch1) {
          day = parseInt(wordMatch1[1], 10);
          const monthIndex = findArabicMonthIndex(wordMatch1[2]);
          month = monthIndex >= 0 ? monthIndex : 0;
          year = wordMatch1[3];
        }
        // Try word-based date: "أوت 15 2024"
        else {
          const wordMatch2 = /^(.+?)\s+(\d{1,2})\s+(\d{4})$/.exec(trimmed);
          if (wordMatch2) {
            const monthIndex = findArabicMonthIndex(wordMatch2[1]);
            month = monthIndex >= 0 ? monthIndex : 0;
            day = parseInt(wordMatch2[2], 10);
            year = wordMatch2[3];
          } else {
            // Fallback: return shaped text without date processing
            return shapeArabicText(trimmed);
          }
        }
      }
    }
  }
  
  const shapedMonth = shapeArabicText(ARABIC_MONTHS_PDF[month] || '');
  
  // Format based on direction
  // RTL: jsPDF needs YEAR DAY MONTH order to display as MONTH DAY YEAR visually from right
  // LTR: jsPDF needs DAY MONTH YEAR order to display correctly from left
  if (direction === 'rtl') {
    return `${year} ${day} ${shapedMonth}`;
  } else {
    return `${day} ${shapedMonth} ${year}`;
  }
}

/**
 * Find the index of an Arabic month name
 */
function findArabicMonthIndex(monthText: string): number {
  const normalized = monthText.trim();
  return ARABIC_MONTHS_PDF.findIndex(m => 
    m === normalized || 
    m.includes(normalized) || 
    normalized.includes(m)
  );
}

// ============================================================================
// MIXED TEXT PROCESSING
// ============================================================================

/**
 * Process mixed Arabic/Latin/Numeric text for PDF.
 * 
 * Strategy:
 * 1. If text is pure Arabic: Shape + RTL BiDi
 * 2. If text is pure Latin/Numeric: Return as-is
 * 3. If mixed: Segment, process Arabic parts, rejoin with correct order
 */
export function processMixedText(text: string, forceRtl: boolean = true): string {
  if (!text) return '';
  
  const hasArabic = containsArabic(text);
  const hasLatin = containsLatin(text);
  const hasNumbers = containsNumbers(text);
  
  // Pure Latin/Numeric - no processing needed
  if (!hasArabic) {
    return text;
  }
  
  // Pure Arabic - standard processing
  if (hasArabic && !hasLatin && !hasNumbers) {
    return prepareArabicText(text, 'rtl');
  }
  
  // Mixed content - process as RTL with Arabic shaping
  // The BiDi algorithm will handle the reordering
  return prepareArabicText(text, forceRtl ? 'rtl' : 'ltr');
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process text for PDF rendering based on field metadata.
 * 
 * This is the main entry point for all text processing.
 * It automatically detects the text type and applies appropriate processing.
 * 
 * IMPORTANT FOR ARABIC DATES:
 * Arabic dates are pre-formatted by formatDateWithPattern() in the correct logical order.
 * We ONLY apply Arabic shaping (ligatures) - NO BiDi reordering.
 * The visual order is already correct from the formatting function.
 * 
 * @param text - The raw text to process
 * @param options - Processing options
 * @returns Processed text with recommended alignment
 * 
 * @example
 * const result = processTextForPdf("محمد علي", { language: 'ar' });
 * doc.text(result.text, x, y, { align: result.align });
 */
export function processTextForPdf(
  text: string,
  options: TextProcessingOptions
): ProcessedText {
  const { language, isDateField = false, forceRtl, dateTextDirection = 'rtl' } = options;
  const original = text || '';
  
  if (!original) {
    return {
      text: '',
      align: 'center',
      isArabic: false,
      original: ''
    };
  }
  
  const detectedLanguage = detectLanguage(original);
  const isArabic = language === 'ar' || detectedLanguage === 'ar' || detectedLanguage === 'mixed';
  
  let processedText: string;
  let align: 'left' | 'center' | 'right';
  
  // CRITICAL: Arabic date fields are PRE-FORMATTED by formatDateWithPattern()
  // The logical order (e.g., "12 أكتوبر 2024") is ALREADY CORRECT
  // We ONLY apply Arabic shaping for proper glyph rendering - NO BiDi reordering
  if (isDateField && isArabic) {
    // Only shape the Arabic text (ligatures/contextual forms) - do NOT reorder
    processedText = shapeArabicTextOnly(original);
    // Use the alignment from dateTextDirection setting
    align = dateTextDirection === 'rtl' ? 'right' : 'left';
  }
  // Non-Arabic date fields (French/English dates)
  else if (isDateField) {
    processedText = original;
    align = 'left';
  }
  // Arabic or mixed text (non-date)
  else if (isArabic) {
    processedText = processMixedText(original, forceRtl ?? true);
    align = 'right';
  }
  // Pure Latin/English
  else {
    processedText = original;
    align = 'left';
  }
  
  return {
    text: processedText,
    align,
    isArabic,
    original
  };
}

/**
 * Apply Arabic shaping ONLY (no BiDi reordering).
 * Used for pre-formatted Arabic dates where the logical order is already correct.
 */
function shapeArabicTextOnly(text: string): string {
  if (!text) return '';
  
  // Split by spaces to preserve the order of components
  const parts = text.split(/(\s+)/);
  
  return parts.map(part => {
    // Only shape parts that contain Arabic characters
    if (containsArabic(part)) {
      return shapeArabicText(part);
    }
    return part;
  }).join('');
}

/**
 * Process a field with full metadata for PDF rendering.
 * 
 * @param field - Field metadata including value and language
 * @returns Processed text result
 */
export function processFieldForPdf(field: FieldMetadata): ProcessedText {
  return processTextForPdf(field.value, {
    language: field.language,
    isDateField: field.isDate,
    forceRtl: field.language === 'ar'
  });
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Quick check if text needs Arabic processing
 */
export function needsArabicProcessing(text: string): boolean {
  return containsArabic(text);
}

/**
 * Get the recommended text direction for a field
 */
export function getTextDirection(language: FieldLanguage): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Get the recommended alignment for a field
 */
export function getFieldAlignment(language: FieldLanguage): 'left' | 'right' {
  return language === 'ar' ? 'right' : 'left';
}
