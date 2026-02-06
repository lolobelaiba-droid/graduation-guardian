import { useRef, useState, useCallback, useMemo } from "react";
import { Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Eye, EyeOff, Trash2, GripVertical, Undo2, Save } from "lucide-react";
import type { TemplateField, CertificateTemplate, CertificateType, MentionType } from "@/types/certificates";
import { mentionLabels } from "@/types/certificates";
import { cn } from "@/lib/utils";
import { toWesternNumerals, formatCertificateDate, formatDefenseDate, formatCertificateIssueDate } from "@/lib/numerals";
import { getTextDirectionFromConfig } from "@/lib/dateFormats";
import { useFontLoader, getFontFamilyCSS } from "@/hooks/useFontLoader";
import { usePrintSettings, getPaperDimensions, DEFAULT_PRINT_SETTINGS } from "@/hooks/usePrintSettings";
import { useDateFormatSettings } from "@/hooks/useDateFormatSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Default A4 dimensions in mm (fallback)
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
  onFieldDrag?: (fieldId: string, newX: number, newY: number) => void;
  onToggleFieldVisibility?: (fieldId: string, visible: boolean) => void;
  onDeleteField?: (fieldId: string) => void;
  onAddField?: () => void;
  onFieldResize?: (fieldId: string, newWidth: number) => void;
  stepSize?: number;
  isMoving?: boolean;
  // Background offset controls
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  onBackgroundOffsetChange?: (offsetX: number, offsetY: number) => void;
  showBackgroundControls?: boolean;
  onToggleBackgroundControls?: () => void;
  // Undo support
  canUndo?: boolean;
  onUndo?: () => void;
  hasUnsavedChanges?: boolean;
  // Save all support
  onSaveAll?: () => void;
}

export function CertificatePreview({
  student,
  fields,
  template,
  certificateType,
  selectedFieldId,
  onFieldClick,
  onFieldMove,
  onFieldDrag,
  onToggleFieldVisibility,
  onDeleteField,
  onAddField,
  onFieldResize,
  stepSize = 1,
  isMoving = false,
  backgroundOffsetX = 0,
  backgroundOffsetY = 0,
  onBackgroundOffsetChange,
  showBackgroundControls = false,
  onToggleBackgroundControls,
  canUndo = false,
  onUndo,
  hasUnsavedChanges = false,
  onSaveAll,
}: CertificatePreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [fieldToDelete, setFieldToDelete] = useState<TemplateField | null>(null);
  const [dragState, setDragState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    fieldStartX: number;
    fieldStartY: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);
  
  // Resize state for field width
  const [resizeState, setResizeState] = useState<{
    fieldId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Load fonts dynamically for preview - version forces re-render when fonts load
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

  // Check if a field is a static text field
  const isStaticTextField = useCallback((fieldKey: string): boolean => {
    return fieldKey.startsWith('static_text_');
  }, []);

  // Check if a field should be resizable (long text fields)
  const isResizableField = useCallback((fieldKey: string): boolean => {
    return fieldKey.startsWith('thesis_title') || 
           fieldKey.startsWith('static_text_');
  }, []);

  const getFieldValue = useCallback((fieldKey: string, field?: TemplateField): string => {
    // Handle static text fields - return the stored text from field_name_fr
    if (fieldKey.startsWith('static_text_') && field?.field_name_fr) {
      return field.field_name_fr;
    }

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
    // Use saved date format settings
    if (fieldKey === 'date_of_birth_ar') {
      const value = student['date_of_birth'];
      if (value) {
        return formatCertificateDate(value as string, true, dateFormatSettings);
      }
      return '';
    }
    
    if (fieldKey === 'date_of_birth_fr') {
      const value = student['date_of_birth'];
      if (value) {
        return formatCertificateDate(value as string, false, dateFormatSettings);
      }
      return '';
    }
    
    if (fieldKey === 'defense_date_ar') {
      const value = student['defense_date'];
      if (value) {
        return formatDefenseDate(value as string, true, dateFormatSettings);
      }
      return '';
    }
    
    if (fieldKey === 'defense_date_fr') {
      const value = student['defense_date'];
      if (value) {
        return formatDefenseDate(value as string, false, dateFormatSettings);
      }
      return '';
    }
    
    if (fieldKey === 'certificate_date_ar') {
      const value = student['certificate_date'];
      if (value) {
        return formatCertificateIssueDate(value as string, true, dateFormatSettings);
      }
      return '';
    }
    
    if (fieldKey === 'certificate_date_fr') {
      const value = student['certificate_date'];
      if (value) {
        return formatCertificateIssueDate(value as string, false, dateFormatSettings);
      }
      return '';
    }
    
    const value = student[fieldKey];
    
    // Legacy date fields support (default to French format)
    if (fieldKey === 'date_of_birth' || fieldKey === 'defense_date' || fieldKey === 'certificate_date') {
      if (value) {
        return formatCertificateDate(value as string, false, dateFormatSettings);
      }
    }
    
    // Convert any Hindi numerals to Western Arabic for all values
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

  const isRtlLanguage = template.language.includes('ar');
  const selectedField = fields.find(f => f.id === selectedFieldId);

  const handleDeleteConfirm = () => {
    if (fieldToDelete && onDeleteField) {
      onDeleteField(fieldToDelete.id);
      setFieldToDelete(null);
    }
  };

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, field: TemplateField) => {
    if (!onFieldDrag) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    onFieldClick(field.id);
    
    setDragState({
      fieldId: field.id,
      startX: e.clientX,
      startY: e.clientY,
      fieldStartX: field.position_x,
      fieldStartY: field.position_y,
    });
    setDragPreview({ x: field.position_x, y: field.position_y });
  }, [onFieldDrag, onFieldClick]);

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
    if (dragState && dragPreview && onFieldDrag) {
      // Only update if position actually changed
      if (dragPreview.x !== dragState.fieldStartX || dragPreview.y !== dragState.fieldStartY) {
        onFieldDrag(dragState.fieldId, dragPreview.x, dragPreview.y);
      }
    }
    setDragState(null);
    setDragPreview(null);
  }, [dragState, dragPreview, onFieldDrag]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      handleMouseUp();
    }
    if (resizeState) {
      handleResizeEnd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, handleMouseUp, resizeState]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, field: TemplateField) => {
    if (!onFieldResize) return;
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = field.field_width || 80; // default 80mm
    setResizeState({
      fieldId: field.id,
      startX: e.clientX,
      startWidth: currentWidth,
    });
  }, [onFieldResize]);

  const handleResizeMove = useCallback((e: React.MouseEvent) => {
    if (!resizeState) return;
    
    const deltaX = (e.clientX - resizeState.startX) / SCALE;
    const newWidth = Math.max(20, Math.round((resizeState.startWidth + deltaX) * 2) / 2);
    
    // Update locally by finding the field element and setting its width
    const fieldEl = document.querySelector(`[data-field-id="${resizeState.fieldId}"]`) as HTMLElement;
    if (fieldEl) {
      fieldEl.style.width = `${newWidth * SCALE}px`;
    }
  }, [resizeState]);

  const handleResizeEnd = useCallback(() => {
    if (resizeState && onFieldResize) {
      const fieldEl = document.querySelector(`[data-field-id="${resizeState.fieldId}"]`) as HTMLElement;
      if (fieldEl) {
        const newWidth = parseFloat(fieldEl.style.width) / SCALE;
        if (newWidth !== resizeState.startWidth) {
          onFieldResize(resizeState.fieldId, Math.round(newWidth * 2) / 2);
        }
      }
    }
    setResizeState(null);
  }, [resizeState, onFieldResize]);

  // Get field position (use drag preview if dragging)
  const getFieldPosition = (field: TemplateField) => {
    if (dragState?.fieldId === field.id && dragPreview) {
      return dragPreview;
    }
    return { x: field.position_x, y: field.position_y };
  };

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

          {onAddField && (
            <Button variant="outline" size="sm" onClick={onAddField}>
              <Plus className="h-4 w-4 ml-1" />
              إضافة حقل
            </Button>
          )}

          {/* Background offset toggle and controls */}
          {template.background_image_url && onBackgroundOffsetChange && onToggleBackgroundControls && (
            <>
              <div className="border-r pr-2 mr-2">
                <Button
                  variant={showBackgroundControls ? "secondary" : "outline"}
                  size="sm"
                  onClick={onToggleBackgroundControls}
                >
                  {showBackgroundControls ? "ضبط الخلفية مفعّل" : "ضبط الخلفية"}
                </Button>
              </div>
              
              {showBackgroundControls && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">تحريك:</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onBackgroundOffsetChange(backgroundOffsetX, backgroundOffsetY - 1)}
                    title="تحريك الخلفية للأعلى"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onBackgroundOffsetChange(backgroundOffsetX, backgroundOffsetY + 1)}
                    title="تحريك الخلفية للأسفل"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onBackgroundOffsetChange(backgroundOffsetX - 1, backgroundOffsetY)}
                    title="تحريك الخلفية لليمين"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onBackgroundOffsetChange(backgroundOffsetX + 1, backgroundOffsetY)}
                    title="تحريك الخلفية لليسار"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Badge variant="outline" className="font-mono text-xs">
                    {backgroundOffsetX},{backgroundOffsetY}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onBackgroundOffsetChange(0, 0)}
                    title="إعادة تعيين موضع الخلفية"
                  >
                    إعادة
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && onSaveAll && (
            <Button variant="default" size="sm" onClick={onSaveAll}>
              <Save className="h-4 w-4 ml-1" />
              حفظ الكل
            </Button>
          )}
          {hasUnsavedChanges && !onSaveAll && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              تغييرات غير محفوظة
            </Badge>
          )}
          {canUndo && onUndo && (
            <Button variant="outline" size="sm" onClick={onUndo}>
              <Undo2 className="h-4 w-4 ml-1" />
              تراجع
            </Button>
          )}
          {dragState && dragPreview && (
            <Badge variant="default" className="font-mono text-xs animate-pulse">
              X: {toWesternNumerals(dragPreview.x)} | Y: {toWesternNumerals(dragPreview.y)} مم
            </Badge>
          )}
          {!dragState && selectedField && (
            <Badge variant="outline" className="font-mono text-xs">
              X: {toWesternNumerals(selectedField.position_x)} | Y: {toWesternNumerals(selectedField.position_y)} مم
            </Badge>
          )}
          {selectedField && (
            <span className="text-sm text-muted-foreground">
              {selectedField.field_name_ar}
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="overflow-auto bg-muted/30 rounded-lg p-4">
        <div
          ref={canvasRef}
          className={cn(
            "relative bg-white mx-auto border border-border shadow-sm",
            dragState && "cursor-grabbing"
          )}
          style={{
            width: `${width * SCALE}px`,
            height: `${height * SCALE}px`,
            direction: isRtlLanguage ? 'rtl' : 'ltr',
          }}
          onMouseMove={(e) => {
            handleMouseMove(e);
            handleResizeMove(e);
          }}
          onMouseUp={() => {
            handleMouseUp();
            handleResizeEnd();
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Background image with offset */}
          {template.background_image_url && (
            <img
              src={template.background_image_url}
              alt="خلفية الشهادة"
              className="absolute w-full h-full object-contain pointer-events-none"
              style={{
                transform: `translate(${backgroundOffsetX * SCALE}px, ${backgroundOffsetY * SCALE}px)`,
              }}
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
            const isDragging = dragState?.fieldId === field.id;
            const isResizing = resizeState?.fieldId === field.id;
            const position = getFieldPosition(field);
            const resizable = isResizableField(field.field_key);
            const hasWidth = field.field_width != null;
            
            // Determine field direction - use date settings for Arabic date fields
            const dateDirection = getDateFieldDirection(field.field_key);
            const fieldDirection = dateDirection !== undefined 
              ? dateDirection 
              : (field.is_rtl ? 'rtl' : 'ltr');

            return (
              <div
                key={field.id}
                className={cn(
                  "absolute transition-all group",
                  isVisible ? "cursor-grab" : "cursor-pointer opacity-40",
                  isSelected && "z-10",
                  isDragging && "cursor-grabbing z-20 opacity-80"
                )}
                style={{
                  left: `${position.x * SCALE}px`,
                  top: `${position.y * SCALE}px`,
                  transition: isDragging ? 'none' : 'all 0.15s ease-out',
                }}
              >
                {/* Field content */}
                <div
                  data-field-id={field.id}
                  className={cn(
                    "border border-transparent transition-all select-none relative",
                    isVisible && "hover:border-primary/50",
                    isSelected && "border-primary border-2 bg-primary/5 rounded",
                    isDragging && "border-primary border-2 bg-primary/10 rounded shadow-lg",
                  )}
                  style={{
                    fontSize: `${field.font_size * SCALE * 0.35}px`,
                    fontFamily: fieldFontStyles[field.id] || getFontFamilyCSS(field.font_name),
                    color: isVisible ? field.font_color : '#999',
                    textAlign: field.text_align as 'left' | 'right' | 'center',
                    direction: fieldDirection,
                    whiteSpace: hasWidth ? 'normal' : 'nowrap',
                    wordWrap: hasWidth ? 'break-word' : undefined,
                    width: hasWidth ? `${field.field_width! * SCALE}px` : undefined,
                    padding: '2px 4px',
                    textDecoration: !isVisible ? 'line-through' : 'none',
                    lineHeight: hasWidth ? '1.4' : undefined,
                  }}
                  onMouseDown={(e) => isVisible && handleMouseDown(e, field)}
                  onClick={() => !dragState && onFieldClick(field.id)}
                  title={`${field.field_name_ar}: X=${position.x}مم, Y=${position.y}مم${hasWidth ? `, W=${field.field_width}مم` : ''} - اسحب لتحريك الحقل`}
                >
                  {/* Drag handle indicator */}
                  {isSelected && showControls && !isDragging && (
                    <GripVertical className="inline-block h-3 w-3 ml-1 text-muted-foreground" />
                  )}
                  {getFieldValue(field.field_key, field) || `[${field.field_name_ar}]`}
                  
                  {/* Word-style resize handles for resizable fields */}
                  {resizable && (isSelected || hasWidth) && showControls && !isDragging && onFieldResize && (
                    <>
                      {/* Border outline like Word text box */}
                      <div 
                        className={cn(
                          "absolute inset-0 pointer-events-none border-2 border-dashed rounded-sm",
                          isSelected ? "border-primary" : "border-primary/30"
                        )}
                      />
                      {/* Right edge handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-6 cursor-ew-resize bg-background border-2 border-primary rounded-sm shadow-sm hover:bg-primary/20 transition-colors z-10"
                        style={{
                          [fieldDirection === 'rtl' ? 'left' : 'right']: '-6px',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, field);
                        }}
                        title="اسحب لتغيير العرض"
                      />
                      {/* Left edge handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-6 cursor-ew-resize bg-background border-2 border-primary rounded-sm shadow-sm hover:bg-primary/20 transition-colors z-10"
                        style={{
                          [fieldDirection === 'rtl' ? 'right' : 'left']: '-6px',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, field);
                        }}
                        title="اسحب لتغيير العرض"
                      />
                      {/* Top-right corner handle */}
                      <div
                        className="absolute -top-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                        style={{ [fieldDirection === 'rtl' ? 'left' : 'right']: '-6px' }}
                      />
                      {/* Top-left corner handle */}
                      <div
                        className="absolute -top-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                        style={{ [fieldDirection === 'rtl' ? 'right' : 'left']: '-6px' }}
                      />
                      {/* Bottom-right corner handle */}
                      <div
                        className="absolute -bottom-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                        style={{ [fieldDirection === 'rtl' ? 'left' : 'right']: '-6px' }}
                      />
                      {/* Bottom-left corner handle */}
                      <div
                        className="absolute -bottom-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                        style={{ [fieldDirection === 'rtl' ? 'right' : 'left']: '-6px' }}
                      />
                    </>
                  )}
                </div>

                {/* Movement controls - show when field is selected, controls enabled, and not dragging */}
                {showControls && isSelected && onFieldMove && !isDragging && (
                  <>
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
                  </>
                )}

                {/* Visibility and Delete controls */}
                {showControls && isSelected && !isDragging && (
                  <div 
                    className="absolute -top-8 -right-8 flex gap-1 bg-background border rounded-lg shadow-lg p-1 z-20"
                    style={{ direction: 'ltr' }}
                  >
                    {onToggleFieldVisibility && (
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
                    )}
                    
                    {onDeleteField && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setFieldToDelete(field);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>حذف الحقل</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Corner markers */}
          <div className="absolute top-2 left-2 text-[10px] text-muted-foreground pointer-events-none">
            0,0
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground pointer-events-none">
            {toWesternNumerals(width)},{toWesternNumerals(height)}mm
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isLandscape ? 'أفقي' : 'عمودي'} • {toWesternNumerals(width)}×{toWesternNumerals(height)}mm • {template.page_size}
          </span>
          <span className="flex items-center gap-2">
            <GripVertical className="h-3 w-3" />
            اسحب الحقول لتحريكها • {toWesternNumerals(fields.length)} حقل
          </span>
        </div>
      </div>

      {/* Field list panel */}
      {showControls && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              الحقول ({toWesternNumerals(fields.length)})
            </span>
            {onAddField && (
              <Button variant="ghost" size="sm" onClick={onAddField}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
            )}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!fieldToDelete} onOpenChange={() => setFieldToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحقل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الحقل "{fieldToDelete?.field_name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
