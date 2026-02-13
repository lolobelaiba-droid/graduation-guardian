import { useState } from "react";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import jsPDF from "jspdf";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { toWesternNumerals } from "@/lib/numerals";
import { loadFontFile, arrayBufferToBase64 } from "@/lib/arabicFonts";
import { processTextForPdf } from "@/lib/pdf/arabicTextUtils";
import type { KpiResult } from "@/lib/kpi-calculator";

// ─── Types ───────────────────────────────────────────────────────────
export interface ReportExportData {
  facultyName?: string;
  kpi: KpiResult;
  registeredCount: number;
  defendedCount: number;
  registeredLmd: number;
  registeredScience: number;
  defendedLmd: number;
  defendedScience: number;
  avgRegAll: number;
  avgRegLmd: number;
  avgRegScience: number;
  avgDefAll: number;
  avgDefLmd: number;
  avgDefScience: number;
  registeredStudents: any[];
  defendedStudents: any[];
  adminActions: {
    name: string; type: string; supervisor: string; status: string;
    councilDate: string; defenseDate: string;
    processingTime: { months: number; days: number; totalDays: number } | null;
  }[];
  juryStats: {
    name: string; title: string; supervisor: number; coSupervisor: number;
    president: number; member: number; total: number;
  }[];
  englishTheses: {
    name: string; branch: string; specialty: string; supervisor: string;
    thesisTitle: string; defenseDate: string;
  }[];
  labStats: { name: string; count: number }[];
  assistantProfessors: {
    name: string; employmentStatus: string; branch: string; specialty: string;
    supervisor: string; defenseDate: string;
  }[];
}

type SectionKey = "kpi" | "registered" | "defended" | "jury" | "admin" | "english" | "labs" | "assistants";

const sectionLabels: Record<SectionKey, string> = {
  kpi: "مؤشر الأداء العام ولوحة المؤشرات",
  registered: "أولا: الطلبة المسجلين",
  defended: "ثانيا: الطلبة المناقشين",
  jury: "إحصائيات العضوية",
  admin: "ثالثا: الإجراءات الإدارية",
  english: "رابعا: المناقشات باللغة الإنجليزية",
  labs: "خامسا: عدد المناقشات حسب مخابر البحث",
  assistants: "سادسا: الأساتذة المساعدين المناقشين",
};

// ─── Component ───────────────────────────────────────────────────────
export default function ExportReportPdfDialog({ data }: { data: ReportExportData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: settings } = useUniversitySettings();

  const [selectedSections, setSelectedSections] = useState<SectionKey[]>(
    Object.keys(sectionLabels) as SectionKey[]
  );

  const toggleSection = (key: SectionKey) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const processText = (text: string) => processTextForPdf(text || "", { language: "ar" }).text;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // ── Use landscape for tables with many columns, portrait for KPI page ──
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", putOnlyUsedFonts: true });

      // ===== Load fonts (same as annual report) =====
      const fontData = await loadFontFile("/fonts/Amiri-Regular.ttf");
      if (!fontData) throw new Error("فشل تحميل ملف الخط Amiri-Regular.ttf");
      doc.addFileToVFS("Amiri-Regular.ttf", arrayBufferToBase64(fontData));
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", undefined, "Identity-H");

      const boldData = await loadFontFile("/fonts/Amiri-Bold.ttf");
      if (boldData) {
        doc.addFileToVFS("Amiri-Bold.ttf", arrayBufferToBase64(boldData));
        doc.addFont("Amiri-Bold.ttf", "Amiri", "bold", undefined, "Identity-H");
      }

      doc.setFont("Amiri", "normal");

      const MARGIN = 15;
      let PAGE_WIDTH = doc.internal.pageSize.getWidth();
      let PAGE_HEIGHT = doc.internal.pageSize.getHeight();
      let currentY = 20;

      const checkPage = (needed: number) => {
        if (currentY + needed > PAGE_HEIGHT - 15) { doc.addPage(); currentY = 20; }
      };

      // ===== Header (same style as annual report) =====
      doc.setFont("Amiri", "bold");
      doc.setFontSize(14);
      doc.text(
        processText(settings?.universityName || "جامعة العربي بن مهيدي - أم البواقي"),
        PAGE_WIDTH / 2, currentY, { align: "center" }
      );
      currentY += 10;

      doc.setFontSize(16);
      doc.text(processText("تقرير الأداء في التكوين"), PAGE_WIDTH / 2, currentY, { align: "center" });
      currentY += 8;

      if (data.facultyName) {
        doc.setFontSize(11);
        doc.text(processText(`كلية/معهد: ${data.facultyName}`), PAGE_WIDTH / 2, currentY, { align: "center" });
        currentY += 8;
      }

      doc.setFont("Amiri", "normal");
      currentY += 4;

      // ===== KPI Section =====
      if (selectedSections.includes("kpi")) {
        checkPage(60);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("مؤشر الأداء العام"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;

        // KPI circle
        const gaugeX = PAGE_WIDTH / 2;
        const gaugeY = currentY + 18;
        const gaugeR = 16;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(2.5);
        doc.circle(gaugeX, gaugeY, gaugeR, "S");

        const kpiVal = Math.round(data.kpi.general);
        if (kpiVal > 90) doc.setDrawColor(34, 197, 94);
        else if (kpiVal > 75) doc.setDrawColor(59, 130, 246);
        else if (kpiVal > 50) doc.setDrawColor(234, 179, 8);
        else doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(2.5);
        doc.circle(gaugeX, gaugeY, gaugeR, "S");

        doc.setFont("Amiri", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(toWesternNumerals(kpiVal) + "%", gaugeX, gaugeY + 2, { align: "center" });
        doc.setFontSize(8);
        doc.text(processText("مؤشر الأداء العام"), gaugeX, gaugeY + gaugeR + 5, { align: "center" });
        currentY = gaugeY + gaugeR + 10;

        // Sub-KPIs
        doc.setFont("Amiri", "normal");
        doc.setFontSize(11);
        const subKpis = [
          { label: "الفعالية التدفقية (30%)", value: data.kpi.flowEffectiveness },
          { label: "سرعة الإنجاز (25%)", value: data.kpi.speedOfAchievement },
          { label: "الجودة الزمنية (25%)", value: data.kpi.timeQuality },
          { label: "الفعالية الإدارية (20%)", value: data.kpi.administrativeEffectiveness },
        ];
        subKpis.forEach(sk => {
          doc.text(
            processText(`${sk.label}: ${toWesternNumerals(Math.round(sk.value))}%`),
            PAGE_WIDTH - MARGIN, currentY, { align: "right" }
          );
          currentY += 6;
        });
        currentY += 4;

        // Dashboard summary
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText("لوحة المؤشرات المختصرة"), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(11);

        const statsLines = [
          `عدد المسجلين في الدكتوراه: ${toWesternNumerals(data.registeredCount)} (ل.م.د: ${toWesternNumerals(data.registeredLmd)}، علوم: ${toWesternNumerals(data.registeredScience)})`,
          `متوسط سنوات التسجيل للمسجلين: ${toWesternNumerals(data.avgRegAll.toFixed(1))} (ل.م.د: ${toWesternNumerals(data.avgRegLmd.toFixed(1))}، علوم: ${toWesternNumerals(data.avgRegScience.toFixed(1))})`,
          `عدد المناقشين: ${toWesternNumerals(data.defendedCount)} (ل.م.د: ${toWesternNumerals(data.defendedLmd)}، علوم: ${toWesternNumerals(data.defendedScience)})`,
          `متوسط مدة التسجيل للمناقشين: ${toWesternNumerals(data.avgDefAll.toFixed(1))} (ل.م.د: ${toWesternNumerals(data.avgDefLmd.toFixed(1))}، علوم: ${toWesternNumerals(data.avgDefScience.toFixed(1))})`,
        ];
        statsLines.forEach(line => {
          doc.text(processText(line), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
          currentY += 6;
        });
        currentY += 6;
      }

      // ===== Helper: Draw table (same style as annual report) =====
      const drawTableSection = (
        title: string,
        headers: string[],
        rows: string[][],
        colWidths?: number[],
        useNewPage?: boolean,
      ) => {
        if (useNewPage) { doc.addPage(); currentY = 20; }

        // Recalculate page dimensions (in case orientation changed)
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        checkPage(20);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(13);
        doc.text(processText(title), PAGE_WIDTH - MARGIN, currentY, { align: "right" });
        currentY += 8;

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = colWidths || headers.map(() => tableW / headers.length);

        const drawHeader = (startY: number) => {
          doc.setFont("Amiri", "bold");
          doc.setFontSize(9);
          doc.setFillColor(220, 220, 220);
          doc.rect(MARGIN, startY, tableW, 8, "F");
          // Draw headers RTL
          let hx = PAGE_WIDTH - MARGIN;
          headers.forEach((h, i) => {
            doc.text(processText(h), hx - cols[i] / 2, startY + 6, { align: "center" });
            hx -= cols[i];
          });
          doc.setFont("Amiri", "normal");
          return startY + 8;
        };

        currentY = drawHeader(currentY);
        doc.setFontSize(8);

        rows.forEach(row => {
          if (currentY > PAGE_HEIGHT - 15) {
            doc.addPage();
            currentY = 15;
            currentY = drawHeader(currentY);
            doc.setFontSize(8);
          }

          let cx = PAGE_WIDTH - MARGIN;
          row.forEach((cell, i) => {
            const maxChars = Math.floor(cols[i] / 1.5);
            const txt = processText(cell);
            const truncated = txt.length > maxChars ? txt.substring(0, maxChars) + "…" : txt;
            doc.text(truncated, cx - cols[i] / 2, currentY + 5, { align: "center" });
            cx -= cols[i];
          });
          doc.setDrawColor(200, 200, 200);
          doc.line(MARGIN, currentY + 7, PAGE_WIDTH - MARGIN, currentY + 7);
          currentY += 7;
        });
        currentY += 6;
      };

      // ===== أولا: Registered Students (landscape for wide table) =====
      if (selectedSections.includes("registered") && data.registeredStudents.length > 0) {
        // Switch to landscape for this table
        doc.addPage("a4", "landscape");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [8, 50, 35, 35, 25, 25, 22].map(p => (p / 200) * tableW);
        const rows = data.registeredStudents.map((s: any, i: number) => [
          toWesternNumerals(i + 1), s.full_name_ar || "", s.branch_ar || "",
          s.specialty_ar || "", s._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم",
          s.first_registration_year ? toWesternNumerals(s.first_registration_year) : "-",
          getStatusLabel(s.registration_count, s._type),
        ]);
        drawTableSection(
          "أولا: إحصائيات عامة حول الطلبة المسجلين حاليا",
          ["ت", "الاسم واللقب", "الشعبة", "التخصص", "نوع الدكتوراه", "سنة أول تسجيل", "حالة التسجيل"],
          rows, cols
        );
      }

      // ===== ثانيا: Defended Students =====
      if (selectedSections.includes("defended") && data.defendedStudents.length > 0) {
        doc.addPage("a4", "landscape");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [8, 50, 35, 35, 25, 22, 28].map(p => (p / 203) * tableW);
        const rows = data.defendedStudents.map((s: any, i: number) => [
          toWesternNumerals(i + 1), s.full_name_ar || "", s.branch_ar || "",
          s.specialty_ar || "", s._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم",
          getStatusLabel(s.registration_count, s._type),
          s.defense_date ? toWesternNumerals(formatDateDDMMYYYY(s.defense_date)) : "-",
        ]);
        drawTableSection(
          "ثانيا: إحصائيات عامة حول الطلبة المناقشين",
          ["ت", "الاسم واللقب", "الشعبة", "التخصص", "نوع الدكتوراه", "حالة التسجيل", "تاريخ المناقشة"],
          rows, cols
        );
      }

      // ===== إحصائيات العضوية =====
      if (selectedSections.includes("jury") && data.juryStats.length > 0) {
        doc.addPage("a4", "landscape");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [8, 55, 30, 20, 25, 22, 22, 18].map(p => (p / 200) * tableW);
        const rows = data.juryStats.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.title,
          s.supervisor > 0 ? toWesternNumerals(s.supervisor) : "-",
          s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : "-",
          s.president > 0 ? toWesternNumerals(s.president) : "-",
          s.member > 0 ? toWesternNumerals(s.member) : "-",
          toWesternNumerals(s.total),
        ]);
        drawTableSection(
          "إحصائيات العضوية (مشرف / مشرف مساعد / رئيس لجنة / عضو لجنة)",
          ["ت", "الاسم واللقب", "الرتبة", "مشرف", "مشرف مساعد", "رئيس لجنة", "عضو لجنة", "المجموع"],
          rows, cols
        );
      }

      // ===== ثالثا: Administrative Actions =====
      if (selectedSections.includes("admin") && data.adminActions.length > 0) {
        doc.addPage("a4", "landscape");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [8, 42, 38, 18, 18, 28, 28, 28].map(p => (p / 208) * tableW);
        const rows = data.adminActions.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.supervisor, s.type,
          s.status === "regular" ? "منتظم" : s.status === "delayed" ? "متأخر" : "-",
          s.councilDate ? toWesternNumerals(formatDateDDMMYYYY(s.councilDate)) : "-",
          s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
          s.processingTime ? `${toWesternNumerals(s.processingTime.months)} شهر ${toWesternNumerals(s.processingTime.days)} يوم` : "-",
        ]);
        drawTableSection(
          "ثالثا: الإجراءات الإدارية",
          ["ت", "الاسم واللقب", "المشرف", "النوع", "الحالة", "تاريخ المصادقة", "تاريخ المناقشة", "مدة المعالجة"],
          rows, cols
        );
      }

      // ===== رابعا: English Theses =====
      if (selectedSections.includes("english") && data.englishTheses.length > 0) {
        doc.addPage("a4", "landscape");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [8, 38, 28, 28, 38, 70, 25].map(p => (p / 235) * tableW);
        const rows = data.englishTheses.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.branch, s.specialty, s.supervisor,
          s.thesisTitle,
          s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
        ]);
        drawTableSection(
          "رابعا: المناقشات باللغة الإنجليزية",
          ["ت", "الاسم واللقب", "الشعبة", "التخصص", "المشرف", "عنوان الأطروحة", "تاريخ المناقشة"],
          rows, cols
        );
      }

      // ===== خامسا: Lab Stats (portrait - few columns) =====
      if (selectedSections.includes("labs") && data.labStats.length > 0) {
        doc.addPage("a4", "portrait");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [10, 120, 30].map(p => (p / 160) * tableW);
        const rows = data.labStats.map((s, i) => [
          toWesternNumerals(i + 1), s.name, toWesternNumerals(s.count),
        ]);
        drawTableSection(
          "خامسا: عدد المناقشات حسب مخابر البحث",
          ["ت", "مخبر البحث", "عدد المناقشين"],
          rows, cols
        );
      }

      // ===== سادسا: Assistant Professors =====
      if (selectedSections.includes("assistants") && data.assistantProfessors.length > 0) {
        doc.addPage("a4", "landscape");
        currentY = 20;
        PAGE_WIDTH = doc.internal.pageSize.getWidth();
        PAGE_HEIGHT = doc.internal.pageSize.getHeight();

        const tableW = PAGE_WIDTH - MARGIN * 2;
        const cols = [8, 42, 30, 32, 32, 42, 25].map(p => (p / 211) * tableW);
        const rows = data.assistantProfessors.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.employmentStatus, s.branch,
          s.specialty, s.supervisor,
          s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
        ]);
        drawTableSection(
          "سادسا: الأساتذة المساعدين المناقشين",
          ["ت", "الاسم واللقب", "الحالة الوظيفية", "الشعبة", "التخصص", "المشرف", "تاريخ المناقشة"],
          rows, cols
        );
      }

      // ===== Footer on all pages =====
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          processText(`مديرية الدراسات العليا والبحث العلمي - صفحة ${toWesternNumerals(p)} من ${toWesternNumerals(totalPages)}`),
          pw / 2, ph - 7, { align: "center" }
        );
        doc.setTextColor(0, 0, 0);
      }

      const fileName = `تقرير_الأداء${data.facultyName ? `_${data.facultyName}` : ""}.pdf`;
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
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-right">إعدادات تصدير تقرير الأداء</DialogTitle>
          <DialogDescription className="text-right">اختر الأقسام التي تريد تضمينها في ملف PDF</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-2">
          <div className="py-4 space-y-3" dir="rtl">
            <Label className="mb-2 block font-semibold">اختر الأقسام المراد تضمينها:</Label>
            <div className="grid grid-cols-1 gap-2.5">
              {(Object.keys(sectionLabels) as SectionKey[]).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`rpt-section-${key}`}
                    checked={selectedSections.includes(key)}
                    onCheckedChange={() => toggleSection(key)}
                  />
                  <Label htmlFor={`rpt-section-${key}`} className="text-sm cursor-pointer">
                    {sectionLabels[key]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleExport} disabled={isExporting || selectedSections.length === 0} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            بدء التصدير
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return dateStr; }
}

function getStatusLabel(regCount: number | null | undefined, type: string): string {
  if (!regCount) return "-";
  const legal = type === "phd_science" ? 5 : 3;
  return regCount <= legal ? "منتظم" : "متأخر";
}
