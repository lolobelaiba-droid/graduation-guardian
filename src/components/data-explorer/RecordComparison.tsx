import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SearchResult } from "@/hooks/useDataExplorer";

const HIDDEN_FIELDS = ["id", "created_at", "updated_at", "_source", "_role"];
const FIELD_LABELS: Record<string, string> = {
  full_name_ar: "الاسم بالعربية", full_name_fr: "الاسم بالفرنسية",
  date_of_birth: "تاريخ الميلاد", birthplace_ar: "مكان الميلاد", gender: "الجنس",
  registration_number: "رقم التسجيل", student_number: "الرقم", faculty_ar: "الكلية",
  field_ar: "الميدان", branch_ar: "الفرع", specialty_ar: "التخصص",
  supervisor_ar: "المشرف", co_supervisor_ar: "المشرف المساعد",
  thesis_title_ar: "عنوان الأطروحة", defense_date: "تاريخ المناقشة",
  mention: "التقدير", stage_status: "الحالة", university_ar: "الجامعة",
  full_name: "الاسم", rank_label: "الرتبة", university: "الجامعة",
  employment_status: "الحالة الوظيفية", registration_type: "نوع التسجيل",
  inscription_status: "حالة التسجيل", first_registration_year: "سنة أول تسجيل",
  phone_number: "الهاتف", professional_email: "البريد", province: "الولاية",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordA: SearchResult;
  recordB: SearchResult;
}

export function RecordComparison({ open, onOpenChange, recordA, recordB }: Props) {
  const allKeys = Array.from(new Set([
    ...Object.keys(recordA.raw),
    ...Object.keys(recordB.raw),
  ])).filter(k => !HIDDEN_FIELDS.includes(k));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle>مقارنة بين سجلين</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[65vh]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-right font-semibold w-[25%]">الحقل</th>
                <th className="p-2 text-right font-semibold w-[37.5%]">
                  <div className="flex items-center gap-2">
                    {recordA.name}
                    <Badge variant="secondary" className="text-[10px]">{recordA.typeLabel}</Badge>
                  </div>
                </th>
                <th className="p-2 text-right font-semibold w-[37.5%]">
                  <div className="flex items-center gap-2">
                    {recordB.name}
                    <Badge variant="secondary" className="text-[10px]">{recordB.typeLabel}</Badge>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map(key => {
                const valA = String(recordA.raw[key] ?? "");
                const valB = String(recordB.raw[key] ?? "");
                const isDifferent = valA !== valB;
                return (
                  <tr key={key} className={`border-b ${isDifferent ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                    <td className="p-2 text-xs font-medium text-muted-foreground">{FIELD_LABELS[key] || key}</td>
                    <td className={`p-2 text-sm ${isDifferent ? "font-semibold" : ""}`}>{valA || "—"}</td>
                    <td className={`p-2 text-sm ${isDifferent ? "font-semibold" : ""}`}>{valB || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
