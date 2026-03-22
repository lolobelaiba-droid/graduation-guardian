import { useState, useEffect, useRef } from "react";
import { Search, User, GraduationCap, Award, Scale, ChevronLeft, Loader2, X, Users, BookOpen, Gavel, FileText, Info, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataExplorer, getProfessorRelations, getStudentRelations, SearchResult } from "@/hooks/useDataExplorer";

const TYPE_CONFIG: Record<string, any> = {
  professor: { icon: User, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  phd_student: { icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  defense_student: { icon: Scale, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  certificate: { icon: Award, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const FIELD_LABELS: Record<string, string> = {
  full_name_ar: "الاسم بالعربية", full_name_fr: "الاسم بالفرنسية",
  date_of_birth: "تاريخ الميلاد", birthplace_ar: "مكان الميلاد",
  gender: "الجنس", registration_number: "رقم التسجيل",
  student_number: "الرقم", faculty_ar: "الكلية",
  field_ar: "الميدان", branch_ar: "الفرع", specialty_ar: "التخصص",
  supervisor_ar: "المشرف", co_supervisor_ar: "المشرف المساعد",
  thesis_title_ar: "عنوان الأطروحة", defense_date: "تاريخ المناقشة",
  mention: "التقدير", stage_status: "الحالة",
  jury_president_ar: "رئيس اللجنة", jury_members_ar: "أعضاء اللجنة",
  university_ar: "الجامعة", research_lab_ar: "المخبر",
  full_name: "الاسم", rank_label: "الرتبة", university: "الجامعة",
  employment_status: "الحالة الوظيفية", registration_type: "نوع التسجيل",
  inscription_status: "حالة التسجيل", first_registration_year: "سنة أول تسجيل",
  certificate_date: "تاريخ الشهادة", current_year: "السنة الحالية",
  supervisor_university: "جامعة المشرف", co_supervisor_university: "جامعة المشرف المساعد",
  thesis_language: "لغة الأطروحة", phone_number: "الهاتف", professional_email: "البريد",
  province: "الولاية", registration_count: "عدد التسجيلات", notes: "ملاحظات",
  rank_abbreviation: "اختصار الرتبة",
};

const HIDDEN_FIELDS = ["id", "created_at", "updated_at", "_source", "_role"];

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const labels: Record<string, string> = {
    phd_lmd_students: "طلبة ل.م.د", phd_science_students: "طلبة علوم",
    defense_stage_lmd: "مناقشة ل.م.د", defense_stage_science: "مناقشة علوم",
    phd_lmd_certificates: "شهادة ل.م.د", phd_science_certificates: "شهادة علوم",
    master_certificates: "شهادة ماستر",
  };
  return <Badge variant="outline" className="text-xs">{labels[source] || source}</Badge>;
}

function FieldsGrid({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {Object.entries(data)
        .filter(([key, val]) => !HIDDEN_FIELDS.includes(key) && val != null && val !== "")
        .map(([key, value]) => (
          <div key={key} className="p-2.5 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-0.5">{FIELD_LABELS[key] || key}</p>
            <p className="text-sm font-medium break-words">{String(value)}</p>
          </div>
        ))}
    </div>
  );
}

function RelatedRecordCard({ record, onClick }: { record: any; onClick?: () => void }) {
  return (
    <Card className={`p-3 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{record.full_name_ar || record.full_name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {record.specialty_ar && `${record.specialty_ar}`}
            {record.defense_date && ` — ${record.defense_date}`}
            {record._role && ` — ${record._role}`}
            {record.rank_label && ` — ${record.rank_label}`}
          </p>
        </div>
        <SourceBadge source={record._source} />
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-muted-foreground py-8">{text}</p>;
}

function DetailHeader({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const config = TYPE_CONFIG[result.type];
  const Icon = config?.icon || Info;
  return (
    <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
      <div className={`p-2.5 rounded-lg ${config?.bg}`}><Icon className={`h-5 w-5 ${config?.color}`} /></div>
      <div>
        <h2 className="text-xl font-bold">{result.name}</h2>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge className={config?.badge}>{result.typeLabel}</Badge>
          {result.subType && <Badge variant="outline" className="text-xs">{result.subType}</Badge>}
        </div>
      </div>
    </div>
  );
}

// =================== PROFESSOR DETAILS ===================
function ProfessorDetailsPanel({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfessorRelations(result.name).then((data) => { setRelations(data); setLoading(false); });
  }, [result.name]);

  return (
    <div className="space-y-4">
      <DetailHeader result={result} onBack={onBack} />
      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Info className="h-4 w-4" />البيانات</TabsTrigger>
          <TabsTrigger value="students" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="h-4 w-4" />الطلاب ({loading ? "..." : relations?.supervisedStudents?.length || 0})</TabsTrigger>
          <TabsTrigger value="certificates" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Award className="h-4 w-4" />الشهادات ({loading ? "..." : relations?.supervisedCertificates?.length || 0})</TabsTrigger>
          <TabsTrigger value="jury" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Gavel className="h-4 w-4" />اللجان ({loading ? "..." : relations?.juryParticipation?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="info"><ScrollArea className="h-[500px]"><FieldsGrid data={result.raw} /></ScrollArea></TabsContent>
        <TabsContent value="students">
          <ScrollArea className="h-[500px]">
            {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8 text-muted-foreground" /> :
              relations?.supervisedStudents?.length === 0 ? <EmptyState text="لا توجد سجلات" /> :
                <div className="space-y-2">{relations.supervisedStudents.map((s: any, i: number) => <RelatedRecordCard key={i} record={s} />)}</div>}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="certificates">
          <ScrollArea className="h-[500px]">
            {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8 text-muted-foreground" /> :
              relations?.supervisedCertificates?.length === 0 ? <EmptyState text="لا توجد سجلات" /> :
                <div className="space-y-2">{relations.supervisedCertificates.map((s: any, i: number) => <RelatedRecordCard key={i} record={s} />)}</div>}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="jury">
          <ScrollArea className="h-[500px]">
            {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8 text-muted-foreground" /> :
              relations?.juryParticipation?.length === 0 ? <EmptyState text="لا توجد سجلات" /> :
                <div className="space-y-2">{relations.juryParticipation.map((s: any, i: number) => (
                  <Card key={i} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{s.full_name_ar}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.jury_president_ar?.includes(result.name) ? "رئيس اللجنة" : "عضو اللجنة"} — {s.specialty_ar}
                        </p>
                      </div>
                      <SourceBadge source={s._source} />
                    </div>
                  </Card>
                ))}</div>}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================== STUDENT / DEFENSE / CERTIFICATE DETAILS ===================
function EntityDetailsPanel({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStudentRelations(result.name, result.raw).then((data) => { setRelations(data); setLoading(false); });
  }, [result.name]);

  // Filter out current record from relations
  const filteredCerts = relations?.certificates?.filter((r: any) => r.id !== result.raw.id) || [];
  const filteredDefense = relations?.defenseRecords?.filter((r: any) => r.id !== result.raw.id) || [];
  const filteredStudents = relations?.studentRecords?.filter((r: any) => r.id !== result.raw.id) || [];
  const professors = relations?.relatedProfessors || [];

  const totalRelations = filteredCerts.length + filteredDefense.length + filteredStudents.length + professors.length;

  return (
    <div className="space-y-4">
      <DetailHeader result={result} onBack={onBack} />
      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="info" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Info className="h-4 w-4" />البيانات</TabsTrigger>
          <TabsTrigger value="relations" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Link2 className="h-4 w-4" />الارتباطات ({loading ? "..." : totalRelations})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ScrollArea className="h-[550px]"><FieldsGrid data={result.raw} /></ScrollArea>
        </TabsContent>

        <TabsContent value="relations">
          <ScrollArea className="h-[550px]">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : totalRelations === 0 ? (
              <EmptyState text="لا توجد ارتباطات مع سجلات أخرى" />
            ) : (
              <div className="space-y-5">
                {professors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                      <User className="h-4 w-4" /><span>الأساتذة المرتبطون</span>
                      <Badge variant="secondary" className="text-xs">{professors.length}</Badge>
                    </div>
                    <div className="space-y-2">{professors.map((p: any, i: number) => <RelatedRecordCard key={i} record={p} />)}</div>
                  </div>
                )}

                {filteredStudents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                      <GraduationCap className="h-4 w-4" /><span>سجلات الطالب</span>
                      <Badge variant="secondary" className="text-xs">{filteredStudents.length}</Badge>
                    </div>
                    <div className="space-y-2">{filteredStudents.map((s: any, i: number) => <RelatedRecordCard key={i} record={s} />)}</div>
                  </div>
                )}

                {filteredDefense.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                      <Scale className="h-4 w-4" /><span>سجلات طور المناقشة</span>
                      <Badge variant="secondary" className="text-xs">{filteredDefense.length}</Badge>
                    </div>
                    <div className="space-y-2">{filteredDefense.map((s: any, i: number) => <RelatedRecordCard key={i} record={s} />)}</div>
                  </div>
                )}

                {filteredCerts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                      <Award className="h-4 w-4" /><span>الشهادات المصدرة</span>
                      <Badge variant="secondary" className="text-xs">{filteredCerts.length}</Badge>
                    </div>
                    <div className="space-y-2">{filteredCerts.map((s: any, i: number) => <RelatedRecordCard key={i} record={s} />)}</div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================== MAIN PAGE ===================
export default function DataExplorer() {
  const { grouped, loading, query, search } = useDataExplorer();
  const [searchInput, setSearchInput] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const totalResults = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  const handleInputChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleClear = () => { setSearchInput(""); search(""); setSelectedResult(null); };

  if (selectedResult) {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        {selectedResult.type === "professor" ? (
          <ProfessorDetailsPanel result={selectedResult} onBack={() => setSelectedResult(null)} />
        ) : (
          <EntityDetailsPanel result={selectedResult} onBack={() => setSelectedResult(null)} />
        )}
      </div>
    );
  }

  const renderGroup = (title: string, items: SearchResult[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}<span>{title}</span><Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="space-y-1.5">
          {items.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <Card key={`${item.type}-${item.id}-${item.sourceTable}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedResult(item)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}><Icon className={`h-4 w-4 ${config.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                  </div>
                  <Badge className={`${config.badge} text-xs shrink-0`}>{item.typeLabel}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مستعرض البيانات</h1>
        <p className="text-muted-foreground text-sm">ابحث عن أي طالب أو أستاذ أو شهادة واكتشف جميع الارتباطات</p>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="ابحث بالاسم، رقم التسجيل، اسم المشرف..." value={searchInput} onChange={(e) => handleInputChange(e.target.value)} className="pr-10 pl-10 h-12 text-base" dir="rtl" />
        {searchInput && (
          <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleClear}><X className="h-4 w-4" /></Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="mr-2 text-muted-foreground">جارٍ البحث...</span>
        </div>
      )}

      {!loading && query && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">تم العثور على <span className="font-bold text-foreground">{totalResults}</span> نتيجة</p>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6">
              {renderGroup("الأساتذة", grouped.professors, <User className="h-4 w-4" />)}
              {renderGroup("طلبة الدكتوراه", grouped.students, <GraduationCap className="h-4 w-4" />)}
              {renderGroup("طور المناقشة", grouped.defense, <Scale className="h-4 w-4" />)}
              {renderGroup("الشهادات", grouped.certificates, <Award className="h-4 w-4" />)}
            </div>
          </ScrollArea>
          {totalResults === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">لم يتم العثور على نتائج لـ "{query}"</p>
            </div>
          )}
        </div>
      )}

      {!loading && !query && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">ابدأ بكتابة اسم أو رقم للبحث</p>
          <p className="text-sm text-muted-foreground/60 mt-1">يمكنك البحث في جميع قواعد البيانات في آن واحد</p>
        </div>
      )}
    </div>
  );
}
