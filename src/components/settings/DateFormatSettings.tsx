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
  type DateFormatSettings as DateFormatSettingsType,
  type DateFieldConfig,
  type SingleDateFormat,
} from "@/lib/dateFormats";

export default function DateFormatSettings() {
  const { settings, isLoading, isSaving, saveSettings } = useDateFormatSettings();

  const [birthDate, setBirthDate] = useState<DateFieldConfig>(settings.birthDate);
  const [defenseDate, setDefenseDate] = useState<DateFieldConfig>(settings.defenseDate);
  const [certificateDate, setCertificateDate] = useState<DateFieldConfig>(settings.certificateDate);

  // Sync state with loaded settings
  useEffect(() => {
    if (!isLoading) {
      setBirthDate(settings.birthDate);
      setDefenseDate(settings.defenseDate);
      setCertificateDate(settings.certificateDate);
    }
  }, [isLoading, settings]);

  const handleSave = async () => {
    const newSettings: DateFormatSettingsType = {
      birthDate,
      defenseDate,
      certificateDate,
    };

    const success = await saveSettings(newSettings);

    if (success) {
      toast.success("تم حفظ إعدادات تنسيق التواريخ");
    } else {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleReset = () => {
    setBirthDate(DEFAULT_DATE_FORMAT_SETTINGS.birthDate);
    setDefenseDate(DEFAULT_DATE_FORMAT_SETTINGS.defenseDate);
    setCertificateDate(DEFAULT_DATE_FORMAT_SETTINGS.certificateDate);
    toast.info("تم إعادة تعيين الإعدادات للقيم الافتراضية - اضغط حفظ للتأكيد");
  };

  const updateFieldConfig = (
    setter: React.Dispatch<React.SetStateAction<DateFieldConfig>>,
    lang: 'ar' | 'fr',
    updates: Partial<SingleDateFormat>
  ) => {
    setter(prev => ({
      ...prev,
      [lang]: { ...prev[lang], ...updates },
    }));
  };

  const renderLanguageSelector = (
    langLabel: string,
    langCode: 'ar' | 'fr',
    config: DateFieldConfig,
    setter: React.Dispatch<React.SetStateAction<DateFieldConfig>>
  ) => {
    const langConfig = config[langCode];
    const effectivePattern = getEffectiveDatePattern(langConfig.formatId, langConfig.customPattern);
    const preview = getFormatPreview(effectivePattern, langCode === 'ar');

    const isArabicSection = langCode === 'ar';
    
    return (
      <div 
        className="space-y-2 p-3 bg-muted/20 rounded-lg border border-muted"
        dir={isArabicSection ? "rtl" : "ltr"}
      >
        <Label className="text-sm font-medium text-muted-foreground">{langLabel}</Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {isArabicSection ? "الصيغة" : "Format"}
            </Label>
            <Select 
              value={langConfig.formatId} 
              onValueChange={(v) => updateFieldConfig(setter, langCode, { formatId: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {isArabicSection ? preset.label_ar : preset.label_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {langConfig.formatId === "custom" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {isArabicSection ? "النمط المخصص" : "Motif personnalisé"}
              </Label>
              <Input
                value={langConfig.customPattern}
                onChange={(e) => updateFieldConfig(setter, langCode, { customPattern: e.target.value })}
                placeholder="DD/MM/YYYY"
                dir="ltr"
                className="font-mono h-9"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            {isArabicSection ? "معاينة:" : "Aperçu:"}
          </span>
          <span 
            className="font-medium bg-primary/10 px-2 py-0.5 rounded text-sm"
            dir="ltr"
          >
            {preview}
          </span>
        </div>
      </div>
    );
  };

  const renderDateFieldSection = (
    label: string,
    config: DateFieldConfig,
    setter: React.Dispatch<React.SetStateAction<DateFieldConfig>>
  ) => {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
        <Label className="text-base font-medium">{label}</Label>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {renderLanguageSelector("العربية", "ar", config, setter)}
          {renderLanguageSelector("الفرنسية", "fr", config, setter)}
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
            تخصيص طريقة عرض التواريخ في الشهادات المطبوعة (عربي وفرنسي بشكل مستقل)
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {renderDateFieldSection("تاريخ الميلاد", birthDate, setBirthDate)}
        {renderDateFieldSection("تاريخ المناقشة", defenseDate, setDefenseDate)}
        {renderDateFieldSection("تاريخ الشهادة", certificateDate, setCertificateDate)}
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p className="font-medium mb-1">الرموز المتاحة:</p>
        <p>DD (يوم) • MM (شهر رقم) • MMMM (اسم الشهر) • YYYY (سنة)</p>
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
