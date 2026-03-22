import { useMemo } from "react";
import { BarChart3, Users, GraduationCap, Building2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = [
  "hsl(210, 80%, 55%)", "hsl(150, 60%, 45%)", "hsl(40, 90%, 55%)", "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)", "hsl(180, 60%, 45%)", "hsl(320, 60%, 55%)", "hsl(60, 80%, 45%)",
];

function countBy(data: any[], field: string): { name: string; count: number }[] {
  const map = new Map<string, number>();
  data.forEach(r => {
    const v = r[field];
    if (v && typeof v === "string" && v.trim()) {
      const key = v.trim();
      map.set(key, (map.get(key) || 0) + 1);
    }
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

interface Props {
  data: any[];
  isProfessors: boolean;
}

export function CollectionStats({ data, isProfessors }: Props) {
  const genderStats = useMemo(() => {
    if (isProfessors || !data.length) return [];
    return countBy(data, "gender").map(g => ({
      ...g, name: g.name === "male" ? "ذكر" : g.name === "female" ? "أنثى" : g.name,
    }));
  }, [data, isProfessors]);

  const primaryStats = useMemo(() => {
    if (!data.length) return [];
    return isProfessors ? countBy(data, "university").slice(0, 8) : countBy(data, "faculty_ar").slice(0, 8);
  }, [data, isProfessors]);

  const secondaryStats = useMemo(() => {
    if (!data.length) return [];
    return isProfessors ? countBy(data, "rank_label").slice(0, 8) : countBy(data, "specialty_ar").slice(0, 10);
  }, [data, isProfessors]);

  const supervisorStats = useMemo(() => {
    if (isProfessors || !data.length) return [];
    return countBy(data, "supervisor_ar").slice(0, 10);
  }, [data, isProfessors]);

  if (!data.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <span className="font-semibold">إحصائيات المجموعة</span>
        <Badge variant="secondary">{data.length} سجل</Badge>
      </div>
      <Tabs defaultValue="primary" dir="rtl">
        <TabsList className="h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="primary" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" />{isProfessors ? "الجامعة" : "الكلية"}
          </TabsTrigger>
          <TabsTrigger value="secondary" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GraduationCap className="h-3.5 w-3.5" />{isProfessors ? "الرتبة" : "التخصص"}
          </TabsTrigger>
          {!isProfessors && (
            <>
              <TabsTrigger value="supervisor" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserCheck className="h-3.5 w-3.5" />المشرف
              </TabsTrigger>
              <TabsTrigger value="gender" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-3.5 w-3.5" />الجنس
              </TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="primary">
          {primaryStats.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={primaryStats} layout="vertical" margin={{ right: 120, left: 10 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, "العدد"]} />
                  <Bar dataKey="count" fill="hsl(210, 80%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>}
        </TabsContent>
        <TabsContent value="secondary">
          {secondaryStats.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={secondaryStats} layout="vertical" margin={{ right: 120, left: 10 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, "العدد"]} />
                  <Bar dataKey="count" fill="hsl(150, 60%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>}
        </TabsContent>
        {!isProfessors && (
          <>
            <TabsContent value="supervisor">
              {supervisorStats.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supervisorStats} layout="vertical" margin={{ right: 130, left: 10 }}>
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v, "العدد"]} />
                      <Bar dataKey="count" fill="hsl(40, 90%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>}
            </TabsContent>
            <TabsContent value="gender">
              {genderStats.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name} (${count})`}>
                        {genderStats.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "العدد"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
