import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

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
  certificate_date: "تاريخ الشهادة", current_year: "السنة الحالية",
  phone_number: "الهاتف", professional_email: "البريد", province: "الولاية",
  registration_count: "عدد التسجيلات", notes: "ملاحظات",
  birthplace_fr: "مكان الميلاد بالفرنسية", faculty_fr: "الكلية بالفرنسية",
  field_fr: "الميدان بالفرنسية", branch_fr: "الفرع بالفرنسية",
  specialty_fr: "التخصص بالفرنسية", thesis_title_fr: "عنوان الأطروحة بالفرنسية",
  university_fr: "الجامعة بالفرنسية", supervisor_university: "جامعة المشرف",
  co_supervisor_university: "جامعة المشرف المساعد", thesis_language: "لغة الأطروحة",
  rank_abbreviation: "اختصار الرتبة", scientific_council_date: "تاريخ المجلس العلمي",
  signature_title: "صفة الموقع",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  fileName: string;
}

export function CustomExportDialog({ open, onOpenChange, data, fileName }: Props) {
  const allKeys = useMemo(() => {
    if (!data.length) return [];
    return Array.from(new Set(data.flatMap(r => Object.keys(r)))).filter(k => !HIDDEN_FIELDS.includes(k));
  }, [data]);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(allKeys));

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(allKeys));
  const deselectAll = () => setSelectedKeys(new Set());

  const handleExport = async () => {
    if (selectedKeys.size === 0) { toast.error("اختر عموداً واحداً على الأقل"); return; }
    try {
      const keys = allKeys.filter(k => selectedKeys.has(k));
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("البيانات");
      ws.columns = keys.map(k => ({ header: FIELD_LABELS[k] || k, key: k, width: 22 }));
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 28;
      data.forEach(record => {
        const row: any = {};
        keys.forEach(k => { row[k] = record[k] ?? ""; });
        ws.addRow(row);
      });
      ws.views = [{ rightToLeft: true, state: "normal" }];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${fileName}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("تم التصدير بنجاح");
      onOpenChange(false);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("حدث خطأ أثناء التصدير");
    }
  };

  // Reset selection when data changes
  useMemo(() => { setSelectedKeys(new Set(allKeys)); }, [allKeys]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تصدير مخصص — اختر الأعمدة</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={selectAll}>تحديد الكل</Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>إلغاء الكل</Button>
          <span className="text-xs text-muted-foreground mr-auto mt-2">{selectedKeys.size} / {allKeys.length}</span>
        </div>
        <ScrollArea className="h-[300px] border rounded-lg p-3">
          <div className="space-y-2">
            {allKeys.map(key => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                <Checkbox checked={selectedKeys.has(key)} onCheckedChange={() => toggleKey(key)} />
                <span className="text-sm">{FIELD_LABELS[key] || key}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />تصدير ({data.length} سجل)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
