import { useState, useEffect, useRef } from "react";
import { Search, User, GraduationCap, Award, Scale, ChevronLeft, Loader2, X, Users, BookOpen, Gavel } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useDataExplorer, getProfessorRelations, SearchResult } from "@/hooks/useDataExplorer";

const TYPE_CONFIG = {
  professor: { icon: User, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  phd_student: { icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  defense_student: { icon: Scale, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  certificate: { icon: Award, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

function ProfessorDetailsPanel({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfessorRelations(result.name).then((data) => {
      setRelations(data);
      setLoading(false);
    });
  }, [result.name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{result.name}</h2>
          <p className="text-sm text-muted-foreground">{result.details}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="students" dir="rtl">
          <TabsList className="w-full">
            <TabsTrigger value="students" className="flex-1 gap-1">
              <Users className="h-4 w-4" />
              الطلاب ({relations?.supervisedStudents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex-1 gap-1">
              <Award className="h-4 w-4" />
              الشهادات ({relations?.supervisedCertificates?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="jury" className="flex-1 gap-1">
              <Gavel className="h-4 w-4" />
              اللجان ({relations?.juryParticipation?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <ScrollArea className="h-[500px]">
              {relations?.supervisedStudents?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>
              ) : (
                <div className="space-y-2">
                  {relations?.supervisedStudents?.map((s: any, i: number) => (
                    <Card key={i} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{s.full_name_ar}</p>
                          <p className="text-sm text-muted-foreground">{s.specialty_ar} — {s.branch_ar}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {s._source?.includes("lmd") ? "ل.م.د" : "علوم"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="certificates">
            <ScrollArea className="h-[500px]">
              {relations?.supervisedCertificates?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>
              ) : (
                <div className="space-y-2">
                  {relations?.supervisedCertificates?.map((s: any, i: number) => (
                    <Card key={i} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{s.full_name_ar}</p>
                          <p className="text-sm text-muted-foreground">{s.specialty_ar} — تاريخ المناقشة: {s.defense_date}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {s._source?.includes("master") ? "ماستر" : s._source?.includes("lmd") ? "ل.م.د" : "علوم"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="jury">
            <ScrollArea className="h-[500px]">
              {relations?.juryParticipation?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>
              ) : (
                <div className="space-y-2">
                  {relations?.juryParticipation?.map((s: any, i: number) => (
                    <Card key={i} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{s.full_name_ar}</p>
                          <p className="text-sm text-muted-foreground">
                            {s.jury_president_ar?.includes(result.name) ? "رئيس اللجنة" : "عضو اللجنة"} — {s.specialty_ar}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {s._source?.includes("master") ? "ماستر" : s._source?.includes("lmd") ? "ل.م.د" : "علوم"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function RecordDetailsPanel({ result, onBack }: { result: SearchResult; onBack: () => void }) {
  const raw = result.raw;
  const fieldLabels: Record<string, string> = {
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
  };

  const hiddenFields = ["id", "created_at", "updated_at", "raw", "_source"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{result.name}</h2>
          <Badge className={TYPE_CONFIG[result.type]?.badge}>{result.typeLabel}</Badge>
        </div>
      </div>
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(raw)
            .filter(([key]) => !hiddenFields.includes(key) && raw[key] != null && raw[key] !== "")
            .map(([key, value]) => (
              <div key={key} className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">{fieldLabels[key] || key}</p>
                <p className="text-sm font-medium break-words">{String(value)}</p>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}

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

  const handleClear = () => {
    setSearchInput("");
    search("");
    setSelectedResult(null);
  };

  if (selectedResult) {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        {selectedResult.type === "professor" ? (
          <ProfessorDetailsPanel result={selectedResult} onBack={() => setSelectedResult(null)} />
        ) : (
          <RecordDetailsPanel result={selectedResult} onBack={() => setSelectedResult(null)} />
        )}
      </div>
    );
  }

  const renderGroup = (title: string, items: SearchResult[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          <span>{title}</span>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="space-y-1.5">
          {items.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <Card
                key={`${item.type}-${item.id}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedResult(item)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="ابحث بالاسم، رقم التسجيل، اسم المشرف..."
          value={searchInput}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pr-10 pl-10 h-12 text-base"
          dir="rtl"
        />
        {searchInput && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="mr-2 text-muted-foreground">جارٍ البحث...</span>
        </div>
      )}

      {/* Results */}
      {!loading && query && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            تم العثور على <span className="font-bold text-foreground">{totalResults}</span> نتيجة
          </p>

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

      {/* Empty State */}
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
