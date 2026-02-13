import { useState } from "react";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import jsPDF from "jspdf";
import { Download, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { certificateTypeLabels } from "@/types/certificates";
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

// Sections available for export
type SectionKey = "summary" | "monthly" | "faculty" | "specialty" | "status" | "avg_years" | "custom_table";

const sectionLabels: Record<SectionKey, string> = {
  summary: "الملخص العام",
  monthly: "التوزيع الشهري",
  faculty: "حسب الكلية",
  specialty: "حسب التخصص",
  status: "حالة الطلاب (نظامي / متأخر)",
  avg_years: "متوسط سنوات التسجيل",
  custom_table: "جدول مخصص بالطلاب",
};

const allColumns = [
  { key: "full_name_ar", label: "الاسم واللقب" },
  { key: "specialty_ar", label: "التخصص" },
  { key: "branch_ar", label: "الفرع" },
  { key: "faculty_ar", label: "الكلية" },
  { key: "defense_date", label: "تاريخ المناقشة" },
  { key: "supervisor_ar", label: "المشرف" },
  { key: "co_supervisor_ar", label: "المشرف المساعد" },
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
  { key: "_type", label: "نوع الشهادة" },
  { key: "registration_count", label: "عدد التسجيلات" },
];

export default function ExportPdfDialog({ data }: ExportPdfDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: settings } = useUniversitySettings();
  const [columnsOpen, setColumnsOpen] = useState(false);

  const [selectedSections, setSelectedSections] = useState<SectionKey[]>([
    "summary", "monthly", "faculty", "specialty", "custom_table"
  ]);

  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "full_name_ar", "specialty_ar", "faculty_ar", "defense_date", "mention",
  ]);

  const toggleSection = (key: SectionKey) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  /** Process Arabic text for PDF - same mechanism as certificate printing */
  const processText = (text: string) => {
    return processTextForPdf(text || "", { language: "ar" }).text;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const hasCustomTable = selectedSections.includes("custom_table");
      const activeCols = allColumns.filter(c => selectedColumns.includes(c.key));
      const isLandscape = hasCustomTable && activeCols.length > 5;

      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
      });

      // ===== تحميل الخطوط بنفس آلية طباعة الشهادات =====
      // Regular font
      const fontData = await loadFontFile("/fonts/Amiri-Regular.ttf");
      if (!fontData) throw new Error("فشل تحميل ملف الخط Amiri-Regular.ttf");
      const base64Font = arrayBufferToBase64(fontData);
      doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", undefined, "Identity-H");

      // Bold font
      const boldData = await loadFontFile("/fonts/Amiri-Bold.ttf");
      if (boldData) {
        const base64Bold = arrayBufferToBase64(boldData);
        doc.addFileToVFS("Amiri-Bold.ttf", base64Bold);
        doc.addFont("Amiri-Bold.ttf", "Amiri", "bold", undefined, "Identity-H");
      }

      doc.setFont("Amiri", "normal");

      const PAGE_WIDTH = doc.internal.pageSize.getWidth();
      const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
      const MARGIN = 15;
      let currentY = 20;

      // ===== Header: University name + report title =====
      doc.setFont("Amiri", "bold");
      doc.setFontSize(14);
      doc.text(
        processText(settings?.universityName || "جامعة العربي بن مهيدي - أم البواقي"),
        PAGE_WIDTH / 2, currentY, { align: "center" }
      );
      currentY += 10;

      const titleLabel = data.yearLabel === "كل_السنوات"
        ? "التقرير السنوي - كل السنوات"
        : `التقرير السنوي - ${toWesternNumerals(data.yearLabel)}`;
      doc.setFontSize(16);
      doc.text(processText(titleLabel), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 12;

      doc.setFont("Amiri", "normal");

      // Helper: check page overflow and add new page
      const checkPage = (needed: number) => {
        if (currentY + needed > PAGE_HEIGHT - 15) {
          doc.addPage();
          currentY = 20;
        }
      };

      // ===== Section: Summary =====
      if (selectedSections.includes("summary")) {
        checkPage(30);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("الملخص العام"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(11);

        const summaryLines = [
          `إجمالي المناقشات: ${toWesternNumerals(data.total)}`,
          `${certificateTypeLabels.phd_lmd.ar}: ${toWesternNumerals(data.byType.phd_lmd)}`,
          `${certificateTypeLabels.phd_science.ar}: ${toWesternNumerals(data.byType.phd_science)}`,
          `عدد الكليات: ${toWesternNumerals(data.byFaculty.length)}`,
          `عدد التخصصات: ${toWesternNumerals(data.bySpecialty.length)}`,
        ];
        summaryLines.forEach(line => {
          doc.text(processText(line), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
          currentY += 6;
        });
        currentY += 4;
      }

      // ===== Section: Monthly Distribution =====
      if (selectedSections.includes("monthly")) {
        checkPage(50);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("التوزيع الشهري للمناقشات"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(10);

        const maxVal = Math.max(...data.byMonth, 1);
        const barAreaWidth = PAGE_WIDTH - MARGIN * 2;
        const barWidth = barAreaWidth / 12;
        const barMaxHeight = 30;

        data.byMonth.forEach((count, i) => {
          const barH = (count / maxVal) * barMaxHeight;
          const x = MARGIN + i * barWidth;
          const barY = currentY + barMaxHeight - barH;

          if (barH > 0) {
            doc.setFillColor(66, 133, 244);
            doc.rect(x + 2, barY, barWidth - 4, barH, "F");
          }
          // Month label
          doc.setFontSize(7);
          doc.text(processText(data.monthNames[i].substring(0, 3)), x + barWidth / 2, currentY + barMaxHeight + 5, { align: "center" });
          // Count
          if (count > 0) {
            doc.setFontSize(7);
            doc.text(toWesternNumerals(count), x + barWidth / 2, barY - 1, { align: "center" });
          }
        });
        currentY += barMaxHeight + 12;
      }

      // ===== Section: By Faculty =====
      if (selectedSections.includes("faculty") && data.byFaculty.length > 0) {
        checkPage(20 + data.byFaculty.length * 7);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("حسب الكلية"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;

        // Table header
        doc.setFontSize(10);
        doc.setFillColor(230, 230, 230);
        doc.rect(MARGIN, currentY, PAGE_WIDTH - MARGIN * 2, 7, "F");
        const facHeaders = ["المجموع", "د.علوم", "د.ل.م.د", "الكلية"];
        const facColW = (PAGE_WIDTH - MARGIN * 2) / 4;
        facHeaders.forEach((h, i) => {
          doc.text(processText(h), PAGE_WIDTH - MARGIN - i * facColW - facColW / 2, currentY + 5, { align: "center" });
        });
        currentY += 7;

        doc.setFont("Amiri", "normal");
        data.byFaculty.forEach(([fac, counts]) => {
          checkPage(7);
          const vals = [toWesternNumerals(counts.total), toWesternNumerals(counts.phd_science), toWesternNumerals(counts.phd_lmd), fac];
          vals.forEach((v, i) => {
            doc.text(processText(v), PAGE_WIDTH - MARGIN - i * facColW - facColW / 2, currentY + 5, { align: "center" });
          });
          doc.setDrawColor(200, 200, 200);
          doc.line(MARGIN, currentY + 7, PAGE_WIDTH - MARGIN, currentY + 7);
          currentY += 7;
        });
        currentY += 6;
      }

      // ===== Section: By Specialty =====
      if (selectedSections.includes("specialty") && data.bySpecialty.length > 0) {
        checkPage(20 + data.bySpecialty.length * 7);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("حسب التخصص"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;

        doc.setFontSize(10);
        doc.setFillColor(230, 230, 230);
        doc.rect(MARGIN, currentY, PAGE_WIDTH - MARGIN * 2, 7, "F");
        const specHeaders = ["العدد", "الكلية", "التخصص"];
        const specColW = (PAGE_WIDTH - MARGIN * 2) / 3;
        specHeaders.forEach((h, i) => {
          doc.text(processText(h), PAGE_WIDTH - MARGIN - i * specColW - specColW / 2, currentY + 5, { align: "center" });
        });
        currentY += 7;

        doc.setFont("Amiri", "normal");
        data.bySpecialty.forEach(([spec, info]) => {
          checkPage(7);
          const vals = [toWesternNumerals(info.count), info.faculty, spec];
          vals.forEach((v, i) => {
            doc.text(processText(String(v)), PAGE_WIDTH - MARGIN - i * specColW - specColW / 2, currentY + 5, { align: "center" });
          });
          doc.setDrawColor(200, 200, 200);
          doc.line(MARGIN, currentY + 7, PAGE_WIDTH - MARGIN, currentY + 7);
          currentY += 7;
        });
        currentY += 6;
      }

      // ===== Section: Student Status (Regular / Late) =====
      if (selectedSections.includes("status")) {
        checkPage(30);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("حالة الطلاب"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(11);

        // استخدام القيم المعتمدة من قاعدة بيانات الشهادات (current_year, inscription_status)
        let regularCount = 0;
        let lateCount = 0;

        data.students.forEach(s => {
          // استخدام حقل current_year المخزن في قاعدة البيانات
          if (s.current_year === "متأخر" || s.inscription_status === "متأخر") {
            lateCount++;
          } else if (s.current_year) {
            regularCount++;
          }
        });

        doc.text(processText(`طلاب نظاميون: ${toWesternNumerals(regularCount)}`), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 6;
        doc.text(processText(`طلاب متأخرون: ${toWesternNumerals(lateCount)}`), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 10;
      }

      // ===== Section: Average Registration Years =====
      if (selectedSections.includes("avg_years")) {
        checkPage(20);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("متوسط سنوات التسجيل"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(11);

        // استخدام حقل registration_count المعتمد من قاعدة البيانات
        let totalYears = 0;
        let countWithReg = 0;
        data.students.forEach(s => {
          if (s.registration_count != null && s.registration_count > 0) {
            totalYears += s.registration_count;
            countWithReg++;
          }
        });
        const avg = countWithReg > 0 ? (totalYears / countWithReg).toFixed(1) : "0";
        doc.text(processText(`متوسط سنوات التسجيل: ${toWesternNumerals(avg)} سنة (من ${toWesternNumerals(countWithReg)} طالب)`), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 10;
      }

      // ===== Section: Custom Table =====
      if (hasCustomTable && activeCols.length > 0) {
        // If landscape and this is a new section, may need a new page
        checkPage(20);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("جدول الطلاب المناقشين"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;

        const tableHeaders = ["ت", ...activeCols.map(c => c.label)];
        const colCount = tableHeaders.length;
        const tableWidth = PAGE_WIDTH - MARGIN * 2;
        const colWidth = tableWidth / colCount;

        const drawTableHeader = (y: number) => {
          doc.setFont("Amiri", "bold");
          doc.setFillColor(220, 220, 220);
          doc.rect(MARGIN, y, tableWidth, 8, "F");
          doc.setFontSize(8);
          const reversed = [...tableHeaders].reverse();
          reversed.forEach((header, index) => {
            const xPos = MARGIN + index * colWidth + colWidth / 2;
            doc.text(processText(header), xPos, y + 6, { align: "center" });
          });
          doc.setFont("Amiri", "normal");
          return y + 8;
        };

        currentY = drawTableHeader(currentY);
        doc.setFontSize(7);

        data.students.forEach((student, sIndex) => {
          if (currentY > PAGE_HEIGHT - 15) {
            doc.addPage();
            currentY = 15;
            currentY = drawTableHeader(currentY);
            doc.setFontSize(7);
          }

          const typeLabel = student._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم";
          const rowData = [
            toWesternNumerals(sIndex + 1),
            ...activeCols.map(c => {
              if (c.key === "_type") return typeLabel;
              if (c.key === "registration_count") return student.registration_count != null ? toWesternNumerals(student.registration_count) : "";
              // تحويل التقدير من الإنجليزية إلى العربية
              if (c.key === "mention") {
                const mentionLabels: Record<string, string> = { honorable: "مشرف", very_honorable: "مشرف جدا" };
                return mentionLabels[student.mention] || student.mention || "";
              }
              return String(student[c.key] ?? "");
            }),
          ];

          const reversed = [...rowData].reverse();
          reversed.forEach((cell, cIndex) => {
            const xPos = MARGIN + cIndex * colWidth + colWidth / 2;
            const displayText = processText(cell);
            const maxChars = Math.floor(colWidth / 1.5);
            const truncated = displayText.length > maxChars ? displayText.substring(0, maxChars) + "…" : displayText;
            doc.text(truncated, xPos, currentY + 5, { align: "center" });
          });

          doc.setDrawColor(200, 200, 200);
          doc.line(MARGIN, currentY + 7, PAGE_WIDTH - MARGIN, currentY + 7);
          currentY += 7;
        });
      }

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
          تصدير التقرير السنوي (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-right">إعدادات تصدير التقرير السنوي</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="py-4 space-y-4" dir="rtl">
            {/* Section selection */}
            <div>
              <Label className="mb-3 block font-semibold">اختر الأقسام المراد تضمينها:</Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(sectionLabels) as SectionKey[]).map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`section-${key}`}
                      checked={selectedSections.includes(key)}
                      onCheckedChange={() => toggleSection(key)}
                    />
                    <Label htmlFor={`section-${key}`} className="text-sm cursor-pointer">
                      {sectionLabels[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Column selection for custom table */}
            {selectedSections.includes("custom_table") && (
              <>
                <Separator />
                <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between gap-2 text-sm">
                      <span>أعمدة الجدول المخصص ({toWesternNumerals(selectedColumns.length)} عمود)</span>
                      {columnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      عند اختيار أكثر من 5 أعمدة، يتم التحويل تلقائياً إلى الوضع الأفقي (Landscape)
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allColumns.map(col => (
                        <div key={col.key} className="flex items-center gap-2">
                          <Checkbox
                            id={`col-${col.key}`}
                            checked={selectedColumns.includes(col.key)}
                            onCheckedChange={() => toggleColumn(col.key)}
                          />
                          <Label htmlFor={`col-${col.key}`} className="text-xs cursor-pointer">
                            {col.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedSections.length === 0}
            className="gap-2"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            بدء التصدير
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
