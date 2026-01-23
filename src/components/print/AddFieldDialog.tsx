import { useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [isCustomField, setIsCustomField] = useState(false);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("");
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldNameAr, setCustomFieldNameAr] = useState("");
  const [customFieldNameFr, setCustomFieldNameFr] = useState("");
  const [positionX, setPositionX] = useState(100);
  const [positionY, setPositionY] = useState(100);
  const [fontSize, setFontSize] = useState(14);

  const createField = useCreateTemplateField();

  // Get available fields that haven't been added yet
  const availableFields = certificateFields[certificateType].filter(
    (f) => !existingFieldKeys.includes(f.key)
  );

  const handleSubmit = () => {
    if (!isCustomField && !selectedFieldKey) {
      toast.error("يرجى اختيار حقل");
      return;
    }

    if (isCustomField && (!customFieldKey || !customFieldNameAr)) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const fieldDef = isCustomField
      ? null
      : certificateFields[certificateType].find((f) => f.key === selectedFieldKey);

    createField.mutate(
      {
        template_id: templateId,
        field_key: isCustomField ? customFieldKey : selectedFieldKey,
        field_name_ar: isCustomField ? customFieldNameAr : fieldDef?.name_ar || "",
        field_name_fr: isCustomField ? customFieldNameFr || null : fieldDef?.name_fr || null,
        position_x: positionX,
        position_y: positionY,
        font_size: fontSize,
        font_name: "Arial",
        font_color: "#000000",
        text_align: "center",
        is_rtl: true,
        is_visible: true,
        field_order: existingFieldKeys.length + 1,
      },
      {
        onSuccess: () => {
          toast.success("تم إضافة الحقل بنجاح");
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setIsCustomField(false);
    setSelectedFieldKey("");
    setCustomFieldKey("");
    setCustomFieldNameAr("");
    setCustomFieldNameFr("");
    setPositionX(100);
    setPositionY(100);
    setFontSize(14);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إضافة حقل جديد</DialogTitle>
          <DialogDescription>
            اختر حقلاً من القائمة أو أنشئ حقلاً مخصصاً
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Custom field toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="custom-field"
              checked={isCustomField}
              onCheckedChange={(checked) => setIsCustomField(!!checked)}
            />
            <Label htmlFor="custom-field">حقل مخصص</Label>
          </div>

          {!isCustomField ? (
            /* Predefined field selection */
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
                  تم إضافة جميع الحقول المتاحة. يمكنك إنشاء حقل مخصص.
                </p>
              )}
            </div>
          ) : (
            /* Custom field inputs */
            <div className="space-y-4">
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
            </div>
          )}

          {/* Position */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Font size */}
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
            {createField.isPending ? "جاري الإضافة..." : "إضافة الحقل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
