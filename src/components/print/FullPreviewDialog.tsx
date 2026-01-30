import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Save, RotateCcw, Printer, Move, GripVertical, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toWesternNumerals, formatCertificateDate, formatDefenseDate, formatCertificateIssueDate } from "@/lib/numerals";
import { getTextDirectionFromConfig } from "@/lib/dateFormats";
import { mentionLabels, type CertificateTemplate, type TemplateField, type MentionType } from "@/types/certificates";
import { useFontLoader, getFontFamilyCSS } from "@/hooks/useFontLoader";
import { usePrintSettings, getPaperDimensions, DEFAULT_PRINT_SETTINGS } from "@/hooks/usePrintSettings";
import { useDateFormatSettings } from "@/hooks/useDateFormatSettings";

// Default A4 dimensions in mm (fallback)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const SCALE = 2.5;

interface FieldChange {
  fieldId: string;
  fieldName: string;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

interface FullPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Record<string, unknown>;
  fields: TemplateField[];
  template: CertificateTemplate;
  onSaveSettings: (settings: {
    background_offset_x: number;
    background_offset_y: number;
    background_scale: number;
  }) => void;
  onFieldMove?: (fieldId: string, newX: number, newY: number) => void;
  onPrint: () => void;
  initialOffsetX?: number;
  initialOffsetY?: number;
  initialScale?: number;
}

export function FullPreviewDialog({
  open,
  onOpenChange,
  student,
  fields,
  template,
  onSaveSettings,
  onFieldMove,
  onPrint,
  initialOffsetX = 0,
  initialOffsetY = 0,
  initialScale = 100,
}: FullPreviewDialogProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(initialOffsetX);
  const [offsetY, setOffsetY] = useState(initialOffsetY);
  const [scale, setScale] = useState(initialScale);
  const [hasBackgroundChanges, setHasBackgroundChanges] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showFieldControls, setShowFieldControls] = useState(true);
  
  // Track field changes for undo
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);
  const [localFieldPositions, setLocalFieldPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  // Drag state for fields
  const [dragState, setDragState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    fieldStartX: number;
    fieldStartY: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);

  // Initialize local positions from fields
  useEffect(() => {
    if (open) {
      setOffsetX(initialOffsetX);
      setOffsetY(initialOffsetY);
      setScale(initialScale);
      setHasBackgroundChanges(false);
      setSelectedFieldId(null);
      setFieldChanges([]);
      // Initialize local positions
      const positions: Record<string, { x: number; y: number }> = {};
      fields.forEach(f => {
        positions[f.id] = { x: f.position_x, y: f.position_y };
      });
      setLocalFieldPositions(positions);
    }
  }, [open, initialOffsetX, initialOffsetY, initialScale, fields]);

  // Load fonts dynamically for preview - version forces re-render when fonts change
  const fontNames = useMemo(() => fields.map(f => f.font_name), [fields]);
  const { version: fontVersion } = useFontLoader(fontNames);
  
  // Load print settings from database
  const { data: printSettings } = usePrintSettings();
  const settings = printSettings || DEFAULT_PRINT_SETTINGS;
  
  // Load date format settings from database
  const { settings: dateFormatSettings } = useDateFormatSettings();
  
  // Memoize font styles with fontVersion dependency to force re-render when fonts change
  const fieldFontStyles = useMemo(() => {
    return fields.reduce((acc, field) => {
      acc[field.id] = getFontFamilyCSS(field.font_name);
      return acc;
    }, {} as Record<string, string>);
  }, [fields, fontVersion]);

  // Use template orientation, fall back to settings if template doesn't specify
  const isLandscape = template.page_orientation === 'landscape' || 
    (!template.page_orientation && settings.orientation === 'landscape');
  
  // Get paper dimensions from settings
  const paperDimensions = getPaperDimensions(settings);
  const width = isLandscape ? paperDimensions.height : paperDimensions.width;
  const height = isLandscape ? paperDimensions.width : paperDimensions.height;

  const hasFieldChanges = fieldChanges.length > 0;
  const hasAnyChanges = hasBackgroundChanges || hasFieldChanges;

  const getFieldValue = useCallback((fieldKey: string): string => {
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

    // Handle bilingual date fields - use saved date format settings
    if (fieldKey === 'date_of_birth_ar') {
      const value = student['date_of_birth'];
      return value ? formatCertificateDate(value as string, true, dateFormatSettings) : '';
    }
    if (fieldKey === 'date_of_birth_fr') {
      const value = student['date_of_birth'];
      return value ? formatCertificateDate(value as string, false, dateFormatSettings) : '';
    }
    if (fieldKey === 'defense_date_ar') {
      const value = student['defense_date'];
      return value ? formatDefenseDate(value as string, true, dateFormatSettings) : '';
    }
    if (fieldKey === 'defense_date_fr') {
      const value = student['defense_date'];
      return value ? formatDefenseDate(value as string, false, dateFormatSettings) : '';
    }
    if (fieldKey === 'certificate_date_ar') {
      const value = student['certificate_date'];
      return value ? formatCertificateIssueDate(value as string, true, dateFormatSettings) : '';
    }
    if (fieldKey === 'certificate_date_fr') {
      const value = student['certificate_date'];
      return value ? formatCertificateIssueDate(value as string, false, dateFormatSettings) : '';
    }

    const value = student[fieldKey];
    
    // Legacy date fields
    if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
      return value ? formatCertificateDate(value as string, false, dateFormatSettings) : '';
    }

    return value ? toWesternNumerals(String(value)) : '';
  }, [student, dateFormatSettings]);

  // Helper to get text direction for date fields
  const getDateFieldDirection = useCallback((fieldKey: string): 'rtl' | 'ltr' | undefined => {
    if (!fieldKey.endsWith('_ar')) return undefined;
    
    if (fieldKey.includes('birth')) {
      return getTextDirectionFromConfig(dateFormatSettings.birthDate, true);
    } else if (fieldKey.includes('defense')) {
      return getTextDirectionFromConfig(dateFormatSettings.defenseDate, true);
    } else if (fieldKey.includes('certificate')) {
      return getTextDirectionFromConfig(dateFormatSettings.certificateDate, true);
    }
    return undefined;
  }, [dateFormatSettings]);

  const handleBackgroundMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    setHasBackgroundChanges(true);
    switch (direction) {
      case 'up': setOffsetY(prev => prev - 1); break;
      case 'down': setOffsetY(prev => prev + 1); break;
      case 'left': setOffsetX(prev => prev - 1); break;
      case 'right': setOffsetX(prev => prev + 1); break;
    }
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
    setHasBackgroundChanges(true);
  };

  const handleResetBackground = () => {
    setOffsetX(initialOffsetX);
    setOffsetY(initialOffsetY);
    setScale(initialScale);
    setHasBackgroundChanges(false);
  };

  const handleResetFields = () => {
    // Reset all local positions to original
    const positions: Record<string, { x: number; y: number }> = {};
    fields.forEach(f => {
      positions[f.id] = { x: f.position_x, y: f.position_y };
    });
    setLocalFieldPositions(positions);
    setFieldChanges([]);
    toast.success("تم التراجع عن جميع تغييرات الحقول");
  };

  const handleUndoLastFieldChange = () => {
    if (fieldChanges.length === 0) return;
    
    const lastChange = fieldChanges[fieldChanges.length - 1];
    
    // Restore old position
    setLocalFieldPositions(prev => ({
      ...prev,
      [lastChange.fieldId]: { x: lastChange.oldX, y: lastChange.oldY }
    }));
    
    // Remove last change
    setFieldChanges(prev => prev.slice(0, -1));
    
    toast.success(`تم التراجع عن تحريك "${lastChange.fieldName}"`);
  };

  const handleSaveBackground = () => {
    onSaveSettings({
      background_offset_x: offsetX,
      background_offset_y: offsetY,
      background_scale: scale,
    });
    setHasBackgroundChanges(false);
    toast.success("تم حفظ إعدادات الخلفية");
  };

  const handleSaveFields = () => {
    if (!onFieldMove) return;
    
    // Save all field changes
    fieldChanges.forEach(change => {
      onFieldMove(change.fieldId, change.newX, change.newY);
    });
    
    setFieldChanges([]);
    toast.success(`تم حفظ تغييرات ${fieldChanges.length} حقل`);
  };

  const handleSaveAll = () => {
    if (hasBackgroundChanges) {
      handleSaveBackground();
    }
    if (hasFieldChanges && onFieldMove) {
      handleSaveFields();
    }
  };

  const handlePrint = () => {
    if (hasAnyChanges) {
      handleSaveAll();
    }
    onPrint();
    onOpenChange(false);
  };

  // Field drag handlers
  const handleFieldMouseDown = useCallback((e: React.MouseEvent, field: TemplateField) => {
    if (!onFieldMove) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedFieldId(field.id);
    
    const currentPos = localFieldPositions[field.id] || { x: field.position_x, y: field.position_y };
    
    setDragState({
      fieldId: field.id,
      startX: e.clientX,
      startY: e.clientY,
      fieldStartX: currentPos.x,
      fieldStartY: currentPos.y,
    });
    setDragPreview({ x: currentPos.x, y: currentPos.y });
  }, [onFieldMove, localFieldPositions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !canvasRef.current) return;

    const deltaX = (e.clientX - dragState.startX) / SCALE;
    const deltaY = (e.clientY - dragState.startY) / SCALE;

    // Calculate new position (round to 0.5mm for precision)
    let newX = Math.round((dragState.fieldStartX + deltaX) * 2) / 2;
    let newY = Math.round((dragState.fieldStartY + deltaY) * 2) / 2;

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(width - 10, newX));
    newY = Math.max(0, Math.min(height - 10, newY));

    setDragPreview({ x: newX, y: newY });
  }, [dragState, width, height]);

  const handleMouseUp = useCallback(() => {
    if (dragState && dragPreview) {
      // Only update if position actually changed
      if (dragPreview.x !== dragState.fieldStartX || dragPreview.y !== dragState.fieldStartY) {
        const field = fields.find(f => f.id === dragState.fieldId);
        
        // Update local position
        setLocalFieldPositions(prev => ({
          ...prev,
          [dragState.fieldId]: { x: dragPreview.x, y: dragPreview.y }
        }));
        
        // Track change for undo
        setFieldChanges(prev => [
          ...prev,
          {
            fieldId: dragState.fieldId,
            fieldName: field?.field_name_ar || '',
            oldX: dragState.fieldStartX,
            oldY: dragState.fieldStartY,
            newX: dragPreview.x,
            newY: dragPreview.y,
          }
        ]);
      }
    }
    setDragState(null);
    setDragPreview(null);
  }, [dragState, dragPreview, fields]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      handleMouseUp();
    }
  }, [dragState, handleMouseUp]);

  // Get field position (use drag preview if dragging, then local, then original)
  const getFieldPosition = (field: TemplateField) => {
    if (dragState?.fieldId === field.id && dragPreview) {
      return dragPreview;
    }
    return localFieldPositions[field.id] || { x: field.position_x, y: field.position_y };
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              معاينة الشهادة قبل الطباعة
              {student.full_name_ar && (
                <Badge variant="outline">{String(student.full_name_ar)}</Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {hasAnyChanges && (
                <Badge variant="destructive" className="animate-pulse">
                  تغييرات غير محفوظة
                  {hasFieldChanges && ` (${toWesternNumerals(fieldChanges.length)} حقل)`}
                </Badge>
              )}
              {hasFieldChanges && (
                <Button variant="outline" size="sm" onClick={handleUndoLastFieldChange}>
                  <Undo2 className="h-4 w-4 ml-1" />
                  تراجع
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveAll} disabled={!hasAnyChanges}>
                <Save className="h-4 w-4 ml-1" />
                حفظ الكل
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-1" />
                طباعة
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Controls Sidebar */}
          <div className="w-72 border-l bg-muted/20 p-4 space-y-6 overflow-y-auto">
            {/* Field Controls Toggle */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">تحريك الحقول</h4>
              <Button
                variant={showFieldControls ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowFieldControls(!showFieldControls)}
              >
                <Move className="h-4 w-4 ml-1" />
                {showFieldControls ? "مفعّل" : "معطّل"}
              </Button>
            </div>

            {/* Field Changes Info */}
            {hasFieldChanges && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">
                    {toWesternNumerals(fieldChanges.length)} تغيير غير محفوظ
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleUndoLastFieldChange}>
                    <Undo2 className="h-3 w-3 ml-1" />
                    تراجع
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleResetFields}>
                    <RotateCcw className="h-3 w-3 ml-1" />
                    إلغاء الكل
                  </Button>
                </div>
                <Button size="sm" className="w-full" onClick={handleSaveFields}>
                  <Save className="h-3 w-3 ml-1" />
                  حفظ الحقول
                </Button>
              </div>
            )}

            {/* Selected Field Info */}
            {selectedField && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">{selectedField.field_name_ar}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    X: {toWesternNumerals(getFieldPosition(selectedField).x)} مم
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    Y: {toWesternNumerals(getFieldPosition(selectedField).y)} مم
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">تحريك الخلفية</h4>
                {hasBackgroundChanges && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleResetBackground}>
                    <RotateCcw className="h-3 w-3 ml-1" />
                    تراجع
                  </Button>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleBackgroundMove('up')}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleBackgroundMove('right')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="font-mono px-3 py-2">
                    {toWesternNumerals(offsetX)},{toWesternNumerals(offsetY)}
                  </Badge>
                  <Button variant="outline" size="icon" onClick={() => handleBackgroundMove('left')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={() => handleBackgroundMove('down')}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              {hasBackgroundChanges && (
                <Button size="sm" className="w-full" onClick={handleSaveBackground}>
                  <Save className="h-3 w-3 ml-1" />
                  حفظ الخلفية
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">تكبير/تصغير الخلفية</h4>
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[scale]}
                  onValueChange={handleScaleChange}
                  min={50}
                  max={150}
                  step={1}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <Badge variant="outline" className="font-mono">
                  {toWesternNumerals(scale)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">الحقول المعروضة</h4>
              <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                {fields.filter(f => f.is_visible).map((field) => {
                  const pos = getFieldPosition(field);
                  const hasChange = fieldChanges.some(c => c.fieldId === field.id);
                  return (
                    <div 
                      key={field.id} 
                      className={cn(
                        "flex justify-between items-center p-2 rounded cursor-pointer transition-colors",
                        selectedFieldId === field.id ? "bg-primary/20 border border-primary/30" : "bg-background hover:bg-muted",
                        hasChange && "ring-1 ring-destructive/50"
                      )}
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      <span className="flex items-center gap-1">
                        {hasChange && <span className="w-2 h-2 rounded-full bg-destructive" />}
                        {field.field_name_ar}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {toWesternNumerals(pos.x)},{toWesternNumerals(pos.y)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="flex-1 overflow-auto bg-muted/30 p-4 flex items-center justify-center">
            <div
              ref={canvasRef}
              className={cn(
                "relative bg-white shadow-xl border",
                dragState && "cursor-grabbing"
              )}
              style={{
                width: `${width * SCALE}px`,
                height: `${height * SCALE}px`,
                direction: template.language.includes('ar') ? 'rtl' : 'ltr',
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Background image with offset and scale */}
              {template.background_image_url && (
                <img
                  src={template.background_image_url}
                  alt="خلفية الشهادة"
                  className="absolute pointer-events-none"
                  style={{
                    width: `${scale}%`,
                    height: `${scale}%`,
                    objectFit: 'contain',
                    transform: `translate(${offsetX * SCALE}px, ${offsetY * SCALE}px)`,
                    left: `${(100 - scale) / 2}%`,
                    top: `${(100 - scale) / 2}%`,
                  }}
                />
              )}

              {/* Fields */}
              {fields.filter(f => f.is_visible).map((field) => {
                const position = getFieldPosition(field);
                const isSelected = selectedFieldId === field.id;
                const isDragging = dragState?.fieldId === field.id;
                const hasChange = fieldChanges.some(c => c.fieldId === field.id);
                const value = getFieldValue(field.field_key);
                
                // Get text direction for date fields from settings
                const dateDirection = getDateFieldDirection(field.field_key);
                const effectiveDirection = dateDirection !== undefined ? dateDirection : (field.is_rtl ? 'rtl' : 'ltr');
                
                return (
                  <div
                    key={field.id}
                    className={cn(
                      "absolute transition-all group",
                      showFieldControls && onFieldMove ? "cursor-grab" : "cursor-default",
                      isSelected && "z-10",
                      isDragging && "cursor-grabbing z-20"
                    )}
                    style={{
                      left: `${position.x * SCALE}px`,
                      top: `${position.y * SCALE}px`,
                      transition: isDragging ? 'none' : 'all 0.15s ease-out',
                    }}
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <div
                      className={cn(
                        "border border-transparent transition-all select-none px-1",
                        showFieldControls && "hover:border-primary/50 hover:bg-primary/5",
                        isSelected && "border-primary border-2 bg-primary/10 rounded",
                        isDragging && "border-primary border-2 bg-primary/20 rounded shadow-lg",
                        hasChange && !isSelected && "border-destructive/50 border bg-destructive/5"
                      )}
                      style={{
                        fontSize: `${field.font_size * SCALE * 0.35}px`,
                        fontFamily: fieldFontStyles[field.id] || getFontFamilyCSS(field.font_name),
                        color: field.font_color,
                        textAlign: field.text_align as 'left' | 'right' | 'center',
                        direction: effectiveDirection,
                        whiteSpace: 'nowrap',
                      }}
                      onMouseDown={(e) => showFieldControls && handleFieldMouseDown(e, field)}
                      title={`${field.field_name_ar}: X=${position.x}مم, Y=${position.y}مم - اسحب لتحريك الحقل`}
                    >
                      {isSelected && showFieldControls && !isDragging && (
                        <GripVertical className="inline-block h-3 w-3 ml-1 text-primary" />
                      )}
                      {value || `[${field.field_name_ar}]`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
