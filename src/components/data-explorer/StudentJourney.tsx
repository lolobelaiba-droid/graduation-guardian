import { useState, useEffect } from "react";
import { GraduationCap, Scale, Award, ChevronLeft, Loader2, CheckCircle2, Clock, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStudentRelations, SearchResult } from "@/hooks/useDataExplorer";

interface JourneyStage {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  records: any[];
  source: string;
}

export function StudentJourney({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStudentRelations(result.name, result.raw).then((data) => {
      setRelations(data);
      setLoading(false);
    });
  }, [result.name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground">جارٍ تحميل مسار الطالب...</p>
      </div>
    );
  }

  // Build journey stages
  const stages: JourneyStage[] = [
    {
      key: "registration",
      label: "مرحلة التسجيل",
      icon: GraduationCap,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      borderColor: "border-emerald-300 dark:border-emerald-700",
      records: [
        ...(relations?.studentRecords || []),
        ...(result.type === "phd_student" ? [{ ...result.raw, _source: result.sourceTable }] : []),
      ].filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i),
      source: "phd_students",
    },
    {
      key: "defense",
      label: "مرحلة طور المناقشة",
      icon: Scale,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      borderColor: "border-amber-300 dark:border-amber-700",
      records: [
        ...(relations?.defenseRecords || []),
        ...(result.type === "defense_student" ? [{ ...result.raw, _source: result.sourceTable }] : []),
      ].filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i),
      source: "defense_stage",
    },
    {
      key: "certificate",
      label: "مرحلة الشهادة",
      icon: Award,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      borderColor: "border-purple-300 dark:border-purple-700",
      records: [
        ...(relations?.certificates || []),
        ...(result.type === "certificate" ? [{ ...result.raw, _source: result.sourceTable }] : []),
      ].filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i),
      source: "certificates",
    },
  ];

  const activeStages = stages.filter(s => s.records.length > 0);
  const currentStageIndex = stages.findLastIndex(s => s.records.length > 0);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{result.name}</h2>
          <p className="text-sm text-muted-foreground">تتبع المسار الأكاديمي</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {stages.map((stage, idx) => {
          const isActive = stage.records.length > 0;
          const isCurrent = idx === currentStageIndex;
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? isCurrent
                    ? `${stage.bgColor} ${stage.color} ring-2 ring-offset-2 ring-current`
                    : `${stage.bgColor} ${stage.color}`
                  : "bg-muted text-muted-foreground"
              }`}>
                {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {stage.label}
              </div>
              {idx < stages.length - 1 && (
                <div className={`w-8 h-0.5 ${idx < currentStageIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="relative pr-8">
          {/* Vertical line */}
          <div className="absolute right-[15px] top-0 bottom-0 w-0.5 bg-border" />

          {stages.map((stage, stageIdx) => {
            const StageIcon = stage.icon;
            const isActive = stage.records.length > 0;
            return (
              <div key={stage.key} className="relative mb-8 last:mb-0">
                {/* Timeline dot */}
                <div className={`absolute right-0 w-[31px] h-[31px] rounded-full flex items-center justify-center z-10 border-2 ${
                  isActive ? `${stage.bgColor} ${stage.borderColor}` : "bg-muted border-muted-foreground/20"
                }`}>
                  <StageIcon className={`h-4 w-4 ${isActive ? stage.color : "text-muted-foreground"}`} />
                </div>

                {/* Content */}
                <div className="mr-12">
                  <h3 className={`text-sm font-bold mb-2 ${isActive ? stage.color : "text-muted-foreground"}`}>
                    {stage.label}
                  </h3>

                  {!isActive ? (
                    <Card className="p-4 border-dashed opacity-50">
                      <p className="text-sm text-muted-foreground text-center">لم يصل لهذه المرحلة بعد</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {stage.records.map((record, idx) => {
                        const sourceLabels: Record<string, string> = {
                          phd_lmd_students: "دكتوراه ل.م.د", phd_science_students: "دكتوراه علوم",
                          defense_stage_lmd: "مناقشة ل.م.د", defense_stage_science: "مناقشة علوم",
                          phd_lmd_certificates: "شهادة ل.م.د", phd_science_certificates: "شهادة علوم",
                          master_certificates: "شهادة ماستر",
                        };
                        return (
                          <Card key={record.id || idx} className={`p-4 border-r-4 ${stage.borderColor}`}>
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline" className="text-xs">{sourceLabels[record._source] || record._source}</Badge>
                              {record.stage_status && <Badge className="text-xs">{record.stage_status}</Badge>}
                              {record.mention && <Badge className="text-xs">{record.mention === "honorable" ? "مشرف" : "مشرف جداً"}</Badge>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {record.specialty_ar && (
                                <div><span className="text-muted-foreground">التخصص:</span> {record.specialty_ar}</div>
                              )}
                              {record.supervisor_ar && (
                                <div><span className="text-muted-foreground">المشرف:</span> {record.supervisor_ar}</div>
                              )}
                              {record.first_registration_year && (
                                <div><span className="text-muted-foreground">سنة التسجيل:</span> {record.first_registration_year}</div>
                              )}
                              {record.defense_date && (
                                <div><span className="text-muted-foreground">تاريخ المناقشة:</span> {record.defense_date}</div>
                              )}
                              {record.certificate_date && (
                                <div><span className="text-muted-foreground">تاريخ الشهادة:</span> {record.certificate_date}</div>
                              )}
                              {record.faculty_ar && (
                                <div><span className="text-muted-foreground">الكلية:</span> {record.faculty_ar}</div>
                              )}
                            </div>
                            {record.thesis_title_ar && (
                              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                <span className="font-medium">عنوان الأطروحة:</span> {record.thesis_title_ar}
                              </p>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Arrow between stages */}
                {stageIdx < stages.length - 1 && isActive && stages[stageIdx + 1].records.length > 0 && (
                  <div className="flex justify-center mr-12 my-2">
                    <ArrowDown className="h-5 w-5 text-primary animate-bounce" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
