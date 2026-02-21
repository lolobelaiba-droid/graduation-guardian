import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiGauge } from "@/components/reports/KpiGauge";
import { SectionHeader } from "@/components/reports/SectionHeader";
import { toWesternNumerals } from "@/lib/numerals";
import { Shuffle, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

const JURY_SEPARATORS = /\s*[-–—]\s*|[،,;]\s*|\n/;

interface DefendedStudent {
  full_name_ar: string;
  supervisor_ar?: string;
  co_supervisor_ar?: string;
  jury_president_ar?: string;
  jury_members_ar?: string;
  defense_date?: string;
}

interface JuryDiversitySectionProps {
  filteredDefended: DefendedStudent[];
  extractTitle: (fullName: string) => { title: string; cleanName: string };
  formatDate: (d: string) => string;
}

interface RecurringPattern {
  juryKey: string;
  juryNames: string[];
  students: {
    name: string;
    supervisor: string;
    coSupervisor: string;
    president: string;
    members: string[];
    invited: string[];
  }[];
}

function cleanName(fullName: string, extractTitle: (s: string) => { cleanName: string }) {
  const cleaned = fullName.replace(/\s*\(مدعو\)\s*$/, '').trim();
  return extractTitle(cleaned).cleanName.toLowerCase();
}

export function JuryDiversitySection({ filteredDefended, extractTitle, formatDate }: JuryDiversitySectionProps) {
  // 1. Calculate Similarity Index
  const { similarityIndex, totalSeats, uniqueProfessors, diversityPercent } = useMemo(() => {
    const allSeats: string[] = [];
    const uniqueSet = new Set<string>();

    filteredDefended.forEach(s => {
      // President
      const president = (s as any).jury_president_ar || '';
      if (president.trim()) {
        const pClean = cleanName(president, extractTitle);
        allSeats.push(pClean);
        uniqueSet.add(pClean);
      }

      // Members (excluding supervisor/co-supervisor, including invited as examiners)
      const supLower = cleanName((s as any).supervisor_ar || '', extractTitle);
      const coSupLower = cleanName((s as any).co_supervisor_ar || '', extractTitle);

      ((s as any).jury_members_ar || '').split(JURY_SEPARATORS).forEach((m: string) => {
        const mTrimmed = m.trim();
        if (!mTrimmed) return;
        const mClean = cleanName(mTrimmed, extractTitle);
        // Exclude supervisor and co-supervisor
        if (supLower && mClean === supLower) return;
        if (coSupLower && mClean === coSupLower) return;
        allSeats.push(mClean);
        uniqueSet.add(mClean);
      });
    });

    const total = allSeats.length;
    const unique = uniqueSet.size;
    const diversity = total > 0 ? (unique / total) * 100 : 100;
    const similarity = 100 - diversity;

    return {
      similarityIndex: Math.round(similarity * 10) / 10,
      totalSeats: total,
      uniqueProfessors: unique,
      diversityPercent: Math.round(diversity * 10) / 10,
    };
  }, [filteredDefended, extractTitle]);

  // 2. Find recurring jury patterns (exact same president + examiners)
  const recurringPatterns = useMemo(() => {
    const juryMap: Record<string, RecurringPattern> = {};

    filteredDefended.forEach(s => {
      const president = (s as any).jury_president_ar || '';
      const supLower = cleanName((s as any).supervisor_ar || '', extractTitle);
      const coSupLower = cleanName((s as any).co_supervisor_ar || '', extractTitle);

      // Collect jury members (excluding supervisor/co-supervisor)
      const members: string[] = [];
      const invited: string[] = [];
      ((s as any).jury_members_ar || '').split(JURY_SEPARATORS).forEach((m: string) => {
        const mTrimmed = m.trim();
        if (!mTrimmed) return;
        const mClean = cleanName(mTrimmed, extractTitle);
        if (supLower && mClean === supLower) return;
        if (coSupLower && mClean === coSupLower) return;
        const isInvited = mTrimmed.includes('(مدعو)');
        if (isInvited) {
          invited.push(mTrimmed.replace(/\s*\(مدعو\)\s*$/, '').trim());
        } else {
          members.push(mTrimmed);
        }
      });

      // Build a key from president + sorted examiners (normalized)
      const presidentClean = cleanName(president, extractTitle);
      const memberKeys = members.map(m => cleanName(m, extractTitle)).sort();
      const juryKey = [presidentClean, ...memberKeys].join('|');

      if (!juryMap[juryKey]) {
        juryMap[juryKey] = {
          juryKey,
          juryNames: [president.trim(), ...members],
          students: [],
        };
      }

      juryMap[juryKey].students.push({
        name: s.full_name_ar,
        supervisor: (s as any).supervisor_ar || '',
        coSupervisor: (s as any).co_supervisor_ar || '',
        president: president.trim(),
        members,
        invited,
      });
    });

    // Only keep patterns with more than 1 student
    return Object.values(juryMap)
      .filter(p => p.students.length > 1)
      .sort((a, b) => b.students.length - a.students.length);
  }, [filteredDefended, extractTitle]);

  // Gauge color
  const gaugeColor = useMemo(() => {
    if (similarityIndex > 40) return "hsl(var(--destructive))";
    if (similarityIndex > 25) return "hsl(45, 93%, 47%)";
    return "hsl(var(--chart-2))";
  }, [similarityIndex]);

  const maxMembers = useMemo(() => {
    let max = 0;
    recurringPatterns.forEach(p => {
      p.students.forEach(st => {
        if (st.members.length > max) max = st.members.length;
      });
    });
    return Math.max(max, 4);
  }, [recurringPatterns]);

  return (
    <>
      <div className="break-before-page" />
      <SectionHeader title="تحليل تنوع لجان المناقشة" icon={<Shuffle className="h-5 w-5" />} />

      {/* Similarity Index Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Gauge */}
            <div className="flex-shrink-0">
              <div className="relative" style={{ width: 200, height: 200 }}>
                <svg width={200} height={200} className="-rotate-90">
                  <circle cx={100} cy={100} r={80} fill="none" stroke="hsl(var(--muted))" strokeWidth={12} />
                  <circle
                    cx={100} cy={100} r={80} fill="none"
                    stroke={gaugeColor}
                    strokeWidth={12} strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 80}
                    strokeDashoffset={2 * Math.PI * 80 - (similarityIndex / 100) * 2 * Math.PI * 80}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
                    {toWesternNumerals(similarityIndex)}%
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">مؤشر التشابه</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{toWesternNumerals(totalSeats)}</div>
                  <div className="text-xs text-muted-foreground mt-1">إجمالي المقاعد</div>
                  <div className="text-[10px] text-muted-foreground/70">(رئيس + ممتحنين)</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{toWesternNumerals(uniqueProfessors)}</div>
                  <div className="text-xs text-muted-foreground mt-1">أساتذة فريدين</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: gaugeColor }}>{toWesternNumerals(diversityPercent)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">نسبة التنوع</div>
                </div>
              </div>

              {/* Interpretation */}
              <div className={`rounded-lg border p-3 flex items-start gap-2 ${
                similarityIndex > 40
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  : similarityIndex > 25
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              }`}>
                {similarityIndex > 40 ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                ) : similarityIndex > 25 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-bold">
                    {similarityIndex > 40
                      ? 'مؤشر تشابه مرتفع — تركّز ملحوظ في تشكيلة اللجان'
                      : similarityIndex > 25
                        ? 'مؤشر تشابه متوسط — يمكن تحسين التنوع'
                        : 'مؤشر تشابه منخفض — توزيع عادل للمهام العلمية'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {similarityIndex > 40
                      ? 'يُوصى بتوسيع قاعدة الأساتذة المشاركين في لجان المناقشة لضمان التنوع الأكاديمي والعدالة في توزيع المهام.'
                      : similarityIndex > 25
                        ? 'التنوع مقبول لكن يمكن تحسينه عبر إشراك أساتذة جدد من تخصصات وجامعات مختلفة.'
                        : 'اللجان تتميز بتنوع جيد في تشكيلتها، مما يعكس توزيعاً عادلاً ومتوازناً للمسؤوليات العلمية.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Patterns */}
      {recurringPatterns.length > 0 && (
        <>
          <Card className="shadow-sm mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                الأنماط المتكررة في تشكيلة اللجان
                <Badge variant="outline" className="mr-2 text-xs">{toWesternNumerals(recurringPatterns.length)} نمط</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-0">
              {recurringPatterns.map((pattern, pi) => (
                <div key={pi} className={`${pi > 0 ? 'border-t-2 border-primary/20' : ''}`}>
                  {/* Pattern header */}
                  <div className="bg-gradient-to-l from-primary/5 to-primary/10 px-4 py-3 flex items-center gap-3 flex-wrap">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      {toWesternNumerals(pattern.students.length)} طلبة
                    </Badge>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs font-bold text-foreground">اللجنة:</span>
                      {pattern.juryNames.map((name, ni) => (
                        <Badge key={ni} variant="outline" className="text-[10px] bg-background">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Students table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-right text-[10px] font-bold text-foreground whitespace-nowrap min-w-[120px]">الطالب</TableHead>
                          <TableHead className="text-right text-[10px] font-bold text-foreground whitespace-nowrap min-w-[100px]">المشرف</TableHead>
                          <TableHead className="text-right text-[10px] font-bold text-foreground whitespace-nowrap min-w-[100px]">م.مساعد</TableHead>
                          <TableHead className="text-center text-[10px] font-bold text-foreground whitespace-nowrap min-w-[100px]">رئيس اللجنة</TableHead>
                          {Array.from({ length: maxMembers }, (_, i) => (
                            <TableHead key={i} className="text-center text-[10px] font-bold text-foreground whitespace-nowrap min-w-[100px]">
                              ممتحن {toWesternNumerals(i + 1)}
                            </TableHead>
                          ))}
                          <TableHead className="text-center text-[10px] font-bold text-foreground whitespace-nowrap min-w-[100px]">مدعو</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pattern.students.map((st, si) => (
                          <TableRow key={si} className="hover:bg-muted/30 border-b border-border/30">
                            <TableCell className="text-xs py-2 font-medium">{st.name}</TableCell>
                            <TableCell className="text-xs py-2">{st.supervisor || '-'}</TableCell>
                            <TableCell className="text-xs py-2">{st.coSupervisor || '-'}</TableCell>
                            <TableCell className="text-center text-xs py-2">{st.president || '-'}</TableCell>
                            {Array.from({ length: maxMembers }, (_, i) => (
                              <TableCell key={i} className="text-center text-xs py-2">
                                {st.members[i] || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center text-xs py-2">{st.invited.length > 0 ? st.invited.join('، ') : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {recurringPatterns.length === 0 && (
        <Card className="shadow-sm mt-6">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد أنماط متكررة — كل لجنة مناقشة فريدة في تشكيلتها</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
