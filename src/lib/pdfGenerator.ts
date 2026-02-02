/**
 * PDF Certificate Generator
 * 
 * This module generates certificates as PDF documents using jsPDF.
 * All Arabic text is processed through the centralized Arabic text utilities
 * to ensure correct RTL rendering and visual order.
 * 
 * IMPORTANT: jsPDF does not support Unicode BiDi algorithm.
 * All Arabic correctness is controlled at the application level.
 * 
 * PDF Rendering Contract:
 * - Arabic text: Always use processTextForPdf() then doc.text(text, x, y, { align: 'right' })
 * - Latin text: Use as-is with appropriate alignment
 * - Mixed text: Process through Arabic utilities, use 'right' alignment
 * - Never rely on setR2L() or direction: rtl in jsPDF
 */

import jsPDF from 'jspdf';
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from '@/types/certificates';
import { mentionLabels } from '@/types/certificates';
import { 
  processTextForPdf, 
  containsArabic,
  isDateLikeText,
  shapeArabicText,
  type FieldLanguage,
  type ProcessedText 
} from './pdf/arabicTextUtils';
import { getAllFonts, loadFontFile, arrayBufferToBase64, getFontByName } from './arabicFonts';
import { toWesternNumerals, formatCertificateDate, formatDefenseDate, formatCertificateIssueDate } from './numerals';
import { fetchPrintSettings, getPaperDimensions, type PrintSettings, DEFAULT_PRINT_SETTINGS } from '@/hooks/usePrintSettings';
import { fetchDateFormatSettings } from '@/hooks/useDateFormatSettings';
import type { DateFormatSettings } from './dateFormats';
import { getTextDirectionFromConfig } from './dateFormats';
import { logger } from './logger';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default Arabic font - must be Unicode-capable and embedded */
const DEFAULT_ARABIC_FONT = 'Amiri';

/** Cache for loaded font data (base64) - shared across documents */
const fontDataCache = new Map<string, string>();

// ============================================================================
// FIELD LANGUAGE DETECTION
// ============================================================================

/**
 * Determine the language of a field based on its key and content
 */
function getFieldLanguage(fieldKey: string, value: string, isRtl?: boolean): FieldLanguage {
  // Explicit language markers in field key
  if (fieldKey.endsWith('_ar')) return 'ar';
  if (fieldKey.endsWith('_fr') || fieldKey.endsWith('_en')) return 'fr';
  
  // RTL flag indicates Arabic
  if (isRtl) return 'ar';
  
  // Content-based detection
  if (containsArabic(value)) {
    // Check if it's mixed with Latin
    if (/[a-zA-Z]/.test(value)) return 'mixed';
    return 'ar';
  }
  
  return 'en';
}

/**
 * Check if a field key represents a date field
 */
function isDateField(fieldKey: string): boolean {
  return (
    fieldKey.includes('date_of_birth') ||
    fieldKey.includes('defense_date') ||
    fieldKey.includes('certificate_date')
  );
}

// ============================================================================
// IMAGE LOADING
// ============================================================================

/**
 * Load an image as base64 for PDF embedding
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    logger.error('[PDF] Failed to load image');
    return null;
  }
}

// ============================================================================
// FONT MANAGEMENT
// ============================================================================

/**
 * Load and register fonts in jsPDF document.
 * 
 * Font Safety Rules:
 * - Always loads DEFAULT_ARABIC_FONT to ensure Arabic text renders correctly
 * - Embedded fonts use Identity-H encoding for Unicode support
 * - System fonts are only used for Latin text fallback
 */
async function registerFonts(doc: jsPDF, fontsNeeded: string[]): Promise<Set<string>> {
  const registeredFonts = new Set<string>();
  const allFontsRegistry = getAllFonts();
  
  // Build set of unique font families to load
  const fontFamiliesToLoad = new Set<string>();
  
  // Always include the default Arabic font
  fontFamiliesToLoad.add(DEFAULT_ARABIC_FONT);
  
  // Resolve each font name to its actual family
  for (const fontName of fontsNeeded) {
    if (!fontName) continue;
    const font = getFontByName(fontName);
    if (font) {
      fontFamiliesToLoad.add(font.family);
    } else {
      fontFamiliesToLoad.add(fontName);
    }
  }
  
  logger.log(`[PDF Fonts] Loading: ${Array.from(fontFamiliesToLoad).join(', ')}`);
  
  for (const fontFamily of fontFamiliesToLoad) {
    const matchingFonts = allFontsRegistry.filter(f => 
      f.family === fontFamily || 
      f.name === fontFamily || 
      f.displayName === fontFamily ||
      f.family.toLowerCase() === fontFamily.toLowerCase() ||
      f.name.toLowerCase() === fontFamily.toLowerCase()
    );
    
    if (matchingFonts.length === 0) {
      logger.warn(`[PDF Fonts] Font not found: ${fontFamily}`);
      continue;
    }

    for (const font of matchingFonts) {
      // Skip system fonts - they don't support Arabic in jsPDF
      if (font.isSystem || !font.url) continue;

      try {
        let fontBase64: string;
        
        if (fontDataCache.has(font.url)) {
          fontBase64 = fontDataCache.get(font.url)!;
        } else {
          const fontBuffer = await loadFontFile(font.url);
          if (!fontBuffer) {
            logger.error(`[PDF Fonts] Failed to load: ${font.url}`);
            continue;
          }
          fontBase64 = arrayBufferToBase64(fontBuffer);
          fontDataCache.set(font.url, fontBase64);
        }
        
        const rawExt = font.url.split('?')[0].split('.').pop()?.toLowerCase();
        const ext = rawExt || 'ttf';
        if (ext !== 'ttf' && ext !== 'otf') {
          logger.warn(`[PDF Fonts] Unsupported format: .${ext}`);
          continue;
        }

        const fileName = `${font.name}.${ext}`;
        
        // Add font to virtual file system
        doc.addFileToVFS(fileName, fontBase64);
        
        // Register with Identity-H for Unicode (Arabic) support
        (doc as any).addFont(fileName, font.family, font.style, 'Identity-H');
        
        registeredFonts.add(`${font.family}:${font.style}`);
        logger.log(`[PDF Fonts] Registered: ${font.family} (${font.style})`);
      } catch (error) {
        logger.error(`[PDF Fonts] Failed to load ${font.family}:`, error);
      }
    }
  }
  
  logger.log(`[PDF Fonts] Total registered: ${registeredFonts.size}`);
  return registeredFonts;
}

/**
 * Set font for a field in jsPDF.
 * 
 * Font Selection Priority:
 * 1. Requested embedded font (if registered)
 * 2. Default Arabic font (for Arabic text)
 * 3. Times (for Latin fallback)
 */
function setFieldFont(
  doc: jsPDF, 
  fontName: string | undefined, 
  fontSize: number, 
  registeredFonts: Set<string>,
  isArabic: boolean
): void {
  const safeSetFont = (family: string, style: string): boolean => {
    try {
      doc.setFont(family, style as any);
      return true;
    } catch {
      return false;
    }
  };

  const font = fontName ? getFontByName(fontName) : undefined;
  
  logger.log(`[PDF Font] Field: "${fontName}", Found: ${font?.family || 'none'}, IsArabic: ${isArabic}`);
  
  // PRIORITY 1: Use registered embedded font
  if (font && !font.isSystem && registeredFonts.has(`${font.family}:${font.style}`)) {
    if (safeSetFont(font.family, font.style)) {
      logger.log(`[PDF Font] ✓ Using embedded: ${font.family}`);
      doc.setFontSize(fontSize);
      return;
    }
  }

  // PRIORITY 2: For Arabic text, ALWAYS use Arabic-capable embedded font
  // System fonts do NOT support Arabic glyphs in jsPDF
  if (isArabic) {
    if (registeredFonts.has(`${DEFAULT_ARABIC_FONT}:normal`) && 
        safeSetFont(DEFAULT_ARABIC_FONT, 'normal')) {
      logger.log(`[PDF Font] ✓ Using ${DEFAULT_ARABIC_FONT} for Arabic`);
      doc.setFontSize(fontSize);
      return;
    }
    
    // Try any other registered font
    for (const key of registeredFonts) {
      const [family] = key.split(':');
      if (safeSetFont(family, 'normal')) {
        logger.log(`[PDF Font] ✓ Fallback Arabic: ${family}`);
        doc.setFontSize(fontSize);
        return;
      }
    }
  }
  
  // PRIORITY 3: For Latin-only text, system fonts are acceptable
  if (!isArabic && font && font.isSystem) {
    if (safeSetFont(font.family, font.style)) {
      logger.log(`[PDF Font] ✓ System font for Latin: ${font.family}`);
      doc.setFontSize(fontSize);
      return;
    }
  }

  // Final fallback
  if (safeSetFont('times', 'normal')) {
    logger.log(`[PDF Font] ⚠ Final fallback: times`);
  }
  doc.setFontSize(fontSize);
}

// ============================================================================
// FIELD VALUE EXTRACTION
// ============================================================================

/**
 * Get the display value for a certificate field.
 * Handles date formatting, mention labels, and numeral conversion.
 */
function getFieldValue(
  student: Record<string, unknown>,
  fieldKey: string,
  dateSettings?: DateFormatSettings
): string {
  // Handle mention fields
  if (fieldKey === 'mention_ar') {
    const mentionValue = student['mention'] as MentionType;
    return mentionValue ? mentionLabels[mentionValue]?.ar || String(mentionValue) : '';
  }
  
  if (fieldKey === 'mention_fr') {
    const mentionValue = student['mention'] as MentionType;
    return mentionValue ? mentionLabels[mentionValue]?.fr || String(mentionValue) : '';
  }
  
  if (fieldKey === 'mention') {
    const mentionValue = student['mention'] as MentionType;
    return mentionValue ? mentionLabels[mentionValue]?.ar || String(mentionValue) : '';
  }

  // Handle bilingual date fields
  if (fieldKey === 'date_of_birth_ar') {
    const value = student['date_of_birth'];
    if (value) {
      try {
        return formatCertificateDate(value as string, true, dateSettings);
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }
  
  if (fieldKey === 'date_of_birth_fr') {
    const value = student['date_of_birth'];
    if (value) {
      try {
        return formatCertificateDate(value as string, false, dateSettings);
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }
  
  if (fieldKey === 'defense_date_ar') {
    const value = student['defense_date'];
    if (value) {
      try {
        return formatDefenseDate(value as string, true, dateSettings);
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }
  
  if (fieldKey === 'defense_date_fr') {
    const value = student['defense_date'];
    if (value) {
      try {
        return formatDefenseDate(value as string, false, dateSettings);
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }
  
  if (fieldKey === 'certificate_date_ar') {
    const value = student['certificate_date'];
    if (value) {
      try {
        return formatCertificateIssueDate(value as string, true, dateSettings);
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }
  
  if (fieldKey === 'certificate_date_fr') {
    const value = student['certificate_date'];
    if (value) {
      try {
        return formatCertificateIssueDate(value as string, false, dateSettings);
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }

  const value = student[fieldKey];
  if (!value) return '';

  // Legacy date fields (default to French format)
  if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
    try {
      return formatCertificateDate(value as string, false, dateSettings);
    } catch {
      return toWesternNumerals(String(value));
    }
  }

  // Convert Hindi numerals to Western Arabic
  return toWesternNumerals(String(value));
}

// ============================================================================
// CORE RENDERING FUNCTION
// ============================================================================

/**
 * Render Arabic date field by splitting into separate parts.
 * This prevents BiDi reordering issues by rendering each component individually.
 * 
 * ONLY applies to defense_date_ar field.
 */
function renderArabicDateFieldSplit(
  doc: jsPDF,
  field: TemplateField,
  value: string,
  registeredFonts: Set<string>
): void {
  // Parse the pre-formatted date string (format: "DD MonthName YYYY")
  const parts = value.trim().split(/\s+/);
  
  if (parts.length < 3) {
    // Fallback: render as single string if parsing fails
    const shaped = shapeArabicText(value);
    doc.text(shaped, field.position_x, field.position_y, { align: 'right' });
    return;
  }
  
  // Extract day, month, year
  const day = parts[0];
  const monthName = parts.slice(1, -1).join(' '); // Handle multi-word months
  const year = parts[parts.length - 1];
  
  // Shape Arabic month name for proper glyph rendering
  const shapedMonth = shapeArabicText(monthName);
  
  // Set font
  setFieldFont(doc, field.font_name, field.font_size, registeredFonts, true);
  doc.setTextColor(field.font_color || '#000000');
  
  // Calculate text widths for positioning
  const yearWidth = doc.getTextWidth(year);
  const monthWidth = doc.getTextWidth(shapedMonth);
  const dayWidth = doc.getTextWidth(day);
  const spaceWidth = doc.getTextWidth(' ');
  
  // For RTL: Start from the right position and render right-to-left
  // Visual order should be: DAY MONTH YEAR (reading right to left)
  // So we render: YEAR first (leftmost), then MONTH, then DAY (rightmost)
  const startX = field.position_x;
  const y = field.position_y;
  
  // Render from right to left (day is rightmost)
  // Day (rightmost - at startX, aligned right)
  doc.text(day, startX, y, { align: 'right' });
  
  // Month (to the left of day)
  const monthX = startX - dayWidth - spaceWidth;
  doc.text(shapedMonth, monthX, y, { align: 'right' });
  
  // Year (leftmost)
  const yearX = monthX - monthWidth - spaceWidth;
  doc.text(year, yearX, y, { align: 'right' });
  
  logger.log(`[PDF Render] Arabic date split: day=${day}, month=${monthName}, year=${year}`);
}

/**
 * Render certificate number (student_number) field by splitting into separate parts.
 * This prevents BiDi reordering issues with mixed Arabic/Latin text like "05/2025/ل م د".
 * 
 * The certificate number format is typically: "XX/YYYY/TEXT" where:
 * - XX is a number
 * - YYYY is a year
 * - TEXT is Arabic text like "ل م د"
 */
function renderCertificateNumberSplit(
  doc: jsPDF,
  field: TemplateField,
  value: string,
  registeredFonts: Set<string>
): void {
  // Set font first to calculate widths correctly
  const hasArabic = containsArabic(value);
  setFieldFont(doc, field.font_name, field.font_size, registeredFonts, hasArabic);
  doc.setTextColor(field.font_color || '#000000');
  
  // Split by "/" to get parts
  const parts = value.split('/').filter(p => p.trim() !== '');
  
  if (parts.length === 0) {
    // Fallback: render as-is
    doc.text(value, field.position_x, field.position_y, { align: 'right' });
    return;
  }
  
  // Process each part - shape Arabic text, keep numbers as-is
  const processedParts = parts.map(part => {
    const trimmed = part.trim();
    if (containsArabic(trimmed)) {
      return shapeArabicText(trimmed);
    }
    return trimmed;
  });
  
  const startX = field.position_x;
  const y = field.position_y;
  const slashWidth = doc.getTextWidth('/');
  
  // For RTL rendering, we render from right to left
  // The rightmost part should be at startX
  let currentX = startX;
  
  for (let i = 0; i < processedParts.length; i++) {
    const part = processedParts[i];
    
    // Render the part
    doc.text(part, currentX, y, { align: 'right' });
    
    // Move left for the next part
    const partWidth = doc.getTextWidth(part);
    currentX = currentX - partWidth;
    
    // Add slash between parts (except after the last one)
    if (i < processedParts.length - 1) {
      doc.text('/', currentX, y, { align: 'right' });
      currentX = currentX - slashWidth;
    }
  }
  
  logger.log(`[PDF Render] Certificate number split: parts=${processedParts.join(', ')}`);
}

/**
 * Render a single field to the PDF document.
 * 
 * This is the core function that processes text and renders it correctly.
 * All Arabic text processing happens here through the centralized utilities.
 * 
 * SPECIAL CASES:
 * - defense_date_ar: uses split rendering to prevent BiDi reversal
 * - student_number: uses split rendering for mixed Arabic/Latin certificate numbers
 */
function renderField(
  doc: jsPDF,
  field: TemplateField,
  value: string,
  registeredFonts: Set<string>,
  dateSettings?: DateFormatSettings
): void {
  if (!value) return;

  // SPECIAL CASE: defense_date_ar - use split rendering for Arabic date
  if (field.field_key === 'defense_date_ar') {
    renderArabicDateFieldSplit(doc, field, value, registeredFonts);
    return;
  }

  // SPECIAL CASE: student_number (certificate number) - use split rendering for mixed content
  if (field.field_key === 'student_number' && containsArabic(value)) {
    renderCertificateNumberSplit(doc, field, value, registeredFonts);
    return;
  }

  // Determine field language
  const language = getFieldLanguage(field.field_key, value, field.is_rtl ?? false);
  const isDateFieldType = isDateField(field.field_key);
  
  // Determine date text direction from settings
  let dateTextDirection: 'rtl' | 'ltr' = 'rtl';
  if (isDateFieldType && dateSettings) {
    const isArabicDateField = field.field_key.endsWith('_ar');
    if (isArabicDateField) {
      // Get the date type from field key
      if (field.field_key.includes('birth')) {
        dateTextDirection = getTextDirectionFromConfig(dateSettings.birthDate, true);
      } else if (field.field_key.includes('defense')) {
        dateTextDirection = getTextDirectionFromConfig(dateSettings.defenseDate, true);
      } else if (field.field_key.includes('certificate')) {
        dateTextDirection = getTextDirectionFromConfig(dateSettings.certificateDate, true);
      }
    }
  }
  
  // Process text for PDF
  const processed: ProcessedText = processTextForPdf(value, {
    language,
    isDateField: isDateFieldType,
    forceRtl: language === 'ar' || language === 'mixed',
    dateTextDirection: dateTextDirection
  });
  
  // Set font (must use Arabic-capable font for Arabic text)
  setFieldFont(doc, field.font_name, field.font_size, registeredFonts, processed.isArabic);
  
  // Set text color
  doc.setTextColor(field.font_color || '#000000');
  
  // Determine alignment
  // Field's explicit alignment takes precedence, otherwise use processed recommendation
  let align: 'left' | 'center' | 'right' = 'center';
  if (field.text_align === 'left') align = 'left';
  else if (field.text_align === 'right') align = 'right';
  else if (field.text_align === 'center') align = 'center';
  else align = processed.align; // Use recommended alignment
  
  // Render text
  // IMPORTANT: Always use the processed text, never raw Arabic strings
  doc.text(processed.text, field.position_x, field.position_y, { align });
  
  logger.log(`[PDF Render] Field: ${field.field_key}, Lang: ${language}, Align: ${align}`);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a PDF document with multiple certificates (one per student).
 * Saves the PDF to the user's device.
 */
export async function generatePDF(
  students: Record<string, unknown>[],
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType,
  printSettings?: PrintSettings
): Promise<void> {
  const settings = printSettings || await fetchPrintSettings();
  const dateFormatSettings = await fetchDateFormatSettings();
  
  const isLandscape = template.page_orientation === 'landscape' || settings.orientation === 'landscape';
  const paperDimensions = getPaperDimensions(settings);
  
  const format = settings.paperSize === 'custom' 
    ? [paperDimensions.width, paperDimensions.height] 
    : settings.paperSize;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format,
    putOnlyUsedFonts: true,
  });

  // Collect and register fonts
  const fontsNeeded = fields
    .filter(f => f.is_visible && f.font_name)
    .map(f => f.font_name);
  const registeredFonts = await registerFonts(doc, fontsNeeded);

  // Process each student
  students.forEach((student, index) => {
    if (index > 0) doc.addPage();

    // Render visible fields
    fields.filter(f => f.is_visible).forEach((field) => {
      const value = getFieldValue(student, field.field_key, dateFormatSettings);
      renderField(doc, field, value, registeredFonts, dateFormatSettings);
    });
  });

  // Save PDF
  const fileName = `certificates_${certificateType}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Generate a PDF for a single student and return as Blob.
 * Used for preview functionality.
 */
export async function generateSinglePDF(
  student: Record<string, unknown>,
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType,
  printSettings?: PrintSettings
): Promise<Blob> {
  const settings = printSettings || await fetchPrintSettings();
  const dateFormatSettings = await fetchDateFormatSettings();
  
  const isLandscape = template.page_orientation === 'landscape' || settings.orientation === 'landscape';
  const paperDimensions = getPaperDimensions(settings);
  
  const format = settings.paperSize === 'custom' 
    ? [paperDimensions.width, paperDimensions.height] 
    : settings.paperSize;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format,
    putOnlyUsedFonts: true,
  });

  const fontsNeeded = fields
    .filter(f => f.is_visible && f.font_name)
    .map(f => f.font_name);
  const registeredFonts = await registerFonts(doc, fontsNeeded);

  // Render visible fields
  fields.filter(f => f.is_visible).forEach((field) => {
    const value = getFieldValue(student, field.field_key, dateFormatSettings);
    renderField(doc, field, value, registeredFonts, dateFormatSettings);
  });

  return doc.output('blob');
}

/**
 * Generate a multi-page PDF and return as Blob.
 * Used by desktop printing integration.
 */
export async function generatePDFBlob(
  students: Record<string, unknown>[],
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType,
  printSettings?: PrintSettings
): Promise<Blob> {
  const settings = printSettings || await fetchPrintSettings();
  const dateFormatSettings = await fetchDateFormatSettings();
  
  const isLandscape = template.page_orientation === 'landscape' || settings.orientation === 'landscape';
  const paperDimensions = getPaperDimensions(settings);
  
  const format = settings.paperSize === 'custom' 
    ? [paperDimensions.width, paperDimensions.height] 
    : settings.paperSize;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format,
    putOnlyUsedFonts: true,
  });

  const fontsNeeded = fields.filter(f => f.is_visible && f.font_name).map(f => f.font_name);
  const registeredFonts = await registerFonts(doc, fontsNeeded);

  students.forEach((student, index) => {
    if (index > 0) doc.addPage();

    fields.filter(f => f.is_visible).forEach((field) => {
      const value = getFieldValue(student, field.field_key, dateFormatSettings);
      renderField(doc, field, value, registeredFonts, dateFormatSettings);
    });
  });

  // Keep certificateType reference for potential future use
  void certificateType;
  return doc.output('blob');
}
