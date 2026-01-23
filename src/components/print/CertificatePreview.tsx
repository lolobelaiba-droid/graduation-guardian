import { useRef, useState } from "react";
import { Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Eye, EyeOff } from "lucide-react";
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from "@/types/certificates";
import { mentionLabels } from "@/types/certificates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onFieldMove?: (fieldId: string, direction: 'up' | 'down' | 'left' | 'right', stepSize: number) => void;
  onToggleFieldVisibility?: (fieldId: string, visible: boolean) => void;
  stepSize?: number;
  isMoving?: boolean;
}

export function CertificatePreview({
  student,
  fields,
  template,
  certificateType,
  selectedFieldId,
  onFieldClick,
  onFieldMove,
  onToggleFieldVisibility,
  stepSize = 1,
  isMoving = false,
}: CertificatePreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);

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
  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showControls ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowControls(!showControls)}
                >
                  <Move className="h-4 w-4 ml-1" />
                  {showControls ? "إخفاء أدوات التحريك" : "إظهار أدوات التحريك"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showControls ? "إخفاء أزرار التحريك" : "إظهار أزرار التحريك على الحقول"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {selectedField && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">
              X: {selectedField.position_x} | Y: {selectedField.position_y} مم
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedField.field_name_ar}
            </span>
          </div>
        )}
      </div>

      {/* Canvas */}
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
          {fields.map((field) => {
            const isSelected = selectedFieldId === field.id;
            const isVisible = field.is_visible;

            return (
              <div
                key={field.id}
                className={cn(
                  "absolute transition-all group",
                  isVisible ? "cursor-pointer" : "cursor-pointer opacity-40",
                  isSelected && "z-10"
                )}
                style={{
                  left: `${field.position_x * SCALE}px`,
                  top: `${field.position_y * SCALE}px`,
                }}
              >
                {/* Field content */}
                <div
                  className={cn(
                    "border border-transparent transition-all",
                    isVisible && "hover:border-primary/50",
                    isSelected && "border-primary border-2 bg-primary/5 rounded"
                  )}
                  style={{
                    fontSize: `${field.font_size * SCALE * 0.35}px`,
                    fontFamily: field.font_name,
                    color: isVisible ? field.font_color : '#999',
                    textAlign: field.text_align as 'left' | 'right' | 'center',
                    direction: field.is_rtl ? 'rtl' : 'ltr',
                    whiteSpace: 'nowrap',
                    padding: '2px 4px',
                    textDecoration: !isVisible ? 'line-through' : 'none',
                  }}
                  onClick={() => onFieldClick(field.id)}
                  title={`${field.field_name_ar}: X=${field.position_x}مم, Y=${field.position_y}مم`}
                >
                  {getFieldValue(field.field_key) || `[${field.field_name_ar}]`}
                </div>

                {/* Movement controls - show when field is selected and controls are enabled */}
                {showControls && isSelected && onFieldMove && (
                  <div 
                    className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-20"
                    style={{ direction: 'ltr' }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); onFieldMove(field.id, 'up', stepSize); }}
                      disabled={isMoving}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {showControls && isSelected && onFieldMove && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -right-8 flex flex-col gap-1 bg-background border rounded-lg shadow-lg p-1 z-20"
                    style={{ direction: 'ltr' }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); onFieldMove(field.id, 'left', stepSize); }}
                      disabled={isMoving}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {showControls && isSelected && onFieldMove && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -left-8 flex flex-col gap-1 bg-background border rounded-lg shadow-lg p-1 z-20"
                    style={{ direction: 'ltr' }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); onFieldMove(field.id, 'right', stepSize); }}
                      disabled={isMoving}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {showControls && isSelected && onFieldMove && (
                  <div 
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-20"
                    style={{ direction: 'ltr' }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); onFieldMove(field.id, 'down', stepSize); }}
                      disabled={isMoving}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Visibility toggle */}
                {showControls && isSelected && onToggleFieldVisibility && (
                  <div 
                    className="absolute -top-8 -right-8 bg-background border rounded-lg shadow-lg p-1 z-20"
                    style={{ direction: 'ltr' }}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onToggleFieldVisibility(field.id, !isVisible); 
                            }}
                          >
                            {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isVisible ? "إخفاء الحقل" : "إظهار الحقل"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            );
          })}

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

      {/* Field list panel */}
      {showControls && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            الحقول ({fields.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {fields.map((field) => (
              <Badge
                key={field.id}
                variant={selectedFieldId === field.id ? "default" : field.is_visible ? "outline" : "secondary"}
                className={cn(
                  "cursor-pointer transition-all",
                  !field.is_visible && "opacity-50 line-through"
                )}
                onClick={() => onFieldClick(field.id)}
              >
                {field.field_name_ar}
                {selectedFieldId === field.id && (
                  <span className="mr-1 font-mono text-[10px]">
                    ({field.position_x},{field.position_y})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
