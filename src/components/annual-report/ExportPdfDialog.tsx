import { useState } from "react";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import jsPDF from "jspdf";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toWesternNumerals } from "@/lib/numerals";
import { loadFontFile, arrayBufferToBase64 } from "@/lib/arabicFonts";
import { processTextForPdf } from "@/lib/pdf/arabicTextUtils";

export interface StudentData {
  full_name_ar: string;
  full_name_fr: string;
  faculty_ar: string;
  faculty_fr: string;
  specialty_ar: string;
  specialty_fr: string;
  branch_ar: string;
  branch_fr: string;
  defense_date: string;
  date_of_birth: string;
  birthplace_ar: string;
  student_number: string;
  supervisor_ar: string;
  co_supervisor_ar: string;
  mention: string;
  thesis_title_ar: string;
  first_registration_year: string;
  employment_status: string;
  registration_type: string;
  inscription_status: string;
  registration_count: number | null;
  current_year: string;
  research_lab_ar: string;
  _type: "phd_lmd" | "phd_science";
  [key: string]: any;
}

interface ExportPdfDialogProps {
  data: {
    yearLabel: string;
    total: number;
    byType: { phd_lmd: number; phd_science: number };
    byFaculty: [string, { phd_lmd: number; phd_science: number; total: number }][];
    bySpecialty: [string, { count: number; faculty: string; type: string }][];
    byMonth: number[];
    monthNames: string[];
    students: StudentData[];
  };
}

export default function ExportPdfDialog({ data }: ExportPdfDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: settings } = useUniversitySettings();
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "full_name_ar",
    "specialty_ar",
    "faculty_ar",
    "defense_date",
  ]);

  const columns = [
    { key: "full_name_ar", label: "الاسم واللقب" },
    { key: "specialty_ar", label: "التخصص" },
    { key: "branch_ar", label: "الفرع" },
    { key: "faculty_ar", label: "الكلية" },
    { key: "defense_date", label: "تاريخ المناقشة" },
    { key: "supervisor_ar", label: "المشرف" },
    { key: "mention", label: "التقدير" },
    { key: "first_registration_year", label: "سنة أول تسجيل" },
    { key: "research_lab_ar", label: "مخبر البحث" },
    { key: "employment_status", label: "الحالة الوظيفية" },
    { key: "registration_type", label: "نوع التسجيل" },
    { key: "inscription_status", label: "حالة التسجيل" },
    { key: "current_year", label: "السنة الحالية" },
    { key: "student_number", label: "رقم الطالب" },
    { key: "date_of_birth", label: "تاريخ الميلاد" },
    { key: "birthplace_ar", label: "مكان الميلاد" },
    { key: "thesis_title_ar", label: "عنوان الأطروحة" },
    { key: "co_supervisor_ar", label: "المشرف المساعد" },
    { key: "_type", label: "نوع الشهادة" },
  ];

  const processText = (text: string) => {
    return processTextForPdf(text || "", { language: "ar" }).text;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const activeCols = columns.filter(c => selectedColumns.includes(c.key));
      const isLandscape = activeCols.length > 5;

      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true
      });

      // تحميل الخط بترميز Identity-H لضمان دعم العربية
      const fontData = await loadFontFile("Amiri-Regular.ttf");
      const base64Font = arrayBufferToBase64(fontData);
      doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", undefined as any, "Identity-H");
      doc.setFont("Amiri");

      const PAGE_WIDTH = doc.internal.pageSize.getWidth();
      const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
      const MARGIN = 12;
      let currentY = 18;

      // Header
      doc.setFontSize(13);
      doc.text(processText(settings?.universityName || "جامعة العربي بن مهيدي - أم البواقي"), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 8;
      
      const titleLabel = data.yearLabel === "كل_السنوات" ? "التقرير السنوي - كل السنوات" : `التقرير السنوي - ${toWesternNumerals(data.yearLabel)}`;
      doc.setFontSize(15);
      doc.text(processText(titleLabel), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 7;

      // Summary line
      doc.setFontSize(10);
      const summaryText = `إجمالي المناقشات: ${toWesternNumerals(data.total)} | د.ل.م.د: ${toWesternNumerals(data.byType.phd_lmd)} | د.علوم: ${toWesternNumerals(data.byType.phd_science)}`;
      doc.text(processText(summaryText), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 10;

      // Table
      const tableHeaders = ["ت", ...activeCols.map(c => c.label)];
      const colCount = tableHeaders.length;
      const tableWidth = PAGE_WIDTH - (MARGIN * 2);
      const colWidth = tableWidth / colCount;

      const drawTableHeader = (y: number) => {
        doc.setFillColor(220, 220, 220);
        doc.rect(MARGIN, y, tableWidth, 8, "F");
        doc.setFontSize(9);
        tableHeaders.reverse().forEach((header, index) => {
          const xPos = MARGIN + (index * colWidth) + (colWidth / 2);
          doc.text(processText(header), xPos, y + 6, { align: "center" });
        });
        tableHeaders.reverse(); // restore order
        return y + 8;
      };

      currentY = drawTableHeader(currentY);
      doc.setFontSize(8);

      data.students.forEach((student, sIndex) => {
        if (currentY > PAGE_HEIGHT - 15) {
          doc.addPage();
          currentY = 15;
          doc.setFontSize(9);
          currentY = drawTableHeader(currentY);
          doc.setFontSize(8);
        }

        const typeLabel = student._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم";
        const rowData = [
          toWesternNumerals(sIndex + 1),
          ...activeCols.map(c => {
            if (c.key === "_type") return typeLabel;
            return String(student[c.key] ?? "");
          })
        ];

        rowData.reverse().forEach((cell, cIndex) => {
          const xPos = MARGIN + (cIndex * colWidth) + (colWidth / 2);
          const displayText = processText(cell);
          // Truncate if too long for cell
          const maxChars = Math.floor(colWidth / 1.8);
          const truncated = displayText.length > maxChars ? displayText.substring(0, maxChars) + "..." : displayText;
          doc.text(truncated, xPos, currentY + 5, { align: "center" });
        });

        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, currentY + 7, PAGE_WIDTH - MARGIN, currentY + 7);
        currentY += 7;
      });

      const fileName = `تقرير_سنوي_${data.yearLabel}.pdf`;
      doc.save(fileName);
      toast.success("تم تصدير التقرير بنجاح");
      setIsOpen(false);
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("فشل تصدير التقرير: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          تصدير PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">إعدادات تصدير التقرير السنوي</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Label className="mb-4 block text-right">اختر الأعمدة المراد إظهارها في الجدول:</Label>
          <p className="text-xs text-muted-foreground mb-3 text-right">
            عند اختيار أكثر من 5 أعمدة، يتم التحويل تلقائياً إلى الوضع الأفقي (Landscape)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-right" dir="rtl">
            {columns.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox 
                  id={col.key}
                  checked={selectedColumns.includes(col.key)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedColumns([...selectedColumns, col.key]);
                    else setSelectedColumns(selectedColumns.filter(k => k !== col.key));
                  }}
                />
                <Label htmlFor={col.key} className="text-sm cursor-pointer">{col.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            بدء التصدير
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
