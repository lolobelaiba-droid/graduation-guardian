import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useUpdateTemplate } from "@/hooks/useCertificates";
import {
  certificateTypeLabels,
  languageLabels,
  type CertificateTemplate,
  type CertificateType,
  type TemplateLanguage,
} from "@/types/certificates";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CertificateTemplate | null;
}

export function EditTemplateDialog({
  open,
  onOpenChange,
  template,
}: EditTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const [certificateType, setCertificateType] = useState<CertificateType>("phd_lmd");
  const [language, setLanguage] = useState<TemplateLanguage>("ar");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  const updateTemplate = useUpdateTemplate();

  useEffect(() => {
    if (template) {
      setTemplateName(template.template_name);
      setCertificateType(template.certificate_type as CertificateType);
      setLanguage(template.language as TemplateLanguage);
      setOrientation((template.page_orientation as "portrait" | "landscape") || "portrait");
    }
  }, [template]);

  const handleSubmit = async () => {
    if (!template || !templateName.trim()) {
      toast.error("يرجى إدخال اسم القالب");
      return;
    }

    updateTemplate.mutate(
      {
        id: template.id,
        template_name: templateName.trim(),
        certificate_type: certificateType,
        language: language,
        page_orientation: orientation,
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث القالب بنجاح");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("حدث خطأ أثناء تحديث القالب");
          console.error(error);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل القالب</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">اسم القالب</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="أدخل اسم القالب"
            />
          </div>

          <div className="space-y-2">
            <Label>نوع الشهادة</Label>
            <Select
              value={certificateType}
              onValueChange={(value) => setCertificateType(value as CertificateType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(certificateTypeLabels).map(([key, labels]) => (
                  <SelectItem key={key} value={key}>
                    {labels.ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>اللغة</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as TemplateLanguage)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languageLabels).map(([key, labels]) => (
                  <SelectItem key={key} value={key}>
                    {labels.ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>اتجاه الصفحة</Label>
            <Select
              value={orientation}
              onValueChange={(value) => setOrientation(value as "portrait" | "landscape")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">عمودي</SelectItem>
                <SelectItem value="landscape">أفقي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={updateTemplate.isPending}>
            {updateTemplate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ التغييرات"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
