import { useState } from "react";
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
import { certificateTypeLabels } from "@/types/certificates";
import { toWesternNumerals } from "@/lib/numerals";
import { loadFontFile, arrayBufferToBase64, getAllFonts } from "@/lib/arabicFonts";
import { shapeArabicText } from "@/lib/pdf/arabicTextUtils";

interface ReportData {
  yearLabel: string;
  total: number;
  byType: { phd_lmd: number; phd_science: number };
  byFaculty: [string, { phd_lmd: number; phd_science: number; total: number }][];
  bySpecialty: [string, { count: number; faculty: string; type: string }][];
  byMonth: number[];
  monthNames: string[];
  students: Array<{
    full_name_ar: string;
    faculty_ar: string;
    specialty_ar: string;
    defense_date: string;
    _type: string;
  }>;
}

interface ExportPdfDialogProps {
  data: ReportData;
}

type SectionKey = "summary" | "monthly" | "faculty" | "specialty" | "students";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "summary", label: "ملخص عام" },
  { key: "monthly", label: "التوزيع الشهري" },
  { key: "faculty", label: "حسب الكلية" },
  { key: "specialty", label: "حسب التخصص" },
  { key: "students", label: "قائمة الطلاب المناقشين" },
];

export default function ExportPdfDialog({ data }: ExportPdfDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<SectionKey>>(
    new Set(["summary", "monthly", "faculty", "specialty"])
  );
  const [generating, setGenerating] = useState(false);

  const toggle = (key: SectionKey) => {
    setSelected((prev) => {
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
    setGenerating(true);
    try {
      await generatePdf(data, selected);
      toast.success("تم إنشاء التقرير بنجاح");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("فشل إنشاء التقرير");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <FileText className="h-4 w-4" />
          تصدير PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تصدير تقرير PDF</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">اختر الأقسام التي تريد تضمينها في التقرير:</p>
        <div className="space-y-3 py-2">
          {SECTIONS.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <Checkbox
                id={s.key}
                checked={selected.has(s.key)}
                onCheckedChange={() => toggle(s.key)}
              />
              <Label htmlFor={s.key} className="cursor-pointer">{s.label}</Label>
            </div>
          ))}
        </div>
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
// PDF Generation
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
    (doc as any).addFont(fileName, font.family, font.style, "Identity-H");
  }
}

function shape(text: string): string {
  return shapeArabicText(text);
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

async function generatePdf(data: ReportData, sections: Set<SectionKey>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await loadAmiriFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  let y = PAGE_MARGIN;

  // Report header
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246);
  doc.text(shape("التقرير السنوي"), pageW / 2, y + 5, { align: "center" });
  y += 12;

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
      y = drawTableRow(
        doc,
        [fac, toWesternNumerals(counts.phd_lmd), toWesternNumerals(counts.phd_science), toWesternNumerals(counts.total)],
        colW,
        y
      );
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
    const colW = [10, 55, 40, 40, 30];
    y = drawTableRow(doc, ["#", "الاسم الكامل", "الكلية", "التخصص", "تاريخ المناقشة"], colW, y, { bold: true, bg: true });
    data.students.forEach((s, i) => {
      y = drawTableRow(
        doc,
        [
          toWesternNumerals(i + 1),
          s.full_name_ar || "",
          s.faculty_ar || "",
          s.specialty_ar || "",
          s.defense_date ? toWesternNumerals(s.defense_date) : "",
        ],
        colW,
        y
      );
    });
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
