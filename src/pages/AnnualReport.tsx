import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { FileBarChart, Download, Calendar, Building, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  usePhdLmdCertificates,
  usePhdScienceCertificates,
} from "@/hooks/useCertificates";
import { certificateTypeLabels } from "@/types/certificates";
import type { Certificate } from "@/types/certificates";
import { toWesternNumerals } from "@/lib/numerals";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AnnualReport() {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: phdLmdData = [], isLoading: l1 } = usePhdLmdCertificates();
  const { data: phdScienceData = [], isLoading: l2 } = usePhdScienceCertificates();

  const isLoading = l1 || l2;
  const allData = useMemo(() => [
    ...phdLmdData.map(s => ({ ...s, _type: "phd_lmd" as const })),
    ...phdScienceData.map(s => ({ ...s, _type: "phd_science" as const })),
  ], [phdLmdData, phdScienceData]);

  const [expandFaculty, setExpandFaculty] = useState(false);
  const [expandSpecialty, setExpandSpecialty] = useState(false);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allData.forEach(s => {
      if (s.defense_date) years.add(s.defense_date.substring(0, 4));
    });
    return [...years].sort().reverse();
  }, [allData]);

  // Filter by year and date range
  const yearData = useMemo(() => {
    let filtered = allData;
    
    if (selectedYear !== "all") {
      filtered = filtered.filter(s => s.defense_date?.startsWith(selectedYear));
    }
    
    if (dateFrom) {
      filtered = filtered.filter(s => s.defense_date && s.defense_date >= dateFrom);
    }
    
    if (dateTo) {
      filtered = filtered.filter(s => s.defense_date && s.defense_date <= dateTo);
    }
    
    return filtered;
  }, [allData, selectedYear, dateFrom, dateTo]);

  // Stats by certificate type
  const byType = useMemo(() => ({
    phd_lmd: yearData.filter(s => s._type === "phd_lmd").length,
    phd_science: yearData.filter(s => s._type === "phd_science").length,
  }), [yearData]);

  // Stats by faculty
  const byFaculty = useMemo(() => {
    const map: Record<string, { phd_lmd: number; phd_science: number; total: number }> = {};
    yearData.forEach(s => {
      const fac = s.faculty_ar || "غير محدد";
      if (!map[fac]) map[fac] = { phd_lmd: 0, phd_science: 0, total: 0 };
      map[fac][s._type]++;
      map[fac].total++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [yearData]);

  // Stats by specialty
  const bySpecialty = useMemo(() => {
    const map: Record<string, { count: number; faculty: string; type: string }> = {};
    yearData.forEach(s => {
      const key = s.specialty_ar;
      if (!map[key]) map[key] = { count: 0, faculty: s.faculty_ar || "", type: s._type };
      map[key].count++;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [yearData]);

  // Monthly distribution
  const byMonth = useMemo(() => {
    const months = Array(12).fill(0);
    yearData.forEach(s => {
      if (s.defense_date) {
        const month = parseInt(s.defense_date.substring(5, 7)) - 1;
        if (month >= 0 && month < 12) months[month]++;
      }
    });
    return months;
  }, [yearData]);

  const monthNames = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const handleExportReport = () => {
    if (yearData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      { "البيان": "إجمالي المناقشات", "العدد": yearData.length },
      { "البيان": certificateTypeLabels.phd_lmd.ar, "العدد": byType.phd_lmd },
      { "البيان": certificateTypeLabels.phd_science.ar, "العدد": byType.phd_science },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "ملخص");

    // Sheet 2: By Faculty
    const facultyData = byFaculty.map(([fac, counts]) => ({
      "الكلية": fac,
      [certificateTypeLabels.phd_lmd.ar]: counts.phd_lmd,
      [certificateTypeLabels.phd_science.ar]: counts.phd_science,
      "الإجمالي": counts.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(facultyData), "حسب الكلية");

    // Sheet 3: By Specialty
    const specData = bySpecialty.map(([spec, info]) => ({
      "التخصص": spec,
      "الكلية": info.faculty,
      "العدد": info.count,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(specData), "حسب التخصص");

    // Sheet 4: Monthly
    const monthlyData = monthNames.map((name, i) => ({
      "الشهر": name,
      "عدد المناقشات": byMonth[i],
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyData), "التوزيع الشهري");

    const yearLabel = selectedYear === "all" ? "كل_السنوات" : selectedYear;
    XLSX.writeFile(wb, `تقرير_سنوي_${yearLabel}.xlsx`);
    toast.success("تم تصدير التقرير بنجاح");
  };

  const maxMonthly = Math.max(...byMonth, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقرير السنوي</h1>
          <p className="text-muted-foreground mt-1">ملخص المناقشات والشهادات الصادرة حسب الكلية والتخصص</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">السنة</label>
            <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); if (v !== "all") { setDateFrom(""); setDateTo(""); } }}>
              <SelectTrigger className="w-36 h-9">
                <Calendar className="h-4 w-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل السنوات</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y}>{toWesternNumerals(y)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); if (e.target.value) setSelectedYear("all"); }}
              className="w-40 h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); if (e.target.value) setSelectedYear("all"); }}
              className="w-40 h-9"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-destructive" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              مسح الفترة
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handleExportReport}>
            <Download className="h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{toWesternNumerals(yearData.length)}</div>
                <p className="text-sm text-muted-foreground mt-1">إجمالي المناقشات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary/80">{toWesternNumerals(byType.phd_lmd)}</div>
                <p className="text-sm text-muted-foreground mt-1">{certificateTypeLabels.phd_lmd.ar}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary/60">{toWesternNumerals(byType.phd_science)}</div>
                <p className="text-sm text-muted-foreground mt-1">{certificateTypeLabels.phd_science.ar}</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Distribution Bar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                التوزيع الشهري للمناقشات
                {selectedYear !== "all" && (
                  <Badge variant="secondary">{toWesternNumerals(selectedYear)}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {byMonth.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {count > 0 ? toWesternNumerals(count) : ""}
                    </span>
                    <div
                      className="w-full bg-primary/80 rounded-t-md transition-all duration-500 min-h-[2px]"
                      style={{ height: `${(count / maxMonthly) * 100}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {monthNames[i].substring(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Faculty */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-primary" />
                  حسب الكلية
                  <Badge variant="secondary">{toWesternNumerals(byFaculty.length)} كلية</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right font-semibold">الكلية</TableHead>
                      <TableHead className="text-center font-semibold text-xs">د.ل.م.د</TableHead>
                      <TableHead className="text-center font-semibold text-xs">د.علوم</TableHead>
                      <TableHead className="text-center font-semibold">المجموع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expandFaculty ? byFaculty : byFaculty.slice(0, 2)).map(([fac, counts]) => (
                      <TableRow key={fac}>
                        <TableCell className="font-medium text-sm">{fac}</TableCell>
                        <TableCell className="text-center">{toWesternNumerals(counts.phd_lmd)}</TableCell>
                        <TableCell className="text-center">{toWesternNumerals(counts.phd_science)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            {toWesternNumerals(counts.total)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {byFaculty.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          لا توجد بيانات للسنة المحددة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {byFaculty.length > 2 && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={() => setExpandFaculty(!expandFaculty)}>
                      {expandFaculty ? <><ChevronUp className="h-4 w-4" /> إخفاء</> : <><ChevronDown className="h-4 w-4" /> عرض الكل ({toWesternNumerals(byFaculty.length)})</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Specialty */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  حسب التخصص
                  <Badge variant="secondary">{toWesternNumerals(bySpecialty.length)} تخصص</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right font-semibold">التخصص</TableHead>
                      <TableHead className="text-right font-semibold">الكلية</TableHead>
                      <TableHead className="text-center font-semibold">العدد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expandSpecialty ? bySpecialty : bySpecialty.slice(0, 2)).map(([spec, info]) => (
                      <TableRow key={spec}>
                        <TableCell className="font-medium text-sm">{spec}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{info.faculty}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            {toWesternNumerals(info.count)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bySpecialty.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          لا توجد بيانات للسنة المحددة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {bySpecialty.length > 2 && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={() => setExpandSpecialty(!expandSpecialty)}>
                      {expandSpecialty ? <><ChevronUp className="h-4 w-4" /> إخفاء</> : <><ChevronDown className="h-4 w-4" /> عرض الكل ({toWesternNumerals(bySpecialty.length)})</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
