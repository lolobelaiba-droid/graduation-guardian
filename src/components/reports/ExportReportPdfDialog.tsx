import { useState } from "react";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import jsPDF from "jspdf";
import { Download, FileText, Loader2, Building, BookOpen, CalendarDays } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
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
import type { InsightCard } from "@/lib/strategic-insights";

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
    name: string; title: string; university: string; supervisor: number; coSupervisor: number;
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
  insights?: InsightCard[];
}

type SectionKey = "kpi" | "insights" | "registered" | "defended" | "jury" | "admin" | "english" | "labs" | "assistants";
type ExportMode = "general" | "faculty" | "full";

const sectionLabels: Record<SectionKey, string> = {
  kpi: "مؤشر الأداء العام ولوحة المؤشرات",
  insights: "التشخيص وتحليل النتائج",
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
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

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
    y += 5;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.text(processText("وزارة التعليم العالي والبحث العلمي"), PW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(10);
    doc.text(processText(settings?.universityName || "جامعة العربي بن مهيدي- أم البواقي-"), PW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("Amiri", "normal");
    doc.setFontSize(6.5);
    const subTitle = "نيابة المديرية للتكوين العالي في الطور الثالث والتأهيل الجامعي والبحث العلمي والتكوين العالي فيما بعد التدرج";
    doc.text(processText(subTitle), PW / 2, y, { align: "center", maxWidth: PW - M * 2 });
    y += 10;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(13);
    doc.setTextColor(66, 133, 244);
    doc.text(processText("تقرير الأداء في التكوين الدكتورالي"), PW / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 7;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(9);
    if (data.facultyName) {
      doc.text(processText(`كلية/معهد: ${data.facultyName}`), PW - M, y, { align: "right" });
    } else {
      doc.text(processText("التقرير العام للجامعة"), PW - M, y, { align: "right" });
    }
    y += 6;

    y += 2;

    // ───── HELPER: Draw table ─────
    const drawTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
      const tableW = PW - M * 2;
      const cols = colWidths || headers.map(() => tableW / headers.length);
      const rowH = 5.5;

      const drawHeader = (startY: number) => {
        doc.setFont("Amiri", "bold");
        doc.setFontSize(7);
        doc.setFillColor(180, 180, 180);
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
      checkPage(75);
      sectionTitle("مؤشر الأداء العام");

      // Layout: gauge on LEFT, criteria cards on RIGHT
      const gaugeR = 14;
      const gaugeX = M + gaugeR + 5;
      const gaugeY = y + gaugeR + 2;

      // Draw gauge circle
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(2);
      doc.circle(gaugeX, gaugeY, gaugeR, "S");
      const kpiVal = Math.round(data.kpi.general);
      if (kpiVal >= 80) doc.setDrawColor(34, 197, 94);
      else if (kpiVal >= 50) doc.setDrawColor(234, 179, 8);
      else doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(2.5);
      doc.circle(gaugeX, gaugeY, gaugeR, "S");

      doc.setFont("Amiri", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(toWesternNumerals(kpiVal) + "", gaugeX, gaugeY + 1, { align: "center" });
      doc.setFontSize(7);
      doc.text("/ 100", gaugeX, gaugeY + 5.5, { align: "center" });
      doc.setFontSize(6.5);
      doc.setFont("Amiri", "normal");
      doc.text(processText("مؤشر الأداء العام"), gaugeX, gaugeY + gaugeR + 4, { align: "center" });

      // Period under gauge
      doc.setFontSize(5.5);
      doc.setTextColor(100, 100, 100);
      const defaultFrom = () => {
        const now = new Date();
        const yr = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        return `01/09/${yr}`;
      };
      const defaultTo = () => {
        const now = new Date();
        const yr = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
        return `31/08/${yr}`;
      };
      const fromDisplay = periodFrom ? toWesternNumerals(formatDateDDMMYYYY(periodFrom)) : toWesternNumerals(defaultFrom());
      const toDisplay = periodTo ? toWesternNumerals(formatDateDDMMYYYY(periodTo)) : toWesternNumerals(defaultTo());
      doc.text(processText(`الفترة: من ${fromDisplay} إلى ${toDisplay}`), gaugeX, gaugeY + gaugeR + 8, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // Criteria cards on the right side
      const criteriaX = M + gaugeR * 2 + 15; // start after gauge
      const criteriaW = PW - M - criteriaX;
      const critCardH = 13;
      const cardGap = 2;

      const criteria = [
        { title: "معيار الفعالية التدفقية", weight: "30%", value: data.kpi.flowEffectiveness,
          desc: "يقيس نسبة الطلبة الذين ناقشوا فعلياً مقارنة بإجمالي المسجلين.",
          formula: "(عدد المناقشين ÷ إجمالي المسجلين) × 100" },
        { title: "معيار سرعة الإنجاز", weight: "25%", value: data.kpi.speedOfAchievement,
          desc: "يعتمد على عدد السنوات من أول تسجيل حتى المناقشة.",
          formula: "تشجيع الالتزام بالمدة القانونية" },
        { title: "معيار الجودة الزمنية", weight: "25%", value: data.kpi.timeQuality,
          desc: "يفاضل بين المناقشين في وضعية نظامي والمتأخرين.",
          formula: "(عدد النظاميين ÷ إجمالي المناقشين) × 100" },
        { title: "معيار الفعالية الإدارية", weight: "20%", value: data.kpi.administrativeEffectiveness,
          desc: "يقيس كفاءة معالجة الملفات بين الإيداع والمناقشة.",
          formula: "أقل من 3 أشهر: 100 | 3-6 أشهر: 70 | أكثر: 40" },
      ];

      // Title
      doc.setFont("Amiri", "bold");
      doc.setFontSize(7);
      doc.text(processText("شرح المعايير الفرعية:"), PW - M, y, { align: "right" });
      let cy = y + 4;

      criteria.forEach((c) => {
        // Card background
        doc.setFillColor(248, 249, 252);
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.2);
        doc.roundedRect(criteriaX, cy, criteriaW, critCardH, 1, 1, "FD");

        // Value (colored) on left of card
        const val = Math.round(c.value);
        if (val >= 80) doc.setTextColor(34, 197, 94);
        else if (val >= 50) doc.setTextColor(234, 179, 8);
        else doc.setTextColor(239, 68, 68);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(10);
        doc.text(toWesternNumerals(val) + "%", criteriaX + criteriaW - 2, cy + 5, { align: "right" });

        // Weight badge
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(5);
        doc.text(c.weight, criteriaX + criteriaW - 2, cy + 9.5, { align: "right" });

        // Title
        doc.setTextColor(0, 0, 0);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(6.5);
        doc.text(processText(c.title), criteriaX + criteriaW - 18, cy + 4, { align: "right" });

        // Description
        doc.setFont("Amiri", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(80, 80, 80);
        doc.text(processText(c.desc), criteriaX + criteriaW - 18, cy + 8, { align: "right" });

        // Formula
        doc.setFontSize(4.5);
        doc.setTextColor(140, 140, 140);
        doc.text(processText(c.formula), criteriaX + criteriaW - 18, cy + 11.5, { align: "right" });

        doc.setTextColor(0, 0, 0);
        cy += critCardH + cardGap;
      });

      y = Math.max(gaugeY + gaugeR + 8, cy + 2);

      // Dashboard summary - match UI card layout
      checkPage(45);
      doc.setDrawColor(200, 200, 200);
      doc.line(M, y, PW - M, y);
      y += 4;
      doc.setFont("Amiri", "bold");
      doc.setFontSize(8);
      doc.text(processText("لوحة المؤشرات المختصرة"), PW - M, y, { align: "right" });
      y += 5;

      const cardW = (PW - M * 2 - 6) / 4; // 4 cards with 2mm gaps
      const cardH = 28;
      const cardStartX = M;

      const dashboardCards = [
        {
          title: "عدد المسجلين في الدكتوراه",
          items: [
            { label: "الإجمالي", value: toWesternNumerals(data.registeredCount) },
            { label: "ل.م.د", value: toWesternNumerals(data.registeredLmd) },
            { label: "علوم", value: toWesternNumerals(data.registeredScience) },
          ],
        },
        {
          title: "متوسط سنوات التسجيل (المسجلين)",
          items: [
            { label: "المتوسط العام", value: toWesternNumerals(data.avgRegAll.toFixed(1)) },
            { label: "ل.م.د", value: toWesternNumerals(data.avgRegLmd.toFixed(1)) },
            { label: "علوم", value: toWesternNumerals(data.avgRegScience.toFixed(1)) },
          ],
        },
        {
          title: "عدد المناقشين",
          items: [
            { label: "الإجمالي", value: toWesternNumerals(data.defendedCount) },
            { label: "ل.م.د", value: toWesternNumerals(data.defendedLmd) },
            { label: "علوم", value: toWesternNumerals(data.defendedScience) },
          ],
        },
        {
          title: "متوسط مدة التسجيل (المناقشين)",
          items: [
            { label: "المتوسط العام", value: toWesternNumerals(data.avgDefAll.toFixed(1)) },
            { label: "ل.م.د", value: toWesternNumerals(data.avgDefLmd.toFixed(1)) },
            { label: "علوم", value: toWesternNumerals(data.avgDefScience.toFixed(1)) },
          ],
        },
      ];

      // Draw cards right-to-left
      dashboardCards.forEach((card, ci) => {
        const cx = PW - M - ci * (cardW + 2);
        // Card border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.roundedRect(cx - cardW, y, cardW, cardH, 1.5, 1.5, "S");
        
        // Card title
        doc.setFont("Amiri", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 100, 100);
        doc.text(processText(card.title), cx - 2, y + 4, { align: "right" });
        
        // Card items
        doc.setFont("Amiri", "normal");
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        card.items.forEach((item, ii) => {
          const iy = y + 9 + ii * 5.5;
          doc.setFont("Amiri", "bold");
          doc.setFontSize(8);
          doc.text(item.value, cx - cardW / 2, iy + 1, { align: "center" });
          doc.setFont("Amiri", "normal");
          doc.setFontSize(5);
          doc.setTextColor(130, 130, 130);
          doc.text(processText(item.label), cx - cardW / 2, iy + 4, { align: "center" });
          doc.setTextColor(0, 0, 0);
        });
      });
      y += cardH + 5;
    }

    // ───── Strategic Insights ─────
    if (selectedSections.includes("insights") && data.insights && data.insights.length > 0) {
      checkPage(15);
      sectionTitle("التشخيص وتحليل النتائج");

      const insightColors: Record<string, { r: number; g: number; b: number; bgR: number; bgG: number; bgB: number; label: string }> = {
        warning: { r: 220, g: 38, b: 38, bgR: 254, bgG: 242, bgB: 242, label: "تنبيه" },
        success: { r: 22, g: 163, b: 74, bgR: 240, bgG: 253, bgB: 244, label: "إشادة" },
        info: { r: 37, g: 99, b: 235, bgR: 239, bgG: 246, bgB: 255, label: "معلومة" },
        strategy: { r: 147, g: 51, b: 234, bgR: 250, bgG: 245, bgB: 255, label: "تحليل استراتيجي" },
        recommendation: { r: 217, g: 119, b: 6, bgR: 255, bgG: 251, bgB: 235, label: "توصية" },
      };

      data.insights.forEach((insight) => {
        const color = insightColors[insight.type] || insightColors.info;
        const insightCardH = 16;
        checkPage(insightCardH + 3);

        // Background
        doc.setFillColor(color.bgR, color.bgG, color.bgB);
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.4);
        doc.roundedRect(M, y, PW - M * 2, insightCardH, 1.5, 1.5, "FD");

        // Color bar on right
        doc.setFillColor(color.r, color.g, color.b);
        doc.rect(PW - M - 3, y, 3, insightCardH, "F");

        // Title
        doc.setFont("Amiri", "bold");
        doc.setFontSize(7);
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(processText(insight.title), PW - M - 5, y + 5, { align: "right" });

        // Body text
        doc.setFont("Amiri", "normal");
        doc.setFontSize(6);
        doc.setTextColor(60, 60, 60);
        const textLines = doc.splitTextToSize(processText(insight.text), PW - M * 2 - 10);
        doc.text(textLines, PW - M - 5, y + 9, { align: "right" });

        doc.setTextColor(0, 0, 0);
        y += insightCardH + 3;
      });
      y += 2;
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
      const cols = [6, 32, 18, 28, 15, 15, 15, 15, 15].map(p => (p / 159) * tableW);
      const rows = data.juryStats.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.title, s.university || '-',
        s.supervisor > 0 ? toWesternNumerals(s.supervisor) : "-",
        s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : "-",
        s.president > 0 ? toWesternNumerals(s.president) : "-",
        s.member > 0 ? toWesternNumerals(s.member) : "-",
        toWesternNumerals(s.total),
      ]);
      drawTable(["#", "الاسم واللقب", "الرتبة", "الجامعة", "مشرف", "م.مساعد", "رئيس ل.", "عضو ل.", "المجموع"], rows, cols);
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

            {/* Period selection */}
            <div>
              <Label className="mb-2 block font-semibold text-sm flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                الفترة الزمنية (اختياري):
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
                  <DateInput value={periodFrom} onChange={setPeriodFrom} placeholder="dd/mm/yyyy" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
                  <DateInput value={periodTo} onChange={setPeriodTo} placeholder="dd/mm/yyyy" />
                </div>
              </div>
            </div>

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
