import { useState } from "react";
import { Paintbrush, Type, AlignCenter, AlignLeft, AlignRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/types/certificates";

// Common Arabic fonts
const FONT_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Simplified Arabic", label: "Simplified Arabic" },
  { value: "Traditional Arabic", label: "Traditional Arabic" },
  { value: "Arial Unicode MS", label: "Arial Unicode MS" },
  { value: "Sakkal Majalla", label: "Sakkal Majalla" },
  { value: "Microsoft Sans Serif", label: "Microsoft Sans Serif" },
];

// Common colors
const COLOR_PRESETS = [
  "#000000", // Black
  "#1a1a1a", // Dark gray
  "#333333", // Gray
  "#0066cc", // Blue
  "#006600", // Green
  "#660000", // Dark red
  "#663300", // Brown
  "#000066", // Navy
];

interface FieldPropertiesEditorProps {
  selectedField: TemplateField | null;
  fields: TemplateField[];
  onUpdateField: (fieldId: string, updates: Partial<TemplateField>) => void;
  onUpdateAllFields: (updates: Partial<TemplateField>) => void;
  isUpdating?: boolean;
}

export function FieldPropertiesEditor({
  selectedField,
  fields,
  onUpdateField,
  onUpdateAllFields,
  isUpdating = false,
}: FieldPropertiesEditorProps) {
  const [applyToAll, setApplyToAll] = useState(false);
  const [localFontSize, setLocalFontSize] = useState<number>(selectedField?.font_size || 14);
  const [localFontName, setLocalFontName] = useState<string>(selectedField?.font_name || "Arial");
  const [localFontColor, setLocalFontColor] = useState<string>(selectedField?.font_color || "#000000");
  const [localTextAlign, setLocalTextAlign] = useState<string>(selectedField?.text_align || "center");
  const [localIsRtl, setLocalIsRtl] = useState<boolean>(selectedField?.is_rtl ?? true);

  // Sync local state when selected field changes
  useState(() => {
    if (selectedField) {
      setLocalFontSize(selectedField.font_size);
      setLocalFontName(selectedField.font_name);
      setLocalFontColor(selectedField.font_color);
      setLocalTextAlign(selectedField.text_align);
      setLocalIsRtl(selectedField.is_rtl);
    }
  });

  const handleApply = (property: keyof TemplateField, value: unknown) => {
    if (applyToAll) {
      onUpdateAllFields({ [property]: value });
    } else if (selectedField) {
      onUpdateField(selectedField.id, { [property]: value });
    }
  };

  const handleApplyAll = () => {
    const updates: Partial<TemplateField> = {
      font_size: localFontSize,
      font_name: localFontName,
      font_color: localFontColor,
      text_align: localTextAlign,
      is_rtl: localIsRtl,
    };

    if (applyToAll) {
      onUpdateAllFields(updates);
    } else if (selectedField) {
      onUpdateField(selectedField.id, updates);
    }
  };

  if (!selectedField && !applyToAll) {
    return (
      <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground">
        <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>اختر حقلاً لتعديل خصائصه</p>
        <p className="text-xs mt-1">أو فعّل "تطبيق على الكل" للتعديل الجماعي</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
      {/* Header with Apply to All toggle */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Paintbrush className="h-4 w-4" />
          خصائص الحقل
        </h4>
        <div className="flex items-center gap-2">
          <Switch
            id="apply-all"
            checked={applyToAll}
            onCheckedChange={setApplyToAll}
          />
          <Label htmlFor="apply-all" className="text-sm cursor-pointer">
            تطبيق على الكل
          </Label>
        </div>
      </div>

      {selectedField && !applyToAll && (
        <Badge variant="outline" className="w-full justify-center">
          {selectedField.field_name_ar}
        </Badge>
      )}

      {applyToAll && (
        <Badge variant="default" className="w-full justify-center">
          سيتم التطبيق على {fields.length} حقل
        </Badge>
      )}

      <Separator />

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>حجم الخط</Label>
          <span className="text-sm font-mono bg-background px-2 py-0.5 rounded">
            {localFontSize}px
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Slider
            value={[localFontSize]}
            onValueChange={([value]) => setLocalFontSize(value)}
            min={8}
            max={72}
            step={1}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => handleApply('font_size', localFontSize)}
            disabled={isUpdating}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label>نوع الخط</Label>
        <div className="flex items-center gap-2">
          <Select
            value={localFontName}
            onValueChange={(value) => {
              setLocalFontName(value);
              handleApply('font_name', value);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Font Color */}
      <div className="space-y-2">
        <Label>لون الخط</Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: localFontColor }}
                />
                <span className="font-mono text-xs">{localFontColor}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "h-8 w-8 rounded border-2 transition-all",
                        localFontColor === color
                          ? "border-primary scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setLocalFontColor(color);
                        handleApply('font_color', color);
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={localFontColor}
                    onChange={(e) => setLocalFontColor(e.target.value)}
                    className="h-8 w-12 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localFontColor}
                    onChange={(e) => setLocalFontColor(e.target.value)}
                    className="flex-1 font-mono text-xs"
                    dir="ltr"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleApply('font_color', localFontColor)}
                    disabled={isUpdating}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label>محاذاة النص</Label>
        <div className="flex gap-1">
          {[
            { value: 'right', icon: AlignRight, label: 'يمين' },
            { value: 'center', icon: AlignCenter, label: 'وسط' },
            { value: 'left', icon: AlignLeft, label: 'يسار' },
          ].map(({ value, icon: Icon, label }) => (
            <Button
              key={value}
              variant={localTextAlign === value ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setLocalTextAlign(value);
                handleApply('text_align', value);
              }}
              disabled={isUpdating}
            >
              <Icon className="h-4 w-4 ml-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* RTL Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="rtl-toggle">اتجاه النص (RTL)</Label>
        <Switch
          id="rtl-toggle"
          checked={localIsRtl}
          onCheckedChange={(checked) => {
            setLocalIsRtl(checked);
            handleApply('is_rtl', checked);
          }}
          disabled={isUpdating}
        />
      </div>

      <Separator />

      {/* Apply All Button */}
      <Button
        className="w-full"
        onClick={handleApplyAll}
        disabled={isUpdating || (!selectedField && !applyToAll)}
      >
        <Check className="h-4 w-4 ml-2" />
        {applyToAll ? `تطبيق على ${fields.length} حقل` : 'تطبيق التغييرات'}
      </Button>
    </div>
  );
}
