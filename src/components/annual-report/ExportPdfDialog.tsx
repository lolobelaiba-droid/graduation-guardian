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
import { loadFontFile, arrayBufferToBase64, getAllFonts } from "@/lib/arabicFonts";
import { shapeArabicText } from "@/lib/pdf/arabicTextUtils";
import { extractStartYear } from "@/lib/registration-calculation";

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
  _type: string;
}

interface ReportData {
  yearLabel: string;
  total: number;
  byType: { phd_lmd: number; phd_science: number };
  byFaculty: [string, { phd_lmd: number; phd_science: number; total: number }][];
  bySpecialty: [string, { count: number; faculty: string; type: string }][];
  byMonth: number[];
  monthNames: string[];
  students: StudentData[];
}

interface ExportPdfDialogProps {
  data: ReportData;
}

type SectionKey = "summary" | "monthly" | "faculty" | "specialty" | "students" | "status" | "avgYears" | "customTable";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "summary", label: "ملخص عام" },
  { key: "monthly", label: "التوزيع الشهري" },
  { key: "faculty", label: "حسب الكلية" },
  { key: "specialty", label: "حسب التخصص" },
  { key: "status", label: "حالة الطلاب (نظامي / متأخر / الحالة الوظيفية)" },
  { key: "avgYears", label: "متوسط سنوات التسجيل" },
  { key: "students", label: "قائمة الطلاب المناقشين" },
  { key: "customTable", label: "جدول مخصص (اختيار الأعمدة)" },
];

type ColumnKey = keyof Omit<StudentData, "_type">;

const AVAILABLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "full_name_ar", label: "الاسم الكامل (عربي)" },
  { key: "full_name_fr", label: "الاسم الكامل (فرنسي)" },
  { key: "student_number", label: "رقم الشهادة" },
  { key: "faculty_ar", label: "الكلية (عربي)" },
  { key: "faculty_fr", label: "الكلية (فرنسي)" },
  { key: "branch_ar", label: "الشعبة (عربي)" },
  { key: "branch_fr", label: "الشعبة (فرنسي)" },
  { key: "specialty_ar", label: "التخصص (عربي)" },
  { key: "specialty_fr", label: "التخصص (فرنسي)" },
  { key: "defense_date", label: "تاريخ المناقشة" },
  { key: "date_of_birth", label: "تاريخ الميلاد" },
  { key: "birthplace_ar", label: "مكان الميلاد" },
  { key: "supervisor_ar", label: "المشرف" },
  { key: "co_supervisor_ar", label: "مساعد المشرف" },
  { key: "mention", label: "التقدير" },
  { key: "thesis_title_ar", label: "عنوان الأطروحة" },
  { key: "first_registration_year", label: "سنة أول تسجيل" },
  { key: "employment_status", label: "الحالة الوظيفية" },
  { key: "registration_type", label: "نوع التسجيل" },
  { key: "inscription_status", label: "حالة التسجيل" },
  { key: "research_lab_ar", label: "مخبر البحث" },
  { key: "current_year", label: "السنة الحالية" },
];

const mentionLabels: Record<string, string> = {
  honorable: "مشرف",
  very_honorable: "مشرف جدا",
};

export default function ExportPdfDialog({ data }: ExportPdfDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<SectionKey>>(
    new Set(["summary", "monthly", "faculty", "specialty", "status", "avgYears"])
  );
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(
    new Set(["full_name_ar", "faculty_ar", "specialty_ar", "defense_date"])
  );
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { data: uniSettings } = useUniversitySettings();

  const toggle = (key: SectionKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.error("اختر قسماً واحداً على الأقل");
      return;
    }
    if (selected.has("customTable") && selectedColumns.size === 0) {
      toast.error("اختر عموداً واحداً على الأقل للجدول المخصص");
      return;
    }
    setGenerating(true);
    try {
      await generatePdf(data, selected, selectedColumns, uniSettings);
      toast.success("تم إنشاء التقرير بنجاح");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("فشل إنشاء التقرير");
    } finally {
      setGenerating(false);
    }
  };

  const showCustomColumns = selected.has("customTable");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <FileText className="h-4 w-4" />
          تصدير PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>تصدير تقرير PDF</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <p className="text-sm text-muted-foreground mb-3">اختر الأقسام التي تريد تضمينها في التقرير:</p>
          <div className="space-y-3 py-2">
            {SECTIONS.map((s) => (
              <div key={s.key}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={s.key}
                    checked={selected.has(s.key)}
                    onCheckedChange={() => toggle(s.key)}
                  />
                  <Label htmlFor={s.key} className="cursor-pointer">{s.label}</Label>
                </div>
              </div>
            ))}
          </div>

          {showCustomColumns && (
            <>
              <Separator className="my-3" />
              <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between gap-2 text-sm font-medium">
                    اختر أعمدة الجدول المخصص ({toWesternNumerals(selectedColumns.size)} عمود)
                    {columnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 py-2 pr-2">
                    {AVAILABLE_COLUMNS.map((col) => (
                      <div key={col.key} className="flex items-center gap-3">
                        <Checkbox
                          id={`col-${col.key}`}
                          checked={selectedColumns.has(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <Label htmlFor={`col-${col.key}`} className="cursor-pointer text-sm">{col.label}</Label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleExport} disabled={generating || selected.size === 0} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "جاري الإنشاء..." : "تحميل PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PDF Generation Helpers
// ============================================================================

const FONT_NAME = "Amiri";
const PAGE_MARGIN = 15;
const LINE_HEIGHT = 7;

async function loadAmiriFont(doc: jsPDF) {
  const allFonts = getAllFonts();
  const amiriRegular = allFonts.find(f => f.family === "Amiri" && f.style === "normal");
  const amiriBold = allFonts.find(f => f.family === "Amiri" && f.style === "bold");

  for (const font of [amiriRegular, amiriBold]) {
    if (!font || !font.url) continue;
    const buffer = await loadFontFile(font.url);
    if (!buffer) continue;
    const base64 = arrayBufferToBase64(buffer);
    const ext = font.url.split("?")[0].split(".").pop() || "ttf";
    const fileName = `${font.name}.${ext}`;
    doc.addFileToVFS(fileName, base64);
    doc.addFont(fileName, font.family, font.style, undefined, "Identity-H");
  }
}

function shape(text: string): string {
  return shapeArabicText(text);
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addPageIfNeeded(doc: jsPDF, y: number, needed: number = LINE_HEIGHT * 2): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN + 10;
  }
  return y;
}

function drawTitle(doc: jsPDF, title: string, y: number): number {
  y = addPageIfNeeded(doc, y, 20);
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  const pageW = doc.internal.pageSize.getWidth();
  doc.text(shape(title), pageW - PAGE_MARGIN, y, { align: "right" });
  y += 3;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
  return y + LINE_HEIGHT;
}

function drawText(doc: jsPDF, text: string, y: number, opts?: { bold?: boolean; size?: number; center?: boolean }): number {
  y = addPageIfNeeded(doc, y);
  doc.setFont(FONT_NAME, opts?.bold ? "bold" : "normal");
  doc.setFontSize(opts?.size || 11);
  doc.setTextColor(33, 33, 33);
  const pageW = doc.internal.pageSize.getWidth();
  if (opts?.center) {
    doc.text(shape(text), pageW / 2, y, { align: "center" });
  } else {
    doc.text(shape(text), pageW - PAGE_MARGIN, y, { align: "right" });
  }
  return y + LINE_HEIGHT;
}

function drawTableRow(
  doc: jsPDF,
  cols: string[],
  colWidths: number[],
  y: number,
  opts?: { bold?: boolean; bg?: boolean }
): number {
  y = addPageIfNeeded(doc, y, 10);
  const pageW = doc.internal.pageSize.getWidth();
  const rowH = 8;

  if (opts?.bg) {
    doc.setFillColor(241, 245, 249);
    doc.rect(PAGE_MARGIN, y - 5, pageW - PAGE_MARGIN * 2, rowH, "F");
  }

  doc.setFont(FONT_NAME, opts?.bold ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);

  let x = pageW - PAGE_MARGIN;
  cols.forEach((col, i) => {
    doc.text(shape(col), x - 2, y, { align: "right" });
    x -= colWidths[i];
  });

  return y + rowH;
}

// ============================================================================
// Statistics helpers
// ============================================================================

function getStudentStatus(s: StudentData): string {
  if (s.current_year === "متأخر") return "متأخر";
  const maxYears = s._type === "phd_lmd" ? 5 : 6;
  if (s.registration_count && s.registration_count > maxYears) return "متأخر";
  return "نظامي";
}

function calcRegistrationYears(s: StudentData): number | null {
  if (s.registration_count && s.registration_count >= 1) return s.registration_count;
  if (!s.first_registration_year || !s.defense_date) return null;
  const firstYear = extractStartYear(s.first_registration_year);
  const defenseYear = parseInt(s.defense_date.substring(0, 4), 10);
  if (!firstYear || isNaN(defenseYear)) return null;
  return defenseYear - firstYear + 1;
}

function computeAvg(values: number[]): string {
  if (values.length === 0) return "-";
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return toWesternNumerals(avg.toFixed(1));
}

const mentionLabelsMap: Record<string, string> = {
  honorable: "مشرف",
  very_honorable: "مشرف جدا",
};

function getColumnValue(s: StudentData, key: ColumnKey): string {
  const val = s[key];
  if (val == null) return "";
  if (key === "mention") return mentionLabelsMap[String(val)] || String(val);
  if (key === "registration_count") return val ? toWesternNumerals(val) : "";
  if (key === "defense_date" || key === "date_of_birth" || key === "first_registration_year") {
    return val ? toWesternNumerals(String(val)) : "";
  }
  return String(val);
}

// ============================================================================
// Main PDF generator
// ============================================================================

async function generatePdf(data: ReportData, sections: Set<SectionKey>, customColumns: Set<ColumnKey>, uniSettings?: { universityName?: string; universityNameEn?: string; universityLogo?: string }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await loadAmiriFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  let y = PAGE_MARGIN;

  // University logo & name header
  const logoUrl = uniSettings?.universityLogo;
  const uniName = uniSettings?.universityName || "جامعة أم البواقي";

  if (logoUrl) {
    try {
      const img = await loadImageAsBase64(logoUrl);
      if (img) {
        const logoSize = 18;
        doc.addImage(img, "PNG", (pageW - logoSize) / 2, y, logoSize, logoSize);
        y += logoSize + 3;
      }
    } catch (e) {
      console.warn("Failed to load university logo for PDF", e);
    }
  }

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(13);
  doc.setTextColor(33, 33, 33);
  doc.text(shape(uniName), pageW / 2, y, { align: "center" });
  y += 8;

  // Report title
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246);
  doc.text(shape("التقرير السنوي"), pageW / 2, y + 2, { align: "center" });
  y += 10;

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const periodLabel = data.yearLabel === "كل_السنوات" ? "كل السنوات" : data.yearLabel;
  doc.text(shape(`الفترة: ${periodLabel}`), pageW / 2, y, { align: "center" });
  y += 10;

  // ---- Summary ----
  if (sections.has("summary")) {
    y = drawTitle(doc, "ملخص عام", y);
    y = drawText(doc, `إجمالي المناقشات: ${toWesternNumerals(data.total)}`, y);
    y = drawText(doc, `${certificateTypeLabels.phd_lmd.ar}: ${toWesternNumerals(data.byType.phd_lmd)}`, y);
    y = drawText(doc, `${certificateTypeLabels.phd_science.ar}: ${toWesternNumerals(data.byType.phd_science)}`, y);
    y += 5;
  }

  // ---- Student Status ----
  if (sections.has("status")) {
    y = drawTitle(doc, "حالة الطلاب", y);
    const regular = data.students.filter(s => getStudentStatus(s) === "نظامي").length;
    const late = data.students.filter(s => getStudentStatus(s) === "متأخر").length;
    y = drawText(doc, `نظامي: ${toWesternNumerals(regular)}`, y);
    y = drawText(doc, `متأخر: ${toWesternNumerals(late)}`, y);
    y += 3;

    const empMap: Record<string, number> = {};
    data.students.forEach(s => {
      const status = s.employment_status || "غير محدد";
      empMap[status] = (empMap[status] || 0) + 1;
    });
    const empEntries = Object.entries(empMap).sort((a, b) => b[1] - a[1]);
    if (empEntries.length > 0) {
      y = drawText(doc, "الحالة الوظيفية:", y, { bold: true });
      const colW = [80, 30];
      y = drawTableRow(doc, ["الحالة", "العدد"], colW, y, { bold: true, bg: true });
      empEntries.forEach(([status, count]) => {
        y = drawTableRow(doc, [status, toWesternNumerals(count)], colW, y);
      });
    }
    y += 5;
  }

  // ---- Average Registration Years ----
  if (sections.has("avgYears")) {
    y = drawTitle(doc, "متوسط سنوات التسجيل", y);

    const facYears: Record<string, number[]> = {};
    const branchYears: Record<string, number[]> = {};
    const specYears: Record<string, number[]> = {};

    data.students.forEach(s => {
      const years = calcRegistrationYears(s);
      if (years == null) return;
      const fac = s.faculty_ar || "غير محدد";
      const branch = s.branch_ar || "غير محدد";
      const spec = s.specialty_ar || "غير محدد";
      (facYears[fac] ??= []).push(years);
      (branchYears[branch] ??= []).push(years);
      (specYears[spec] ??= []).push(years);
    });

    const colW2 = [80, 30, 30];
    y = drawText(doc, "حسب الكلية:", y, { bold: true });
    y = drawTableRow(doc, ["الكلية", "المتوسط", "العدد"], colW2, y, { bold: true, bg: true });
    Object.entries(facYears).sort((a, b) => b[1].length - a[1].length).forEach(([fac, vals]) => {
      y = drawTableRow(doc, [fac, computeAvg(vals), toWesternNumerals(vals.length)], colW2, y);
    });
    y += 3;

    y = drawText(doc, "حسب الشعبة:", y, { bold: true });
    y = drawTableRow(doc, ["الشعبة", "المتوسط", "العدد"], colW2, y, { bold: true, bg: true });
    Object.entries(branchYears).sort((a, b) => b[1].length - a[1].length).forEach(([branch, vals]) => {
      y = drawTableRow(doc, [branch, computeAvg(vals), toWesternNumerals(vals.length)], colW2, y);
    });
    y += 3;

    y = drawText(doc, "حسب التخصص:", y, { bold: true });
    y = drawTableRow(doc, ["التخصص", "المتوسط", "العدد"], colW2, y, { bold: true, bg: true });
    Object.entries(specYears).sort((a, b) => b[1].length - a[1].length).forEach(([spec, vals]) => {
      y = drawTableRow(doc, [spec, computeAvg(vals), toWesternNumerals(vals.length)], colW2, y);
    });
    y += 5;
  }

  // ---- Monthly ----
  if (sections.has("monthly")) {
    y = drawTitle(doc, "التوزيع الشهري للمناقشات", y);
    const colW = [50, 30];
    y = drawTableRow(doc, ["الشهر", "العدد"], colW, y, { bold: true, bg: true });
    data.monthNames.forEach((name, i) => {
      if (data.byMonth[i] > 0) {
        y = drawTableRow(doc, [name, toWesternNumerals(data.byMonth[i])], colW, y);
      }
    });
    y += 5;
  }

  // ---- Faculty ----
  if (sections.has("faculty")) {
    y = drawTitle(doc, "حسب الكلية", y);
    const colW = [70, 25, 25, 25];
    y = drawTableRow(doc, ["الكلية", "د.ل.م.د", "د.علوم", "المجموع"], colW, y, { bold: true, bg: true });
    data.byFaculty.forEach(([fac, counts]) => {
      y = drawTableRow(doc, [fac, toWesternNumerals(counts.phd_lmd), toWesternNumerals(counts.phd_science), toWesternNumerals(counts.total)], colW, y);
    });
    y += 5;
  }

  // ---- Specialty ----
  if (sections.has("specialty")) {
    y = drawTitle(doc, "حسب التخصص", y);
    const colW = [60, 50, 25];
    y = drawTableRow(doc, ["التخصص", "الكلية", "العدد"], colW, y, { bold: true, bg: true });
    data.bySpecialty.forEach(([spec, info]) => {
      y = drawTableRow(doc, [spec, info.faculty, toWesternNumerals(info.count)], colW, y);
    });
    y += 5;
  }

  // ---- Students list ----
  if (sections.has("students")) {
    y = drawTitle(doc, "قائمة الطلاب المناقشين", y);
    const colW = [10, 45, 35, 30, 25, 20];
    y = drawTableRow(doc, ["#", "الاسم الكامل", "الكلية", "التخصص", "تاريخ المناقشة", "الحالة"], colW, y, { bold: true, bg: true });
    data.students.forEach((s, i) => {
      y = drawTableRow(doc, [
        toWesternNumerals(i + 1),
        s.full_name_ar || "",
        s.faculty_ar || "",
        s.specialty_ar || "",
        s.defense_date ? toWesternNumerals(s.defense_date) : "",
        getStudentStatus(s),
      ], colW, y);
    });
    y += 5;
  }

  // ---- Custom Table ----
  if (sections.has("customTable") && customColumns.size > 0) {
    y = drawTitle(doc, "جدول مخصص", y);

    const orderedCols = AVAILABLE_COLUMNS.filter(c => customColumns.has(c.key));
    const totalAvailable = pageW - PAGE_MARGIN * 2 - 10; // 10 for # column
    const colWidth = Math.min(totalAvailable / orderedCols.length, 50);
    const colWidths = [10, ...orderedCols.map(() => colWidth)];
    const headers = ["#", ...orderedCols.map(c => c.label)];

    // Switch to landscape if many columns
    if (orderedCols.length > 5) {
      doc.addPage("a4", "landscape");
      y = PAGE_MARGIN + 10;
      const lPageW = doc.internal.pageSize.getWidth();
      const lTotalAvail = lPageW - PAGE_MARGIN * 2 - 10;
      const lColWidth = Math.min(lTotalAvail / orderedCols.length, 50);
      const lColWidths = [10, ...orderedCols.map(() => lColWidth)];

      y = drawTableRow(doc, headers, lColWidths, y, { bold: true, bg: true });
      data.students.forEach((s, i) => {
        const row = [toWesternNumerals(i + 1), ...orderedCols.map(c => getColumnValue(s, c.key))];
        y = drawTableRow(doc, row, lColWidths, y);
      });
    } else {
      y = drawTableRow(doc, headers, colWidths, y, { bold: true, bg: true });
      data.students.forEach((s, i) => {
        const row = [toWesternNumerals(i + 1), ...orderedCols.map(c => getColumnValue(s, c.key))];
        y = drawTableRow(doc, row, colWidths, y);
      });
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(
      `${toWesternNumerals(p)} / ${toWesternNumerals(totalPages)}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
  }

  const fileName = `تقرير_سنوي_${data.yearLabel}.pdf`;
  doc.save(fileName);
}
