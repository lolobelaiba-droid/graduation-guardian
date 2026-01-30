/**
 * PDF Generation Module
 * 
 * This module provides a centralized, Arabic-safe PDF generation system.
 * All Arabic text processing is handled at the application level,
 * treating jsPDF as a low-level drawing engine.
 */

// Re-export Arabic text utilities
export {
  // Core detection
  containsArabic,
  isPrimaryArabic,
  containsLatin,
  containsNumbers,
  detectLanguage,
  isDateLikeText,
  needsArabicProcessing,
  
  // Text processing
  shapeArabicText,
  applyBidiReorder,
  prepareArabicText,
  processMixedText,
  
  // Date processing
  formatArabicDateForPdf,
  
  // Main processing functions
  processTextForPdf,
  processFieldForPdf,
  
  // Utilities
  getTextDirection,
  getFieldAlignment,
  
  // Types
  type FieldLanguage,
  type TextProcessingOptions,
  type ProcessedText,
  type FieldMetadata,
} from './arabicTextUtils';

// Re-export font utilities
export {
  getAllFonts,
  getFontByName,
  getFontOptions,
  loadFontFile,
  arrayBufferToBase64,
  systemFonts,
  arabicFonts,
  setCustomFonts,
  getCustomFonts,
  type FontConfig,
} from '../arabicFonts';
