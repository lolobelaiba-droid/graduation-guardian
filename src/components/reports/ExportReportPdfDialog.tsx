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
import { processTextForPdf, shapeArabicText } from "@/lib/pdf/arabicTextUtils";
import type { KpiResult } from "@/lib/kpi-calculator";
import { getRegistrationStatus } from "@/lib/kpi-calculator";
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
    president: number; member: number; invited: number; total: number;
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

  // ─── Load logo as base64 for PDF ─────
  const loadLogoBase64 = async (url: string): Promise<string | null> => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  // ─── Generate one report into the doc ─────
  const generateReport = (doc: jsPDF, data: ReportExportData, isFirstReport: boolean, logoBase64: string | null) => {
    const PW = doc.internal.pageSize.getWidth();   // 210 portrait
    const PH = doc.internal.pageSize.getHeight();   // 297
    const M = 15;
    let y = 15;

    if (!isFirstReport) { doc.addPage(); y = 15; }

    const checkPage = (needed: number) => {
      if (y + needed > PH - 15) { doc.addPage(); y = 15; }
    };

    // ───── University Logo (top-left with circle) ─────
    if (logoBase64) {
      const logoR = 10; // radius in mm
      const logoX = M + logoR; // center X
      const logoY = y + logoR; // center Y
      // Draw circle border
      doc.setDrawColor(66, 133, 244);
      doc.setLineWidth(0.6);
      doc.circle(logoX, logoY, logoR + 0.5, "S");
      // Clip logo into circle area (draw as square, circle visually frames it)
      try {
        doc.addImage(logoBase64, "PNG", logoX - logoR, logoY - logoR, logoR * 2, logoR * 2);
      } catch { /* ignore logo errors */ }
    }

    // ───── Official Header ─────
    doc.setFont("Amiri", "bold");
    doc.setFontSize(11);
    doc.text(processText("الجمهورية الجزائرية الديمقراطية الشعبية"), PW / 2, y, { align: "center" });
    y += 5;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(10);
    doc.text(processText("وزارة التعليم العالي والبحث العلمي"), PW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(12);
    doc.text(processText(settings?.universityName || "جامعة العربي بن مهيدي- أم البواقي-"), PW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("Amiri", "normal");
    doc.setFontSize(8.5);
    const subTitle = "نيابة المديرية للتكوين العالي في الطور الثالث والتأهيل الجامعي والبحث العلمي والتكوين العالي فيما بعد التدرج";
    doc.text(processText(subTitle), PW / 2, y, { align: "center", maxWidth: PW - M * 2 });
    y += 10;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(15);
    doc.setTextColor(66, 133, 244);
    doc.text(processText("تقرير الأداء في التكوين الدكتورالي"), PW / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 7;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(11);
    if (data.facultyName) {
      doc.text(processText(`كلية/معهد: ${data.facultyName}`), PW - M, y, { align: "right" });
    } else {
      doc.text(processText("التقرير العام للجامعة"), PW - M, y, { align: "right" });
    }
    y += 6;

    y += 2;

    // ───── HELPER: Draw table with multi-line support ─────
    const drawTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
      const tableW = PW - M * 2;
      const cols = colWidths || headers.map(() => tableW / headers.length);
      const baseRowH = 6.5;
      const lineH = 3.8; // height per extra line

      const drawHeader = (startY: number) => {
        doc.setFont("Amiri", "bold");
        doc.setFontSize(9);
        doc.setFillColor(180, 180, 180);
        doc.setTextColor(255, 255, 255);
        doc.rect(M, startY, tableW, baseRowH, "F");
        let hx = PW - M;
        headers.forEach((h, i) => {
          doc.text(processText(h), hx - cols[i] / 2, startY + 4, { align: "center" });
          hx -= cols[i];
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont("Amiri", "normal");
        return startY + baseRowH;
      };

      y = drawHeader(y);
      doc.setFontSize(8.5);

      rows.forEach((row, ri) => {
        // Calculate row height based on longest cell content
        let maxLines = 1;
        const cellLines: string[][] = row.map((cell, i) => {
          // Skip processText for cells prefixed with \u200B (pre-processed marker)
          const txt = cell.startsWith('\u200B') ? cell.slice(1) : processText(cell);
          const colW = cols[i] - 2; // padding
          const lines = doc.splitTextToSize(txt, colW);
          if (lines.length > maxLines) maxLines = lines.length;
          return lines;
        });
        const dynamicRowH = baseRowH + (maxLines > 1 ? (maxLines - 1) * lineH : 0);

        if (y + dynamicRowH > PH - 15) {
          doc.addPage(); y = 15;
          y = drawHeader(y);
          doc.setFontSize(8.5);
          // Recalculate since font reset
        }
        // Alternate row color
        if (ri % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(M, y, tableW, dynamicRowH, "F");
        }
        let cx = PW - M;
        cellLines.forEach((lines, i) => {
          const cellCenterX = cx - cols[i] / 2;
          if (lines.length === 1) {
            doc.text(lines[0], cellCenterX, y + 3.8, { align: "center" });
          } else {
            // Multi-line: start from top with small offset
            const startTextY = y + 3.2;
            lines.forEach((line, li) => {
              doc.text(line, cellCenterX, startTextY + li * lineH, { align: "center" });
            });
          }
          cx -= cols[i];
        });
        doc.setDrawColor(220, 220, 220);
        doc.line(M, y + dynamicRowH, PW - M, y + dynamicRowH);
        y += dynamicRowH;
      });
      y += 10;
    };

    const sectionTitle = (title: string) => {
      checkPage(12);
      doc.setFont("Amiri", "bold");
      doc.setFontSize(11);
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
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(toWesternNumerals(kpiVal) + "", gaugeX, gaugeY + 1, { align: "center" });
      doc.setFontSize(9);
      doc.text("/ 100", gaugeX, gaugeY + 5.5, { align: "center" });
      doc.setFontSize(8.5);
      doc.setFont("Amiri", "normal");
      doc.text(processText("مؤشر الأداء العام"), gaugeX, gaugeY + gaugeR + 4, { align: "center" });

      // Period under gauge - two lines: title then date range
      doc.setTextColor(100, 100, 100);
      doc.setFont("Amiri", "bold");
      doc.setFontSize(7.5);
      doc.text(processText("الفترة الزمنية"), gaugeX, gaugeY + gaugeR + 8, { align: "center" });

      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      const now = new Date();
      const yrStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      const yrEnd = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
      const fromDisplay = periodFrom ? toWesternNumerals(formatDateDDMMYYYY(periodFrom)) : toWesternNumerals(`01/09/${yrStart}`);
      const toDisplay = periodTo ? toWesternNumerals(formatDateDDMMYYYY(periodTo)) : toWesternNumerals(`31/08/${yrEnd}`);
      // RTL: render segments right-to-left manually
      const periodCenterX = gaugeX;
      const periodY = gaugeY + gaugeR + 12;
      const segments = [
        { text: processText("من"), font: "bold" },
        { text: ` ${fromDisplay} `, font: "normal" },
        { text: processText("إلى"), font: "bold" },
        { text: ` ${toDisplay}`, font: "normal" },
      ];
      // Calculate total width
      let totalW = 0;
      segments.forEach(seg => {
        doc.setFont("Amiri", seg.font as "bold" | "normal");
        totalW += doc.getTextWidth(seg.text);
      });
      // Start from right side
      let sx = periodCenterX + totalW / 2;
      segments.forEach(seg => {
        doc.setFont("Amiri", seg.font as "bold" | "normal");
        const w = doc.getTextWidth(seg.text);
        sx -= w;
        doc.text(seg.text, sx, periodY);
      });
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
      doc.setFontSize(9);
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
        doc.setFontSize(12);
        doc.text(toWesternNumerals(val) + "%", criteriaX + criteriaW - 2, cy + 5, { align: "right" });

        // Weight badge
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.text(c.weight, criteriaX + criteriaW - 2, cy + 9.5, { align: "right" });

        // Title
        doc.setTextColor(0, 0, 0);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(8.5);
        doc.text(processText(c.title), criteriaX + criteriaW - 18, cy + 4, { align: "right" });

        // Description
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        doc.text(processText(c.desc), criteriaX + criteriaW - 18, cy + 8, { align: "right" });

        // Formula
        doc.setFontSize(6.5);
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
      doc.setFontSize(10);
      doc.text(processText("لوحة المؤشرات المختصرة"), PW - M, y, { align: "right" });
      y += 5;

      // Calculate delayed counts from student data
      const calcDelayed = (students: any[]) => {
        let delayed = 0;
        students.forEach(s => {
          const st = getRegistrationStatus(s.registration_count, s._type);
          if (st === 'delayed') delayed++;
        });
        return delayed;
      };
      const regDelayed = calcDelayed(data.registeredStudents);
      const defDelayed = calcDelayed(data.defendedStudents);
      const regDelayedPct = data.registeredCount > 0 ? ((regDelayed / data.registeredCount) * 100).toFixed(1) : '0.0';
      const defDelayedPct = data.defendedCount > 0 ? ((defDelayed / data.defendedCount) * 100).toFixed(1) : '0.0';

      const cardCols = 3;
      const cardGapX = 2;
      const cardGapY = 2;
      const cardW = (PW - M * 2 - (cardCols - 1) * cardGapX) / cardCols;
      const cardH = 30;

      const dashboardCards = [
        // Row 1
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
          title: "عدد المتأخرين (المسجلين)",
          items: [
            { label: "الإجمالي", value: toWesternNumerals(regDelayed) },
            { label: "من أصل", value: toWesternNumerals(data.registeredCount) },
            { label: "النسبة", value: `${toWesternNumerals(regDelayedPct)}%` },
          ],
        },
        // Row 2
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
        {
          title: "عدد المتأخرين (المناقشين)",
          items: [
            { label: "الإجمالي", value: toWesternNumerals(defDelayed) },
            { label: "من أصل", value: toWesternNumerals(data.defendedCount) },
            { label: "النسبة", value: `${toWesternNumerals(defDelayedPct)}%` },
          ],
        },
      ];

      // Draw cards in 3-column grid, right-to-left, matching UI layout
      checkPage(cardH * 2 + cardGapY + 5);
      dashboardCards.forEach((card, ci) => {
        const col = ci % cardCols;
        const row = Math.floor(ci / cardCols);
        // Right-to-left: rightmost card is col 0
        const cardLeft = PW - M - (col + 1) * cardW - col * cardGapX;
        const cardTop = y + row * (cardH + cardGapY);
        const cardRight = cardLeft + cardW;

        // Card border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.roundedRect(cardLeft, cardTop, cardW, cardH, 1.5, 1.5, "S");
        
        // Card title (top-right, bold, colored like primary)
        doc.setFont("Amiri", "bold");
        doc.setFontSize(8);
        doc.setTextColor(66, 133, 244);
        doc.text(processText(card.title), cardRight - 3, cardTop + 5, { align: "right" });
        doc.setTextColor(0, 0, 0);

        // Separator line under title
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(cardLeft + 2, cardTop + 7.5, cardRight - 2, cardTop + 7.5);
        
        // Card items as rows: value on LEFT, label on RIGHT
        const itemStartY = cardTop + 11;
        const itemRowH = 6;
        card.items.forEach((item, ii) => {
          const iy = itemStartY + ii * itemRowH;
          // Value (bold, left side)
          doc.setFont("Amiri", "bold");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(item.value, cardLeft + 4, iy + 1, { align: "left" });
          // Label (normal, right side)
          doc.setFont("Amiri", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(processText(item.label), cardRight - 3, iy + 1, { align: "right" });
          doc.setTextColor(0, 0, 0);
        });
      });
      const totalRows = Math.ceil(dashboardCards.length / cardCols);
      y += totalRows * (cardH + cardGapY) + 3;

      // ───── Mini Charts: Registered (right) | Defended (left) ─────
      const chartAreaH = PH - 15 - y; // remaining space on page 1
      if (chartAreaH > 30) {
        doc.setDrawColor(200, 200, 200);
        doc.line(M, y, PW - M, y);
        y += 3;

        const halfW = (PW - M * 2 - 4) / 2; // 4mm gap between halves
        const rightX = PW - M; // right half starts here
        const leftX = M; // left half starts here

        // Helper: draw a simple donut/pie chart
        const drawPieChart = (
          centerX: number, centerY: number, radius: number,
          slices: { label: string; value: number; color: [number, number, number] }[],
          title: string
        ) => {
          // Title above chart
          doc.setFont("Amiri", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(66, 133, 244);
          doc.text(processText(title), centerX, centerY - radius - 3, { align: "center" });
          doc.setTextColor(0, 0, 0);

          const total = slices.reduce((s, sl) => s + sl.value, 0);
          if (total === 0) {
            // Empty chart - draw gray circle
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.circle(centerX, centerY, radius, "S");
            doc.setFont("Amiri", "normal");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("0", centerX, centerY + 1.5, { align: "center" });
            doc.setTextColor(0, 0, 0);
            return;
          }

          // Draw pie slices using filled sectors
          let startAngle = -Math.PI / 2; // start from top
          slices.forEach((slice) => {
            if (slice.value <= 0) return;
            const sweepAngle = (slice.value / total) * 2 * Math.PI;
            const endAngle = startAngle + sweepAngle;

            // Draw filled arc segment using lines
            doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);

            // Build path as triangle fan
            const steps = Math.max(12, Math.ceil(sweepAngle / 0.1));
            const points: [number, number][] = [[centerX, centerY]];
            for (let s = 0; s <= steps; s++) {
              const a = startAngle + (sweepAngle * s) / steps;
              points.push([centerX + radius * Math.cos(a), centerY + radius * Math.sin(a)]);
            }

            // Draw as filled polygon using triangle method
            for (let t = 1; t < points.length - 1; t++) {
              doc.triangle(
                points[0][0], points[0][1],
                points[t][0], points[t][1],
                points[t + 1][0], points[t + 1][1],
                "F"
              );
            }

            startAngle = endAngle;
          });

          // Draw white center for donut effect
          doc.setFillColor(255, 255, 255);
          const innerR = radius * 0.5;
          // Approximate circle with many triangles
          const cSteps = 36;
          for (let i = 0; i < cSteps; i++) {
            const a1 = (i / cSteps) * 2 * Math.PI;
            const a2 = ((i + 1) / cSteps) * 2 * Math.PI;
            doc.triangle(
              centerX, centerY,
              centerX + innerR * Math.cos(a1), centerY + innerR * Math.sin(a1),
              centerX + innerR * Math.cos(a2), centerY + innerR * Math.sin(a2),
              "F"
            );
          }

          // Total in center
          doc.setFont("Amiri", "bold");
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(toWesternNumerals(total), centerX, centerY + 2, { align: "center" });

          // Legend below chart
          let ly = centerY + radius + 4;
          slices.forEach((slice) => {
            doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
            doc.rect(centerX + 8, ly - 1.5, 3, 3, "F");
            doc.setFont("Amiri", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(60, 60, 60);
            const pct = total > 0 ? ((slice.value / total) * 100).toFixed(0) : "0";
            doc.text(`${processText(slice.label)} (${toWesternNumerals(pct)}%)`, centerX + 5, ly + 0.5, { align: "right" });
            doc.setTextColor(0, 0, 0);
            ly += 5;
          });
        };

        // Calculate stats for charts
        const regRegular = data.registeredStudents.filter((s: any) => getRegistrationStatus(s.registration_count, s._type) === 'regular').length;
        const defRegular = data.defendedStudents.filter((s: any) => getRegistrationStatus(s.registration_count, s._type) === 'regular').length;

        const chartR = Math.min(12, (chartAreaH - 25) / 2.5);
        const chartCenterY = y + chartR + 8;

        // RIGHT SIDE: Registered students charts
        const regChartX1 = rightX - halfW / 4; // Type distribution
        const regChartX2 = rightX - (3 * halfW) / 4; // Status distribution

        // Section label
        doc.setFont("Amiri", "bold");
        doc.setFontSize(9);
        doc.setTextColor(66, 133, 244);
        doc.text(processText("المسجلين في الدكتوراه"), rightX - halfW / 2, y, { align: "center" });
        doc.setTextColor(0, 0, 0);

        drawPieChart(regChartX1, chartCenterY, chartR, [
          { label: "د.ل.م.د", value: data.registeredLmd, color: [66, 133, 244] },
          { label: "د.علوم", value: data.registeredScience, color: [52, 211, 153] },
        ], "توزيع النوع");

        drawPieChart(regChartX2, chartCenterY, chartR, [
          { label: "منتظم", value: regRegular, color: [34, 197, 94] },
          { label: "متأخر", value: regDelayed, color: [239, 68, 68] },
        ], "حالة التسجيل");

        // LEFT SIDE: Defended students charts
        const defChartX1 = leftX + (3 * halfW) / 4 + 2; // Type distribution
        const defChartX2 = leftX + halfW / 4 + 2; // Status distribution

        doc.setFont("Amiri", "bold");
        doc.setFontSize(9);
        doc.setTextColor(66, 133, 244);
        doc.text(processText("المناقشين"), leftX + halfW / 2 + 2, y, { align: "center" });
        doc.setTextColor(0, 0, 0);

        drawPieChart(defChartX1, chartCenterY, chartR, [
          { label: "د.ل.م.د", value: data.defendedLmd, color: [66, 133, 244] },
          { label: "د.علوم", value: data.defendedScience, color: [52, 211, 153] },
        ], "توزيع النوع");

        drawPieChart(defChartX2, chartCenterY, chartR, [
          { label: "منتظم", value: defRegular, color: [34, 197, 94] },
          { label: "متأخر", value: defDelayed, color: [239, 68, 68] },
        ], "حالة التسجيل");

        // Vertical separator between two halves
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.3);
        doc.line(PW / 2, y - 2, PW / 2, chartCenterY + chartR + 18);
      }
    }

    // ═══════ PAGE 2: Strategic Insights ═══════
    if (selectedSections.includes("insights") && data.insights && data.insights.length > 0) {
      doc.addPage();
      y = 15;
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
        doc.setFontSize(9);
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(processText(insight.title), PW - M - 5, y + 5, { align: "right" });

        // Body text
        doc.setFont("Amiri", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const textLines = doc.splitTextToSize(processText(insight.text), PW - M * 2 - 10);
        doc.text(textLines, PW - M - 5, y + 9, { align: "right" });

        doc.setTextColor(0, 0, 0);
        y += insightCardH + 3;
      });
      y += 2;
    }

    // ═══════ PAGE 3+: Tables and Statistics ═══════
    const hasTablesSection = selectedSections.some(s => ["registered", "defended", "jury", "admin", "english", "labs", "assistants"].includes(s));
    if (hasTablesSection) {
      doc.addPage();
      y = 15;
    }

    // ───── Registered Students ─────
    if (selectedSections.includes("registered")) {
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
    if (selectedSections.includes("defended")) {
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
    if (selectedSections.includes("jury")) {
      checkPage(15);
      sectionTitle("إحصائيات العضوية (مشرف/مشرف مساعد/رئيس لجنة/عضو/مدعو)");
      const tableW = PW - M * 2;
      const cols = [6, 28, 16, 24, 13, 13, 13, 13, 13, 13].map(p => (p / 152) * tableW);
      const rows = data.juryStats.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.title, s.university || '-',
        s.supervisor > 0 ? toWesternNumerals(s.supervisor) : "-",
        s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : "-",
        s.president > 0 ? toWesternNumerals(s.president) : "-",
        s.member > 0 ? toWesternNumerals(s.member) : "-",
        s.invited > 0 ? toWesternNumerals(s.invited) : "-",
        toWesternNumerals(s.total),
      ]);
      drawTable(["#", "الاسم واللقب", "الرتبة", "الجامعة", "مشرف", "م.مساعد", "رئيس ل.", "عضو", "مدعو", "المجموع"], rows, cols);
    }

    // ───── Administrative Actions ─────
    if (selectedSections.includes("admin")) {
      checkPage(15);
      sectionTitle("ثالثا: الإجراءات الإدارية");
      const tableW = PW - M * 2;
      const cols = [7, 32, 28, 16, 16, 22, 22, 22].map(p => (p / 165) * tableW);
      const rows = data.adminActions.map((s, i) => [
        toWesternNumerals(i + 1), s.name, s.supervisor, s.type,
        s.status === "regular" ? "منتظم" : s.status === "delayed" ? "متأخر" : "-",
        s.councilDate ? toWesternNumerals(formatDateDDMMYYYY(s.councilDate)) : "-",
        s.defenseDate ? toWesternNumerals(formatDateDDMMYYYY(s.defenseDate)) : "-",
        s.processingTime ? '\u200B' + shapeArabicText("يوم") + ' ' + String(s.processingTime.days).padStart(2, '0') + ' ' + shapeArabicText("و") + ' ' + shapeArabicText("شهر") + ' ' + String(s.processingTime.months).padStart(2, '0') : "-",
      ]);
      drawTable(["#", "الاسم واللقب", "المشرف", "النوع", "الحالة", "تاريخ المصادقة", "تاريخ المناقشة", "مدة المعالجة"], rows, cols);
    }

    // ───── English Theses ─────
    if (selectedSections.includes("english")) {
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
    if (selectedSections.includes("labs")) {
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
    if (selectedSections.includes("assistants")) {
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

      // Load university logo
      let logoBase64: string | null = null;
      if (settings?.universityLogo) {
        logoBase64 = await loadLogoBase64(settings.universityLogo);
      }

      dataSets.forEach((data, i) => {
        generateReport(doc, data, i === 0, logoBase64);
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
