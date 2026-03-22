import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { SearchResult } from "@/hooks/useDataExplorer";

const HIDDEN_FIELDS = ["id", "created_at", "updated_at", "_source", "_role"];

const FIELD_LABELS: Record<string, string> = {
  full_name_ar: "الاسم بالعربية", full_name_fr: "الاسم بالفرنسية",
  date_of_birth: "تاريخ الميلاد", birthplace_ar: "مكان الميلاد",
  gender: "الجنس", registration_number: "رقم التسجيل",
  student_number: "الرقم", faculty_ar: "الكلية",
  field_ar: "الميدان", branch_ar: "الفرع", specialty_ar: "التخصص",
  supervisor_ar: "المشرف", co_supervisor_ar: "المشرف المساعد",
  thesis_title_ar: "عنوان الأطروحة", defense_date: "تاريخ المناقشة",
  mention: "التقدير", stage_status: "الحالة",
  jury_president_ar: "رئيس اللجنة", jury_members_ar: "أعضاء اللجنة",
  university_ar: "الجامعة", research_lab_ar: "المخبر",
  full_name: "الاسم", rank_label: "الرتبة", university: "الجامعة",
  employment_status: "الحالة الوظيفية", registration_type: "نوع التسجيل",
  inscription_status: "حالة التسجيل", first_registration_year: "سنة أول تسجيل",
  certificate_date: "تاريخ الشهادة", phone_number: "الهاتف",
  professional_email: "البريد", province: "الولاية",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SearchResult;
}

export function RecordPrintCard({ open, onOpenChange, result }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const fields = Object.entries(result.raw)
    .filter(([key, val]) => !HIDDEN_FIELDS.includes(key) && val != null && val !== "");

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>بطاقة سجل - ${result.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif; padding: 20mm; direction: rtl; }
          .card-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
          .card-header h1 { font-size: 18pt; margin-bottom: 4px; }
          .card-header .badge { font-size: 10pt; color: #555; }
          .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .field { border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; }
          .field-label { font-size: 8pt; color: #666; margin-bottom: 2px; }
          .field-value { font-size: 10pt; font-weight: 600; word-break: break-word; }
          .field.full-width { grid-column: 1 / -1; }
          .footer { text-align: center; margin-top: 16px; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
          @media print { body { padding: 10mm; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <div class="footer">تم الإنشاء بواسطة النظام — ${new Date().toLocaleDateString("ar-DZ")}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const longFields = ["thesis_title_ar", "thesis_title_fr", "jury_members_ar", "jury_members_fr", "notes"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>بطاقة السجل</span>
            <Button size="sm" className="gap-2" onClick={handlePrint}><Printer className="h-4 w-4" />طباعة</Button>
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef}>
          <div className="card-header" style={{ textAlign: "center", borderBottom: "2px solid #333", paddingBottom: 12, marginBottom: 16 }}>
            <h1 style={{ fontSize: "18pt", marginBottom: 4 }}>{result.name}</h1>
            <span className="badge" style={{ fontSize: "10pt", color: "#555" }}>{result.typeLabel} {result.subType ? `— ${result.subType}` : ""}</span>
          </div>
          <div className="fields-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {fields.map(([key, value]) => (
              <div key={key} className={`field ${longFields.includes(key) ? "full-width" : ""}`}
                style={{
                  border: "1px solid #ddd", borderRadius: 4, padding: "6px 10px",
                  ...(longFields.includes(key) ? { gridColumn: "1 / -1" } : {})
                }}>
                <div className="field-label" style={{ fontSize: "8pt", color: "#666", marginBottom: 2 }}>{FIELD_LABELS[key] || key}</div>
                <div className="field-value" style={{ fontSize: "10pt", fontWeight: 600, wordBreak: "break-word" }}>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
