import { useState } from "react";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import jsPDF from "jspdf";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
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
  // Counts
  registeredCount: number;
  defendedCount: number;
  registeredLmd: number;
  registeredScience: number;
  defendedLmd: number;
  defendedScience: number;
  // Averages
  avgRegAll: number;
  avgRegLmd: number;
  avgRegScience: number;
  avgDefAll: number;
  avgDefLmd: number;
  avgDefScience: number;
  // Registered students
  registeredStudents: any[];
  // Defended students
  defendedStudents: any[];
  // Admin actions
  adminActions: {
    name: string; type: string; supervisor: string; status: string;
    councilDate: string; defenseDate: string;
    processingTime: { months: number; days: number; totalDays: number } | null;
  }[];
  // Jury stats
  juryStats: {
    name: string; title: string; supervisor: number; coSupervisor: number;
    president: number; member: number; total: number;
  }[];
  // English theses
  englishTheses: {
    name: string; branch: string; specialty: string; supervisor: string;
    thesisTitle: string; defenseDate: string;
  }[];
  // Lab stats
  labStats: { name: string; count: number }[];
  // Assistant professors
  assistantProfessors: {
    name: string; employmentStatus: string; branch: string; specialty: string;
    supervisor: string; defenseDate: string;
  }[];
}

type SectionKey = "kpi" | "registered" | "defended" | "jury" | "admin" | "english" | "labs" | "assistants";

const sectionLabels: Record<SectionKey, string> = {
  kpi: "مؤشر الأداء العام والإحصائيات",
  registered: "الطلبة المسجلين",
  defended: "الطلبة المناقشين",
  jury: "إحصائيات العضوية",
  admin: "الإجراءات الإدارية",
  english: "المناقشات باللغة الإنجليزية",
  labs: "عدد المناقشات حسب مخابر البحث",
  assistants: "الأساتذة المساعدين المناقشين",
};

// ─── Component ───────────────────────────────────────────────────────
export default function ExportReportPdfDialog({ data }: { data: ReportExportData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: settings } = useUniversitySettings();

  const [selectedSections, setSelectedSections] = useState<SectionKey[]>([
    "kpi", "registered", "defended", "jury", "admin", "english", "labs", "assistants",
  ]);

  const toggleSection = (key: SectionKey) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const processText = (text: string) => processTextForPdf(text || "", { language: "ar" }).text;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", putOnlyUsedFonts: true });

      // Load fonts
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

      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const M = 15;
      let y = 15;

      const checkPage = (needed: number) => {
        if (y + needed > PH - 15) { doc.addPage(); y = 15; }
      };

      // ───── Official Header ─────
      doc.setFont("Amiri", "bold");
      doc.setFontSize(10);
      doc.text(processText("الجمهورية الجزائرية الديمقراطية الشعبية"), PW / 2, y, { align: "center" });
      y += 5;
      doc.setFont("Amiri", "normal");
      doc.setFontSize(9);
      doc.text(processText("وزارة التعليم العالي والبحث العلمي"), PW / 2, y, { align: "center" });
      y += 7;

      doc.setFont("Amiri", "bold");
      doc.setFontSize(13);
      doc.text(processText(settings?.universityName || "جامعة العربي بن مهيدي أم البواقي"), PW / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(15);
      doc.text(processText("تقرير الأداء في التكوين"), PW / 2, y, { align: "center" });
      y += 6;

      if (data.facultyName) {
        doc.setFontSize(11);
        doc.text(processText(`كلية/معهد: ${data.facultyName}`), PW / 2, y, { align: "center" });
        y += 6;
      }

      // Separator line
      doc.setDrawColor(66, 133, 244);
      doc.setLineWidth(0.5);
      doc.line(M, y, PW - M, y);
      y += 8;

      // ───── HELPER: Draw table ─────
      const drawTable = (
        headers: string[],
        rows: string[][],
        colWidths?: number[],
      ) => {
        const tableW = PW - M * 2;
        const cols = colWidths || headers.map(() => tableW / headers.length);

        const drawHeader = (startY: number) => {
          doc.setFont("Amiri", "bold");
          doc.setFontSize(8);
          doc.setFillColor(220, 230, 245);
          doc.rect(M, startY, tableW, 7, "F");
          let hx = PW - M;
          headers.forEach((h, i) => {
            doc.text(processText(h), hx - cols[i] / 2, startY + 5, { align: "center" });
            hx -= cols[i];
          });
          doc.setFont("Amiri", "normal");
          return startY + 7;
        };

        y = drawHeader(y);
        doc.setFontSize(7);

        rows.forEach(row => {
          if (y > PH - 15) {
            doc.addPage();
            y = 15;
            y = drawHeader(y);
            doc.setFontSize(7);
          }

          let cx = PW - M;
          row.forEach((cell, i) => {
            const maxChars = Math.floor(cols[i] / 1.4);
            const txt = processText(cell);
            const truncated = txt.length > maxChars ? txt.substring(0, maxChars) + "…" : txt;
            doc.text(truncated, cx - cols[i] / 2, y + 5, { align: "center" });
            cx -= cols[i];
          });
          doc.setDrawColor(210, 210, 210);
          doc.line(M, y + 7, PW - M, y + 7);
          y += 7;
        });
        y += 4;
      };

      const sectionTitle = (title: string) => {
        checkPage(15);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(12);
        // Draw a colored bar behind the title
        doc.setFillColor(66, 133, 244);
        doc.rect(M, y - 3, PW - M * 2, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(processText(title), PW / 2, y + 2.5, { align: "center" });
        doc.setTextColor(0, 0, 0);
        y += 10;
        doc.setFont("Amiri", "normal");
      };

      // ───── KPI Section ─────
      if (selectedSections.includes("kpi")) {
        checkPage(60);
        sectionTitle("مؤشر الأداء العام");

        // Draw KPI gauge as a circle
        const gaugeX = PW / 2;
        const gaugeY = y + 20;
        const gaugeR = 18;

        // Background circle
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(3);
        doc.circle(gaugeX, gaugeY, gaugeR, "S");

        // Colored arc (simplified as colored circle outline)
        const kpiVal = Math.round(data.kpi.general);
        if (kpiVal > 90) doc.setDrawColor(34, 197, 94);
        else if (kpiVal > 75) doc.setDrawColor(59, 130, 246);
        else if (kpiVal > 50) doc.setDrawColor(234, 179, 8);
        else doc.setDrawColor(239, 68, 68);

        doc.setLineWidth(3);
        // Draw a partial circle (approximate with arc)
        const endAngle = (data.kpi.general / 100) * 360;
        // jsPDF doesn't have arc, so draw full colored circle at the percentage opacity
        doc.circle(gaugeX, gaugeY, gaugeR, "S");

        // KPI value text
        doc.setFont("Amiri", "bold");
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(toWesternNumerals(kpiVal) + "%", gaugeX, gaugeY + 2, { align: "center" });

        doc.setFontSize(8);
        doc.text(processText("مؤشر الأداء العام"), gaugeX, gaugeY + gaugeR + 5, { align: "center" });
        y = gaugeY + gaugeR + 10;

        // Sub-KPIs
        doc.setFont("Amiri", "normal");
        doc.setFontSize(9);
        const subKpis = [
          { label: "الفعالية التدفقية (30%)", value: data.kpi.flowEffectiveness },
          { label: "سرعة الإنجاز (25%)", value: data.kpi.speedOfAchievement },
          { label: "الجودة الزمنية (25%)", value: data.kpi.timeQuality },
          { label: "الفعالية الإدارية (20%)", value: data.kpi.administrativeEffectiveness },
        ];

        checkPage(25);
        const kpiColW = (PW - M * 2) / 4;
        subKpis.forEach((sk, i) => {
          const cx = PW - M - i * kpiColW - kpiColW / 2;
          doc.setFont("Amiri", "bold");
          doc.setFontSize(12);
          doc.text(toWesternNumerals(Math.round(sk.value)) + "%", cx, y + 5, { align: "center" });
          doc.setFont("Amiri", "normal");
          doc.setFontSize(7);
          doc.text(processText(sk.label), cx, y + 10, { align: "center" });
        });
        y += 16;

        // Quick stats
        checkPage(30);
        doc.setDrawColor(200, 200, 200);
        doc.line(M, y, PW - M, y);
        y += 5;
        doc.setFont("Amiri", "bold");
        doc.setFontSize(10);
        doc.text(processText("إحصائيات سريعة"), PW - M, y, { align: "right" });
        y += 6;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(9);

        const statsLines = [
          `عدد طلبة الدكتوراه المسجلين: ${toWesternNumerals(data.registeredCount)} (ل.م.د: ${toWesternNumerals(data.registeredLmd)}، علوم: ${toWesternNumerals(data.registeredScience)})`,
          `متوسط سنوات التسجيل للمسجلين: ${toWesternNumerals(data.avgRegAll.toFixed(1))} (ل.م.د: ${toWesternNumerals(data.avgRegLmd.toFixed(1))}، علوم: ${toWesternNumerals(data.avgRegScience.toFixed(1))})`,
          `عدد المناقشين: ${toWesternNumerals(data.defendedCount)} (ل.م.د: ${toWesternNumerals(data.defendedLmd)}، علوم: ${toWesternNumerals(data.defendedScience)})`,
          `متوسط مدة التسجيل للمناقشين: ${toWesternNumerals(data.avgDefAll.toFixed(1))} (ل.م.د: ${toWesternNumerals(data.avgDefLmd.toFixed(1))}، علوم: ${toWesternNumerals(data.avgDefScience.toFixed(1))})`,
        ];
        statsLines.forEach(line => {
          doc.text(processText(line), PW - M, y, { align: "right" });
          y += 6;
        });
        y += 4;
      }

      // ───── Registered Students ─────
      if (selectedSections.includes("registered") && data.registeredStudents.length > 0) {
        sectionTitle("أولا: إحصائيات عامة حول الطلبة المسجلين حاليا");
        const headers = ["#", "الاسم واللقب", "الشعبة", "التخصص", "نوع الدكتوراه", "سنة أول تسجيل", "حالة التسجيل"];
        const tableW = PW - M * 2;
        const cols = [8, 35, 25, 25, 20, 22, 20].map(p => (p / 155) * tableW);
        const rows = data.registeredStudents.map((s: any, i: number) => {
          const regStatus = getStatusLabel(s.registration_count, s._type);
          return [
            toWesternNumerals(i + 1), s.full_name_ar || "", s.branch_ar || "",
            s.specialty_ar || "", s._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم",
            s.first_registration_year ? toWesternNumerals(s.first_registration_year) : "-",
            regStatus,
          ];
        });
        drawTable(headers, rows, cols);
      }

      // ───── Defended Students ─────
      if (selectedSections.includes("defended") && data.defendedStudents.length > 0) {
        sectionTitle("ثانيا: إحصائيات عامة حول الطلبة المناقشين");
        const headers = ["#", "الاسم واللقب", "الشعبة", "التخصص", "نوع الدكتوراه", "حالة التسجيل", "تاريخ المناقشة"];
        const tableW = PW - M * 2;
        const cols = [8, 35, 25, 25, 20, 18, 24].map(p => (p / 155) * tableW);
        const rows = data.defendedStudents.map((s: any, i: number) => {
          const regStatus = getStatusLabel(s.registration_count, s._type);
          return [
            toWesternNumerals(i + 1), s.full_name_ar || "", s.branch_ar || "",
            s.specialty_ar || "", s._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم",
            regStatus,
            s.defense_date ? toWesternNumerals(formatDateDDMMYYYY(s.defense_date)) : "-",
          ];
        });
        drawTable(headers, rows, cols);
      }

      // ───── Jury Stats ─────
      if (selectedSections.includes("jury") && data.juryStats.length > 0) {
        sectionTitle("إحصائيات العضوية (مشرف/رئيس لجنة/عضو لجنة)");
        const headers = ["#", "الاسم واللقب", "الرتبة", "مشرف", "مشرف مساعد", "رئيس لجنة", "عضو لجنة", "المجموع"];
        const tableW = PW - M * 2;
        const cols = [7, 35, 18, 14, 18, 16, 16, 14].map(p => (p / 138) * tableW);
        const rows = data.juryStats.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.title,
          s.supervisor > 0 ? toWesternNumerals(s.supervisor) : "-",
          s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : "-",
          s.president > 0 ? toWesternNumerals(s.president) : "-",
          s.member > 0 ? toWesternNumerals(s.member) : "-",
          toWesternNumerals(s.total),
        ]);
        drawTable(headers, rows, cols);
      }

      // ───── Administrative Actions ─────
      if (selectedSections.includes("admin") && data.adminActions.length > 0) {
        sectionTitle("ثالثا: الإجراءات الإدارية");
        const headers = ["#", "الاسم واللقب", "النوع", "المشرف", "الحالة", "تاريخ المصادقة", "تاريخ المناقشة", "مدة المعالجة"];
        const tableW = PW - M * 2;
        const cols = [7, 30, 14, 25, 14, 22, 22, 22].map(p => (p / 156) * tableW);
        const rows = data.adminActions.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.type, s.supervisor,
          s.status === "regular" ? "منتظم" : s.status === "delayed" ? "متأخر" : "-",
          s.councilDate ? toWesternNumerals(formatDateDDMMYYYY(s.councilDate)) : "-",
          s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
          s.processingTime ? `${toWesternNumerals(s.processingTime.months)} شهر ${toWesternNumerals(s.processingTime.days)} يوم` : "-",
        ]);
        drawTable(headers, rows, cols);
      }

      // ───── English Theses ─────
      if (selectedSections.includes("english") && data.englishTheses.length > 0) {
        sectionTitle("رابعا: المناقشات باللغة الإنجليزية");
        const headers = ["#", "الاسم واللقب", "الشعبة", "التخصص", "المشرف", "عنوان الأطروحة", "تاريخ المناقشة"];
        const tableW = PW - M * 2;
        const cols = [7, 28, 20, 20, 25, 40, 20].map(p => (p / 160) * tableW);
        const rows = data.englishTheses.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.branch, s.specialty, s.supervisor,
          s.thesisTitle,
          s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
        ]);
        drawTable(headers, rows, cols);
      }

      // ───── Lab Stats ─────
      if (selectedSections.includes("labs") && data.labStats.length > 0) {
        sectionTitle("خامسا: عدد المناقشات حسب مخابر البحث");
        const headers = ["#", "مخبر البحث", "عدد المناقشين"];
        const tableW = PW - M * 2;
        const cols = [10, 110, 30].map(p => (p / 150) * tableW);
        const rows = data.labStats.map((s, i) => [
          toWesternNumerals(i + 1), s.name, toWesternNumerals(s.count),
        ]);
        drawTable(headers, rows, cols);
      }

      // ───── Assistant Professors ─────
      if (selectedSections.includes("assistants") && data.assistantProfessors.length > 0) {
        sectionTitle("سادسا: الأساتذة المساعدين المناقشين");
        const headers = ["#", "الاسم واللقب", "الحالة الوظيفية", "الشعبة", "التخصص", "المشرف", "تاريخ المناقشة"];
        const tableW = PW - M * 2;
        const cols = [7, 30, 22, 22, 22, 30, 22].map(p => (p / 155) * tableW);
        const rows = data.assistantProfessors.map((s, i) => [
          toWesternNumerals(i + 1), s.name, s.employmentStatus, s.branch,
          s.specialty, s.supervisor,
          s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
        ]);
        drawTable(headers, rows, cols);
      }

      // ───── Footer ─────
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          processText(`مديرية الدراسات العليا والبحث العلمي - صفحة ${toWesternNumerals(p)} من ${toWesternNumerals(totalPages)}`),
          PW / 2, PH - 7, { align: "center" }
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
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

function getStatusLabel(regCount: number | null | undefined, type: string): string {
  if (!regCount) return "-";
  const legal = type === "phd_science" ? 5 : 3;
  return regCount <= legal ? "منتظم" : "متأخر";
}
