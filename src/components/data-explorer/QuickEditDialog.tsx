import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertTriangle, Eye, EyeOff, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { getCurrentUserName } from "@/lib/current-user-store";
import { useRecordLock } from "@/hooks/useRecordLock";
import { RecordLockBanner } from "@/components/ui/record-lock-banner";
import { toast } from "sonner";

const FIELD_LABELS: Record<string, string> = {
  full_name_ar: "الاسم بالعربية", full_name_fr: "الاسم بالفرنسية",
  date_of_birth: "تاريخ الميلاد", birthplace_ar: "مكان الميلاد بالعربية",
  birthplace_fr: "مكان الميلاد بالفرنسية",
  gender: "الجنس", registration_number: "رقم التسجيل",
  student_number: "رقم الطالب", faculty_ar: "الكلية بالعربية",
  faculty_fr: "الكلية بالفرنسية",
  field_ar: "الميدان بالعربية", field_fr: "الميدان بالفرنسية",
  branch_ar: "الشعبة بالعربية", branch_fr: "الشعبة بالفرنسية",
  specialty_ar: "التخصص بالعربية", specialty_fr: "التخصص بالفرنسية",
  supervisor_ar: "المشرف", co_supervisor_ar: "المشرف المساعد",
  supervisor_university: "جامعة المشرف", co_supervisor_university: "جامعة المشرف المساعد",
  thesis_title_ar: "عنوان الأطروحة", thesis_title_fr: "عنوان الأطروحة بالفرنسية",
  defense_date: "تاريخ المناقشة", mention: "التقدير",
  stage_status: "حالة الطور", status: "الحالة",
  jury_president_ar: "رئيس اللجنة", jury_president_fr: "رئيس اللجنة بالفرنسية",
  jury_members_ar: "أعضاء اللجنة", jury_members_fr: "أعضاء اللجنة بالفرنسية",
  university_ar: "الجامعة بالعربية", university_fr: "الجامعة بالفرنسية",
  research_lab_ar: "المخبر",
  full_name: "الاسم", rank_label: "الرتبة", rank_abbreviation: "اختصار الرتبة",
  university: "الجامعة",
  employment_status: "الحالة الوظيفية", registration_type: "نوع التسجيل",
  inscription_status: "حالة التسجيل", first_registration_year: "سنة أول تسجيل",
  certificate_date: "تاريخ الشهادة", current_year: "السنة الحالية",
  thesis_language: "لغة الأطروحة", phone_number: "الهاتف",
  professional_email: "البريد الإلكتروني",
  province: "الولاية", registration_count: "عدد التسجيلات",
  notes: "ملاحظات", scientific_council_date: "تاريخ المجلس العلمي",
  signature_title: "صفة الموقع",
  decision_number: "رقم القرار", decision_date: "تاريخ القرار",
  decree_accreditation: "مرسوم الاعتماد", decree_training: "مرسوم التكوين",
  auth_decision_number: "رقم قرار الترخيص", auth_decision_date: "تاريخ قرار الترخيص",
  dean_letter_number: "رقم رسالة العميد", dean_letter_date: "تاريخ رسالة العميد",
};

const READ_ONLY_FIELDS = ["id", "created_at", "updated_at"];
const HIDDEN_FIELDS = ["id", "created_at", "updated_at"];

const LONG_TEXT_FIELDS = ["notes", "thesis_title_ar", "thesis_title_fr", "jury_members_ar", "jury_members_fr"];

const SELECT_FIELDS: Record<string, { value: string; label: string }[]> = {
  gender: [
    { value: "male", label: "ذكر" },
    { value: "female", label: "أنثى" },
  ],
  mention: [
    { value: "honorable", label: "مشرف" },
    { value: "very_honorable", label: "مشرف جداً" },
  ],
  stage_status: [
    { value: "pending", label: "قيد الانتظار" },
    { value: "authorized", label: "مرخص" },
    { value: "completed", label: "مكتمل" },
  ],
  thesis_language: [
    { value: "arabic", label: "العربية" },
    { value: "french", label: "الفرنسية" },
    { value: "english", label: "الإنجليزية" },
  ],
};

interface QuickEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Record<string, unknown> | null;
  sourceTable: string;
  onSaved?: () => void;
}

export function QuickEditDialog({ open, onOpenChange, record, sourceTable, onSaved }: QuickEditDialogProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  const recordId = record?.id as string | null;
  const { isLocked, lockedBy, acquireLock, releaseLock } = useRecordLock(sourceTable, recordId);

  // Initialize form data
  useEffect(() => {
    if (record && open) {
      const clean = { ...record };
      setFormData(clean);
      setOriginalData(clean);
      // Try to acquire lock
      acquireLock();
    }
    return () => {
      if (open) releaseLock();
    };
  }, [record, open]);

  const editableFields = useMemo(() => {
    if (!record) return [];
    return Object.keys(record)
      .filter(k => !HIDDEN_FIELDS.includes(k) && record[k] !== undefined)
      .sort((a, b) => {
        const aLabel = FIELD_LABELS[a] || a;
        const bLabel = FIELD_LABELS[b] || b;
        return aLabel.localeCompare(bLabel, "ar");
      });
  }, [record]);

  const changes = useMemo(() => {
    const diff: { field: string; oldVal: unknown; newVal: unknown }[] = [];
    for (const key of editableFields) {
      const oldVal = originalData[key];
      const newVal = formData[key];
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        diff.push({ field: key, oldVal, newVal });
      }
    }
    return diff;
  }, [formData, originalData, editableFields]);

  const hasChanges = changes.length > 0;

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value === "" ? null : value }));
  };

  const handleSave = async () => {
    if (!recordId || !sourceTable || !hasChanges) return;

    // Build update payload with only changed fields
    const updatePayload: Record<string, unknown> = {};
    for (const c of changes) {
      updatePayload[c.field] = c.newVal;
    }

    setSaving(true);
    try {
      if (isElectron()) {
        const db = getDbClient();
        if (db) {
          const result = await db.update(sourceTable, recordId, updatePayload);
          if (!result?.success) throw new Error(result?.error || "فشل التحديث");
        }
      } else {
        const { error } = await (supabase as any)
          .from(sourceTable)
          .update(updatePayload)
          .eq("id", recordId);
        if (error) throw error;
      }

      // Log activity
      try {
        const nameField = sourceTable === "professors" ? "full_name" : "full_name_ar";
        const name = formData[nameField] as string || "غير معروف";
        const changedFields = changes.map(c => FIELD_LABELS[c.field] || c.field).join("، ");
        const activityDesc = `تعديل سريع: ${name} — الحقول: ${changedFields}`;
        
        if (isElectron()) {
          const db = getDbClient();
          if (db) {
            await db.insert("activity_log", {
              activity_type: "student_updated",
              description: activityDesc,
              entity_id: recordId,
              entity_type: sourceTable,
            });
          }
        } else {
          await supabase.from("activity_log").insert({
            activity_type: "student_updated",
            description: activityDesc,
            entity_id: recordId,
            entity_type: sourceTable,
          });
        }
      } catch { /* activity log is non-critical */ }

      toast.success(`تم حفظ ${changes.length} تعديل بنجاح`);
      releaseLock();
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Quick edit save error:", err);
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (key: string) => {
    const label = FIELD_LABELS[key] || key;
    const value = formData[key];
    const isReadOnly = READ_ONLY_FIELDS.includes(key);
    const isChanged = String(originalData[key] ?? "") !== String(value ?? "");

    // Select fields
    if (SELECT_FIELDS[key]) {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            {label}
            {isChanged && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">معدّل</Badge>}
          </Label>
          <Select value={String(value ?? "")} onValueChange={(v) => handleFieldChange(key, v)} disabled={isLocked}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECT_FIELDS[key].map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Long text fields
    if (LONG_TEXT_FIELDS.includes(key)) {
      return (
        <div key={key} className="space-y-1.5 col-span-2">
          <Label className="text-xs flex items-center gap-1.5">
            {label}
            {isChanged && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">معدّل</Badge>}
          </Label>
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="text-sm min-h-[60px] resize-y"
            dir="auto"
            disabled={isLocked}
          />
        </div>
      );
    }

    // Number fields
    if (key === "registration_count") {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            {label}
            {isChanged && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">معدّل</Badge>}
          </Label>
          <Input
            type="number"
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(key, e.target.value ? Number(e.target.value) : null)}
            className="h-9 text-sm"
            disabled={isLocked}
          />
        </div>
      );
    }

    // Default text/date input
    const isDate = key.includes("date") || key === "certificate_date" || key === "scientific_council_date";
    return (
      <div key={key} className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          {label}
          {isChanged && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">معدّل</Badge>}
        </Label>
        <Input
          type={isDate ? "date" : "text"}
          value={String(value ?? "")}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          className="h-9 text-sm"
          dir="auto"
          disabled={isReadOnly || isLocked}
        />
      </div>
    );
  };

  const tableLabel: Record<string, string> = {
    phd_lmd_students: "طلبة دكتوراه ل.م.د",
    phd_science_students: "طلبة دكتوراه علوم",
    defense_stage_lmd: "طور المناقشة ل.م.د",
    defense_stage_science: "طور المناقشة علوم",
    phd_lmd_certificates: "شهادات دكتوراه ل.م.د",
    phd_science_certificates: "شهادات دكتوراه علوم",
    master_certificates: "شهادات ماستر",
    professors: "الأساتذة",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) releaseLock(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            تصحيح سريع
            <Badge variant="secondary" className="text-xs">{tableLabel[sourceTable] || sourceTable}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLocked && lockedBy && (
          <RecordLockBanner isLocked={isLocked} lockedBy={lockedBy} />
        )}

        {/* Changes preview */}
        {hasChanges && (
          <div className="border rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>{changes.length} تعديل معلّق</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowChanges(!showChanges)}>
                {showChanges ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showChanges ? "إخفاء" : "مراجعة"}
              </Button>
            </div>
            {showChanges && (
              <div className="mt-2 space-y-1.5">
                {changes.map(c => (
                  <div key={c.field} className="text-xs flex items-center gap-2 p-1.5 rounded bg-background/80">
                    <span className="font-medium min-w-[100px]">{FIELD_LABELS[c.field] || c.field}:</span>
                    <span className="line-through text-muted-foreground truncate max-w-[150px]">{String(c.oldVal ?? "فارغ")}</span>
                    <span className="text-primary">←</span>
                    <span className="text-primary font-medium truncate max-w-[150px]">{String(c.newVal ?? "فارغ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <ScrollArea className="h-[55vh]">
          <div className="grid grid-cols-2 gap-3 p-1">
            {editableFields.map(renderField)}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges || isLocked} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التعديلات ({changes.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
