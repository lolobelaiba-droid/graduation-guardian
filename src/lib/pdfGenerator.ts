import jsPDF from 'jspdf';
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from '@/types/certificates';
import { mentionLabels } from '@/types/certificates';
import { allFonts, loadFontFile, arrayBufferToBase64, getFontByName, type FontConfig } from './arabicFonts';
import { toWesternNumerals, formatCertificateDate } from './numerals';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

/**
 * Reshape Arabic text for proper rendering in PDF
 * Arabic text needs to be reshaped because jsPDF doesn't handle Arabic ligatures
 */
function reshapeArabicText(text: string): string {
  if (!text) return '';
  
  // Check if text contains Arabic characters
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (!arabicRegex.test(text)) {
    return text; // Return as-is if no Arabic
  }

  // Arabic character forms mapping (isolated, initial, medial, final)
  const arabicForms: { [key: string]: [string, string, string, string] } = {
    'ا': ['ﺍ', 'ﺍ', 'ﺎ', 'ﺎ'],
    'أ': ['ﺃ', 'ﺃ', 'ﺄ', 'ﺄ'],
    'إ': ['ﺇ', 'ﺇ', 'ﺈ', 'ﺈ'],
    'آ': ['ﺁ', 'ﺁ', 'ﺂ', 'ﺂ'],
    'ب': ['ﺏ', 'ﺑ', 'ﺒ', 'ﺐ'],
    'ت': ['ﺕ', 'ﺗ', 'ﺘ', 'ﺖ'],
    'ث': ['ﺙ', 'ﺛ', 'ﺜ', 'ﺚ'],
    'ج': ['ﺝ', 'ﺟ', 'ﺠ', 'ﺞ'],
    'ح': ['ﺡ', 'ﺣ', 'ﺤ', 'ﺢ'],
    'خ': ['ﺥ', 'ﺧ', 'ﺨ', 'ﺦ'],
    'د': ['ﺩ', 'ﺩ', 'ﺪ', 'ﺪ'],
    'ذ': ['ﺫ', 'ﺫ', 'ﺬ', 'ﺬ'],
    'ر': ['ﺭ', 'ﺭ', 'ﺮ', 'ﺮ'],
    'ز': ['ﺯ', 'ﺯ', 'ﺰ', 'ﺰ'],
    'س': ['ﺱ', 'ﺳ', 'ﺴ', 'ﺲ'],
    'ش': ['ﺵ', 'ﺷ', 'ﺸ', 'ﺶ'],
    'ص': ['ﺹ', 'ﺻ', 'ﺼ', 'ﺺ'],
    'ض': ['ﺽ', 'ﺿ', 'ﻀ', 'ﺾ'],
    'ط': ['ﻁ', 'ﻃ', 'ﻄ', 'ﻂ'],
    'ظ': ['ﻅ', 'ﻇ', 'ﻈ', 'ﻆ'],
    'ع': ['ﻉ', 'ﻋ', 'ﻌ', 'ﻊ'],
    'غ': ['ﻍ', 'ﻏ', 'ﻐ', 'ﻎ'],
    'ف': ['ﻑ', 'ﻓ', 'ﻔ', 'ﻒ'],
    'ق': ['ﻕ', 'ﻗ', 'ﻘ', 'ﻖ'],
    'ك': ['ﻙ', 'ﻛ', 'ﻜ', 'ﻚ'],
    'ل': ['ﻝ', 'ﻟ', 'ﻠ', 'ﻞ'],
    'م': ['ﻡ', 'ﻣ', 'ﻤ', 'ﻢ'],
    'ن': ['ﻥ', 'ﻧ', 'ﻨ', 'ﻦ'],
    'ه': ['ﻩ', 'ﻫ', 'ﻬ', 'ﻪ'],
    'و': ['ﻭ', 'ﻭ', 'ﻮ', 'ﻮ'],
    'ي': ['ﻱ', 'ﻳ', 'ﻴ', 'ﻲ'],
    'ى': ['ﻯ', 'ﻯ', 'ﻰ', 'ﻰ'],
    'ة': ['ﺓ', 'ﺓ', 'ﺔ', 'ﺔ'],
    'ء': ['ء', 'ء', 'ء', 'ء'],
    'ؤ': ['ﺅ', 'ﺅ', 'ﺆ', 'ﺆ'],
    'ئ': ['ﺉ', 'ﺋ', 'ﺌ', 'ﺊ'],
    'لا': ['ﻻ', 'ﻻ', 'ﻼ', 'ﻼ'],
    'لأ': ['ﻷ', 'ﻷ', 'ﻸ', 'ﻸ'],
    'لإ': ['ﻹ', 'ﻹ', 'ﻺ', 'ﻺ'],
    'لآ': ['ﻵ', 'ﻵ', 'ﻶ', 'ﻶ'],
  };

  // Characters that don't connect to the next character
  const nonConnecting = new Set(['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ة', 'ء', 'ى']);

  // Process each word separately
  const words = text.split(/(\s+)/);
  const reshapedWords = words.map(word => {
    if (/^\s+$/.test(word)) return word; // Keep whitespace as-is
    
    const chars = [...word];
    let result = '';
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const prevChar = i > 0 ? chars[i - 1] : null;
      const nextChar = i < chars.length - 1 ? chars[i + 1] : null;
      
      // Check for ligatures (لا، لأ، لإ، لآ)
      if (char === 'ل' && nextChar && ['ا', 'أ', 'إ', 'آ'].includes(nextChar)) {
        const ligature = char + nextChar;
        const forms = arabicForms[ligature];
        if (forms) {
          const prevConnects = prevChar && arabicForms[prevChar] && !nonConnecting.has(prevChar);
          result += prevConnects ? forms[3] : forms[0]; // final or isolated
          i++; // Skip the next character
          continue;
        }
      }
      
      const forms = arabicForms[char];
      if (!forms) {
        result += char; // Non-Arabic character
        continue;
      }
      
      const prevConnects = prevChar && arabicForms[prevChar] && !nonConnecting.has(prevChar);
      const nextConnects = nextChar && arabicForms[nextChar];
      
      let formIndex: number;
      if (prevConnects && nextConnects) {
        formIndex = 2; // medial
      } else if (prevConnects) {
        formIndex = 3; // final
      } else if (nextConnects) {
        formIndex = 1; // initial
      } else {
        formIndex = 0; // isolated
      }
      
      result += forms[formIndex];
    }
    
    return result;
  });

  // Reverse for RTL display in PDF
  return reshapedWords.join('').split('').reverse().join('');
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

// Cache for loaded fonts in jsPDF format
const loadedFontsForPDF = new Set<string>();

// Default Arabic font to use as fallback
const DEFAULT_ARABIC_FONT = 'Cairo';

/**
 * Load and register fonts in jsPDF document
 * Always loads a default Arabic font first to ensure Arabic text renders correctly
 */
async function registerFonts(doc: jsPDF, fontsNeeded: string[]): Promise<void> {
  // Always ensure we have at least one Arabic font loaded as fallback
  const uniqueFonts = [...new Set([DEFAULT_ARABIC_FONT, ...fontsNeeded])];
  
  for (const fontFamily of uniqueFonts) {
    // Find matching fonts (normal and bold variants)
    const matchingFonts = allFonts.filter(f => 
      f.family === fontFamily || 
      f.name === fontFamily || 
      f.displayName === fontFamily ||
      f.family.toLowerCase() === fontFamily.toLowerCase() ||
      f.name.toLowerCase() === fontFamily.toLowerCase()
    );
    
    if (matchingFonts.length === 0) {
      console.warn(`Font not found: ${fontFamily}, will use fallback`);
      continue;
    }

    for (const font of matchingFonts) {
      // Skip system fonts - they're built into jsPDF but don't support Arabic
      if (font.isSystem) {
        continue;
      }

      const fontKey = `${font.family}-${font.style}`;
      
      // Skip if already loaded
      if (loadedFontsForPDF.has(fontKey)) {
        continue;
      }

      // Skip if no URL (system font)
      if (!font.url) {
        continue;
      }

      try {
        const fontBuffer = await loadFontFile(font.url);
        if (fontBuffer) {
          const fontBase64 = arrayBufferToBase64(fontBuffer);
          const fileName = `${font.name}.ttf`;
          
          // Add font file to virtual file system
          doc.addFileToVFS(fileName, fontBase64);
          
          // Register the font
          doc.addFont(fileName, font.family, font.style);
          
          loadedFontsForPDF.add(fontKey);
          console.log(`Loaded font: ${font.family} (${font.style})`);
        }
      } catch (error) {
        console.error(`Failed to load font ${font.family}:`, error);
      }
    }
  }
}

/**
 * Set font for a field in jsPDF
 * Falls back to Cairo (Arabic font) if the requested font is not available
 */
function setFieldFont(doc: jsPDF, fontName: string | undefined, fontSize: number): void {
  if (!fontName) {
    // Use default Arabic font
    try {
      doc.setFont(DEFAULT_ARABIC_FONT, 'normal');
    } catch {
      console.warn('Default Arabic font not available');
    }
    doc.setFontSize(fontSize);
    return;
  }

  const font = getFontByName(fontName);
  if (font) {
    try {
      doc.setFont(font.family, font.style);
    } catch {
      // Font not loaded, try fallback to Cairo
      console.warn(`Font ${fontName} not available, using Cairo fallback`);
      try {
        doc.setFont(DEFAULT_ARABIC_FONT, 'normal');
      } catch {
        console.warn('Cairo fallback also failed');
      }
    }
  } else {
    // Unknown font, use default Arabic
    try {
      doc.setFont(DEFAULT_ARABIC_FONT, 'normal');
    } catch {
      console.warn('Default Arabic font not available');
    }
  }
  
  doc.setFontSize(fontSize);
}

export async function generatePDF(
  students: Record<string, unknown>[],
  fields: TemplateField[],
  template: CertificateTemplate,
  certificateType: CertificateType
): Promise<void> {
  const isLandscape = template.page_orientation === 'landscape';
  const pageWidth = isLandscape ? A4_HEIGHT : A4_WIDTH;
  const pageHeight = isLandscape ? A4_WIDTH : A4_HEIGHT;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  // Collect all fonts needed from fields
  const fontsNeeded = fields
    .filter(f => f.is_visible && f.font_name)
    .map(f => f.font_name);

  // Register fonts
  await registerFonts(doc, fontsNeeded);

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
      setFieldFont(doc, field.font_name, field.font_size);
      doc.setTextColor(field.font_color);

      // Calculate text position
      const x = field.position_x;
      const y = field.position_y;

      // Handle text alignment
      let align: 'left' | 'center' | 'right' = 'center';
      if (field.text_align === 'left') align = 'left';
      else if (field.text_align === 'right') align = 'right';

      // Reshape Arabic text for proper rendering
      const reshapedValue = reshapeArabicText(value);
      doc.text(reshapedValue, x, y, { align });
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
        return formatCertificateDate(value as string, true); // Arabic format
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
        return formatCertificateDate(value as string, false); // French format
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
  certificateType: CertificateType
): Promise<Blob> {
  const isLandscape = template.page_orientation === 'landscape';
  const pageWidth = isLandscape ? A4_HEIGHT : A4_WIDTH;
  const pageHeight = isLandscape ? A4_WIDTH : A4_HEIGHT;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  // Collect all fonts needed from fields
  const fontsNeeded = fields
    .filter(f => f.is_visible && f.font_name)
    .map(f => f.font_name);

  // Register fonts
  await registerFonts(doc, fontsNeeded);

  // NOTE: Background is NOT included in PDF - it's only for visual positioning in preview
  // The PDF is designed to print on pre-printed certificate paper

  // Add visible fields
  fields.filter(f => f.is_visible).forEach((field) => {
    const value = getFieldValue(student, field.field_key);
    if (!value) return;

    // Set font properties
    setFieldFont(doc, field.font_name, field.font_size);
    doc.setTextColor(field.font_color);

    let align: 'left' | 'center' | 'right' = 'center';
    if (field.text_align === 'left') align = 'left';
    else if (field.text_align === 'right') align = 'right';

    // Reshape Arabic text for proper rendering
    const reshapedValue = reshapeArabicText(value);
    doc.text(reshapedValue, field.position_x, field.position_y, { align });
  });

  return doc.output('blob');
}
