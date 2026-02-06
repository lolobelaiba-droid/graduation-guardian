import { useState } from "react";
import { Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { certificateFields, type CertificateType } from "@/types/certificates";
import { useCreateTemplateField } from "@/hooks/useCertificates";
import { toast } from "sonner";

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  certificateType: CertificateType;
  existingFieldKeys: string[];
}

export function AddFieldDialog({
  open,
  onOpenChange,
  templateId,
  certificateType,
  existingFieldKeys,
}: AddFieldDialogProps) {
  const [activeTab, setActiveTab] = useState<"predefined" | "custom" | "static">("predefined");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("");
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldNameAr, setCustomFieldNameAr] = useState("");
  const [customFieldNameFr, setCustomFieldNameFr] = useState("");
  // Static text fields
  const [staticText, setStaticText] = useState("");
  const [staticTextLabel, setStaticTextLabel] = useState("");
  const [positionX, setPositionX] = useState(100);
  const [positionY, setPositionY] = useState(100);
  const [fontSize, setFontSize] = useState(14);

  const createField = useCreateTemplateField();

  // Get available fields that haven't been added yet
  const availableFields = certificateFields[certificateType].filter(
    (f) => !existingFieldKeys.includes(f.key)
  );

  const handleSubmit = () => {
    if (activeTab === "predefined" && !selectedFieldKey) {
      toast.error("يرجى اختيار حقل");
      return;
    }

    if (activeTab === "custom" && (!customFieldKey || !customFieldNameAr)) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (activeTab === "static" && !staticText.trim()) {
      toast.error("يرجى إدخال النص الثابت");
      return;
    }

    let fieldKey: string;
    let fieldNameAr: string;
    let fieldNameFr: string | null = null;

    if (activeTab === "predefined") {
      const fieldDef = certificateFields[certificateType].find((f) => f.key === selectedFieldKey);
      fieldKey = selectedFieldKey;
      fieldNameAr = fieldDef?.name_ar || "";
      fieldNameFr = fieldDef?.name_fr || null;
    } else if (activeTab === "custom") {
      fieldKey = customFieldKey;
      fieldNameAr = customFieldNameAr;
      fieldNameFr = customFieldNameFr || null;
    } else {
      // Static text - use a unique key with timestamp
      fieldKey = `static_text_${Date.now()}`;
      fieldNameAr = staticTextLabel || "نص ثابت";
      fieldNameFr = null;
    }

    // Determine RTL based on field key suffix or content
    const isRtlField = activeTab === "static" 
      ? /[\u0600-\u06FF]/.test(staticText) // Check if static text contains Arabic
      : fieldKey.endsWith('_ar') || (!fieldKey.endsWith('_fr') && !fieldKey.includes('_fr_'));

    createField.mutate(
      {
        template_id: templateId,
        field_key: fieldKey,
        field_name_ar: fieldNameAr,
        field_name_fr: fieldNameFr,
        position_x: positionX,
        position_y: positionY,
        font_size: fontSize,
        font_name: "Cairo",
        font_color: "#000000",
        text_align: isRtlField ? "right" : "left",
        is_rtl: isRtlField,
        is_visible: true,
        field_width: null,
        field_order: existingFieldKeys.length + 1,
        // Store static text in field_name_fr if it's a static text field (workaround)
        ...(activeTab === "static" && { 
          field_name_fr: staticText // Store the actual static text content
        }),
      },
      {
        onSuccess: () => {
          toast.success(activeTab === "static" ? "تم إضافة النص الثابت بنجاح" : "تم إضافة الحقل بنجاح");
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setActiveTab("predefined");
    setSelectedFieldKey("");
    setCustomFieldKey("");
    setCustomFieldNameAr("");
    setCustomFieldNameFr("");
    setStaticText("");
    setStaticTextLabel("");
    setPositionX(100);
    setPositionY(100);
    setFontSize(14);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>إضافة حقل جديد</DialogTitle>
          <DialogDescription>
            اختر حقلاً من القائمة أو أنشئ حقلاً مخصصاً أو أضف نصاً ثابتاً
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predefined">حقول محددة</TabsTrigger>
            <TabsTrigger value="custom">حقل مخصص</TabsTrigger>
            <TabsTrigger value="static" className="gap-1">
              <Type className="h-3 w-3" />
              نص ثابت
            </TabsTrigger>
          </TabsList>

          {/* Predefined fields */}
          <TabsContent value="predefined" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>اختر الحقل</Label>
              {availableFields.length > 0 ? (
                <Select value={selectedFieldKey} onValueChange={setSelectedFieldKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حقلاً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.name_ar} ({field.name_fr})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  تم إضافة جميع الحقول المتاحة. يمكنك إنشاء حقل مخصص أو إضافة نص ثابت.
                </p>
              )}
            </div>
          </TabsContent>

          {/* Custom field */}
          <TabsContent value="custom" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>مفتاح الحقل (بالإنجليزية)</Label>
              <Input
                value={customFieldKey}
                onChange={(e) => setCustomFieldKey(e.target.value)}
                placeholder="custom_field_key"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الحقل (بالعربية) *</Label>
              <Input
                value={customFieldNameAr}
                onChange={(e) => setCustomFieldNameAr(e.target.value)}
                placeholder="اسم الحقل"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الحقل (بالفرنسية)</Label>
              <Input
                value={customFieldNameFr}
                onChange={(e) => setCustomFieldNameFr(e.target.value)}
                placeholder="Nom du champ"
                dir="ltr"
              />
            </div>
          </TabsContent>

          {/* Static text */}
          <TabsContent value="static" className="space-y-4 pt-4">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                النص الثابت يظهر على جميع الشهادات بنفس المحتوى (مثل: عناوين، تواريخ ثابتة، نصوص قانونية)
              </p>
            </div>
            <div className="space-y-2">
              <Label>النص الثابت *</Label>
              <Textarea
                value={staticText}
                onChange={(e) => setStaticText(e.target.value)}
                placeholder="أدخل النص الذي سيظهر على جميع الشهادات..."
                rows={3}
                dir="auto"
              />
            </div>
            <div className="space-y-2">
              <Label>تسمية الحقل (للتعريف فقط)</Label>
              <Input
                value={staticTextLabel}
                onChange={(e) => setStaticTextLabel(e.target.value)}
                placeholder="مثال: عنوان الكلية، ملاحظة قانونية..."
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Common fields: Position and Font Size */}
        <div className="space-y-4 pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label>الموقع X (مم)</Label>
              <Input
                type="number"
                value={positionX}
                onChange={(e) => setPositionX(Number(e.target.value))}
                min={0}
                max={297}
              />
            </div>
            <div className="space-y-2">
              <Label>الموقع Y (مم)</Label>
              <Input
                type="number"
                value={positionY}
                onChange={(e) => setPositionY(Number(e.target.value))}
                min={0}
                max={210}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>حجم الخط</Label>
            <Input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min={8}
              max={72}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={createField.isPending}>
            {createField.isPending ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
