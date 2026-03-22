import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, User, GraduationCap, Award, Scale, ChevronLeft, Loader2, X, Users, BookOpen, Gavel, FileText, Info, Link2, Download, Database, Table2, Route, Network, UserCircle, Star, StarOff, Clock, Trash2, Printer, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Bookmark, Filter, GitCompare, Copy, BarChart3, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataExplorer, getProfessorRelations, getStudentRelations, SearchResult, COLLECTIONS, fetchCollection } from "@/hooks/useDataExplorer";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { CustomExportDialog } from "@/components/data-explorer/CustomExportDialog";
import { RecordPrintCard } from "@/components/data-explorer/RecordPrintCard";
import { AdvancedFilters } from "@/components/data-explorer/AdvancedFilters";
import { CollectionStats } from "@/components/data-explorer/CollectionStats";
import { RecordComparison } from "@/components/data-explorer/RecordComparison";
import { DuplicateDetector } from "@/components/data-explorer/DuplicateDetector";
import { QuickEditDialog } from "@/components/data-explorer/QuickEditDialog";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { StudentJourney } from "@/components/data-explorer/StudentJourney";
import { ProfessorProfile } from "@/components/data-explorer/ProfessorProfile";
import { RelationshipNetwork } from "@/components/data-explorer/RelationshipNetwork";

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
  rank_abbreviation: "اختصار الرتبة", birthplace_fr: "مكان الميلاد بالفرنسية",
  faculty_fr: "الكلية بالفرنسية", field_fr: "الميدان بالفرنسية",
  branch_fr: "الفرع بالفرنسية", specialty_fr: "التخصص بالفرنسية",
  thesis_title_fr: "عنوان الأطروحة بالفرنسية", university_fr: "الجامعة بالفرنسية",
  jury_president_fr: "رئيس اللجنة بالفرنسية", jury_members_fr: "أعضاء اللجنة بالفرنسية",
  scientific_council_date: "تاريخ المجلس العلمي", signature_title: "صفة الموقع",
  decision_number: "رقم القرار", decision_date: "تاريخ القرار",
  decree_accreditation: "مرسوم الاعتماد", decree_training: "مرسوم التكوين",
  auth_decision_number: "رقم قرار الترخيص", auth_decision_date: "تاريخ قرار الترخيص",
  dean_letter_number: "رقم رسالة العميد", dean_letter_date: "تاريخ رسالة العميد",
};

const HIDDEN_FIELDS = ["id", "created_at", "updated_at", "_source", "_role"];

// =================== EXPORT HELPER ===================
async function exportToExcel(data: any[], fileName: string) {
  if (!data || data.length === 0) { toast.error("لا توجد بيانات للتصدير"); return; }
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("البيانات");
    const allKeys = Array.from(new Set(data.flatMap(r => Object.keys(r)))).filter(k => !HIDDEN_FIELDS.includes(k));
    ws.columns = allKeys.map(k => ({ header: FIELD_LABELS[k] || k, key: k, width: 22 }));
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 28;
    data.forEach(record => {
      const row: any = {};
      allKeys.forEach(k => { row[k] = record[k] ?? ""; });
      ws.addRow(row);
    });
    ws.views = [{ rightToLeft: true, state: "normal" }];
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${fileName}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم التصدير بنجاح");
  } catch (err) {
    console.error("Export error:", err);
    toast.error("حدث خطأ أثناء التصدير");
  }
}

// =================== SHARED COMPONENTS ===================
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

function DetailHeader({ result, onBack, onPrint, onEdit }: { result: SearchResult; onBack: () => void; onPrint?: () => void; onEdit?: () => void }) {
  const config = TYPE_CONFIG[result.type];
  const Icon = config?.icon || Info;
  return (
    <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
      <div className={`p-2.5 rounded-lg ${config?.bg}`}><Icon className={`h-5 w-5 ${config?.color}`} /></div>
      <div className="flex-1">
        <h2 className="text-xl font-bold">{result.name}</h2>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge className={config?.badge}>{result.typeLabel}</Badge>
          {result.subType && <Badge variant="outline" className="text-xs">{result.subType}</Badge>}
        </div>
      </div>
      <div className="flex gap-1">
        {onEdit && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-4 w-4" />تصحيح
          </Button>
        )}
        {onPrint && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onPrint}>
            <Printer className="h-4 w-4" />بطاقة
          </Button>
        )}
      </div>
    </div>
  );
}

// =================== PROFESSOR DETAILS ===================
function ProfessorDetailsPanel({ result, onBack, onPrint, onEdit }: { result: SearchResult; onBack: () => void; onPrint: () => void; onEdit?: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfessorRelations(result.name).then((data) => { setRelations(data); setLoading(false); });
  }, [result.name]);

  return (
    <div className="space-y-4">
      <DetailHeader result={result} onBack={onBack} onPrint={onPrint} onEdit={onEdit} />
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

// =================== ENTITY DETAILS ===================
function EntityDetailsPanel({ result, onBack, onPrint }: { result: SearchResult; onBack: () => void; onPrint: () => void }) {
  const [relations, setRelations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStudentRelations(result.name, result.raw).then((data) => { setRelations(data); setLoading(false); });
  }, [result.name]);

  const filteredCerts = relations?.certificates?.filter((r: any) => r.id !== result.raw.id) || [];
  const filteredDefense = relations?.defenseRecords?.filter((r: any) => r.id !== result.raw.id) || [];
  const filteredStudents = relations?.studentRecords?.filter((r: any) => r.id !== result.raw.id) || [];
  const professors = relations?.relatedProfessors || [];
  const totalRelations = filteredCerts.length + filteredDefense.length + filteredStudents.length + professors.length;

  return (
    <div className="space-y-4">
      <DetailHeader result={result} onBack={onBack} onPrint={onPrint} />
      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="info" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Info className="h-4 w-4" />البيانات</TabsTrigger>
          <TabsTrigger value="relations" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Link2 className="h-4 w-4" />الارتباطات ({loading ? "..." : totalRelations})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info"><ScrollArea className="h-[550px]"><FieldsGrid data={result.raw} /></ScrollArea></TabsContent>
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

// =================== RAW COLLECTION BROWSER ===================
type SortDir = "asc" | "desc" | null;
interface SortConfig { field: string; dir: "asc" | "desc"; }

function CollectionBrowser() {
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sorts, setSorts] = useState<SortConfig[]>([]);
  const [customExportOpen, setCustomExportOpen] = useState(false);

  const loadCollection = useCallback(async (table: string) => {
    if (!table) return;
    setSelectedTable(table);
    setLoading(true);
    setFilterText("");
    setSorts([]);
    try {
      const result = await fetchCollection(table);
      setData(result);
    } catch (err) {
      console.error("Load error:", err);
      setData([]);
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  const collectionLabel = COLLECTIONS.find(c => c.table === selectedTable)?.label || "";
  const nameField = COLLECTIONS.find(c => c.table === selectedTable)?.nameField || "full_name_ar";
  const isProfessors = selectedTable === "professors";

  const columns = useMemo(() => {
    if (isProfessors) return [
      { key: nameField, label: "الاسم" },
      { key: "rank_label", label: "الرتبة" },
      { key: "university", label: "الجامعة" },
      { key: "faculty_ar", label: "الكلية" },
    ];
    return [
      { key: nameField, label: "الاسم" },
      { key: "specialty_ar", label: "التخصص" },
      { key: "supervisor_ar", label: "المشرف" },
      { key: "faculty_ar", label: "الكلية" },
    ];
  }, [isProfessors, nameField]);

  const toggleSort = (field: string) => {
    setSorts(prev => {
      const existing = prev.find(s => s.field === field);
      if (!existing) return [...prev, { field, dir: "asc" }];
      if (existing.dir === "asc") return prev.map(s => s.field === field ? { ...s, dir: "desc" as const } : s);
      return prev.filter(s => s.field !== field);
    });
  };

  const getSortIcon = (field: string) => {
    const s = sorts.find(s => s.field === field);
    if (!s) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    const idx = sorts.indexOf(s);
    return (
      <span className="flex items-center gap-0.5">
        {s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />}
        {sorts.length > 1 && <span className="text-[10px] text-primary font-bold">{idx + 1}</span>}
      </span>
    );
  };

  const filtered = useMemo(() => {
    let result = data;
    if (filterText) {
      result = result.filter(r => {
        const name = r[nameField] || r.full_name_ar || r.full_name || "";
        return String(name).toLowerCase().includes(filterText.toLowerCase());
      });
    }
    if (sorts.length > 0) {
      result = [...result].sort((a, b) => {
        for (const s of sorts) {
          const va = String(a[s.field] || "").toLowerCase();
          const vb = String(b[s.field] || "").toLowerCase();
          const cmp = va.localeCompare(vb, "ar");
          if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }
    return result;
  }, [data, filterText, sorts, nameField]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedTable} onValueChange={loadCollection}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="اختر قاعدة البيانات..." />
          </SelectTrigger>
          <SelectContent>
            {COLLECTIONS.map(c => (
              <SelectItem key={c.table} value={c.table}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data.length > 0 && (
          <>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="تصفية حسب الاسم..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pr-9" dir="rtl" />
            </div>
            <Button variant="outline" className="gap-2 shrink-0" onClick={() => exportToExcel(filtered, collectionLabel || "بيانات")}>
              <Download className="h-4 w-4" />تصدير Excel ({filtered.length})
            </Button>
            <Button variant="outline" className="gap-2 shrink-0" onClick={() => setCustomExportOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />تصدير مخصص
            </Button>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="mr-2 text-muted-foreground">جارٍ التحميل...</span>
        </div>
      )}

      {!loading && selectedTable && data.length === 0 && <EmptyState text="لا توجد بيانات في هذا الجدول" />}

      {!loading && data.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              إجمالي: <span className="font-bold text-foreground">{data.length}</span> سجل
              {filterText && filtered.length !== data.length && (
                <span> — عرض <span className="font-bold text-foreground">{filtered.length}</span></span>
              )}
            </p>
            {sorts.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setSorts([])}>
                <X className="h-3 w-3" />إزالة الترتيب
              </Button>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-right font-semibold">#</th>
                    {columns.map(col => (
                      <th key={col.key} className="p-2 text-right font-semibold cursor-pointer select-none hover:bg-muted/80 transition-colors" onClick={() => toggleSort(col.key)}>
                        <span className="flex items-center gap-1">
                          {col.label}
                          {getSortIcon(col.key)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr key={row.id || idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      {columns.map(col => (
                        <td key={col.key} className={`p-2 ${col.key === nameField ? "font-medium" : ""}`}>
                          {row[col.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </>
      )}

      {!loading && data.length > 0 && (
        <CollectionStats data={filtered} isProfessors={isProfessors} />
      )}

      {!loading && !selectedTable && (
        <div className="text-center py-16">
          <Database className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">اختر قاعدة بيانات لاستعراض محتوياتها</p>
        </div>
      )}

      <CustomExportDialog open={customExportOpen} onOpenChange={setCustomExportOpen} data={filtered} fileName={collectionLabel || "بيانات_مخصصة"} />
    </div>
  );
}

// =================== SEARCH HISTORY & BOOKMARKS PANEL ===================
function SearchHistoryPanel({ onSelect }: { onSelect: (query: string) => void }) {
  const { history, bookmarks, clearHistory, removeFromHistory, removeBookmark } = useSearchHistory();

  if (history.length === 0 && bookmarks.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">لا يوجد سجل بحث بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookmarks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">المفضلات</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bookmarks.map(b => (
              <Badge key={b.id} variant="secondary" className="cursor-pointer gap-1.5 py-1.5 px-3 hover:bg-accent transition-colors" onClick={() => onSelect(b.query)}>
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                {b.label}
                <button className="mr-1 hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeBookmark(b.id); }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">سجل البحث</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={clearHistory}>
              <Trash2 className="h-3 w-3" />مسح الكل
            </Button>
          </div>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors" onClick={() => onSelect(h.query)}>
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{h.query}</span>
                {h.resultCount !== undefined && (
                  <span className="text-xs text-muted-foreground">{h.resultCount} نتيجة</span>
                )}
                <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); removeFromHistory(h.query); }}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =================== MAIN PAGE ===================
export default function DataExplorer() {
  const { grouped, loading, query, search, results } = useDataExplorer();
  const { addToHistory, addBookmark, isBookmarked } = useSearchHistory();
  const [searchInput, setSearchInput] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "journey" | "profile">("list");
  const [activeTab, setActiveTab] = useState("search");
  const [printCardOpen, setPrintCardOpen] = useState(false);
  const [printCardResult, setPrintCardResult] = useState<SearchResult | null>(null);
  const [customExportOpen, setCustomExportOpen] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<SearchResult[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickEditRecord, setQuickEditRecord] = useState<{ raw: Record<string, unknown>; sourceTable: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const openQuickEdit = (raw: Record<string, unknown>, sourceTable: string) => {
    setQuickEditRecord({ raw, sourceTable });
    setQuickEditOpen(true);
  };

  const handleQuickEditSaved = () => {
    // Re-run search to refresh results
    if (query) search(query);
  };

  // Use filtered results when filters are active
  const displayResults = filteredResults.length > 0 || results.length === 0 ? filteredResults : results;
  const displayGrouped = useMemo(() => ({
    professors: displayResults.filter((r) => r.type === "professor"),
    students: displayResults.filter((r) => r.type === "phd_student"),
    defense: displayResults.filter((r) => r.type === "defense_student"),
    certificates: displayResults.filter((r) => r.type === "certificate"),
  }), [displayResults]);
  const totalResults = displayResults.length;

  // Save to history when results arrive
  useEffect(() => {
    if (query && !loading && results.length >= 0) {
      addToHistory(query, results.length);
    }
  }, [query, loading, results.length]);

  // Sync filtered results when results change
  useEffect(() => {
    setFilteredResults(results);
  }, [results]);

  const handleInputChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleClear = () => { setSearchInput(""); search(""); setSelectedResult(null); setViewMode("list"); setCompareMode(false); setCompareSelection([]); };
  const handleBack = () => { setViewMode("list"); };

  const toggleCompareSelect = (item: SearchResult) => {
    setCompareSelection(prev => {
      const exists = prev.find(r => r.id === item.id && r.sourceTable === item.sourceTable);
      if (exists) return prev.filter(r => !(r.id === item.id && r.sourceTable === item.sourceTable));
      if (prev.length >= 2) return [prev[1], item];
      return [...prev, item];
    });
  };

  const handleHistorySelect = (q: string) => {
    setSearchInput(q);
    search(q);
  };

  const openPrintCard = (result: SearchResult) => {
    setPrintCardResult(result);
    setPrintCardOpen(true);
  };

  // Journey view
  if (selectedResult && viewMode === "journey") {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        <StudentJourney result={selectedResult} onBack={handleBack} />
      </div>
    );
  }

  // Professor profile view
  if (selectedResult && viewMode === "profile") {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        <ProfessorProfile result={selectedResult} onBack={handleBack} />
      </div>
    );
  }

  if (selectedResult && viewMode === "list") {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        {selectedResult.type === "professor" ? (
          <div className="space-y-4">
            <ProfessorDetailsPanel result={selectedResult} onBack={() => setSelectedResult(null)} onPrint={() => openPrintCard(selectedResult)} onEdit={() => openQuickEdit(selectedResult.raw, selectedResult.sourceTable || "professors")} />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="gap-2" onClick={() => setViewMode("profile")}>
                <UserCircle className="h-4 w-4" />ملف الأستاذ الشامل
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <EntityDetailsPanel result={selectedResult} onBack={() => setSelectedResult(null)} onPrint={() => openPrintCard(selectedResult)} onEdit={() => openQuickEdit(selectedResult.raw, selectedResult.sourceTable || "")} />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="gap-2" onClick={() => setViewMode("journey")}>
                <Route className="h-4 w-4" />تتبع المسار الأكاديمي
              </Button>
            </div>
          </div>
        )}
        {printCardResult && <RecordPrintCard open={printCardOpen} onOpenChange={setPrintCardOpen} result={printCardResult} />}
        <QuickEditDialog open={quickEditOpen} onOpenChange={setQuickEditOpen} record={quickEditRecord?.raw || null} sourceTable={quickEditRecord?.sourceTable || ""} onSaved={handleQuickEditSaved} />
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
            const isSelected = compareSelection.some(r => r.id === item.id && r.sourceTable === item.sourceTable);
            return (
              <Card key={`${item.type}-${item.id}-${item.sourceTable}`} className={`cursor-pointer hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-primary" : ""}`} onClick={() => compareMode ? toggleCompareSelect(item) : setSelectedResult(item)}>
                <CardContent className="p-3 flex items-center gap-3">
                  {compareMode && (
                    <Checkbox checked={isSelected} className="shrink-0" />
                  )}
                  <div className={`p-2 rounded-lg ${config.bg}`}><Icon className={`h-4 w-4 ${config.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!compareMode && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openQuickEdit(item.raw, item.sourceTable || ""); }} title="تصحيح سريع">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openPrintCard(item); }} title="طباعة بطاقة">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Badge className={`${config.badge} text-xs`}>{item.typeLabel}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مستعرض البيانات</h1>
        <p className="text-muted-foreground text-sm">ابحث واستعرض جميع البيانات من مكان واحد</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="h-4 w-4" />البحث الشامل
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Network className="h-4 w-4" />خريطة العلاقات
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Table2 className="h-4 w-4" />استعراض المجموعات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="ابحث بالاسم، رقم التسجيل، اسم المشرف..." value={searchInput} onChange={(e) => handleInputChange(e.target.value)} className="pr-10 pl-20 h-12 text-base" dir="rtl" />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchInput && query && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (isBookmarked(query)) return; addBookmark(query); toast.success("تمت الإضافة للمفضلات"); }} title={isBookmarked(query) ? "في المفضلات" : "إضافة للمفضلات"}>
                  {isBookmarked(query) ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : <StarOff className="h-4 w-4" />}
                </Button>
              )}
              {searchInput && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}><X className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جارٍ البحث...</span>
            </div>
          )}

          {!loading && query && (
            <div className="space-y-4">
              {/* Advanced Filters */}
              <AdvancedFilters results={results} onFilteredResults={setFilteredResults} />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">تم العثور على <span className="font-bold text-foreground">{totalResults}</span> نتيجة {filteredResults.length !== results.length && <span className="text-xs">(من أصل {results.length})</span>}</p>
                {totalResults > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant={compareMode ? "secondary" : "outline"} size="sm" className="gap-2" onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}>
                      <GitCompare className="h-4 w-4" />{compareMode ? "إلغاء المقارنة" : "مقارنة"}
                    </Button>
                    {compareMode && compareSelection.length === 2 && (
                      <Button size="sm" className="gap-2" onClick={() => setCompareOpen(true)}>
                        <GitCompare className="h-4 w-4" />قارن ({compareSelection.length})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setDuplicateOpen(true)}>
                      <Copy className="h-4 w-4" />كشف التكرارات
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                      exportToExcel(displayResults.map(r => r.raw), `نتائج_البحث_${query}`);
                    }}>
                      <Download className="h-4 w-4" />تصدير Excel
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setCustomExportOpen(true)}>
                      <SlidersHorizontal className="h-4 w-4" />تصدير مخصص
                    </Button>
                  </div>
                )}
              </div>
              {compareMode && <p className="text-xs text-muted-foreground">اختر سجلين للمقارنة بينهما جنباً إلى جنب</p>}
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="space-y-6">
                  {renderGroup("الأساتذة", displayGrouped.professors, <User className="h-4 w-4" />)}
                  {renderGroup("طلبة الدكتوراه", displayGrouped.students, <GraduationCap className="h-4 w-4" />)}
                  {renderGroup("طور المناقشة", displayGrouped.defense, <Scale className="h-4 w-4" />)}
                  {renderGroup("الشهادات", displayGrouped.certificates, <Award className="h-4 w-4" />)}
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
            <div className="space-y-6">
              <div className="text-center py-8">
                <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">ابدأ بكتابة اسم أو رقم للبحث</p>
                <p className="text-sm text-muted-foreground/60 mt-1">يمكنك البحث في جميع قواعد البيانات في آن واحد</p>
              </div>
              <SearchHistoryPanel onSelect={handleHistorySelect} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <RelationshipNetwork />
        </TabsContent>

        <TabsContent value="browse" className="mt-4">
          <CollectionBrowser />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {printCardResult && <RecordPrintCard open={printCardOpen} onOpenChange={setPrintCardOpen} result={printCardResult} />}
      <CustomExportDialog open={customExportOpen} onOpenChange={setCustomExportOpen} data={displayResults.map(r => r.raw)} fileName={`نتائج_البحث_${query}`} />
      {compareSelection.length === 2 && <RecordComparison open={compareOpen} onOpenChange={setCompareOpen} recordA={compareSelection[0]} recordB={compareSelection[1]} />}
      <DuplicateDetector open={duplicateOpen} onOpenChange={setDuplicateOpen} />
    </div>
  );
}
