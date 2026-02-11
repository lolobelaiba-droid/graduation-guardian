import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Save, RotateCcw, Printer, Move, GripVertical, Undo2, MoveHorizontal, MoveVertical, Link, Unlink, Grid3X3 } from "lucide-react";
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
import { getFontByName } from "@/lib/arabicFonts";
import { useDateFormatSettings } from "@/hooks/useDateFormatSettings";

// Default A4 dimensions in mm (fallback)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
// Use the SAME base scale as CertificatePreview to guarantee identical rendering
const BASE_SCALE = 2;
// CSS zoom factor applied on top of BASE_SCALE for the enlarged view
const ZOOM = 1.6;
// Effective scale for coordinate display purposes
const SCALE = BASE_SCALE;

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
    background_scale_x?: number;
    background_scale_y?: number;
  }) => void;
  onFieldMove?: (fieldId: string, newX: number, newY: number) => void;
  onFieldResize?: (fieldId: string, newWidth: number) => void;
  onPrint: () => void;
  initialOffsetX?: number;
  initialOffsetY?: number;
  initialScale?: number;
  initialScaleX?: number;
  initialScaleY?: number;
}

export function FullPreviewDialog({
  open,
  onOpenChange,
  student,
  fields,
  template,
  onSaveSettings,
  onFieldMove,
  onFieldResize,
  onPrint,
  initialOffsetX = 0,
  initialOffsetY = 0,
  initialScale = 100,
  initialScaleX = 100,
  initialScaleY = 100,
}: FullPreviewDialogProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(initialOffsetX);
  const [offsetY, setOffsetY] = useState(initialOffsetY);
  const [scale, setScale] = useState(initialScale);
  const [scaleX, setScaleX] = useState(initialScaleX);
  const [scaleY, setScaleY] = useState(initialScaleY);
  const [linkedScale, setLinkedScale] = useState(true); // Link X and Y scale by default
  const [hasBackgroundChanges, setHasBackgroundChanges] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showFieldControls, setShowFieldControls] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
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
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

  // Resize state for field width
  const [resizeState, setResizeState] = useState<{
    fieldId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [localFieldWidths, setLocalFieldWidths] = useState<Record<string, number>>({});

  // Initialize local positions from fields
  useEffect(() => {
    if (open) {
      setOffsetX(initialOffsetX);
      setOffsetY(initialOffsetY);
      setScale(initialScale);
      setScaleX(initialScaleX);
      setScaleY(initialScaleY);
      setLinkedScale(initialScaleX === initialScaleY);
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
  }, [open, initialOffsetX, initialOffsetY, initialScale, initialScaleX, initialScaleY, fields]);

  // Load fonts dynamically for preview - version forces re-render when fonts change
  const fontNames = useMemo(() => fields.map(f => f.font_name), [fields]);
  const { version: fontVersion } = useFontLoader(fontNames);
  
  // Load date format settings from database
  const { settings: dateFormatSettings } = useDateFormatSettings();
  
  // Memoize font styles with fontVersion dependency to force re-render when fonts change
  const fieldFontStyles = useMemo(() => {
    return fields.reduce((acc, field) => {
      acc[field.id] = getFontFamilyCSS(field.font_name);
      return acc;
    }, {} as Record<string, string>);
  }, [fields, fontVersion]);

  // Use template-specific paper dimensions
  const getTemplatePaperDimensions = useMemo(() => {
    const paperSize = ((template as any).print_paper_size || template.page_size || 'a4').toLowerCase();
    let width: number;
    let height: number;

    if (paperSize === 'custom') {
      width = (template as any).print_custom_width || 210;
      height = (template as any).print_custom_height || 297;
    } else {
      // Map common paper sizes
      const PAPER_SIZES: Record<string, { width: number; height: number }> = {
        a0: { width: 841, height: 1189 },
        a1: { width: 594, height: 841 },
        a2: { width: 420, height: 594 },
        a3: { width: 297, height: 420 },
        a4: { width: 210, height: 297 },
        a5: { width: 148, height: 210 },
        a6: { width: 105, height: 148 },
        b4: { width: 250, height: 353 },
        b5: { width: 176, height: 250 },
        letter: { width: 216, height: 279 },
        legal: { width: 216, height: 356 },
        tabloid: { width: 279, height: 432 },
        executive: { width: 184, height: 267 },
      };
      const size = PAPER_SIZES[paperSize];
      if (size) {
        width = size.width;
        height = size.height;
      } else {
        // Default to A4
        width = 210;
        height = 297;
      }
    }

    return { width, height };
  }, [template]);

  // Use template orientation
  const isLandscape = template.page_orientation === 'landscape';
  
  // Get paper dimensions from template
  const width = isLandscape ? getTemplatePaperDimensions.height : getTemplatePaperDimensions.width;
  const height = isLandscape ? getTemplatePaperDimensions.width : getTemplatePaperDimensions.height;

  const hasFieldChanges = fieldChanges.length > 0;
  const hasAnyChanges = hasBackgroundChanges || hasFieldChanges;

  const getFieldValue = useCallback((fieldKey: string, field?: TemplateField): string => {
    // Handle static text fields - return the stored text from field_name_fr
    if (fieldKey.startsWith('static_text_') && field?.field_name_fr) {
      return field.field_name_fr;
    }

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
    const newValue = value[0];
    setScale(newValue);
    if (linkedScale) {
      setScaleX(newValue);
      setScaleY(newValue);
    }
    setHasBackgroundChanges(true);
  };

  const handleScaleXChange = (value: number[]) => {
    const newValue = value[0];
    setScaleX(newValue);
    if (linkedScale) {
      setScaleY(newValue);
      setScale(newValue);
    }
    setHasBackgroundChanges(true);
  };

  const handleScaleYChange = (value: number[]) => {
    const newValue = value[0];
    setScaleY(newValue);
    if (linkedScale) {
      setScaleX(newValue);
      setScale(newValue);
    }
    setHasBackgroundChanges(true);
  };

  const toggleLinkedScale = () => {
    if (!linkedScale) {
      // When linking, set both to X value
      setScaleY(scaleX);
      setScale(scaleX);
    }
    setLinkedScale(!linkedScale);
    setHasBackgroundChanges(true);
  };

  const handleResetBackground = () => {
    setOffsetX(initialOffsetX);
    setOffsetY(initialOffsetY);
    setScale(initialScale);
    setScaleX(initialScaleX);
    setScaleY(initialScaleY);
    setLinkedScale(initialScaleX === initialScaleY);
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
      background_scale_x: scaleX,
      background_scale_y: scaleY,
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

    const deltaX = (e.clientX - dragState.startX) / (SCALE * ZOOM);
    const deltaY = (e.clientY - dragState.startY) / (SCALE * ZOOM);

    // Calculate new position (round to 0.5mm for precision)
    let newX = Math.round((dragState.fieldStartX + deltaX) * 2) / 2;
    let newY = Math.round((dragState.fieldStartY + deltaY) * 2) / 2;

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(width - 10, newX));
    newY = Math.max(0, Math.min(height - 10, newY));

    // Snap threshold in mm
    const SNAP_THRESHOLD = 1.5;
    const guidesX: number[] = [];
    const guidesY: number[] = [];

    // Compare with other visible fields
    const otherFields = fields.filter(f => f.is_visible && f.id !== dragState.fieldId);
    for (const other of otherFields) {
      const otherPos = localFieldPositions[other.id] || { x: other.position_x, y: other.position_y };
      
      // Snap X (left edge alignment)
      if (Math.abs(newX - otherPos.x) < SNAP_THRESHOLD) {
        newX = otherPos.x;
        guidesX.push(otherPos.x);
      }
      // Snap Y (top edge alignment)
      if (Math.abs(newY - otherPos.y) < SNAP_THRESHOLD) {
        newY = otherPos.y;
        guidesY.push(otherPos.y);
      }
    }

    setAlignmentGuides({ x: guidesX, y: guidesY });
    setDragPreview({ x: newX, y: newY });
  }, [dragState, width, height, fields, localFieldPositions]);

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
    setAlignmentGuides({ x: [], y: [] });
  }, [dragState, dragPreview, fields]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      handleMouseUp();
    }
    if (resizeState) {
      handleResizeEnd();
    }
  }, [dragState, handleMouseUp, resizeState]);

  // Check if a field should be resizable (long text fields)
  const isResizableField = useCallback((fieldKey: string): boolean => {
    return fieldKey.startsWith('thesis_title') || 
           fieldKey.startsWith('static_text_');
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, field: TemplateField) => {
    if (!onFieldResize) return;
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = localFieldWidths[field.id] ?? field.field_width ?? 80;
    setResizeState({
      fieldId: field.id,
      startX: e.clientX,
      startWidth: currentWidth,
    });
  }, [onFieldResize, localFieldWidths]);

  const handleResizeMove = useCallback((e: React.MouseEvent) => {
    if (!resizeState) return;
    
    const deltaX = (e.clientX - resizeState.startX) / (SCALE * ZOOM);
    const newWidth = Math.max(20, Math.round((resizeState.startWidth + deltaX) * 2) / 2);
    
    setLocalFieldWidths(prev => ({
      ...prev,
      [resizeState.fieldId]: newWidth,
    }));
  }, [resizeState]);

  const handleResizeEnd = useCallback(() => {
    if (resizeState && onFieldResize) {
      const newWidth = localFieldWidths[resizeState.fieldId] ?? resizeState.startWidth;
      if (newWidth !== resizeState.startWidth) {
        onFieldResize(resizeState.fieldId, newWidth);
      }
    }
    setResizeState(null);
  }, [resizeState, onFieldResize, localFieldWidths]);

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
          <div className="w-64 border-l bg-muted/20 p-3 space-y-5 overflow-y-auto flex-shrink-0">
            {/* Guidelines Toggle */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">خطوط إرشادية</h4>
              <Button
                variant={showGuidelines ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowGuidelines(!showGuidelines)}
              >
                <Grid3X3 className="h-4 w-4 ml-1" />
                {showGuidelines ? "مفعّل" : "معطّل"}
              </Button>
            </div>

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
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">تكبير/تصغير الخلفية</h4>
                <Button
                  variant={linkedScale ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={toggleLinkedScale}
                  title={linkedScale ? "إلغاء الربط" : "ربط الأبعاد"}
                >
                  {linkedScale ? (
                    <Link className="h-3.5 w-3.5" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              {/* Horizontal Scale */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MoveHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">أفقي</span>
                  <Badge variant="outline" className="font-mono text-xs mr-auto">
                    {toWesternNumerals(scaleX)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut className="h-3 w-3 text-muted-foreground" />
                  <Slider
                    value={[scaleX]}
                    onValueChange={handleScaleXChange}
                    min={50}
                    max={150}
                    step={1}
                    className="flex-1"
                  />
                  <ZoomIn className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>

              {/* Vertical Scale */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MoveVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">عمودي</span>
                  <Badge variant="outline" className="font-mono text-xs mr-auto">
                    {toWesternNumerals(scaleY)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut className="h-3 w-3 text-muted-foreground" />
                  <Slider
                    value={[scaleY]}
                    onValueChange={handleScaleYChange}
                    min={50}
                    max={150}
                    step={1}
                    className="flex-1"
                  />
                  <ZoomIn className="h-3 w-3 text-muted-foreground" />
                </div>
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
          <div className="flex-1 overflow-auto bg-muted/30 p-4 flex items-center justify-center" dir="ltr">
            {/* Outer wrapper sized to the zoomed dimensions + rulers so scrolling works correctly */}
            <div style={{
              flexShrink: 0,
            }}>
              {/* Horizontal Ruler (top) */}
              <div className="flex" style={{ marginRight: `${20 * ZOOM}px` }}>
                <div style={{ width: `${20 * ZOOM}px`, height: `${20 * ZOOM}px`, flexShrink: 0 }} />
                <div style={{
                  width: `${width * BASE_SCALE * ZOOM}px`,
                  height: `${20 * ZOOM}px`,
                  position: 'relative',
                  background: '#f8f8f8',
                  borderBottom: '1px solid #ccc',
                  overflow: 'hidden',
                }}>
                  {Array.from({ length: Math.floor(width / 10) + 1 }, (_, i) => i).map(cm => (
                    <div key={`hr-${cm}`} style={{
                      position: 'absolute',
                      left: `${cm * 10 * BASE_SCALE * ZOOM}px`,
                      top: 0,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <div style={{ width: '1px', height: `${12 * ZOOM}px`, background: '#666' }} />
                      <span style={{ fontSize: `${8 * ZOOM}px`, color: '#666', lineHeight: 1, marginTop: '1px', userSelect: 'none' }}>
                        {cm}
                      </span>
                      {/* Half-cm tick */}
                      {cm < Math.floor(width / 10) && (
                        <div style={{
                          position: 'absolute',
                          left: `${5 * BASE_SCALE * ZOOM}px`,
                          top: 0,
                          width: '1px',
                          height: `${8 * ZOOM}px`,
                          background: '#999',
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Row with vertical ruler + canvas */}
              <div className="flex">
                {/* Vertical Ruler (left) */}
                <div style={{
                  width: `${20 * ZOOM}px`,
                  height: `${height * BASE_SCALE * ZOOM}px`,
                  position: 'relative',
                  background: '#f8f8f8',
                  borderLeft: '1px solid #ccc',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {Array.from({ length: Math.floor(height / 10) + 1 }, (_, i) => i).map(cm => (
                    <div key={`vr-${cm}`} style={{
                      position: 'absolute',
                      top: `${cm * 10 * BASE_SCALE * ZOOM}px`,
                      left: 0,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      <div style={{ height: '1px', width: `${12 * ZOOM}px`, background: '#666' }} />
                      <span style={{ fontSize: `${8 * ZOOM}px`, color: '#666', lineHeight: 1, marginRight: '1px', userSelect: 'none', writingMode: 'vertical-lr' }}>
                        {cm}
                      </span>
                      {/* Half-cm tick */}
                      {cm < Math.floor(height / 10) && (
                        <div style={{
                          position: 'absolute',
                          top: `${5 * BASE_SCALE * ZOOM}px`,
                          left: 0,
                          height: '1px',
                          width: `${8 * ZOOM}px`,
                          background: '#999',
                        }} />
                      )}
                    </div>
                  ))}
                </div>
                {/* Canvas wrapper */}
                <div style={{
                  width: `${width * BASE_SCALE * ZOOM}px`,
                  height: `${height * BASE_SCALE * ZOOM}px`,
                  flexShrink: 0,
                }}>
            <div
              ref={canvasRef}
              className={cn(
                "relative bg-white shadow-xl border",
                dragState && "cursor-grabbing"
              )}
              style={{
                width: `${width * BASE_SCALE}px`,
                height: `${height * BASE_SCALE}px`,
                overflow: 'hidden',
                direction: 'ltr',
                transform: `scale(${ZOOM})`,
                transformOrigin: 'top left',
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
              {/* Background image with offset and separate X/Y scale */}
              {template.background_image_url && (
                <img
                  src={template.background_image_url}
                  alt="خلفية الشهادة"
                  className="absolute pointer-events-none"
                  style={{
                    width: `${scaleX}%`,
                    height: `${scaleY}%`,
                    objectFit: 'fill',
                    transform: `translate(${offsetX * SCALE}px, ${offsetY * SCALE}px)`,
                    left: `${(100 - scaleX) / 2}%`,
                    top: `${(100 - scaleY) / 2}%`,
                  }}
                />
              )}

              {/* Guidelines Grid */}
              {showGuidelines && (
                <svg
                  className="pointer-events-none"
                  viewBox={`0 0 ${width * SCALE} ${height * SCALE}`}
                  style={{ position: 'absolute', zIndex: 5, top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                >
                  {/* Grid lines every 10mm */}
                  {Array.from({ length: Math.floor(width / 10) - 1 }, (_, i) => (i + 1) * 10).map(x => (
                    <line
                      key={`v-${x}`}
                      x1={x * SCALE}
                      y1={0}
                      x2={x * SCALE}
                      y2={height * SCALE}
                      stroke="rgba(59, 130, 246, 0.15)"
                      strokeWidth={1}
                    />
                  ))}
                  {Array.from({ length: Math.floor(height / 10) - 1 }, (_, i) => (i + 1) * 10).map(y => (
                    <line
                      key={`h-${y}`}
                      x1={0}
                      y1={y * SCALE}
                      x2={width * SCALE}
                      y2={y * SCALE}
                      stroke="rgba(59, 130, 246, 0.15)"
                      strokeWidth={1}
                    />
                  ))}
                  {/* Center vertical line */}
                  <line
                    x1={(width / 2) * SCALE}
                    y1={0}
                    x2={(width / 2) * SCALE}
                    y2={height * SCALE}
                    stroke="rgba(239, 68, 68, 0.6)"
                    strokeWidth={2}
                    strokeDasharray="10,5"
                  />
                  {/* Center horizontal line */}
                  <line
                    x1={0}
                    y1={(height / 2) * SCALE}
                    x2={width * SCALE}
                    y2={(height / 2) * SCALE}
                    stroke="rgba(239, 68, 68, 0.6)"
                    strokeWidth={2}
                    strokeDasharray="10,5"
                  />
                </svg>
              )}

              {/* Alignment guides when dragging */}
              {dragState && (alignmentGuides.x.length > 0 || alignmentGuides.y.length > 0) && (
                <svg
                  className="pointer-events-none"
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 20 }}
                  viewBox={`0 0 ${width * SCALE} ${height * SCALE}`}
                >
                  {alignmentGuides.x.map((x, i) => (
                    <line
                      key={`ax-${i}`}
                      x1={x * SCALE}
                      y1={0}
                      x2={x * SCALE}
                      y2={height * SCALE}
                      stroke="rgba(34, 197, 94, 0.8)"
                      strokeWidth={1.5}
                      strokeDasharray="6,3"
                    />
                  ))}
                  {alignmentGuides.y.map((y, i) => (
                    <line
                      key={`ay-${i}`}
                      x1={0}
                      y1={y * SCALE}
                      x2={width * SCALE}
                      y2={y * SCALE}
                      stroke="rgba(34, 197, 94, 0.8)"
                      strokeWidth={1.5}
                      strokeDasharray="6,3"
                    />
                  ))}
                </svg>
              )}

              {/* Fields */}
              {fields.filter(f => f.is_visible).map((field) => {
                const position = getFieldPosition(field);
                const isSelected = selectedFieldId === field.id;
                const isDragging = dragState?.fieldId === field.id;
                const isResizing = resizeState?.fieldId === field.id;
                const hasChange = fieldChanges.some(c => c.fieldId === field.id);
                const value = getFieldValue(field.field_key, field);
                const resizable = isResizableField(field.field_key);
                const effectiveWidth = localFieldWidths[field.id] ?? field.field_width;
                const hasWidth = effectiveWidth != null;
                
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
                        "border border-transparent transition-all select-none relative",
                        showFieldControls && "hover:border-primary/50 hover:bg-primary/5",
                        isSelected && "border-primary border-2 bg-primary/10 rounded",
                        isDragging && "border-primary border-2 bg-primary/20 rounded shadow-lg",
                        hasChange && !isSelected && "border-destructive/50 border bg-destructive/5"
                      )}
                      style={{
                        fontSize: `${field.font_size * SCALE * 0.353}px`,
                        fontFamily: fieldFontStyles[field.id] || getFontFamilyCSS(field.font_name),
                        fontWeight: (() => { const fc = field.font_name ? getFontByName(field.font_name) : undefined; return fc?.style === 'bold' ? 'bold' : 'normal'; })(),
                        color: field.font_color,
                        textAlign: field.text_align as 'left' | 'right' | 'center',
                        direction: effectiveDirection,
                        whiteSpace: hasWidth ? 'normal' : 'nowrap',
                        wordWrap: hasWidth ? 'break-word' : undefined,
                        width: hasWidth ? `${effectiveWidth! * SCALE}px` : undefined,
                        lineHeight: hasWidth ? '1.4' : undefined,
                        padding: '0',
                      }}
                      onMouseDown={(e) => showFieldControls && handleFieldMouseDown(e, field)}
                      title={`${field.field_name_ar}: X=${position.x}مم, Y=${position.y}مم${hasWidth ? `, W=${effectiveWidth}مم` : ''}`}
                    >
                      {isSelected && showFieldControls && !isDragging && (
                        <GripVertical className="inline-block h-3 w-3 ml-1 text-primary" />
                      )}
                      {value || `[${field.field_name_ar}]`}

                      {/* Word-style resize handles for resizable fields */}
                      {resizable && (isSelected || hasWidth) && showFieldControls && !isDragging && onFieldResize && (
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
                              [effectiveDirection === 'rtl' ? 'left' : 'right']: '-6px',
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
                              [effectiveDirection === 'rtl' ? 'right' : 'left']: '-6px',
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleResizeStart(e, field);
                            }}
                            title="اسحب لتغيير العرض"
                          />
                          {/* Corner handles */}
                          <div className="absolute -top-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                            style={{ [effectiveDirection === 'rtl' ? 'left' : 'right']: '-6px' }} />
                          <div className="absolute -top-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                            style={{ [effectiveDirection === 'rtl' ? 'right' : 'left']: '-6px' }} />
                          <div className="absolute -bottom-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                            style={{ [effectiveDirection === 'rtl' ? 'left' : 'right']: '-6px' }} />
                          <div className="absolute -bottom-1.5 w-3 h-3 bg-background border-2 border-primary rounded-sm pointer-events-none z-10"
                            style={{ [effectiveDirection === 'rtl' ? 'right' : 'left']: '-6px' }} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
