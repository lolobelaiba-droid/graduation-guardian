import { useState, useEffect } from "react";
import { Calendar, Save, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useDateFormatSettings } from "@/hooks/useDateFormatSettings";
import {
  DATE_FORMAT_PRESETS,
  getFormatPreview,
  getEffectiveDatePattern,
  DEFAULT_DATE_FORMAT_SETTINGS,
} from "@/lib/dateFormats";

export default function DateFormatSettings() {
  const { settings, isLoading, isSaving, saveSettings } = useDateFormatSettings();

  const [birthDateFormat, setBirthDateFormat] = useState(settings.birthDateFormat);
  const [birthDateCustomPattern, setBirthDateCustomPattern] = useState(settings.birthDateCustomPattern);
  const [defenseDateFormat, setDefenseDateFormat] = useState(settings.defenseDateFormat);
  const [defenseDateCustomPattern, setDefenseDateCustomPattern] = useState(settings.defenseDateCustomPattern);
  const [certificateDateFormat, setCertificateDateFormat] = useState(settings.certificateDateFormat);
  const [certificateDateCustomPattern, setCertificateDateCustomPattern] = useState(settings.certificateDateCustomPattern);

  // Sync state with loaded settings
  useEffect(() => {
    if (!isLoading) {
      setBirthDateFormat(settings.birthDateFormat);
      setBirthDateCustomPattern(settings.birthDateCustomPattern);
      setDefenseDateFormat(settings.defenseDateFormat);
      setDefenseDateCustomPattern(settings.defenseDateCustomPattern);
      setCertificateDateFormat(settings.certificateDateFormat);
      setCertificateDateCustomPattern(settings.certificateDateCustomPattern);
    }
  }, [isLoading, settings]);

  const handleSave = async () => {
    const success = await saveSettings({
      birthDateFormat,
      birthDateCustomPattern,
      defenseDateFormat,
      defenseDateCustomPattern,
      certificateDateFormat,
      certificateDateCustomPattern,
    });

    if (success) {
      toast.success("تم حفظ إعدادات تنسيق التواريخ");
    } else {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleReset = () => {
    setBirthDateFormat(DEFAULT_DATE_FORMAT_SETTINGS.birthDateFormat);
    setBirthDateCustomPattern(DEFAULT_DATE_FORMAT_SETTINGS.birthDateCustomPattern);
    setDefenseDateFormat(DEFAULT_DATE_FORMAT_SETTINGS.defenseDateFormat);
    setDefenseDateCustomPattern(DEFAULT_DATE_FORMAT_SETTINGS.defenseDateCustomPattern);
    setCertificateDateFormat(DEFAULT_DATE_FORMAT_SETTINGS.certificateDateFormat);
    setCertificateDateCustomPattern(DEFAULT_DATE_FORMAT_SETTINGS.certificateDateCustomPattern);
    toast.info("تم إعادة تعيين الإعدادات للقيم الافتراضية - اضغط حفظ للتأكيد");
  };

  const renderFormatSelector = (
    label: string,
    formatId: string,
    setFormatId: (v: string) => void,
    customPattern: string,
    setCustomPattern: (v: string) => void
  ) => {
    const effectivePattern = getEffectiveDatePattern(formatId, customPattern);
    const previewAr = getFormatPreview(effectivePattern, true);
    const previewFr = getFormatPreview(effectivePattern, false);

    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
        <Label className="text-base font-medium">{label}</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">الصيغة</Label>
            <Select value={formatId} onValueChange={setFormatId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formatId === "custom" && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                النمط المخصص
              </Label>
              <Input
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
                placeholder="DD/MM/YYYY"
                dir="ltr"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                الرموز: DD (يوم), MM (شهر رقم), MMMM (اسم الشهر), YYYY (سنة)
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">معاينة عربي:</span>
            <span className="font-medium bg-primary/10 px-2 py-1 rounded text-sm">
              {previewAr}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">معاينة فرنسي:</span>
            <span className="font-medium bg-primary/10 px-2 py-1 rounded text-sm" dir="ltr">
              {previewFr}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">تنسيق التواريخ</h3>
          <p className="text-sm text-muted-foreground">
            تخصيص طريقة عرض التواريخ في الشهادات المطبوعة
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {renderFormatSelector(
          "تاريخ الميلاد",
          birthDateFormat,
          setBirthDateFormat,
          birthDateCustomPattern,
          setBirthDateCustomPattern
        )}

        {renderFormatSelector(
          "تاريخ المناقشة",
          defenseDateFormat,
          setDefenseDateFormat,
          defenseDateCustomPattern,
          setDefenseDateCustomPattern
        )}

        {renderFormatSelector(
          "تاريخ الشهادة",
          certificateDateFormat,
          setCertificateDateFormat,
          certificateDateCustomPattern,
          setCertificateDateCustomPattern
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" className="gap-2" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
          إعادة تعيين
        </Button>

        <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}
