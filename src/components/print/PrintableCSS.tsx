/**
 * PrintableCSS - CSS-based printable certificate renderer
 * 
 * Renders the certificate as positioned HTML elements at real mm dimensions.
 * Used with window.print() for native print preview and vector output.
 * 
 * Architecture:
 * 1. Dynamically injects @page CSS with template dimensions
 * 2. Renders fields at exact mm positions using CSS positioning
 * 3. Supports background image with offset/scale
 * 4. Hidden from screen, visible only in @media print
 */

import { useCallback, useMemo } from "react";
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from "@/types/certificates";
import { mentionLabels } from "@/types/certificates";
import { toWesternNumerals, formatCertificateDate, formatDefenseDate, formatCertificateIssueDate } from "@/lib/numerals";
import { getTextDirectionFromConfig } from "@/lib/dateFormats";
import { getFontFamilyCSS } from "@/hooks/useFontLoader";
import type { DateFormatSettings } from "@/lib/dateFormats";

interface PrintableCSSProps {
  student: Record<string, unknown>;
  fields: TemplateField[];
  template: CertificateTemplate;
  certificateType: CertificateType;
  pageWidthMm: number;
  pageHeightMm: number;
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  backgroundScaleX?: number;
  backgroundScaleY?: number;
  dateFormatSettings?: DateFormatSettings;
}

export function PrintableCSS({
  student,
  fields,
  template,
  certificateType,
  pageWidthMm,
  pageHeightMm,
  backgroundOffsetX = 0,
  backgroundOffsetY = 0,
  backgroundScaleX = 100,
  backgroundScaleY = 100,
  dateFormatSettings,
}: PrintableCSSProps) {

  const getFieldValue = useCallback((fieldKey: string, field?: TemplateField): string => {
    // Static text fields
    if (fieldKey.startsWith('static_text_') && field?.field_name_fr) {
      return field.field_name_fr;
    }

    // Mention fields
    if (fieldKey === 'mention_ar') {
      const v = student['mention'] as MentionType;
      return v ? mentionLabels[v]?.ar || String(v) : '';
    }
    if (fieldKey === 'mention_fr') {
      const v = student['mention'] as MentionType;
      return v ? mentionLabels[v]?.fr || String(v) : '';
    }
    if (fieldKey === 'mention') {
      const v = student['mention'] as MentionType;
      return v ? mentionLabels[v]?.ar || String(v) : '';
    }

    // Bilingual date fields
    if (fieldKey === 'date_of_birth_ar') {
      const v = student['date_of_birth'];
      return v ? formatCertificateDate(v as string, true, dateFormatSettings) : '';
    }
    if (fieldKey === 'date_of_birth_fr') {
      const v = student['date_of_birth'];
      return v ? formatCertificateDate(v as string, false, dateFormatSettings) : '';
    }
    if (fieldKey === 'defense_date_ar') {
      const v = student['defense_date'];
      return v ? formatDefenseDate(v as string, true, dateFormatSettings) : '';
    }
    if (fieldKey === 'defense_date_fr') {
      const v = student['defense_date'];
      return v ? formatDefenseDate(v as string, false, dateFormatSettings) : '';
    }
    if (fieldKey === 'certificate_date_ar') {
      const v = student['certificate_date'];
      return v ? formatCertificateIssueDate(v as string, true, dateFormatSettings) : '';
    }
    if (fieldKey === 'certificate_date_fr') {
      const v = student['certificate_date'];
      return v ? formatCertificateIssueDate(v as string, false, dateFormatSettings) : '';
    }

    const value = student[fieldKey];
    
    // Legacy date fields
    if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
      return value ? formatCertificateDate(value as string, false, dateFormatSettings) : '';
    }

    return value ? toWesternNumerals(String(value)) : '';
  }, [student, dateFormatSettings]);

  const getDateFieldDirection = useCallback((fieldKey: string): 'rtl' | 'ltr' | undefined => {
    if (!fieldKey.endsWith('_ar') || !dateFormatSettings) return undefined;
    if (fieldKey.includes('birth')) {
      return getTextDirectionFromConfig(dateFormatSettings.birthDate, true);
    } else if (fieldKey.includes('defense')) {
      return getTextDirectionFromConfig(dateFormatSettings.defenseDate, true);
    } else if (fieldKey.includes('certificate')) {
      return getTextDirectionFromConfig(dateFormatSettings.certificateDate, true);
    }
    return undefined;
  }, [dateFormatSettings]);

  const visibleFields = useMemo(() => fields.filter(f => f.is_visible), [fields]);

  // Font size conversion: the font_size is stored in points for PDF.
  // For CSS print at exact mm dimensions, 1pt = 1/72 inch = 0.3528mm
  // We use pt directly in CSS since browsers handle pt correctly for print.

  return (
    <div
      id="printable-certificate"
      className="printable-certificate-container"
      style={{
        position: 'relative',
        width: `${pageWidthMm}mm`,
        height: `${pageHeightMm}mm`,
        overflow: 'hidden',
        backgroundColor: 'white',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Background image */}
      {template.background_image_url && (
        <img
          src={template.background_image_url}
          alt=""
          style={{
            position: 'absolute',
            width: `${backgroundScaleX}%`,
            height: `${backgroundScaleY}%`,
            objectFit: 'fill',
            transform: `translate(${backgroundOffsetX}mm, ${backgroundOffsetY}mm)`,
            left: `${(100 - backgroundScaleX) / 2}%`,
            top: `${(100 - backgroundScaleY) / 2}%`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Certificate fields */}
      {visibleFields.map((field) => {
        const value = getFieldValue(field.field_key, field);
        if (!value) return null;

        const dateDirection = getDateFieldDirection(field.field_key);
        const fieldDirection = dateDirection !== undefined 
          ? dateDirection 
          : (field.is_rtl ? 'rtl' : 'ltr');

        const hasWidth = field.field_width != null;

        return (
          <div
            key={field.id}
            style={{
              position: 'absolute',
              left: `${field.position_x}mm`,
              top: `${field.position_y}mm`,
              fontSize: `${field.font_size}pt`,
              fontFamily: getFontFamilyCSS(field.font_name),
              color: field.font_color || '#000000',
              textAlign: (field.text_align as 'left' | 'right' | 'center') || 'right',
              direction: fieldDirection,
              whiteSpace: hasWidth ? 'normal' : 'nowrap',
              wordWrap: hasWidth ? 'break-word' : undefined,
              width: hasWidth ? `${field.field_width}mm` : undefined,
              lineHeight: hasWidth ? '1.4' : '1.2',
              margin: 0,
              padding: 0,
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}
