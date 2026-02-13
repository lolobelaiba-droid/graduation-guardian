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
  registration_date: string;
  status: string;
  [key: string]: any;
}

interface ExportPdfDialogProps {
  data: {
    title: string;
    students: StudentData[];
    filters: any;
  };
}

export default function ExportPdfDialog({ data }: ExportPdfDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { settings } = useUniversitySettings();
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "full_name_ar",
    "specialty_ar",
    "registration_date",
    "status"
  ]);

  const columns = [
    { key: "full_name_ar", label: "الاسم واللقب" },
    { key: "specialty_ar", label: "التخصص" },
    { key: "branch_ar", label: "الفرع" },
    { key: "registration_date", label: "تاريخ التسجيل" },
    { key: "status", label: "الحالة" },
    { key: "defense_date", label: "تاريخ المناقشة" },
  ];

  const processText = (text: string) => {
    return processTextForPdf(text || "", { useReshaping: true, rtl: true }).text;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true
      });

      // تحميل الخط بترميز Identity-H لضمان دعم العربية (مثل الشهادات)
      const fontData = await loadFontFile("Amiri-Regular.ttf");
      const base64Font = arrayBufferToBase64(fontData);
      doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "normal", "Identity-H");
      doc.setFont("Amiri");

      const PAGE_WIDTH = doc.internal.pageSize.getWidth();
      const MARGIN = 15;
      let currentY = 20;

      doc.setFontSize(14);
      doc.text(processText(settings?.university_name_ar || "جامعة العربي بن مهيدي - أم البواقي"), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 10;
      
      doc.setFontSize(16);
      doc.text(processText(data.title), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 15;

      const tableHeaders = ["ت", ...columns.filter(c => selectedColumns.includes(c.key)).map(c => c.label)];
      const colWidth = (PAGE_WIDTH - (MARGIN * 2)) / tableHeaders.length;

      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN, currentY, PAGE_WIDTH - (MARGIN * 2), 10, "F");
      
      tableHeaders.reverse().forEach((header, index) => {
        const xPos = MARGIN + (index * colWidth) + (colWidth / 2);
        doc.text(processText(header), xPos, currentY + 7, { align: "center" });
      });

      currentY += 10;
      doc.setFontSize(11);

      data.students.forEach((student, sIndex) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        const rowData = [
          toWesternNumerals(sIndex + 1),
          ...columns
            .filter(c => selectedColumns.includes(c.key))
            .map(c => (student as any)[c.key])
        ];

        rowData.reverse().forEach((cell, cIndex) => {
          const xPos = MARGIN + (cIndex * colWidth) + (colWidth / 2);
          doc.text(processText(String(cell || "")), xPos, currentY + 7, { align: "center" });
        });

        doc.line(MARGIN, currentY + 10, PAGE_WIDTH - MARGIN, currentY + 10);
        currentY += 10;
      });

      doc.save(`التقرير_السنوي_${new Date().getTime()}.pdf`);
      toast.success("تم تصدير التقرير بنجاح");
      setIsOpen(false);
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("فشل تصدير التقرير");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          تصدير التقرير السنوي (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">إعدادات تصدير التقرير</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Label className="mb-4 block text-right">اختر الأعمدة المراد إظهارها في التقرير:</Label>
          <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
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
                <Label htmlFor={col.key}>{col.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            بدء التصدير
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
