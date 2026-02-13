import { useState } from "react";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import jsPDF from "jspdf";
import { Download, FileText, Loader2, Building, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
type ExportMode = "general" | "faculty" | "full";

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

interface Props {
  currentData: ReportExportData;
  faculties: string[];
  buildExportData: (faculty?: string) => ReportExportData;
}

// ─── Component ───────────────────────────────────────────────────────
export default function ExportReportPdfDialog({ currentData, faculties, buildExportData }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: settings } = useUniversitySettings();

  const [exportMode, setExportMode] = useState<ExportMode>("general");
  const [selectedExportFaculty, setSelectedExportFaculty] = useState<string>(faculties[0] || "");
  const [selectedSections, setSelectedSections] = useState<SectionKey[]>(
    Object.keys(sectionLabels) as SectionKey[]
  );

  const toggleSection = (key: SectionKey) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const processText = (text: string) => processTextForPdf(text || "", { language: "ar" }).text;

  // ─── Generate one report into the doc ─────
  const generateReport = (doc: jsPDF, data: ReportExportData, isFirstReport: boolean) => {
    const PW = doc.internal.pageSize.getWidth();   // 210 portrait
    const PH = doc.internal.pageSize.getHeight();   // 297
    const M = 15;
    let y = 15;

    if (!isFirstReport) { doc.addPage(); y = 15; }

    const checkPage = (needed: number) => {
      if (y + needed > PH - 15) { doc.addPage(); y = 15; }
    };

    // ───── Official Header ─────
    doc.setFont("Amiri", "bold");
    doc.setFontSize(9);
    doc.text(processText("الجمهورية الجزائرية الديمقراطية الشعبية"), PW / 2, y, { align: "center" });
    y += 4.5;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.text(processText("وزارة التعليم العالي والبحث العلمي"), PW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(11);
    doc.text(processText(settings?.universityName || "جامعة العربي بن مهيدي أم البواقي"), PW / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(12);
    doc.text(processText("تقرير الأداء في التكوين"), PW / 2, y, { align: "center" });
    y += 4.5;

    if (data.facultyName) {
      doc.setFontSize(9);
      doc.text(processText(`كلية/معهد: ${data.facultyName}`), PW / 2, y, { align: "center" });
      y += 4.5;
    }

    doc.setDrawColor(66, 133, 244);
    doc.setLineWidth(0.5);
    doc.line(M, y, PW - M, y);
    y += 5;

    // ───── HELPER: Draw table ─────
    const drawTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
      const tableW = PW - M * 2;
      const cols = colWidths || headers.map(() => tableW / headers.length);
      const rowH = 5.5;

      const drawHeader = (startY: number) => {
        doc.setFont("Amiri", "bold");
        doc.setFontSize(7);
        doc.setFillColor(66, 133, 244);
        doc.setTextColor(255, 255, 255);
        doc.rect(M, startY, tableW, rowH, "F");
        let hx = PW - M;
        headers.forEach((h, i) => {
          doc.text(processText(h), hx - cols[i] / 2, startY + 4, { align: "center" });
          hx -= cols[i];
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont("Amiri", "normal");
        return startY + rowH;
      };

      y = drawHeader(y);
      doc.setFontSize(6.5);

      rows.forEach((row, ri) => {
        if (y + rowH > PH - 15) {
          doc.addPage(); y = 15;
          y = drawHeader(y);
          doc.setFontSize(6.5);
        }
        // Alternate row color
        if (ri % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(M, y, tableW, rowH, "F");
        }
        let cx = PW - M;
        row.forEach((cell, i) => {
          const maxChars = Math.floor(cols[i] / 1.1);
          const txt = processText(cell);
          const truncated = txt.length > maxChars ? txt.substring(0, maxChars) + "…" : txt;
          doc.text(truncated, cx - cols[i] / 2, y + 3.8, { align: "center" });
          cx -= cols[i];
        });
        doc.setDrawColor(220, 220, 220);
        doc.line(M, y + rowH, PW - M, y + rowH);
        y += rowH;
      });
      y += 3;
    };

    const sectionTitle = (title: string) => {
      checkPage(12);
      doc.setFont("Amiri", "bold");
      doc.setFontSize(9);
      doc.setFillColor(66, 133, 244);
      doc.rect(M, y - 1.5, PW - M * 2, 6.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(processText(title), PW / 2, y + 2.5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 8;
      doc.setFont("Amiri", "normal");
    };

    // ───── KPI Section ─────
    if (selectedSections.includes("kpi")) {
      checkPage(65);
      sectionTitle("مؤشر الأداء العام");

      const gaugeX = PW / 2;
      const gaugeY = y + 12;
      const gaugeR = 12;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(2);
      doc.circle(gaugeX, gaugeY, gaugeR, "S");
      const kpiVal = Math.round(data.kpi.general);
      if (kpiVal > 90) doc.setDrawColor(34, 197, 94);
      else if (kpiVal > 75) doc.setDrawColor(59, 130, 246);
      else if (kpiVal > 50) doc.setDrawColor(234, 179, 8);
      else doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(2);
      doc.circle(gaugeX, gaugeY, gaugeR, "S");

      doc.setFont("Amiri", "bold");
      doc.setFontSize(14);
      doc.text(toWesternNumerals(kpiVal) + "%", gaugeX, gaugeY + 2, { align: "center" });
      doc.setFontSize(6.5);
      doc.text(processText("مؤشر الأداء العام"), gaugeX, gaugeY + gaugeR + 3.5, { align: "center" });
      y = gaugeY + gaugeR + 7;

      // Sub-KPIs
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      const subKpis = [
        { label: "الفعالية التدفقية (30%)", value: data.kpi.flowEffectiveness },
        { label: "سرعة الإنجاز (25%)", value: data.kpi.speedOfAchievement },
        { label: "الجودة الزمنية (25%)", value: data.kpi.timeQuality },
        { label: "الفعالية الإدارية (20%)", value: data.kpi.administrativeEffectiveness },
      ];
      checkPage(12);
      const kpiColW = (PW - M * 2) / 4;
      subKpis.forEach((sk, i) => {
        const cx = PW - M - i * kpiColW - kpiColW / 2;
        doc.setFont("Amiri", "bold");
        doc.setFontSize(10);
        doc.text(toWesternNumerals(Math.round(sk.value)) + "%", cx, y + 3, { align: "center" });
        doc.setFont("Amiri", "normal");
        doc.setFontSize(5.5);
        doc.text(processText(sk.label), cx, y + 7, { align: "center" });
      });
      y += 12;

      // Dashboard summary
      checkPage(30);
      doc.setDrawColor(200, 200, 200);
      doc.line(M, y, PW - M, y);
      y += 3.5;
      doc.setFont("Amiri", "bold");
      doc.setFontSize(8);
      doc.text(processText("لوحة المؤشرات المختصرة"), PW - M, y, { align: "right" });
      y += 4.5;
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);

      const statsLines = [
        `عدد المسجلين في الدكتوراه: ${toWesternNumerals(data.registeredCount)} (ل.م.د: ${toWesternNumerals(data.registeredLmd)}، علوم: ${toWesternNumerals(data.registeredScience)})`,
        `متوسط سنوات التسجيل للمسجلين: ${toWesternNumerals(data.avgRegAll.toFixed(1))} (ل.م.د: ${toWesternNumerals(data.avgRegLmd.toFixed(1))}، علوم: ${toWesternNumerals(data.avgRegScience.toFixed(1))})`,
        `عدد المناقشين: ${toWesternNumerals(data.defendedCount)} (ل.م.د: ${toWesternNumerals(data.defendedLmd)}، علوم: ${toWesternNumerals(data.defendedScience)})`,
        `متوسط مدة التسجيل للمناقشين: ${toWesternNumerals(data.avgDefAll.toFixed(1))} (ل.م.د: ${toWesternNumerals(data.avgDefLmd.toFixed(1))}، علوم: ${toWesternNumerals(data.avgDefScience.toFixed(1))})`,
      ];
      statsLines.forEach(line => {
        doc.text(processText(line), PW - M, y, { align: "right" });
        y += 4.5;
      });
      y += 3;
    }

    // ───── Registered Students ─────
    if (selectedSections.includes("registered") && data.registeredStudents.length > 0) {
      checkPage(15);
      sectionTitle("أولا: إحصائيات عامة حول الطلبة المسجلين حاليا");
      const tableW = PW - M * 2;
      const cols = [7, 35, 28, 28, 22, 22, 20].map(p => (p / 162) * tableW);
      const rows = data.registeredStudents.map((s: any, i: number) => [
        toWesternNumerals(i + 1), s.full_name_ar || "", s.branch_ar || "",
        s.specialty_ar || "", s._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم",
        s.first_registration_year ? toWesternNumerals(s.first_registration_year) : "-",
        getStatusLabel(s.registration_count, s._type),
      ]);
      drawTable(["#", "الاسم واللقب", "الشعبة", "التخصص", "نوع الدكتوراه", "سنة أول تسجيل", "حالة التسجيل"], rows, cols);
    }

    // ───── Defended Students ─────
    if (selectedSections.includes("defended") && data.defendedStudents.length > 0) {
      checkPage(15);
      sectionTitle("ثانيا: إحصائيات عامة حول الطلبة المناقشين");
      const tableW = PW - M * 2;
      const cols = [7, 35, 28, 28, 22, 20, 22].map(p => (p / 162) * tableW);
      const rows = data.defendedStudents.map((s: any, i: number) => [
        toWesternNumerals(i + 1), s.full_name_ar || "", s.branch_ar || "",
        s.specialty_ar || "", s._type === "phd_lmd" ? "د.ل.م.د" : "د.علوم",
        getStatusLabel(s.registration_count, s._type),
        s.defense_date ? toWesternNumerals(formatDateDDMMYYYY(s.defense_date)) : "-",
      ]);
      drawTable(["#", "الاسم واللقب", "الشعبة", "التخصص", "نوع الدكتوراه", "حالة التسجيل", "تاريخ المناقشة"], rows, cols);
    }

    // ───── Jury Stats ─────
    if (selectedSections.includes("jury") && data.juryStats.length > 0) {
      checkPage(15);
      sectionTitle("إحصائيات العضوية (مشرف/مشرف مساعد/رئيس لجنة/عضو لجنة)");
      const tableW = PW - M * 2;
      const cols = [7, 38, 22, 18, 22, 20, 20, 18].map(p => (p / 165) * tableW);
      const rows = data.juryStats.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.title,
        s.supervisor > 0 ? toWesternNumerals(s.supervisor) : "-",
        s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : "-",
        s.president > 0 ? toWesternNumerals(s.president) : "-",
        s.member > 0 ? toWesternNumerals(s.member) : "-",
        toWesternNumerals(s.total),
      ]);
      drawTable(["#", "الاسم واللقب", "الرتبة", "مشرف", "مشرف مساعد", "رئيس لجنة", "عضو لجنة", "المجموع"], rows, cols);
    }

    // ───── Administrative Actions ─────
    if (selectedSections.includes("admin") && data.adminActions.length > 0) {
      checkPage(15);
      sectionTitle("ثالثا: الإجراءات الإدارية");
      const tableW = PW - M * 2;
      const cols = [7, 32, 28, 16, 16, 22, 22, 22].map(p => (p / 165) * tableW);
      const rows = data.adminActions.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.supervisor, s.type,
        s.status === "regular" ? "منتظم" : s.status === "delayed" ? "متأخر" : "-",
        s.councilDate ? toWesternNumerals(formatDateDDMMYYYY(s.councilDate)) : "-",
        s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
        s.processingTime ? `${toWesternNumerals(s.processingTime.months)} شهر ${toWesternNumerals(s.processingTime.days)} يوم` : "-",
      ]);
      drawTable(["#", "الاسم واللقب", "المشرف", "النوع", "الحالة", "تاريخ المصادقة", "تاريخ المناقشة", "مدة المعالجة"], rows, cols);
    }

    // ───── English Theses ─────
    if (selectedSections.includes("english") && data.englishTheses.length > 0) {
      checkPage(15);
      sectionTitle("رابعا: المناقشات باللغة الإنجليزية");
      const tableW = PW - M * 2;
      const cols = [7, 30, 22, 22, 28, 48, 22].map(p => (p / 179) * tableW);
      const rows = data.englishTheses.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.branch, s.specialty, s.supervisor,
        s.thesisTitle,
        s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
      ]);
      drawTable(["#", "الاسم واللقب", "الشعبة", "التخصص", "المشرف", "عنوان الأطروحة", "تاريخ المناقشة"], rows, cols);
    }

    // ───── Lab Stats ─────
    if (selectedSections.includes("labs") && data.labStats.length > 0) {
      checkPage(15);
      sectionTitle("خامسا: عدد المناقشات حسب مخابر البحث");
      const tableW = PW - M * 2;
      const cols = [10, 120, 30].map(p => (p / 160) * tableW);
      const rows = data.labStats.map((s, i) => [
        toWesternNumerals(i + 1), s.name, toWesternNumerals(s.count),
      ]);
      drawTable(["#", "مخبر البحث", "عدد المناقشين"], rows, cols);
    }

    // ───── Assistant Professors ─────
    if (selectedSections.includes("assistants") && data.assistantProfessors.length > 0) {
      checkPage(15);
      sectionTitle("سادسا: الأساتذة المساعدين المناقشين");
      const tableW = PW - M * 2;
      const cols = [7, 32, 25, 25, 25, 32, 22].map(p => (p / 168) * tableW);
      const rows = data.assistantProfessors.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.employmentStatus, s.branch,
        s.specialty, s.supervisor,
        s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
      ]);
      drawTable(["#", "الاسم واللقب", "الحالة الوظيفية", "الشعبة", "التخصص", "المشرف", "تاريخ المناقشة"], rows, cols);
    }
  };

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

      // Determine which data sets to export
      let dataSets: ReportExportData[] = [];
      let fileName = "تقرير_الأداء";

      if (exportMode === "general") {
        dataSets = [buildExportData(undefined)];
        fileName = "تقرير_الأداء_العام";
      } else if (exportMode === "faculty") {
        if (!selectedExportFaculty) {
          toast.error("يرجى اختيار كلية");
          setIsExporting(false);
          return;
        }
        dataSets = [buildExportData(selectedExportFaculty)];
        fileName = `تقرير_الأداء_${selectedExportFaculty}`;
      } else if (exportMode === "full") {
        dataSets = faculties.map(f => buildExportData(f));
        fileName = "تقرير_الأداء_الكامل";
      }

      dataSets.forEach((data, i) => {
        generateReport(doc, data, i === 0);
      });

      // Footer on all pages
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("Amiri", "normal");
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(
          processText(`مديرية الدراسات العليا والبحث العلمي - صفحة ${toWesternNumerals(p)} من ${toWesternNumerals(totalPages)}`),
          PW / 2, PH - 5, { align: "center" }
        );
        doc.setTextColor(0, 0, 0);
      }

      doc.save(fileName + ".pdf");
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
          <DialogDescription className="text-right">اختر نوع التصدير والأقسام المطلوبة</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-2">
          <div className="py-4 space-y-5" dir="rtl">
            {/* Export Mode */}
            <div>
              <Label className="mb-3 block font-semibold text-sm">نوع التصدير:</Label>
              <RadioGroup value={exportMode} onValueChange={(v) => setExportMode(v as ExportMode)} className="space-y-2.5">
                <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="general" id="mode-general" />
                  <Label htmlFor="mode-general" className="cursor-pointer flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-primary" />
                    تقرير عام (كل الجامعة)
                  </Label>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="faculty" id="mode-faculty" />
                  <Label htmlFor="mode-faculty" className="cursor-pointer flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-primary" />
                    تصدير حسب الكلية
                  </Label>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="full" id="mode-full" />
                  <Label htmlFor="mode-full" className="cursor-pointer flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    تصدير كامل (كل الكليات متتابعة)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Faculty selector */}
            {exportMode === "faculty" && (
              <div>
                <Label className="mb-2 block font-semibold text-sm">اختر الكلية:</Label>
                <Select value={selectedExportFaculty} onValueChange={setSelectedExportFaculty}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="اختر كلية..." /></SelectTrigger>
                  <SelectContent>
                    {faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Section selection */}
            <div>
              <Label className="mb-2 block font-semibold text-sm">اختر الأقسام المراد تضمينها:</Label>
              <div className="grid grid-cols-1 gap-2">
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
