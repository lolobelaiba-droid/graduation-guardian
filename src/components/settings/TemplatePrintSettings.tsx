import { useState, useEffect } from "react";
import { Printer, Save, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCertificateTemplates, useUpdateTemplate } from "@/hooks/useCertificates";
import { certificateTypeLabels, type CertificateType } from "@/types/certificates";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Paper sizes with dimensions in mm
const PAPER_SIZES = [
  { value: "a0", label: "A0", width: 841, height: 1189 },
  { value: "a1", label: "A1", width: 594, height: 841 },
  { value: "a2", label: "A2", width: 420, height: 594 },
  { value: "a3", label: "A3", width: 297, height: 420 },
  { value: "a4", label: "A4", width: 210, height: 297 },
  { value: "a5", label: "A5", width: 148, height: 210 },
  { value: "a6", label: "A6", width: 105, height: 148 },
  { value: "b4", label: "B4", width: 250, height: 353 },
  { value: "b5", label: "B5", width: 176, height: 250 },
  { value: "letter", label: "Letter", width: 216, height: 279 },
  { value: "legal", label: "Legal", width: 216, height: 356 },
  { value: "tabloid", label: "Tabloid", width: 279, height: 432 },
  { value: "executive", label: "Executive", width: 184, height: 267 },
  { value: "custom", label: "حجم مخصص", width: 0, height: 0 },
];

const typeColors: Record<CertificateType, string> = {
  phd_lmd: "bg-primary/10 text-primary border-primary/20",
  phd_science: "bg-success/10 text-success border-success/20",
  master: "bg-warning/10 text-warning border-warning/20",
};

interface TemplateSettings {
  paperSize: string;
  customWidth: string;
  customHeight: string;
  marginTop: string;
  marginBottom: string;
  marginRight: string;
  marginLeft: string;
}

interface TemplateSettingsState {
  [templateId: string]: TemplateSettings;
}

export default function TemplatePrintSettings() {
  const { data: templates = [], isLoading } = useCertificateTemplates();
  const updateTemplate = useUpdateTemplate();
  
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [localSettings, setLocalSettings] = useState<TemplateSettingsState>({});
  const [savingTemplates, setSavingTemplates] = useState<Set<string>>(new Set());

  // Initialize local settings from templates
  useEffect(() => {
    if (templates.length > 0) {
      const initial: TemplateSettingsState = {};
      templates.forEach((template) => {
        initial[template.id] = {
          paperSize: (template as any).print_paper_size || "a4",
          customWidth: String((template as any).print_custom_width || 210),
          customHeight: String((template as any).print_custom_height || 297),
          marginTop: String((template as any).print_margin_top || 20),
          marginBottom: String((template as any).print_margin_bottom || 20),
          marginRight: String((template as any).print_margin_right || 15),
          marginLeft: String((template as any).print_margin_left || 15),
        };
      });
      setLocalSettings(initial);
    }
  }, [templates]);

  const toggleTemplate = (templateId: string) => {
    setOpenTemplates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const updateLocalSetting = (
    templateId: string,
    key: keyof TemplateSettings,
    value: string
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [key]: value,
      },
    }));
  };

  const saveTemplateSettings = async (templateId: string) => {
    const settings = localSettings[templateId];
    if (!settings) return;

    setSavingTemplates((prev) => new Set(prev).add(templateId));

    try {
      await updateTemplate.mutateAsync({
        id: templateId,
        print_paper_size: settings.paperSize,
        print_custom_width: parseFloat(settings.customWidth) || 210,
        print_custom_height: parseFloat(settings.customHeight) || 297,
        print_margin_top: parseFloat(settings.marginTop) || 20,
        print_margin_bottom: parseFloat(settings.marginBottom) || 20,
        print_margin_right: parseFloat(settings.marginRight) || 15,
        print_margin_left: parseFloat(settings.marginLeft) || 15,
      } as any);

      toast.success("تم حفظ إعدادات الطباعة");
    } catch (error) {
      console.error("Error saving template print settings:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSavingTemplates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
    }
  };

  const getPaperDimensions = (settings: TemplateSettings) => {
    if (settings.paperSize === "custom") {
      return `${settings.customWidth} × ${settings.customHeight} مم`;
    }
    const paper = PAPER_SIZES.find((p) => p.value === settings.paperSize);
    return paper ? `${paper.width} × ${paper.height} مم` : "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Printer className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">إعدادات الطباعة للقوالب</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد قوالب حتى الآن</p>
          <p className="text-sm mt-2">قم بإنشاء قالب أولاً من صفحة القوالب</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Printer className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">إعدادات الطباعة للقوالب</h3>
          <p className="text-sm text-muted-foreground">
            تخصيص إعدادات الطباعة لكل قالب على حدة
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {templates.map((template) => {
          const settings = localSettings[template.id];
          const isOpen = openTemplates.has(template.id);
          const isSaving = savingTemplates.has(template.id);

          if (!settings) return null;

          return (
            <Collapsible
              key={template.id}
              open={isOpen}
              onOpenChange={() => toggleTemplate(template.id)}
            >
              <div
                className={cn(
                  "border rounded-xl transition-all",
                  isOpen ? "border-primary/30 bg-primary/5" : "border-border"
                )}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-medium">{template.template_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              typeColors[template.certificate_type as CertificateType]
                            )}
                          >
                            {certificateTypeLabels[template.certificate_type as CertificateType]?.ar}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getPaperDimensions(settings)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4">
                    <Separator />

                    {/* Paper Size */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>حجم الورق</Label>
                        <Select
                          value={settings.paperSize}
                          onValueChange={(v) =>
                            updateLocalSetting(template.id, "paperSize", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAPER_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                                {size.width > 0 && (
                                  <span className="text-muted-foreground mr-2">
                                    ({size.width} × {size.height} مم)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {settings.paperSize === "custom" && (
                        <>
                          <div className="space-y-2">
                            <Label>العرض (مم)</Label>
                            <Input
                              type="number"
                              value={settings.customWidth}
                              onChange={(e) =>
                                updateLocalSetting(
                                  template.id,
                                  "customWidth",
                                  e.target.value
                                )
                              }
                              min="50"
                              max="1000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الارتفاع (مم)</Label>
                            <Input
                              type="number"
                              value={settings.customHeight}
                              onChange={(e) =>
                                updateLocalSetting(
                                  template.id,
                                  "customHeight",
                                  e.target.value
                                )
                              }
                              min="50"
                              max="1500"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Margins */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-3 block">
                        الهوامش (مم)
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">أعلى</Label>
                          <Input
                            type="number"
                            value={settings.marginTop}
                            onChange={(e) =>
                              updateLocalSetting(
                                template.id,
                                "marginTop",
                                e.target.value
                              )
                            }
                            min="0"
                            max="100"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">أسفل</Label>
                          <Input
                            type="number"
                            value={settings.marginBottom}
                            onChange={(e) =>
                              updateLocalSetting(
                                template.id,
                                "marginBottom",
                                e.target.value
                              )
                            }
                            min="0"
                            max="100"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">يمين</Label>
                          <Input
                            type="number"
                            value={settings.marginRight}
                            onChange={(e) =>
                              updateLocalSetting(
                                template.id,
                                "marginRight",
                                e.target.value
                              )
                            }
                            min="0"
                            max="100"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">يسار</Label>
                          <Input
                            type="number"
                            value={settings.marginLeft}
                            onChange={(e) =>
                              updateLocalSetting(
                                template.id,
                                "marginLeft",
                                e.target.value
                              )
                            }
                            min="0"
                            max="100"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => saveTemplateSettings(template.id)}
                        disabled={isSaving}
                        size="sm"
                        className="gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        حفظ إعدادات هذا القالب
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
