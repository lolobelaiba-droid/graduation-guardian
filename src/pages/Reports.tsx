import { useState, useMemo } from "react";
import { Loader2, Users, GraduationCap, Clock, Award, BookOpen, Building, FlaskConical, UserCheck, FileText, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { usePhdLmdStudents, usePhdScienceStudents } from "@/hooks/usePhdStudents";
import { usePhdLmdCertificates, usePhdScienceCertificates } from "@/hooks/useCertificates";
import { toWesternNumerals } from "@/lib/numerals";
import { calculateKpi, calcProcessingTime, getRegistrationStatus } from "@/lib/kpi-calculator";
import { KpiGauge } from "@/components/reports/KpiGauge";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { SectionHeader } from "@/components/reports/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const STATUS_COLORS = { regular: "hsl(var(--chart-2))", delayed: "hsl(var(--destructive))" };

// Separators for jury members parsing
const JURY_SEPARATORS = /\s*[-–—]\s*|[،,;]\s*|\n/;

export default function Reports() {
  const [selectedFaculty, setSelectedFaculty] = useState<string>("all");

  // Fetch all data
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

  // Merge registered students
  const allRegistered = useMemo(() => [
    ...regLmd.map(s => ({ ...s, _type: "phd_lmd" as const })),
    ...regScience.map(s => ({ ...s, _type: "phd_science" as const })),
  ], [regLmd, regScience]);

  // Merge defended students
  const allDefended = useMemo(() => [
    ...defLmd.map(s => ({ ...s, _type: "phd_lmd" as const })),
    ...defScience.map(s => ({ ...s, _type: "phd_science" as const })),
  ], [defLmd, defScience]);

  // Available faculties
  const faculties = useMemo(() => {
    const set = new Set<string>();
    [...allRegistered, ...allDefended].forEach(s => { if (s.faculty_ar) set.add(s.faculty_ar); });
    return [...set].sort();
  }, [allRegistered, allDefended]);

  // Filter by faculty
  const filteredRegistered = useMemo(() =>
    selectedFaculty === "all" ? allRegistered : allRegistered.filter(s => s.faculty_ar === selectedFaculty),
  [allRegistered, selectedFaculty]);

  const filteredDefended = useMemo(() =>
    selectedFaculty === "all" ? allDefended : allDefended.filter(s => s.faculty_ar === selectedFaculty),
  [allDefended, selectedFaculty]);

  // KPI calculation
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

  // Average registration years
  const avgRegYears = useMemo(() => {
    const calcAvg = (students: any[]) => {
      const valid = students.filter(s => s.registration_count).map(s => s.registration_count as number);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    };
    const regLmdFiltered = filteredRegistered.filter(s => s._type === 'phd_lmd');
    const regSciFiltered = filteredRegistered.filter(s => s._type === 'phd_science');
    const defLmdFiltered = filteredDefended.filter(s => s._type === 'phd_lmd');
    const defSciFiltered = filteredDefended.filter(s => s._type === 'phd_science');
    return {
      regLmd: calcAvg(regLmdFiltered),
      regScience: calcAvg(regSciFiltered),
      regAll: calcAvg(filteredRegistered),
      defLmd: calcAvg(defLmdFiltered),
      defScience: calcAvg(defSciFiltered),
      defAll: calcAvg(filteredDefended),
    };
  }, [filteredRegistered, filteredDefended]);

  // Registered type distribution
  const regTypeData = useMemo(() => [
    { name: "د.ل.م.د", value: filteredRegistered.filter(s => s._type === 'phd_lmd').length },
    { name: "د.علوم", value: filteredRegistered.filter(s => s._type === 'phd_science').length },
  ], [filteredRegistered]);

  // Registered status distribution
  const regStatusData = useMemo(() => {
    let regular = 0, delayed = 0;
    filteredRegistered.forEach(s => {
      const status = getRegistrationStatus((s as any).registration_count, s._type);
      if (status === 'regular') regular++;
      else if (status === 'delayed') delayed++;
    });
    return [
      { name: "منتظم", value: regular },
      { name: "متأخر", value: delayed },
    ];
  }, [filteredRegistered]);

  // Defended type distribution
  const defTypeData = useMemo(() => [
    { name: "د.ل.م.د", value: filteredDefended.filter(s => s._type === 'phd_lmd').length },
    { name: "د.علوم", value: filteredDefended.filter(s => s._type === 'phd_science').length },
  ], [filteredDefended]);

  // Defended status distribution
  const defStatusData = useMemo(() => {
    let regular = 0, delayed = 0;
    filteredDefended.forEach(s => {
      const status = getRegistrationStatus((s as any).registration_count, s._type);
      if (status === 'regular') regular++;
      else if (status === 'delayed') delayed++;
    });
    return [
      { name: "منتظم", value: regular },
      { name: "متأخر", value: delayed },
    ];
  }, [filteredDefended]);

  // Faculty bar chart data for defended
  const facultyBarData = useMemo(() => {
    const map: Record<string, { lmd: number; science: number }> = {};
    filteredDefended.forEach(s => {
      const fac = s.faculty_ar || "غير محدد";
      if (!map[fac]) map[fac] = { lmd: 0, science: 0 };
      if (s._type === 'phd_lmd') map[fac].lmd++;
      else map[fac].science++;
    });
    return Object.entries(map).map(([name, v]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, lmd: v.lmd, science: v.science }));
  }, [filteredDefended]);

  // Administrative Actions table (sorted by processing time desc)
  const adminActions = useMemo(() => {
    return filteredDefended
      .map(s => {
        const pt = calcProcessingTime((s as any).scientific_council_date, (s as any).defense_date);
        return {
          name: s.full_name_ar,
          type: s._type === 'phd_lmd' ? 'د.ل.م.د' : 'د.علوم',
          supervisor: (s as any).supervisor_ar || '',
          status: getRegistrationStatus((s as any).registration_count, s._type),
          councilDate: (s as any).scientific_council_date || '',
          defenseDate: (s as any).defense_date || '',
          processingTime: pt,
        };
      })
      .filter(s => s.processingTime !== null)
      .sort((a, b) => (b.processingTime?.totalDays || 0) - (a.processingTime?.totalDays || 0));
  }, [filteredDefended]);

  // Jury/Membership statistics
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
      if (!fullName || !fullName.trim()) return;
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
      
      const members = ((s as any).jury_members_ar || '').split(JURY_SEPARATORS);
      members.forEach((m: string) => {
        if (m.trim()) addEntry(m.trim(), 'member');
      });
    });

    return Object.values(map)
      .map(v => ({ ...v, total: v.supervisor + v.president + v.member + v.coSupervisor }))
      .sort((a, b) => b.total - a.total);
  }, [filteredDefended, academicTitles]);

  // English thesis defenses
  const englishTheses = useMemo(() => {
    return filteredDefended.filter(s => (s as any).thesis_language === 'english').map(s => ({
      name: s.full_name_ar,
      branch: (s as any).branch_ar || '',
      specialty: s.specialty_ar,
      supervisor: (s as any).supervisor_ar || '',
      thesisTitle: (s as any).thesis_title_ar || '',
      defenseDate: (s as any).defense_date || '',
    }));
  }, [filteredDefended]);

  // Lab statistics
  const labStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDefended.forEach(s => {
      const lab = (s as any).research_lab_ar;
      if (lab) map[lab] = (map[lab] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [filteredDefended]);

  // Assistant professors who defended
  const assistantProfessors = useMemo(() => {
    return filteredDefended.filter(s => {
      const status = (s as any).employment_status || '';
      return status.includes('أستاذ مساعد') || status.includes('مساعد أ') || status.includes('مساعد ب');
    }).map(s => ({
      name: s.full_name_ar,
      branch: (s as any).branch_ar || '',
      specialty: s.specialty_ar,
      supervisor: (s as any).supervisor_ar || '',
      defenseDate: (s as any).defense_date || '',
      employmentStatus: (s as any).employment_status || '',
    }));
  }, [filteredDefended]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Official Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <ReportHeader facultyName={selectedFaculty !== "all" ? selectedFaculty : undefined} />
        </CardContent>
      </Card>

      {/* Faculty Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">تصفية حسب الكلية:</label>
        <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الكليات</SelectItem>
            {faculties.map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Dashboard */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Central KPI Gauge */}
            <div className="flex-shrink-0">
              <KpiGauge value={kpi.general} label="مؤشر الأداء العام" size={200} />
            </div>

            {/* Sub-KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <Card className="border-primary/20">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-primary">{toWesternNumerals(Math.round(kpi.flowEffectiveness))}%</div>
                  <p className="text-xs text-muted-foreground mt-1">الفعالية التدفقية</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">30%</Badge>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-primary">{toWesternNumerals(Math.round(kpi.speedOfAchievement))}%</div>
                  <p className="text-xs text-muted-foreground mt-1">سرعة الإنجاز</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">25%</Badge>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-primary">{toWesternNumerals(Math.round(kpi.timeQuality))}%</div>
                  <p className="text-xs text-muted-foreground mt-1">الجودة الزمنية</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">25%</Badge>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-primary">{toWesternNumerals(Math.round(kpi.administrativeEffectiveness))}%</div>
                  <p className="text-xs text-muted-foreground mt-1">الفعالية الإدارية</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">20%</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <StatMini icon={<Users className="h-4 w-4" />} label="إجمالي المسجلين" value={filteredRegistered.length} />
              <StatMini icon={<GraduationCap className="h-4 w-4" />} label="إجمالي المناقشين" value={filteredDefended.length} />
              <StatMini icon={<Clock className="h-4 w-4" />} label="متوسط سنوات (مسجلين)" value={avgRegYears.regAll.toFixed(1)} />
              <StatMini icon={<Clock className="h-4 w-4" />} label="متوسط سنوات (مناقشين)" value={avgRegYears.defAll.toFixed(1)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1 & 2: Registered & Defended Students */}
      <Tabs defaultValue="registered" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registered">
            <Users className="h-4 w-4 ml-2" />
            الطلبة المسجلين ({toWesternNumerals(filteredRegistered.length)})
          </TabsTrigger>
          <TabsTrigger value="defended">
            <GraduationCap className="h-4 w-4 ml-2" />
            الطلبة المناقشين ({toWesternNumerals(filteredDefended.length)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registered">
          <StudentSection
            students={filteredRegistered}
            typeData={regTypeData}
            statusData={regStatusData}
            showDefenseDate={false}
          />
        </TabsContent>

        <TabsContent value="defended">
          <StudentSection
            students={filteredDefended}
            typeData={defTypeData}
            statusData={defStatusData}
            showDefenseDate={true}
            facultyBarData={facultyBarData}
          />
        </TabsContent>
      </Tabs>

      {/* Section 3: Administrative Actions */}
      {adminActions.length > 0 && (
        <>
          <SectionHeader title="الإجراءات الإدارية" icon={<FileText className="h-5 w-5" />} />
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right font-semibold text-xs">#</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الاسم</TableHead>
                      <TableHead className="text-center font-semibold text-xs">النوع</TableHead>
                      <TableHead className="text-right font-semibold text-xs">المشرف</TableHead>
                      <TableHead className="text-center font-semibold text-xs">الحالة</TableHead>
                      <TableHead className="text-center font-semibold text-xs">تاريخ المصادقة</TableHead>
                      <TableHead className="text-center font-semibold text-xs">تاريخ المناقشة</TableHead>
                      <TableHead className="text-center font-semibold text-xs">مدة المعالجة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminActions.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{toWesternNumerals(i + 1)}</TableCell>
                        <TableCell className="text-xs font-medium">{s.name}</TableCell>
                        <TableCell className="text-center text-xs">{s.type}</TableCell>
                        <TableCell className="text-xs">{s.supervisor}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={s.status === 'regular' ? 'default' : 'destructive'} className="text-[10px]">
                            {s.status === 'regular' ? 'منتظم' : s.status === 'delayed' ? 'متأخر' : '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs">{s.councilDate ? toWesternNumerals(new Date(s.councilDate).toLocaleDateString('ar-EG-u-nu-latn')) : '-'}</TableCell>
                        <TableCell className="text-center text-xs">{s.defenseDate ? toWesternNumerals(new Date(s.defenseDate).toLocaleDateString('ar-EG-u-nu-latn')) : '-'}</TableCell>
                        <TableCell className="text-center text-xs font-medium">
                          {s.processingTime ? `${toWesternNumerals(s.processingTime.months)} شهر ${toWesternNumerals(s.processingTime.days)} يوم` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Section 4: Jury Statistics */}
      {juryStats.length > 0 && (
        <>
          <SectionHeader title="إحصائيات العضوية" icon={<UserCheck className="h-5 w-5" />} />
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right font-semibold text-xs">#</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الاسم واللقب</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الرتبة</TableHead>
                      <TableHead className="text-center font-semibold text-xs">مشرف</TableHead>
                      <TableHead className="text-center font-semibold text-xs">مشرف مساعد</TableHead>
                      <TableHead className="text-center font-semibold text-xs">رئيس لجنة</TableHead>
                      <TableHead className="text-center font-semibold text-xs">عضو لجنة</TableHead>
                      <TableHead className="text-center font-semibold text-xs">المجموع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {juryStats.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{toWesternNumerals(i + 1)}</TableCell>
                        <TableCell className="text-xs font-medium">{s.name}</TableCell>
                        <TableCell className="text-xs">{s.title}</TableCell>
                        <TableCell className="text-center text-xs">{s.supervisor > 0 ? toWesternNumerals(s.supervisor) : '-'}</TableCell>
                        <TableCell className="text-center text-xs">{s.coSupervisor > 0 ? toWesternNumerals(s.coSupervisor) : '-'}</TableCell>
                        <TableCell className="text-center text-xs">{s.president > 0 ? toWesternNumerals(s.president) : '-'}</TableCell>
                        <TableCell className="text-center text-xs">{s.member > 0 ? toWesternNumerals(s.member) : '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                            {toWesternNumerals(s.total)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Section 5: English Thesis Defenses */}
      {englishTheses.length > 0 && (
        <>
          <SectionHeader title="المناقشات باللغة الإنجليزية" icon={<Globe className="h-5 w-5" />} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-semibold text-xs">#</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الاسم</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الشعبة</TableHead>
                    <TableHead className="text-right font-semibold text-xs">التخصص</TableHead>
                    <TableHead className="text-right font-semibold text-xs">المشرف</TableHead>
                    <TableHead className="text-right font-semibold text-xs">عنوان الأطروحة</TableHead>
                    <TableHead className="text-center font-semibold text-xs">تاريخ المناقشة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {englishTheses.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{toWesternNumerals(i + 1)}</TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs">{s.branch}</TableCell>
                      <TableCell className="text-xs">{s.specialty}</TableCell>
                      <TableCell className="text-xs">{s.supervisor}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{s.thesisTitle}</TableCell>
                      <TableCell className="text-center text-xs">{s.defenseDate ? toWesternNumerals(new Date(s.defenseDate).toLocaleDateString('ar-EG-u-nu-latn')) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Section 6: Lab Statistics */}
      {labStats.length > 0 && (
        <>
          <SectionHeader title="عدد المناقشات حسب مخابر البحث" icon={<FlaskConical className="h-5 w-5" />} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-semibold text-xs">#</TableHead>
                    <TableHead className="text-right font-semibold text-xs">مخبر البحث</TableHead>
                    <TableHead className="text-center font-semibold text-xs">عدد المناقشين</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labStats.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{toWesternNumerals(i + 1)}</TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {toWesternNumerals(s.count)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Section 7: Assistant Professors who Defended */}
      {assistantProfessors.length > 0 && (
        <>
          <SectionHeader title="الأساتذة المساعدين المناقشين" icon={<Award className="h-5 w-5" />} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-semibold text-xs">#</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الاسم</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الحالة الوظيفية</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الشعبة</TableHead>
                    <TableHead className="text-right font-semibold text-xs">التخصص</TableHead>
                    <TableHead className="text-right font-semibold text-xs">المشرف</TableHead>
                    <TableHead className="text-center font-semibold text-xs">تاريخ المناقشة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assistantProfessors.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{toWesternNumerals(i + 1)}</TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs">{s.employmentStatus}</TableCell>
                      <TableCell className="text-xs">{s.branch}</TableCell>
                      <TableCell className="text-xs">{s.specialty}</TableCell>
                      <TableCell className="text-xs">{s.supervisor}</TableCell>
                      <TableCell className="text-center text-xs">{s.defenseDate ? toWesternNumerals(new Date(s.defenseDate).toLocaleDateString('ar-EG-u-nu-latn')) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Mini stat card component
function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
      <div className="text-primary">{icon}</div>
      <div>
        <div className="text-base font-bold text-foreground">{typeof value === 'number' ? toWesternNumerals(value) : toWesternNumerals(value)}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      </div>
    </div>
  );
}

// Student section with table + charts side-by-side
function StudentSection({ students, typeData, statusData, showDefenseDate, facultyBarData }: {
  students: any[];
  typeData: { name: string; value: number }[];
  statusData: { name: string; value: number }[];
  showDefenseDate: boolean;
  facultyBarData?: { name: string; lmd: number; science: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      {/* Right side: Data table */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-semibold text-xs">#</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الاسم</TableHead>
                    <TableHead className="text-right font-semibold text-xs">الشعبة</TableHead>
                    <TableHead className="text-right font-semibold text-xs">التخصص</TableHead>
                    <TableHead className="text-center font-semibold text-xs">النوع</TableHead>
                    <TableHead className="text-center font-semibold text-xs">سنة أول تسجيل</TableHead>
                    <TableHead className="text-center font-semibold text-xs">الحالة</TableHead>
                    {showDefenseDate && <TableHead className="text-center font-semibold text-xs">تاريخ المناقشة</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.slice(0, 50).map((s, i) => {
                    const status = getRegistrationStatus(s.registration_count, s._type);
                    return (
                      <TableRow key={s.id || i}>
                        <TableCell className="text-xs">{toWesternNumerals(i + 1)}</TableCell>
                        <TableCell className="text-xs font-medium">{s.full_name_ar}</TableCell>
                        <TableCell className="text-xs">{s.branch_ar || '-'}</TableCell>
                        <TableCell className="text-xs">{s.specialty_ar}</TableCell>
                        <TableCell className="text-center text-xs">{s._type === 'phd_lmd' ? 'ل.م.د' : 'علوم'}</TableCell>
                        <TableCell className="text-center text-xs">{s.first_registration_year ? toWesternNumerals(s.first_registration_year) : '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={status === 'regular' ? 'default' : status === 'delayed' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {status === 'regular' ? 'منتظم' : status === 'delayed' ? 'متأخر' : '-'}
                          </Badge>
                        </TableCell>
                        {showDefenseDate && (
                          <TableCell className="text-center text-xs">
                            {s.defense_date ? toWesternNumerals(new Date(s.defense_date).toLocaleDateString('ar-EG-u-nu-latn')) : '-'}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {students.length > 50 && (
                    <TableRow>
                      <TableCell colSpan={showDefenseDate ? 8 : 7} className="text-center text-muted-foreground text-xs py-3">
                        ... و {toWesternNumerals(students.length - 50)} طالب آخر
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Left side: Charts */}
      <div className="space-y-4">
        {/* Type Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">توزيع النوع</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${toWesternNumerals(value)}`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number) => toWesternNumerals(val)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">حالة التسجيل</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${toWesternNumerals(value)}`}>
                  <Cell fill={STATUS_COLORS.regular} />
                  <Cell fill={STATUS_COLORS.delayed} />
                </Pie>
                <Tooltip formatter={(val: number) => toWesternNumerals(val)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faculty Bar Chart (defended only) */}
        {facultyBarData && facultyBarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">حسب الكلية</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={facultyBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip formatter={(val: number) => toWesternNumerals(val)} />
                  <Bar dataKey="lmd" name="ل.م.د" fill={COLORS[0]} stackId="a" />
                  <Bar dataKey="science" name="علوم" fill={COLORS[1]} stackId="a" />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
