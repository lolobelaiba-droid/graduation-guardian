import jsPDF from 'jspdf';
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from '@/types/certificates';
import { mentionLabels } from '@/types/certificates';
// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Points per mm
const MM_TO_PT = 72 / 25.4;

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
      doc.setFontSize(field.font_size);
      doc.setTextColor(field.font_color);

      // Calculate text position
      let x = field.position_x;
      const y = field.position_y;

      // Handle text alignment
      let align: 'left' | 'center' | 'right' = 'center';
      if (field.text_align === 'left') align = 'left';
      else if (field.text_align === 'right') align = 'right';

      // For RTL text, we need to handle alignment differently
      if (field.is_rtl) {
        // jsPDF handles RTL poorly, so we'll just position the text
        // The user should adjust positions manually for RTL
      }

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

    doc.setFontSize(field.font_size);
    doc.setTextColor(field.font_color);

    let align: 'left' | 'center' | 'right' = 'center';
    if (field.text_align === 'left') align = 'left';
    else if (field.text_align === 'right') align = 'right';

    doc.text(value, field.position_x, field.position_y, { align });
  });

  return doc.output('blob');
}
