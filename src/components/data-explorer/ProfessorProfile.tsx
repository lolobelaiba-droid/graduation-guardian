import { useState, useEffect } from "react";
import { User, Users, Award, Gavel, ChevronLeft, Loader2, BarChart3, Building2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfessorRelations, SearchResult } from "@/hooks/useDataExplorer";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SpecialtyBreakdown({ records, label }: { records: any[]; label: string }) {
  const specialties: Record<string, number> = {};
  records.forEach(r => {
    const spec = r.specialty_ar || "غير محدد";
    specialties[spec] = (specialties[spec] || 0) + 1;
  });
  const sorted = Object.entries(specialties).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  const max = sorted[0][1];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {sorted.map(([spec, count]) => (
          <div key={spec} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate">{spec}</span>
              <Badge variant="secondary" className="text-xs shrink-0 mr-2">{count}</Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FacultyBreakdown({ records }: { records: any[] }) {
  const faculties: Record<string, number> = {};
  records.forEach(r => {
    const fac = r.faculty_ar || "غير محدد";
    faculties[fac] = (faculties[fac] || 0) + 1;
  });
  const sorted = Object.entries(faculties).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع حسب الكلية</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {sorted.map(([fac, count]) => (
            <div key={fac} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{fac}</span>
              </div>
              <Badge variant="outline" className="text-xs">{count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordsList({ records, emptyText }: { records: any[]; emptyText: string }) {
  if (records.length === 0) return <p className="text-center text-muted-foreground py-8">{emptyText}</p>;
  const sourceLabels: Record<string, string> = {
    phd_lmd_students: "ل.م.د", phd_science_students: "علوم",
    defense_stage_lmd: "مناقشة ل.م.د", defense_stage_science: "مناقشة علوم",
    phd_lmd_certificates: "شهادة ل.م.د", phd_science_certificates: "شهادة علوم",
    master_certificates: "شهادة ماستر",
  };
  return (
    <div className="space-y-2">
      {records.map((r, i) => (
        <Card key={i} className="p-3">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{r.full_name_ar || r.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.specialty_ar && `${r.specialty_ar}`}
                {r.defense_date && ` — ${r.defense_date}`}
                {r.faculty_ar && ` — ${r.faculty_ar}`}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">{sourceLabels[r._source] || r._source}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ProfessorProfile({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfessorRelations(result.name).then((data) => {
      setRelations(data);
      setLoading(false);
    });
  }, [result.name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground">جارٍ تحميل ملف الأستاذ...</p>
      </div>
    );
  }

  const students = relations?.supervisedStudents || [];
  const certificates = relations?.supervisedCertificates || [];
  const jury = relations?.juryParticipation || [];
  const allRecords = [...students, ...certificates, ...jury];
  const totalActivity = students.length + certificates.length + jury.length;

  // Role analysis
  const juryAsPresident = jury.filter((r: any) => r.jury_president_ar?.includes(result.name)).length;
  const juryAsMember = jury.length - juryAsPresident;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{result.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {result.raw.rank_label && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{String(result.raw.rank_label)}</Badge>}
            {result.raw.university && <Badge variant="outline" className="text-xs">{String(result.raw.university)}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="طلاب تحت الإشراف" value={students.length} icon={Users} color="bg-emerald-50 dark:bg-emerald-950 text-emerald-600" />
        <StatCard label="شهادات مصدرة" value={certificates.length} icon={Award} color="bg-purple-50 dark:bg-purple-950 text-purple-600" />
        <StatCard label="رئيس لجنة" value={juryAsPresident} icon={Gavel} color="bg-amber-50 dark:bg-amber-950 text-amber-600" />
        <StatCard label="عضو لجنة" value={juryAsMember} icon={BookOpen} color="bg-blue-50 dark:bg-blue-950 text-blue-600" />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="students" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" />الطلاب ({students.length})
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Award className="h-4 w-4" />الشهادات ({certificates.length})
          </TabsTrigger>
          <TabsTrigger value="jury" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gavel className="h-4 w-4" />اللجان ({jury.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SpecialtyBreakdown records={allRecords} label="التخصصات" />
              <FacultyBreakdown records={allRecords} />
              {/* Year distribution */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">ملخص النشاط</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-emerald-600">{students.length}</p>
                      <p className="text-xs text-muted-foreground">إجمالي الإشراف</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-purple-600">{certificates.length}</p>
                      <p className="text-xs text-muted-foreground">شهادات مصدرة</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-amber-600">{jury.length}</p>
                      <p className="text-xs text-muted-foreground">مشاركات في اللجان</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="students">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <RecordsList records={students} emptyText="لا يوجد طلاب تحت إشراف هذا الأستاذ" />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="certificates">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <RecordsList records={certificates} emptyText="لا توجد شهادات مرتبطة" />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="jury">
          <ScrollArea className="h-[calc(100vh-450px)]">
            {jury.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد مشاركات في لجان</p>
            ) : (
              <div className="space-y-2">
                {jury.map((r: any, i: number) => (
                  <Card key={i} className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{r.full_name_ar}</p>
                        <p className="text-xs text-muted-foreground">
                          <Badge variant={r.jury_president_ar?.includes(result.name) ? "default" : "secondary"} className="text-xs ml-2">
                            {r.jury_president_ar?.includes(result.name) ? "رئيس اللجنة" : "عضو"}
                          </Badge>
                          {r.specialty_ar && ` ${r.specialty_ar}`}
                          {r.defense_date && ` — ${r.defense_date}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {r._source?.includes("lmd") ? "ل.م.د" : r._source?.includes("science") ? "علوم" : r._source?.includes("master") ? "ماستر" : ""}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
