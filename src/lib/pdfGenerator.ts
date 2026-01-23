import jsPDF from 'jspdf';
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from '@/types/certificates';
import { mentionLabels } from '@/types/certificates';
import { allFonts, loadFontFile, arrayBufferToBase64, getFontByName, type FontConfig } from './arabicFonts';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

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

/**
 * Load and register fonts in jsPDF document
 */
async function registerFonts(doc: jsPDF, fontsNeeded: string[]): Promise<void> {
  const uniqueFonts = [...new Set(fontsNeeded)];
  
  for (const fontFamily of uniqueFonts) {
    // Find matching fonts (normal and bold variants)
    const matchingFonts = allFonts.filter(f => 
      f.family === fontFamily || 
      f.name === fontFamily || 
      f.displayName === fontFamily ||
      f.family.toLowerCase() === fontFamily.toLowerCase()
    );
    
    if (matchingFonts.length === 0) {
      console.warn(`Font not found: ${fontFamily}, using default`);
      continue;
    }

    for (const font of matchingFonts) {
      // Skip system fonts - they're built into jsPDF
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
 */
function setFieldFont(doc: jsPDF, fontName: string | undefined, fontSize: number): void {
  if (!fontName) {
    doc.setFontSize(fontSize);
    return;
  }

  const font = getFontByName(fontName);
  if (font) {
    try {
      doc.setFont(font.family, font.style);
    } catch {
      // Font not loaded, use default
      console.warn(`Font ${fontName} not available, using default`);
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

  // Load background image if exists
  let backgroundBase64: string | null = null;
  if (template.background_image_url) {
    backgroundBase64 = await loadImageAsBase64(template.background_image_url);
  }

  // Process each student
  students.forEach((student, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Add background image
    if (backgroundBase64) {
      doc.addImage(backgroundBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

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

      doc.text(value, x, y, { align });
    });
  });

  // Save the PDF
  const fileName = `certificates_${certificateType}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

function getFieldValue(student: Record<string, unknown>, fieldKey: string): string {
  const value = student[fieldKey];
  
  if (!value) return '';

  // Handle special fields
  if (fieldKey === 'mention') {
    return mentionLabels[value as MentionType]?.ar || String(value);
  }

  // Handle date fields
  if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
    try {
      return new Date(value as string).toLocaleDateString('ar-SA');
    } catch {
      return String(value);
    }
  }

  return String(value);
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

  // Load background image if exists
  if (template.background_image_url) {
    const backgroundBase64 = await loadImageAsBase64(template.background_image_url);
    if (backgroundBase64) {
      doc.addImage(backgroundBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    }
  }

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

    doc.text(value, field.position_x, field.position_y, { align });
  });

  return doc.output('blob');
}
