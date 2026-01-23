import { useRef, useEffect } from "react";
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from "@/types/certificates";
import { mentionLabels } from "@/types/certificates";
import { cn } from "@/lib/utils";

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Scale for preview (1mm = 2px for good visibility)
const SCALE = 2;

interface CertificatePreviewProps {
  student: Record<string, unknown>;
  fields: TemplateField[];
  template: CertificateTemplate;
  certificateType: CertificateType;
  selectedFieldId: string | null;
  onFieldClick: (fieldId: string) => void;
}

export function CertificatePreview({
  student,
  fields,
  template,
  certificateType,
  selectedFieldId,
  onFieldClick,
}: CertificatePreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const isLandscape = template.page_orientation === 'landscape';
  const width = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const height = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const getFieldValue = (fieldKey: string): string => {
    const value = student[fieldKey];
    
    if (fieldKey === 'mention' && value) {
      return mentionLabels[value as MentionType]?.ar || String(value);
    }
    
    if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
      if (value) {
        return new Date(value as string).toLocaleDateString('ar-SA');
      }
    }
    
    return value ? String(value) : '';
  };

  const isRtlLanguage = template.language.includes('ar');

  return (
    <div className="overflow-auto bg-muted/30 rounded-lg p-4">
      <div
        ref={canvasRef}
        className="relative bg-white mx-auto border border-border shadow-sm"
        style={{
          width: `${width * SCALE}px`,
          height: `${height * SCALE}px`,
          direction: isRtlLanguage ? 'rtl' : 'ltr',
        }}
      >
        {/* Background image */}
        {template.background_image_url && (
          <img
            src={template.background_image_url}
            alt="خلفية الشهادة"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Grid overlay for positioning help (only when no background) */}
        {!template.background_image_url && (
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: `${10 * SCALE}px ${10 * SCALE}px`,
            }}
          />
        )}

        {/* Fields */}
        {fields.filter(f => f.is_visible).map((field) => (
          <div
            key={field.id}
            className={cn(
              "absolute cursor-pointer transition-all border border-transparent hover:border-primary/50",
              selectedFieldId === field.id && "border-primary border-2 bg-primary/5"
            )}
            style={{
              left: `${field.position_x * SCALE}px`,
              top: `${field.position_y * SCALE}px`,
              fontSize: `${field.font_size * SCALE * 0.35}px`,
              fontFamily: field.font_name,
              color: field.font_color,
              textAlign: field.text_align as 'left' | 'right' | 'center',
              direction: field.is_rtl ? 'rtl' : 'ltr',
              whiteSpace: 'nowrap',
              padding: '2px 4px',
            }}
            onClick={() => onFieldClick(field.id)}
            title={`${field.field_name_ar}: X=${field.position_x}mm, Y=${field.position_y}mm`}
          >
            {getFieldValue(field.field_key) || `[${field.field_name_ar}]`}
          </div>
        ))}

        {/* Corner markers */}
        <div className="absolute top-2 left-2 text-[10px] text-muted-foreground">
          0,0
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
          {width},{height}mm
        </div>
      </div>

      {/* Info bar */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isLandscape ? 'أفقي' : 'عمودي'} • {width}×{height}mm • {template.page_size}
        </span>
        <span>
          {fields.length} حقل • مقياس {SCALE}:1
        </span>
      </div>
    </div>
  );
}
