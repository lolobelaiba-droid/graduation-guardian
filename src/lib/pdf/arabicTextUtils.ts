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
// DATE PROCESSING FOR PDF
// ============================================================================

/**
 * Parse a date string into its components
 */
interface DateComponents {
  day: string;
  month: string;
  year: string;
  separator: string;
  isWordMonth: boolean;
}

function parseDateComponents(text: string): DateComponents | null {
  const trimmed = text.trim();
  
  // Numeric date with slashes: dd/mm/yyyy or yyyy/mm/dd
  let match = NUMERIC_DATE_RE.exec(trimmed);
  if (match) {
    const [, p1, p2, p3] = match;
    // Determine order: if first part is 4 digits, it's yyyy/mm/dd
    if (p1.length === 4) {
      return { year: p1, month: p2, day: p3, separator: '/', isWordMonth: false };
    }
    return { day: p1, month: p2, year: p3, separator: '/', isWordMonth: false };
  }
  
  // Numeric date with dashes: dd-mm-yyyy or yyyy-mm-dd
  match = DASH_DATE_RE.exec(trimmed);
  if (match) {
    const [, p1, p2, p3] = match;
    if (p1.length === 4) {
      return { year: p1, month: p2, day: p3, separator: '-', isWordMonth: false };
    }
    return { day: p1, month: p2, year: p3, separator: '-', isWordMonth: false };
  }
  
  // Word date: dd month yyyy
  match = WORD_DATE_RE.exec(trimmed);
  if (match) {
    const [, day, month, year] = match;
    return { day, month, year, separator: ' ', isWordMonth: true };
  }
  
  // Word date: month dd yyyy
  match = WORD_DATE_MONTH_FIRST_RE.exec(trimmed);
  if (match) {
    const [, month, day, year] = match;
    return { day, month, year, separator: ' ', isWordMonth: true };
  }
  
  return null;
}

/**
 * Format an Arabic date for PDF rendering.
 * 
 * For RTL dates in jsPDF, we reverse the component order before BiDi processing.
 * This ensures the visual output shows the correct order when read right-to-left.
 * 
 * Example:
 * - Input: "15 أوت 2024" (logical: day month year)
 * - Reversed: "2024 أوت 15" (year month day)
 * - After RTL BiDi: Displays as "15 أوت 2024" (day month year, RTL)
 * 
 * @param text - The date string
 * @param forceRtl - Whether to force RTL rendering
 * @returns The processed date string for jsPDF
 */
export function formatArabicDateForPdf(text: string, forceRtl: boolean = true): string {
  if (!text) return '';
  
  const components = parseDateComponents(text);
  
  // If not a recognizable date format, treat as regular text
  if (!components) {
    return prepareArabicText(text, forceRtl ? 'rtl' : 'ltr');
  }
  
  const { day, month, year, separator, isWordMonth } = components;
  
  // For numeric dates (no Arabic), simpler handling
  if (!isWordMonth) {
    if (forceRtl) {
      // Reverse the order for RTL display
      const reversed = `${year}${separator}${month}${separator}${day}`;
      return applyBidiReorder(reversed, 'rtl');
    }
    return text;
  }
  
  // For word-based dates with Arabic month names
  const hasArabicMonth = containsArabic(month);
  
  if (forceRtl && hasArabicMonth) {
    // Shape the Arabic month
    const shapedMonth = shapeArabicText(month);
    
    // Reverse order: year month day (for RTL BiDi to display as day month year)
    const reversed = `${year}${separator}${shapedMonth}${separator}${day}`;
    return applyBidiReorder(reversed, 'rtl');
  }
  
  // For LTR or non-Arabic months
  if (hasArabicMonth) {
    const shapedMonth = prepareArabicText(month, 'rtl');
    return `${day}${separator}${shapedMonth}${separator}${year}`;
  }
  
  return text;
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
  const { language, isDateField = false, forceRtl } = options;
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
  const shouldForceRtl = forceRtl ?? isArabic;
  
  let processedText: string;
  let align: 'left' | 'center' | 'right';
  
  // Date fields get special handling
  if (isDateField || isDateLikeText(original)) {
    processedText = formatArabicDateForPdf(original, shouldForceRtl);
    align = isArabic ? 'right' : 'left';
  }
  // Arabic or mixed text
  else if (isArabic) {
    processedText = processMixedText(original, shouldForceRtl);
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
