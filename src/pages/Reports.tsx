import { useState, useMemo } from "react";
import { Loader2, Users, GraduationCap, Clock, Award, FlaskConical, UserCheck, FileText, Globe, BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Brain, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { usePhdLmdStudents, usePhdScienceStudents } from "@/hooks/usePhdStudents";
import { usePhdLmdCertificates, usePhdScienceCertificates } from "@/hooks/useCertificates";
import { toWesternNumerals } from "@/lib/numerals";
import { calculateKpi, calcProcessingTime, getRegistrationStatus } from "@/lib/kpi-calculator";
import { generateStrategicInsights, type InsightCard } from "@/lib/strategic-insights";
import { KpiGauge } from "@/components/reports/KpiGauge";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { SectionHeader } from "@/components/reports/SectionHeader";
import ExportReportPdfDialog from "@/components/reports/ExportReportPdfDialog";
import type { ReportExportData } from "@/components/reports/ExportReportPdfDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const STATUS_COLORS = { regular: "hsl(var(--chart-2))", delayed: "hsl(var(--destructive))" };
const JURY_SEPARATORS = /\s*[-–—]\s*|[،,;]\s*|\n/;

export default function Reports() {
  const [selectedFaculty, setSelectedFaculty] = useState<string>("all");

  const { data: regLmd = [], isLoading: l1 } = usePhdLmdStudents();
  const { data: regScience = [], isLoading: l2 } = usePhdScienceStudents();
  const { data: defLmd = [], isLoading: l3 } = usePhdLmdCertificates();
  const { data: defScience = [], isLoading: l4 } = usePhdScienceCertificates();
  const { data: academicTitles = [] } = useQuery({
    queryKey: ["academic_titles_report"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_titles").select("abbreviation, full_name");
      return data || [];
    },
  });

  const isLoading = l1 || l2 || l3 || l4;

  const allRegistered = useMemo(() => [
    ...regLmd.map(s => ({ ...s, _type: "phd_lmd" as const })),
    ...regScience.map(s => ({ ...s, _type: "phd_science" as const })),
  ], [regLmd, regScience]);

  const allDefended = useMemo(() => [
    ...defLmd.map(s => ({ ...s, _type: "phd_lmd" as const })),
    ...defScience.map(s => ({ ...s, _type: "phd_science" as const })),
  ], [defLmd, defScience]);

  const faculties = useMemo(() => {
    const set = new Set<string>();
    [...allRegistered, ...allDefended].forEach(s => { if (s.faculty_ar) set.add(s.faculty_ar); });
    return [...set].sort();
  }, [allRegistered, allDefended]);

  const filteredRegistered = useMemo(() =>
    selectedFaculty === "all" ? allRegistered : allRegistered.filter(s => s.faculty_ar === selectedFaculty),
  [allRegistered, selectedFaculty]);

  const filteredDefended = useMemo(() =>
    selectedFaculty === "all" ? allDefended : allDefended.filter(s => s.faculty_ar === selectedFaculty),
  [allDefended, selectedFaculty]);

  const kpi = useMemo(() => calculateKpi({
    totalRegistered: filteredRegistered.length + filteredDefended.length,
    totalDefended: filteredDefended.length,
    defendedStudents: filteredDefended.map(s => ({
      registration_count: (s as any).registration_count,
      first_registration_year: (s as any).first_registration_year,
      defense_date: (s as any).defense_date,
      scientific_council_date: (s as any).scientific_council_date,
      _type: s._type,
    })),
  }), [filteredRegistered, filteredDefended]);

  const avgRegYears = useMemo(() => {
    const calcAvg = (students: any[]) => {
      const valid = students.filter(s => s.registration_count).map(s => s.registration_count as number);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    };
    return {
      regLmd: calcAvg(filteredRegistered.filter(s => s._type === 'phd_lmd')),
      regScience: calcAvg(filteredRegistered.filter(s => s._type === 'phd_science')),
      regAll: calcAvg(filteredRegistered),
      defLmd: calcAvg(filteredDefended.filter(s => s._type === 'phd_lmd')),
      defScience: calcAvg(filteredDefended.filter(s => s._type === 'phd_science')),
      defAll: calcAvg(filteredDefended),
    };
  }, [filteredRegistered, filteredDefended]);

  const regTypeData = useMemo(() => [
    { name: "د.ل.م.د", value: filteredRegistered.filter(s => s._type === 'phd_lmd').length },
    { name: "د.علوم", value: filteredRegistered.filter(s => s._type === 'phd_science').length },
  ], [filteredRegistered]);

  const regStatusData = useMemo(() => {
    let regular = 0, delayed = 0;
    filteredRegistered.forEach(s => {
      const status = getRegistrationStatus((s as any).registration_count, s._type);
      if (status === 'regular') regular++; else if (status === 'delayed') delayed++;
    });
    return [{ name: "منتظم", value: regular }, { name: "متأخر", value: delayed }];
  }, [filteredRegistered]);

  const defTypeData = useMemo(() => [
    { name: "د.ل.م.د", value: filteredDefended.filter(s => s._type === 'phd_lmd').length },
    { name: "د.علوم", value: filteredDefended.filter(s => s._type === 'phd_science').length },
  ], [filteredDefended]);

  const defStatusData = useMemo(() => {
    let regular = 0, delayed = 0;
    filteredDefended.forEach(s => {
      const status = getRegistrationStatus((s as any).registration_count, s._type);
      if (status === 'regular') regular++; else if (status === 'delayed') delayed++;
    });
    return [{ name: "منتظم", value: regular }, { name: "متأخر", value: delayed }];
  }, [filteredDefended]);

  const adminActions = useMemo(() => {
    return filteredDefended
      .map(s => ({
        name: s.full_name_ar,
        type: s._type === 'phd_lmd' ? 'د.ل.م.د' : 'د.علوم',
        supervisor: (s as any).supervisor_ar || '',
        status: getRegistrationStatus((s as any).registration_count, s._type),
        councilDate: (s as any).scientific_council_date || '',
        defenseDate: (s as any).defense_date || '',
        processingTime: calcProcessingTime((s as any).scientific_council_date, (s as any).defense_date),
      }))
      .filter(s => s.processingTime !== null)
      .sort((a, b) => (b.processingTime?.totalDays || 0) - (a.processingTime?.totalDays || 0));
  }, [filteredDefended]);

  const extractTitle = (fullName: string) => {
    const trimmed = fullName.trim();
    for (const t of academicTitles) {
      if (trimmed.startsWith(t.abbreviation + " ") || trimmed.startsWith(t.abbreviation + ".") || trimmed.startsWith(t.abbreviation + "/")) {
        return { title: t.full_name, cleanName: trimmed.substring(t.abbreviation.length).replace(/^[.\s/]+/, "").trim() };
      }
    }
    return { title: "", cleanName: trimmed };
  };

  const juryStats = useMemo(() => {
    const map: Record<string, { name: string; title: string; supervisor: number; president: number; member: number; coSupervisor: number }> = {};
    const addEntry = (fullName: string, role: 'supervisor' | 'president' | 'member' | 'coSupervisor') => {
      if (!fullName?.trim()) return;
      const { title, cleanName } = extractTitle(fullName);
      const key = cleanName.toLowerCase();
      if (!map[key]) map[key] = { name: cleanName, title, supervisor: 0, president: 0, member: 0, coSupervisor: 0 };
      if (!map[key].title && title) map[key].title = title;
      map[key][role]++;
    };
    filteredDefended.forEach(s => {
      addEntry((s as any).supervisor_ar, 'supervisor');
      addEntry((s as any).co_supervisor_ar, 'coSupervisor');
      addEntry((s as any).jury_president_ar, 'president');
      ((s as any).jury_members_ar || '').split(JURY_SEPARATORS).forEach((m: string) => { if (m.trim()) addEntry(m.trim(), 'member'); });
    });
    return Object.values(map).map(v => ({ ...v, total: v.supervisor + v.president + v.member + v.coSupervisor })).sort((a, b) => b.total - a.total);
  }, [filteredDefended, academicTitles]);

  const englishTheses = useMemo(() => {
    return filteredDefended.filter(s => (s as any).thesis_language === 'english').map(s => ({
      name: s.full_name_ar, branch: (s as any).branch_ar || '', specialty: s.specialty_ar,
      supervisor: (s as any).supervisor_ar || '', thesisTitle: (s as any).thesis_title_ar || '',
      defenseDate: (s as any).defense_date || '',
    }));
  }, [filteredDefended]);

  const labStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDefended.forEach(s => { const lab = (s as any).research_lab_ar; if (lab) map[lab] = (map[lab] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [filteredDefended]);

  const assistantProfessors = useMemo(() => {
    return filteredDefended.filter(s => {
      const status = (s as any).employment_status || '';
      return status.includes('أستاذ مساعد') || status.includes('مساعد أ') || status.includes('مساعد ب');
    }).map(s => ({
      name: s.full_name_ar, branch: (s as any).branch_ar || '', specialty: s.specialty_ar,
      supervisor: (s as any).supervisor_ar || '', defenseDate: (s as any).defense_date || '',
      employmentStatus: (s as any).employment_status || '',
    }));
  }, [filteredDefended]);

  const strategicInsights = useMemo(() => {
    let delayedDef = 0, countedDef = 0;
    filteredDefended.forEach(s => {
      const st = getRegistrationStatus((s as any).registration_count, s._type);
      if (st === 'delayed') delayedDef++;
      if (st !== 'unknown') countedDef++;
    });
    return generateStrategicInsights({
      kpi,
      avgRegYearsLmd: avgRegYears.regLmd,
      avgRegYearsScience: avgRegYears.regScience,
      avgDefYearsLmd: avgRegYears.defLmd,
      avgDefYearsScience: avgRegYears.defScience,
      englishThesesCount: englishTheses.length,
      assistantProfessorsCount: assistantProfessors.length,
      delayedDefendedPercent: countedDef > 0 ? (delayedDef / countedDef) * 100 : 0,
    });
  }, [kpi, avgRegYears, filteredDefended, englishTheses, assistantProfessors]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return toWesternNumerals(`${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
    } catch { return d; }
  };

  const regLmdCount = filteredRegistered.filter(s => s._type === 'phd_lmd').length;
  const regSciCount = filteredRegistered.filter(s => s._type === 'phd_science').length;
  const defLmdCount = filteredDefended.filter(s => s._type === 'phd_lmd').length;
  const defSciCount = filteredDefended.filter(s => s._type === 'phd_science').length;

  // Build export data for any faculty
  const buildExportData = (faculty?: string): ReportExportData => {
    const reg = faculty ? allRegistered.filter(s => s.faculty_ar === faculty) : allRegistered;
    const def = faculty ? allDefended.filter(s => s.faculty_ar === faculty) : allDefended;
    const calcAvg = (students: any[]) => {
      const valid = students.filter(s => s.registration_count).map(s => s.registration_count as number);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    };
    const rLmd = reg.filter(s => s._type === 'phd_lmd');
    const rSci = reg.filter(s => s._type === 'phd_science');
    const dLmd = def.filter(s => s._type === 'phd_lmd');
    const dSci = def.filter(s => s._type === 'phd_science');
    const kpiData = calculateKpi({
      totalRegistered: reg.length + def.length, totalDefended: def.length,
      defendedStudents: def.map(s => ({ registration_count: (s as any).registration_count, first_registration_year: (s as any).first_registration_year, defense_date: (s as any).defense_date, scientific_council_date: (s as any).scientific_council_date, _type: s._type })),
    });
    const adminActs = def.map(s => ({ name: s.full_name_ar, type: s._type === 'phd_lmd' ? 'د.ل.م.د' : 'د.علوم', supervisor: (s as any).supervisor_ar || '', status: getRegistrationStatus((s as any).registration_count, s._type), councilDate: (s as any).scientific_council_date || '', defenseDate: (s as any).defense_date || '', processingTime: calcProcessingTime((s as any).scientific_council_date, (s as any).defense_date) })).filter(s => s.processingTime !== null).sort((a, b) => (b.processingTime?.totalDays || 0) - (a.processingTime?.totalDays || 0));
    const juryMap: Record<string, any> = {};
    const addJ = (fn: string, role: string) => { if (!fn?.trim()) return; const { title, cleanName } = extractTitle(fn); const k = cleanName.toLowerCase(); if (!juryMap[k]) juryMap[k] = { name: cleanName, title, supervisor: 0, president: 0, member: 0, coSupervisor: 0 }; if (!juryMap[k].title && title) juryMap[k].title = title; juryMap[k][role]++; };
    def.forEach(s => { addJ((s as any).supervisor_ar, 'supervisor'); addJ((s as any).co_supervisor_ar, 'coSupervisor'); addJ((s as any).jury_president_ar, 'president'); ((s as any).jury_members_ar || '').split(JURY_SEPARATORS).forEach((m: string) => { if (m.trim()) addJ(m.trim(), 'member'); }); });
    const juryStatsD = Object.values(juryMap).map((v: any) => ({ ...v, total: v.supervisor + v.president + v.member + v.coSupervisor })).sort((a: any, b: any) => b.total - a.total);
    const engT = def.filter(s => (s as any).thesis_language === 'english').map(s => ({ name: s.full_name_ar, branch: (s as any).branch_ar || '', specialty: s.specialty_ar, supervisor: (s as any).supervisor_ar || '', thesisTitle: (s as any).thesis_title_ar || '', defenseDate: (s as any).defense_date || '' }));
    const labM: Record<string, number> = {}; def.forEach(s => { const lab = (s as any).research_lab_ar; if (lab) labM[lab] = (labM[lab] || 0) + 1; });
    const labS = Object.entries(labM).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
    const assistP = def.filter(s => { const st = (s as any).employment_status || ''; return st.includes('أستاذ مساعد') || st.includes('مساعد أ') || st.includes('مساعد ب'); }).map(s => ({ name: s.full_name_ar, branch: (s as any).branch_ar || '', specialty: s.specialty_ar, supervisor: (s as any).supervisor_ar || '', defenseDate: (s as any).defense_date || '', employmentStatus: (s as any).employment_status || '' }));
    // Generate insights for this dataset
    let delayedD = 0, countedD = 0;
    def.forEach(s => { const st = getRegistrationStatus((s as any).registration_count, s._type); if (st === 'delayed') delayedD++; if (st !== 'unknown') countedD++; });
    const insightsData = generateStrategicInsights({
      kpi: kpiData,
      avgRegYearsLmd: calcAvg(rLmd), avgRegYearsScience: calcAvg(rSci),
      avgDefYearsLmd: calcAvg(dLmd), avgDefYearsScience: calcAvg(dSci),
      englishThesesCount: engT.length, assistantProfessorsCount: assistP.length,
      delayedDefendedPercent: countedD > 0 ? (delayedD / countedD) * 100 : 0,
    });
    return { facultyName: faculty, kpi: kpiData, registeredCount: reg.length, defendedCount: def.length, registeredLmd: rLmd.length, registeredScience: rSci.length, defendedLmd: dLmd.length, defendedScience: dSci.length, avgRegAll: calcAvg(reg), avgRegLmd: calcAvg(rLmd), avgRegScience: calcAvg(rSci), avgDefAll: calcAvg(def), avgDefLmd: calcAvg(dLmd), avgDefScience: calcAvg(dSci), registeredStudents: reg, defendedStudents: def, adminActions: adminActs, juryStats: juryStatsD, englishTheses: engT, labStats: labS, assistantProfessors: assistP, insights: insightsData };
  };

  return (
    <div className="space-y-6 w-full" dir="rtl">
      {/* Header */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <ReportHeader facultyName={selectedFaculty !== "all" ? selectedFaculty : undefined} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-foreground">تصفية حسب الكلية:</label>
        <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الكليات</SelectItem>
            {faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="mr-auto">
          <ExportReportPdfDialog
            currentData={buildExportData(selectedFaculty !== "all" ? selectedFaculty : undefined)}
            faculties={faculties}
            buildExportData={buildExportData}
          />
        </div>
      </div>

      {/* مؤشر الأداء + لوحة المؤشرات */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-row-reverse items-start gap-6 mb-6">
            {/* شرح المعايير على اليمين */}
            <div className="flex-1 space-y-3">
              <h3 className="text-sm font-bold text-foreground mb-3">شرح المعايير الفرعية:</h3>
              <KpiCriteriaCard
                value={kpi.flowEffectiveness}
                weight="30%"
                title="معيار الفعالية التدفقية"
                description="يقيس نسبة الطلبة الذين ناقشوا فعلياً مقارنة بإجمالي المسجلين."
                formula="(عدد المناقشين ÷ إجمالي المسجلين) × 100"
              />
              <KpiCriteriaCard
                value={kpi.speedOfAchievement}
                weight="25%"
                title="معيار سرعة الإنجاز"
                description="يعتمد على عدد السنوات من أول تسجيل حتى المناقشة."
                formula="تشجيع الالتزام بالمدة القانونية"
              />
              <KpiCriteriaCard
                value={kpi.timeQuality}
                weight="25%"
                title="معيار الجودة الزمنية"
                description="يفاضل بين المناقشين في وضعية نظامي والمتأخرين."
                formula="(عدد النظاميين ÷ إجمالي المناقشين) × 100"
              />
              <KpiCriteriaCard
                value={kpi.administrativeEffectiveness}
                weight="20%"
                title="معيار الفعالية الإدارية"
                description="يقيس كفاءة معالجة الملفات بين الإيداع والمناقشة."
                formula="أقل من 3 أشهر: 100 | 3-6 أشهر: 70 | أكثر: 40"
              />
            </div>
            {/* دائرة المؤشر على اليسار */}
            <div className="flex-shrink-0">
              <KpiGauge value={kpi.general} label="مؤشر الأداء العام" size={180} />
            </div>
          </div>

          {/* التشخيص الاستراتيجي */}
          {strategicInsights.length > 0 && (
            <div className="border-t pt-5 mb-5">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                التشخيص وتحليل النتائج
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {strategicInsights.map((insight, i) => (
                  <InsightCardUI key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              لوحة المؤشرات المختصرة
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardCard title="عدد المسجلين في الدكتوراه" icon={<Users className="h-4 w-4" />} items={[{ label: "الإجمالي", value: filteredRegistered.length }, { label: "ل.م.د", value: regLmdCount }, { label: "علوم", value: regSciCount }]} />
              <DashboardCard title="متوسط سنوات التسجيل (المسجلين)" icon={<Clock className="h-4 w-4" />} items={[{ label: "المتوسط العام", value: avgRegYears.regAll.toFixed(1) }, { label: "ل.م.د", value: avgRegYears.regLmd.toFixed(1) }, { label: "علوم", value: avgRegYears.regScience.toFixed(1) }]} />
              <DashboardCard title="عدد المناقشين" icon={<GraduationCap className="h-4 w-4" />} items={[{ label: "الإجمالي", value: filteredDefended.length }, { label: "ل.م.د", value: defLmdCount }, { label: "علوم", value: defSciCount }]} />
              <DashboardCard title="متوسط مدة التسجيل (المناقشين)" icon={<TrendingUp className="h-4 w-4" />} items={[{ label: "المتوسط العام", value: avgRegYears.defAll.toFixed(1) }, { label: "ل.م.د", value: avgRegYears.defLmd.toFixed(1) }, { label: "علوم", value: avgRegYears.defScience.toFixed(1) }]} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أولا: المسجلين */}
      <SectionHeader title="أولا: إحصائيات عامة حول الطلبة المسجلين حاليا" icon={<Users className="h-5 w-5" />} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                      <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">الاسم واللقب</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">الشعبة</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">التخصص</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">نوع الدكتوراه</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">سنة أول تسجيل</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">حالة التسجيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistered.map((s, i) => {
                      const status = getRegistrationStatus((s as any).registration_count, s._type);
                      return (
                        <TableRow key={s.id || i} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                          <TableCell className="text-xs py-2.5 font-medium">{s.full_name_ar}</TableCell>
                          <TableCell className="text-xs py-2.5">{(s as any).branch_ar || '-'}</TableCell>
                          <TableCell className="text-xs py-2.5">{s.specialty_ar}</TableCell>
                          <TableCell className="text-center text-xs py-2.5">{s._type === 'phd_lmd' ? 'د.ل.م.د' : 'د.علوم'}</TableCell>
                          <TableCell className="text-center text-xs py-2.5">{(s as any).first_registration_year ? toWesternNumerals((s as any).first_registration_year) : '-'}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <Badge variant={status === 'regular' ? 'default' : status === 'delayed' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {status === 'regular' ? 'منتظم' : status === 'delayed' ? 'متأخر' : '-'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <MiniPieChart title="توزيع النوع" data={regTypeData} />
          <MiniPieChart title="حالة التسجيل" data={regStatusData} useStatusColors />
        </div>
      </div>

      {/* ثانيا: المناقشين */}
      <SectionHeader title="ثانيا: إحصائيات عامة حول الطلبة المناقشين" icon={<GraduationCap className="h-5 w-5" />} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                      <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">الاسم واللقب</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">الشعبة</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">التخصص</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">نوع الدكتوراه</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">حالة التسجيل</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">تاريخ المناقشة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDefended.map((s, i) => {
                      const status = getRegistrationStatus((s as any).registration_count, s._type);
                      return (
                        <TableRow key={s.id || i} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                          <TableCell className="text-xs py-2.5 font-medium">{s.full_name_ar}</TableCell>
                          <TableCell className="text-xs py-2.5">{(s as any).branch_ar || '-'}</TableCell>
                          <TableCell className="text-xs py-2.5">{s.specialty_ar}</TableCell>
                          <TableCell className="text-center text-xs py-2.5">{s._type === 'phd_lmd' ? 'د.ل.م.د' : 'د.علوم'}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <Badge variant={status === 'regular' ? 'default' : status === 'delayed' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {status === 'regular' ? 'منتظم' : status === 'delayed' ? 'متأخر' : '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs py-2.5">{(s as any).defense_date ? formatDate((s as any).defense_date) : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <MiniPieChart title="توزيع النوع" data={defTypeData} />
          <MiniPieChart title="حالة التسجيل" data={defStatusData} useStatusColors />
        </div>
      </div>

      {/* إحصائيات العضوية */}
      <SectionHeader title="إحصائيات العضوية (مشرف/مشرف مساعد/رئيس لجنة/عضو لجنة)" icon={<UserCheck className="h-5 w-5" />} />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {juryStats.length > 0 ? (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                    <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground">الاسم واللقب</TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground">الرتبة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">مشرف</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">مشرف مساعد</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">رئيس لجنة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">عضو لجنة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">المجموع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {juryStats.map((s, i) => (
                    <TableRow key={i} className="hover:bg-muted/30 border-b border-border/50">
                      <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                      <TableCell className="text-xs py-2.5 font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs py-2.5">{s.title}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.supervisor > 0 ? toWesternNumerals(s.supervisor) : '-'}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : '-'}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.president > 0 ? toWesternNumerals(s.president) : '-'}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.member > 0 ? toWesternNumerals(s.member) : '-'}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <Badge variant="outline" className="bg-primary/10 text-primary text-xs">{toWesternNumerals(s.total)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>

      {/* ثالثا: الإجراءات الإدارية */}
      <SectionHeader title="ثالثا: الإجراءات الإدارية" icon={<FileText className="h-5 w-5" />} />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {adminActions.length > 0 ? (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                    <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground">الاسم واللقب</TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground">المشرف</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">النوع</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">الحالة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">تاريخ المصادقة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">تاريخ المناقشة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-foreground">مدة المعالجة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminActions.map((s, i) => (
                    <TableRow key={i} className="hover:bg-muted/30 border-b border-border/50">
                      <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                      <TableCell className="text-xs py-2.5 font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs py-2.5">{s.supervisor}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.type}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <Badge variant={s.status === 'regular' ? 'default' : 'destructive'} className="text-[10px]">
                          {s.status === 'regular' ? 'منتظم' : s.status === 'delayed' ? 'متأخر' : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.councilDate ? formatDate(s.councilDate) : '-'}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.defenseDate ? formatDate(s.defenseDate) : '-'}</TableCell>
                      <TableCell className="text-center text-xs py-2.5 font-medium">
                        {s.processingTime ? `${toWesternNumerals(s.processingTime.months)} شهر ${toWesternNumerals(s.processingTime.days)} يوم` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات للإجراءات الإدارية</div>
          )}
        </CardContent>
      </Card>

      {/* رابعا: المناقشات بالإنجليزية */}
      <SectionHeader title="رابعا: المناقشات باللغة الإنجليزية" icon={<Globe className="h-5 w-5" />} />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {englishTheses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                  <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">الاسم واللقب</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">الشعبة</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">التخصص</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">المشرف</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">عنوان الأطروحة</TableHead>
                  <TableHead className="text-center text-xs font-bold text-foreground">تاريخ المناقشة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {englishTheses.map((s, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                    <TableCell className="text-xs py-2.5 font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.branch}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.specialty}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.supervisor}</TableCell>
                    <TableCell className="text-xs py-2.5 max-w-[250px] truncate">{s.thesisTitle}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{s.defenseDate ? formatDate(s.defenseDate) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد مناقشات باللغة الإنجليزية</div>
          )}
        </CardContent>
      </Card>

      {/* خامسا: المخابر */}
      <SectionHeader title="خامسا: عدد المناقشات حسب مخابر البحث" icon={<FlaskConical className="h-5 w-5" />} />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {labStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                  <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">مخبر البحث</TableHead>
                  <TableHead className="text-center text-xs font-bold text-foreground">عدد المناقشين</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labStats.map((s, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                    <TableCell className="text-xs py-2.5 font-medium">{s.name}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <Badge variant="outline" className="bg-primary/10 text-primary text-xs">{toWesternNumerals(s.count)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>

      {/* سادسا: الأساتذة المساعدين */}
      <SectionHeader title="سادسا: الأساتذة المساعدين المناقشين" icon={<Award className="h-5 w-5" />} />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {assistantProfessors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                  <TableHead className="text-right text-xs font-bold text-foreground">#</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">الاسم واللقب</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">الحالة الوظيفية</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">الشعبة</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">التخصص</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">المشرف</TableHead>
                  <TableHead className="text-center text-xs font-bold text-foreground">تاريخ المناقشة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assistantProfessors.map((s, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="text-xs py-2.5">{toWesternNumerals(i + 1)}</TableCell>
                    <TableCell className="text-xs py-2.5 font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.employmentStatus}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.branch}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.specialty}</TableCell>
                    <TableCell className="text-xs py-2.5">{s.supervisor}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{s.defenseDate ? formatDate(s.defenseDate) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────────────

function SubKpiCard({ value, label, weight }: { value: number; label: string; weight: string }) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-3 text-center">
        <div className="text-lg font-bold text-primary">{toWesternNumerals(Math.round(value))}%</div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        <Badge variant="outline" className="mt-1 text-[10px]">{weight}</Badge>
      </CardContent>
    </Card>
  );
}

function DashboardCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: { label: string; value: number | string }[] }) {
  return (
    <Card className="border-primary/10">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2 text-primary">
          {icon}
          <span className="text-xs font-bold leading-tight">{title}</span>
        </div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-bold text-foreground">{typeof item.value === 'number' ? toWesternNumerals(item.value) : toWesternNumerals(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCriteriaCard({ value, weight, title, description, formula }: { value: number; weight: string; title: string; description: string; formula: string }) {
  const color = value >= 80 ? "text-green-600" : value >= 50 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex-shrink-0 text-center min-w-[50px]">
        <div className={`text-lg font-bold ${color}`}>{toWesternNumerals(Math.round(value))}%</div>
        <Badge variant="outline" className="text-[10px]">{weight}</Badge>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{formula}</p>
      </div>
    </div>
  );
}

function MiniPieChart({ title, data, useStatusColors }: { title: string; data: { name: string; value: number }[]; useStatusColors?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value"
              label={({ name, value }) => `${name}: ${toWesternNumerals(value)}`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={useStatusColors ? (i === 0 ? STATUS_COLORS.regular : STATUS_COLORS.delayed) : COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: number) => toWesternNumerals(val)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function InsightCardUI({ insight }: { insight: InsightCard }) {
  const config = {
    warning: { icon: <AlertTriangle className="h-4 w-4" />, bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", iconColor: "text-red-600", titleColor: "text-red-700 dark:text-red-400" },
    success: { icon: <CheckCircle2 className="h-4 w-4" />, bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", iconColor: "text-green-600", titleColor: "text-green-700 dark:text-green-400" },
    info: { icon: <Info className="h-4 w-4" />, bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", iconColor: "text-blue-600", titleColor: "text-blue-700 dark:text-blue-400" },
    strategy: { icon: <Brain className="h-4 w-4" />, bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", iconColor: "text-purple-600", titleColor: "text-purple-700 dark:text-purple-400" },
    recommendation: { icon: <Lightbulb className="h-4 w-4" />, bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", iconColor: "text-amber-600", titleColor: "text-amber-700 dark:text-amber-400" },
  }[insight.type];

  return (
    <div className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-2">
        <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${config.titleColor}`}>{insight.title}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  );
}
