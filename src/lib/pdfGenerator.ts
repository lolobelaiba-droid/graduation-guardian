import jsPDF from 'jspdf';
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from '@/types/certificates';
import { mentionLabels } from '@/types/certificates';
import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';
import { getAllFonts, loadFontFile, arrayBufferToBase64, getFontByName } from './arabicFonts';
import { toWesternNumerals, formatCertificateDate, formatDefenseDate } from './numerals';
import { fetchPrintSettings, getPaperDimensions, type PrintSettings, DEFAULT_PRINT_SETTINGS } from '@/hooks/usePrintSettings';

// Default A4 dimensions in mm (fallback)
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Bidi reordering is required because jsPDF doesn't implement the Unicode BiDi algorithm.
// We reorder *after* shaping so Arabic letters stay connected and the visual order becomes correct.
const bidi = (bidiFactory as any)();

function isArabicText(text: string): boolean {
  return !!text && ARABIC_REGEX.test(text);
}

/**
 * Robust Arabic shaping (ligatures + contextual forms) using arabic-reshaper.
 * This produces Arabic Presentation Forms that jsPDF can draw when the font is embedded with Identity-H.
 */
function shapeArabicText(text: string): string {
  if (!text) return '';
  if (!isArabicText(text)) return text;
  try {
    // arabic-reshaper is CommonJS; depending on bundler it may appear as default or direct export.
    const reshaper =
      (ArabicReshaper as any)?.convertArabic ? (ArabicReshaper as any) : (ArabicReshaper as any)?.default;
    // arabic-reshaper returns a string of presentation forms.
    return reshaper?.convertArabic?.(text) ?? text;
  } catch (e) {
    console.warn('Arabic shaping failed, falling back to raw text', e);
    return text;
  }
}

/**
 * Convert logical Arabic string into a visually-correct string for jsPDF:
 * 1) Arabic shaping (presentation forms)
 * 2) BiDi reordering (RTL)
 */
function prepareArabicForPdf(text: string): string {
  const reshaped = shapeArabicText(text);
  try {
    // bidi-js API: getReorderedInfo(str, baseDir) -> { text: string, ... }
    const info = bidi?.getReorderedInfo?.(reshaped, 'rtl');
    return info?.text ?? reshaped;
  } catch (e) {
    console.warn('Bidi reorder failed, falling back to reshaped text', e);
    return reshaped;
  }
}

// Load image as base64
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
  } catch (error) {
    console.error('Failed to load image:', error);
    return null;
  }
}

// Cache for loaded font data (ArrayBuffer) - shared across documents
const fontDataCache = new Map<string, string>(); // url -> base64

// Default Arabic font to use as fallback
const DEFAULT_ARABIC_FONT = 'Amiri';

/**
 * Load and register fonts in jsPDF document
 * Always loads a default Arabic font first to ensure Arabic text renders correctly
 * NOTE: Each jsPDF document needs fonts registered separately
 */
async function registerFonts(doc: jsPDF, fontsNeeded: string[]): Promise<Set<string>> {
  const registeredFonts = new Set<string>(); // key: "family:style"
  const allFontsRegistry = getAllFonts();
  
  // Build a set of unique font families we need to load
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
      // Try direct match as family name
      fontFamiliesToLoad.add(fontName);
    }
  }
  
  console.log(`[PDF Fonts] Fonts to load: ${Array.from(fontFamiliesToLoad).join(', ')}`);
  
  for (const fontFamily of fontFamiliesToLoad) {
    // Find matching fonts (normal and bold variants)
    const matchingFonts = allFontsRegistry.filter(f => 
      f.family === fontFamily || 
      f.name === fontFamily || 
      f.displayName === fontFamily ||
      f.family.toLowerCase() === fontFamily.toLowerCase() ||
      f.name.toLowerCase() === fontFamily.toLowerCase()
    );
    
    if (matchingFonts.length === 0) {
      console.warn(`[PDF Fonts] Font not found in registry: ${fontFamily}, will use fallback`);
      continue;
    }

    for (const font of matchingFonts) {
      // Skip system fonts - they're built into jsPDF but don't support Arabic
      if (font.isSystem) {
        console.log(`[PDF Fonts] Skipping system font: ${font.family}`);
        continue;
      }

      // Skip if no URL (system font)
      if (!font.url) {
        continue;
      }

      try {
        let fontBase64: string;
        
        // Check if we have cached the base64 data
        if (fontDataCache.has(font.url)) {
          fontBase64 = fontDataCache.get(font.url)!;
        } else {
          // Load and convert to base64
          const fontBuffer = await loadFontFile(font.url);
          if (!fontBuffer) {
            console.error(`[PDF Fonts] Failed to load font buffer: ${font.url}`);
            continue;
          }
          fontBase64 = arrayBufferToBase64(fontBuffer);
          fontDataCache.set(font.url, fontBase64);
        }
        
        const rawExt = font.url.split('?')[0].split('.').pop()?.toLowerCase();
        const ext = rawExt || 'ttf';
        if (ext !== 'ttf' && ext !== 'otf') {
          console.warn(`[PDF Fonts] Unsupported font format: .${ext} (${font.family}). Use TTF/OTF.`);
          continue;
        }

        const fileName = `${font.name}.${ext}`;
        
        // Add font file to virtual file system for THIS document
        doc.addFileToVFS(fileName, fontBase64);
        
        // Register the font for THIS document
        // Use Identity-H so Unicode glyphs (Arabic) map correctly.
        (doc as any).addFont(fileName, font.family, font.style, 'Identity-H');
        
        registeredFonts.add(`${font.family}:${font.style}`);
        console.log(`[PDF Fonts] Registered: ${font.family} (${font.style})`);
      } catch (error) {
        console.error(`[PDF Fonts] Failed to load font ${font.family}:`, error);
      }
    }
  }
  
  console.log(`[PDF Fonts] Total registered: ${registeredFonts.size} fonts`);
  return registeredFonts;
}

/**
 * Set font for a field in jsPDF
 * Falls back to Amiri (Arabic font) if the requested font is not available
 */
function setFieldFont(doc: jsPDF, fontName: string | undefined, fontSize: number, registeredFonts: Set<string>): void {
  const safeSetFont = (family: string, style: string) => {
    try {
      doc.setFont(family, style as any);
      return true;
    } catch {
      return false;
    }
  };

  const fallbackArabic = () => safeSetFont(DEFAULT_ARABIC_FONT, 'normal');
  const fallbackLatin = () => safeSetFont('times', 'normal');

  // If no font specified, default to Arabic fallback (safe for mixed templates)
  if (!fontName) {
    if (!fallbackArabic()) fallbackLatin();
    doc.setFontSize(fontSize);
    return;
  }

  const font = getFontByName(fontName);
  const textLooksArabic = font?.isArabic ?? false;

  // System fonts: available without embedding, but NOT reliable for Arabic glyphs.
  if (font?.isSystem) {
    // If a system font was chosen but we need Arabic, force Arabic fallback.
    if (textLooksArabic) {
      if (!fallbackArabic()) fallbackLatin();
    } else {
      if (!safeSetFont(font.family, font.style)) fallbackLatin();
    }
    doc.setFontSize(fontSize);
    return;
  }

  // Embedded fonts: must be registered per document.
  if (font && registeredFonts.has(`${font.family}:${font.style}`)) {
    if (!safeSetFont(font.family, font.style)) {
      // Fallback if something went wrong
      if (!fallbackArabic()) fallbackLatin();
    }
  } else {
    // Unknown/unregistered font
    if (!fallbackArabic()) fallbackLatin();
  }

  doc.setFontSize(fontSize);
}

function setFieldFontForText(
  doc: jsPDF,
  fontName: string | undefined,
  fontSize: number,
  registeredFonts: Set<string>,
  opts: { isArabic: boolean }
): void {
  const safeSetFont = (family: string, style: string): boolean => {
    try {
      doc.setFont(family, style as any);
      return true;
    } catch {
      return false;
    }
  };

  // Try to find the font by name in our registry
  const font = fontName ? getFontByName(fontName) : undefined;
  
  console.log(`[PDF Font] Field font: "${fontName}", Found: ${font?.family || 'none'}, IsSystem: ${font?.isSystem}, IsArabic: ${opts.isArabic}`);
  
  // PRIORITY 1: Use registered (embedded) fonts - they work for all text types
  if (font && !font.isSystem && registeredFonts.has(`${font.family}:${font.style}`)) {
    if (safeSetFont(font.family, font.style)) {
      console.log(`[PDF Font] ✓ Using embedded font: ${font.family} (${font.style})`);
      doc.setFontSize(fontSize);
      return;
    }
  }

  // PRIORITY 2: For Arabic text, ALWAYS use an Arabic-capable embedded font
  // System fonts like "times" do NOT support Arabic glyphs in jsPDF
  if (opts.isArabic) {
    // Try to find a registered Arabic font
    if (registeredFonts.has(`${DEFAULT_ARABIC_FONT}:normal`) && safeSetFont(DEFAULT_ARABIC_FONT, 'normal')) {
      console.log(`[PDF Font] ✓ Using ${DEFAULT_ARABIC_FONT} for Arabic text (system fonts don't support Arabic in PDF)`);
      doc.setFontSize(fontSize);
      return;
    }
    
    // Try any other registered Arabic font
    for (const key of registeredFonts) {
      const [family] = key.split(':');
      if (safeSetFont(family, 'normal')) {
        console.log(`[PDF Font] ✓ Using fallback Arabic font: ${family}`);
        doc.setFontSize(fontSize);
        return;
      }
    }
  }
  
  // PRIORITY 3: For Latin-only text, system fonts are acceptable
  if (!opts.isArabic && font && font.isSystem) {
    if (safeSetFont(font.family, font.style)) {
      console.log(`[PDF Font] ✓ Using system font for Latin text: ${font.family}`);
      doc.setFontSize(fontSize);
      return;
    }
  }

  // Final fallback
  if (safeSetFont('times', 'normal')) {
    console.log(`[PDF Font] ⚠ Final fallback to times`);
  }
  doc.setFontSize(fontSize);
}

export async function generatePDF(
  students: Record<string, unknown>[],
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType,
  printSettings?: PrintSettings
): Promise<void> {
  // Fetch print settings if not provided
  const settings = printSettings || await fetchPrintSettings();
  
  // Use template orientation or fall back to settings
  const isLandscape = template.page_orientation === 'landscape' || settings.orientation === 'landscape';
  
  // Get paper dimensions from settings
  const paperDimensions = getPaperDimensions(settings);
  const pageWidth = isLandscape ? paperDimensions.height : paperDimensions.width;
  const pageHeight = isLandscape ? paperDimensions.width : paperDimensions.height;

  // Determine the format for jsPDF
  const format = settings.paperSize === 'custom' 
    ? [paperDimensions.width, paperDimensions.height] 
    : settings.paperSize;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format,
    putOnlyUsedFonts: true,
  });

  // Collect all fonts needed from fields
  const fontsNeeded = fields
    .filter(f => f.is_visible && f.font_name)
    .map(f => f.font_name);

  // Register fonts
  const registeredFonts = await registerFonts(doc, fontsNeeded);

  // NOTE: Background is NOT included in PDF - it's only for visual positioning in preview
  // The PDF is designed to print on pre-printed certificate paper

  // Process each student
  students.forEach((student, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // NO background image in PDF - printing on pre-printed paper

    // Add visible fields
    fields.filter(f => f.is_visible).forEach((field) => {
      const value = getFieldValue(student, field.field_key);
      if (!value) return;

      // Set font properties
      const valueIsArabic = !!field.is_rtl || isArabicText(value);
      setFieldFontForText(doc, field.font_name, field.font_size, registeredFonts, { isArabic: valueIsArabic });
      doc.setTextColor(field.font_color || '#000000');

      // Calculate text position
      const x = field.position_x;
      const y = field.position_y;

      // Handle text alignment
      let align: 'left' | 'center' | 'right' = 'center';
      if (field.text_align === 'left') align = 'left';
      else if (field.text_align === 'right') align = 'right';

      if (valueIsArabic) {
        const prepared = prepareArabicForPdf(value);
        doc.text(prepared, x, y, { align } as any);
      } else {
        doc.text(value, x, y, { align });
      }
    });
  });

  // Save the PDF
  const fileName = `certificates_${certificateType}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

function getFieldValue(student: Record<string, unknown>, fieldKey: string): string {
  // Handle mention fields - convert enum to display text
  if (fieldKey === 'mention_ar') {
    const mentionValue = student['mention'] as MentionType;
    if (mentionValue) {
      return mentionLabels[mentionValue]?.ar || String(mentionValue);
    }
    return '';
  }
  
  if (fieldKey === 'mention_fr') {
    const mentionValue = student['mention'] as MentionType;
    if (mentionValue) {
      return mentionLabels[mentionValue]?.fr || String(mentionValue);
    }
    return '';
  }
  
  // Legacy support for old 'mention' field key
  if (fieldKey === 'mention') {
    const mentionValue = student['mention'] as MentionType;
    if (mentionValue) {
      return mentionLabels[mentionValue]?.ar || String(mentionValue);
    }
    return '';
  }

  // Handle bilingual date fields - they all use the same source data
  // Arabic dates: yyyy/mm/dd (reads day/month/year RTL)
  // French dates: dd/mm/yyyy (reads day/month/year LTR)
  if (fieldKey === 'date_of_birth_ar') {
    const value = student['date_of_birth'];
    if (value) {
      try {
        return formatCertificateDate(value as string, true); // Arabic format
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
        return formatCertificateDate(value as string, false); // French format
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
        return formatDefenseDate(value as string, true); // Arabic format with month name
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
        return formatDefenseDate(value as string, false); // French format with month name
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
        return formatCertificateDate(value as string, true); // Arabic format
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
        return formatCertificateDate(value as string, false); // French format
      } catch {
        return toWesternNumerals(String(value));
      }
    }
    return '';
  }

  const value = student[fieldKey];
  
  if (!value) return '';

  // Legacy date fields support (default to French format)
  if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
    try {
      return formatCertificateDate(value as string, false);
    } catch {
      return toWesternNumerals(String(value));
    }
  }

  // Convert any Hindi numerals to Western Arabic for all values
  return toWesternNumerals(String(value));
}

// Export function to generate PDF for a single student (for preview)
export async function generateSinglePDF(
  student: Record<string, unknown>,
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType,
  printSettings?: PrintSettings
): Promise<Blob> {
  // Fetch print settings if not provided
  const settings = printSettings || await fetchPrintSettings();
  
  // Use template orientation or fall back to settings
  const isLandscape = template.page_orientation === 'landscape' || settings.orientation === 'landscape';
  
  // Get paper dimensions from settings
  const paperDimensions = getPaperDimensions(settings);
  const pageWidth = isLandscape ? paperDimensions.height : paperDimensions.width;
  const pageHeight = isLandscape ? paperDimensions.width : paperDimensions.height;

  // Determine the format for jsPDF
  const format = settings.paperSize === 'custom' 
    ? [paperDimensions.width, paperDimensions.height] 
    : settings.paperSize;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format,
    putOnlyUsedFonts: true,
  });

  // Collect all fonts needed from fields
  const fontsNeeded = fields
    .filter(f => f.is_visible && f.font_name)
    .map(f => f.font_name);

  // Register fonts
  const registeredFonts = await registerFonts(doc, fontsNeeded);

  // NOTE: Background is NOT included in PDF - it's only for visual positioning in preview
  // The PDF is designed to print on pre-printed certificate paper

  // Add visible fields
  fields.filter(f => f.is_visible).forEach((field) => {
    const value = getFieldValue(student, field.field_key);
    if (!value) return;

    // Set font properties
    const valueIsArabic = !!field.is_rtl || isArabicText(value);
    setFieldFontForText(doc, field.font_name, field.font_size, registeredFonts, { isArabic: valueIsArabic });
    doc.setTextColor(field.font_color || '#000000');

    let align: 'left' | 'center' | 'right' = 'center';
    if (field.text_align === 'left') align = 'left';
    else if (field.text_align === 'right') align = 'right';

    if (valueIsArabic) {
      const prepared = prepareArabicForPdf(value);
      doc.text(prepared, field.position_x, field.position_y, { align } as any);
    } else {
      doc.text(value, field.position_x, field.position_y, { align });
    }
  });

  return doc.output('blob');
}

// Generate a multi-page PDF as a Blob (used by desktop printing integration)
export async function generatePDFBlob(
  students: Record<string, unknown>[],
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType,
  printSettings?: PrintSettings
): Promise<Blob> {
  // Fetch print settings if not provided
  const settings = printSettings || await fetchPrintSettings();
  
  // Use template orientation or fall back to settings
  const isLandscape = template.page_orientation === 'landscape' || settings.orientation === 'landscape';
  
  // Get paper dimensions from settings
  const paperDimensions = getPaperDimensions(settings);

  // Determine the format for jsPDF
  const format = settings.paperSize === 'custom' 
    ? [paperDimensions.width, paperDimensions.height] 
    : settings.paperSize;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format,
    putOnlyUsedFonts: true,
  });

  const fontsNeeded = fields.filter((f) => f.is_visible && f.font_name).map((f) => f.font_name);
  const registeredFonts = await registerFonts(doc, fontsNeeded);

  students.forEach((student, index) => {
    if (index > 0) doc.addPage();

    fields
      .filter((f) => f.is_visible)
      .forEach((field) => {
        const value = getFieldValue(student, field.field_key);
        if (!value) return;

        const valueIsArabic = !!field.is_rtl || isArabicText(value);
        setFieldFontForText(doc, field.font_name, field.font_size, registeredFonts, { isArabic: valueIsArabic });
        doc.setTextColor(field.font_color || '#000000');

        let align: 'left' | 'center' | 'right' = 'center';
        if (field.text_align === 'left') align = 'left';
        else if (field.text_align === 'right') align = 'right';

        if (valueIsArabic) {
          doc.text(prepareArabicForPdf(value), field.position_x, field.position_y, { align } as any);
        } else {
          doc.text(value, field.position_x, field.position_y, { align });
        }
      });
  });

  // Keep filename semantics for callers if needed
  void certificateType;
  return doc.output('blob');
}
