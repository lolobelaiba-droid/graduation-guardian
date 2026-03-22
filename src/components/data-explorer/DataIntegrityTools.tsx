import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck, AlertTriangle, CheckCircle, Loader2, RefreshCw,
  Sparkles, FileWarning, ChevronDown, ChevronUp, Wrench, BarChart3,
  XCircle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

// =================== TYPES & CONSTANTS ===================

const ALL_TABLES = [
  "phd_lmd_students", "phd_science_students",
  "defense_stage_lmd", "defense_stage_science",
  "phd_lmd_certificates", "phd_science_certificates", "master_certificates",
];

const TABLE_LABELS: Record<string, string> = {
  phd_lmd_students: "طلبة دكتوراه ل.م.د",
  phd_science_students: "طلبة دكتوراه علوم",
  defense_stage_lmd: "مناقشة ل.م.د",
  defense_stage_science: "مناقشة علوم",
  phd_lmd_certificates: "شهادة ل.م.د",
  phd_science_certificates: "شهادة علوم",
  master_certificates: "شهادة ماستر",
  professors: "الأساتذة",
};

const REQUIRED_FIELDS: Record<string, { label: string; fields: string[] }> = {
  phd_lmd_students: {
    label: "طلبة دكتوراه ل.م.د",
    fields: ["full_name_ar", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "supervisor_ar", "field_ar"],
  },
  phd_science_students: {
    label: "طلبة دكتوراه علوم",
    fields: ["full_name_ar", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "supervisor_ar", "field_ar"],
  },
  defense_stage_lmd: {
    label: "مناقشة ل.م.د",
    fields: ["full_name_ar", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "supervisor_ar", "jury_president_ar", "jury_members_ar", "scientific_council_date"],
  },
  defense_stage_science: {
    label: "مناقشة علوم",
    fields: ["full_name_ar", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "supervisor_ar", "jury_president_ar", "jury_members_ar", "scientific_council_date"],
  },
  phd_lmd_certificates: {
    label: "شهادة ل.م.د",
    fields: ["full_name_ar", "student_number", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "thesis_title_ar", "defense_date", "jury_president_ar", "jury_members_ar", "supervisor_ar"],
  },
  phd_science_certificates: {
    label: "شهادة علوم",
    fields: ["full_name_ar", "student_number", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "thesis_title_ar", "defense_date", "jury_president_ar", "jury_members_ar", "supervisor_ar"],
  },
  master_certificates: {
    label: "شهادة ماستر",
    fields: ["full_name_ar", "student_number", "date_of_birth", "birthplace_ar", "faculty_ar", "branch_ar", "specialty_ar", "defense_date"],
  },
};

const FIELD_LABELS: Record<string, string> = {
  full_name_ar: "الاسم بالعربية", full_name_fr: "الاسم بالفرنسية",
  date_of_birth: "تاريخ الميلاد", birthplace_ar: "مكان الميلاد",
  faculty_ar: "الكلية", field_ar: "الميدان", branch_ar: "الشعبة",
  specialty_ar: "التخصص", supervisor_ar: "المشرف", thesis_title_ar: "عنوان الأطروحة",
  defense_date: "تاريخ المناقشة", jury_president_ar: "رئيس اللجنة",
  jury_members_ar: "أعضاء اللجنة", student_number: "رقم الطالب",
  scientific_council_date: "تاريخ المجلس العلمي", registration_number: "رقم التسجيل",
  co_supervisor_ar: "المشرف المساعد", research_lab_ar: "المخبر",
  first_registration_year: "سنة أول تسجيل", phone_number: "الهاتف",
  professional_email: "البريد", university_ar: "الجامعة",
};

interface InconsistencyIssue {
  type: "orphan_defense" | "orphan_certificate" | "duplicate_cross" | "missing_professor";
  severity: "high" | "medium" | "low";
  message: string;
  details: string;
  table: string;
  recordId: string;
  recordName: string;
}

interface CleanupResult {
  table: string;
  recordId: string;
  field: string;
  oldValue: string;
  newValue: string;
}

interface FieldHealth {
  field: string;
  filled: number;
  empty: number;
  total: number;
  percentage: number;
}

interface TableHealth {
  table: string;
  label: string;
  totalRecords: number;
  overallHealth: number;
  fields: FieldHealth[];
  incompleteRecords: { id: string; name: string; missingFields: string[] }[];
}

// =================== HELPERS ===================

async function queryTable(table: string): Promise<any[]> {
  if (isElectron()) {
    const db = getDbClient();
    if (!db) return [];
    const result = await db.getAll(table);
    return result?.success && result.data ? result.data : [];
  } else {
    const { data } = await (supabase as any).from(table).select("*");
    return data || [];
  }
}

async function updateRecord(table: string, id: string, updates: Record<string, string>): Promise<boolean> {
  try {
    if (isElectron()) {
      const db = getDbClient();
      if (!db) return false;
      await db.update(table, id, updates);
      return true;
    } else {
      const { error } = await (supabase as any).from(table).update(updates).eq("id", id);
      return !error;
    }
  } catch { return false; }
}

// Normalize Arabic text
function cleanArabicText(text: string): string {
  if (!text) return text;
  let cleaned = text;
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  // Remove zero-width characters
  cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
  // Normalize dashes between names
  cleaned = cleaned.replace(/\s*[-–—]\s*/g, " - ");
  return cleaned;
}

// =================== 1. CONSISTENCY CHECKER ===================

function ConsistencyChecker() {
  const [issues, setIssues] = useState<InconsistencyIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const runCheck = useCallback(async () => {
    setLoading(true);
    const foundIssues: InconsistencyIssue[] = [];

    try {
      // Load all data
      const [
        lmdStudents, sciStudents,
        defenseLmd, defenseScience,
        certLmd, certScience, certMaster,
        professors
      ] = await Promise.all([
        queryTable("phd_lmd_students"),
        queryTable("phd_science_students"),
        queryTable("defense_stage_lmd"),
        queryTable("defense_stage_science"),
        queryTable("phd_lmd_certificates"),
        queryTable("phd_science_certificates"),
        queryTable("master_certificates"),
        queryTable("professors"),
      ]);

      const lmdStudentNames = new Set(lmdStudents.map((s: any) => s.full_name_ar?.trim()));
      const sciStudentNames = new Set(sciStudents.map((s: any) => s.full_name_ar?.trim()));
      const profNames = new Set(professors.map((p: any) => p.full_name?.trim()));

      // Check: Defense students not in student database
      for (const d of defenseLmd) {
        const name = d.full_name_ar?.trim();
        if (name && !lmdStudentNames.has(name)) {
          foundIssues.push({
            type: "orphan_defense",
            severity: "medium",
            message: `طالب في المناقشة غير موجود في قاعدة الطلبة`,
            details: `"${name}" موجود في مناقشة ل.م.د لكن ليس له سجل في قاعدة طلبة الدكتوراه ل.م.د`,
            table: "defense_stage_lmd",
            recordId: d.id,
            recordName: name,
          });
        }
      }

      for (const d of defenseScience) {
        const name = d.full_name_ar?.trim();
        if (name && !sciStudentNames.has(name)) {
          foundIssues.push({
            type: "orphan_defense",
            severity: "medium",
            message: `طالب في المناقشة غير موجود في قاعدة الطلبة`,
            details: `"${name}" موجود في مناقشة علوم لكن ليس له سجل في قاعدة طلبة الدكتوراه علوم`,
            table: "defense_stage_science",
            recordId: d.id,
            recordName: name,
          });
        }
      }

      // Check: Certificates without matching defense or student record
      const allDefenseNames = new Set([
        ...defenseLmd.map((d: any) => d.full_name_ar?.trim()),
        ...defenseScience.map((d: any) => d.full_name_ar?.trim()),
      ]);
      const allStudentNames = new Set([...lmdStudentNames, ...sciStudentNames]);

      for (const c of [...certLmd, ...certScience]) {
        const name = c.full_name_ar?.trim();
        if (name && !allDefenseNames.has(name) && !allStudentNames.has(name)) {
          const src = certLmd.includes(c) ? "phd_lmd_certificates" : "phd_science_certificates";
          foundIssues.push({
            type: "orphan_certificate",
            severity: "low",
            message: `شهادة بدون سجل طالب أو مناقشة`,
            details: `"${name}" لديه شهادة لكن لا يوجد سجل مطابق في قواعد الطلبة أو المناقشة`,
            table: src,
            recordId: c.id,
            recordName: name,
          });
        }
      }

      // Check: Supervisors not in professors table
      const allSupervisors = new Set<string>();
      for (const table of [...lmdStudents, ...sciStudents, ...defenseLmd, ...defenseScience, ...certLmd, ...certScience]) {
        if (table.supervisor_ar?.trim()) allSupervisors.add(table.supervisor_ar.trim());
        if (table.co_supervisor_ar?.trim()) allSupervisors.add(table.co_supervisor_ar.trim());
      }

      for (const sup of allSupervisors) {
        if (!profNames.has(sup)) {
          foundIssues.push({
            type: "missing_professor",
            severity: "low",
            message: `مشرف غير مسجل في قاعدة الأساتذة`,
            details: `"${sup}" مذكور كمشرف لكنه غير موجود في سجل الأساتذة`,
            table: "professors",
            recordId: "",
            recordName: sup,
          });
        }
      }

    } catch (err) {
      console.error("Consistency check error:", err);
      toast.error("حدث خطأ أثناء فحص التناسق");
    }

    setIssues(foundIssues);
    setLoading(false);
  }, []);

  const groupedIssues = useMemo(() => {
    const groups: Record<string, InconsistencyIssue[]> = {};
    issues.forEach(issue => {
      if (!groups[issue.type]) groups[issue.type] = [];
      groups[issue.type].push(issue);
    });
    return groups;
  }, [issues]);

  const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    orphan_defense: { label: "طلاب مناقشة بدون سجل", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
    orphan_certificate: { label: "شهادات بدون سجل مطابق", icon: <FileWarning className="h-4 w-4 text-orange-500" /> },
    missing_professor: { label: "مشرفون غير مسجلين", icon: <XCircle className="h-4 w-4 text-red-500" /> },
    duplicate_cross: { label: "تكرارات عبر الجداول", icon: <Info className="h-4 w-4 text-blue-500" /> },
  };

  const toggleGroup = (type: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const sevColor = (s: string) => s === "high" ? "text-red-500" : s === "medium" ? "text-amber-500" : "text-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />مدقق التناسق
          </h3>
          <p className="text-sm text-muted-foreground">كشف التناقضات والبيانات اليتيمة بين الجداول</p>
        </div>
        <Button onClick={runCheck} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          فحص التناسق
        </Button>
      </div>

      {!loading && issues.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            {Object.keys(groupedIssues).length === 0 && issues.length === 0 ? (
              <>
                <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">اضغط "فحص التناسق" لبدء الفحص</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-emerald-600">لا توجد مشاكل تناسق! 🎉</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="destructive">{issues.length} مشكلة</Badge>
            <span className="text-sm text-muted-foreground">
              {issues.filter(i => i.severity === "high").length > 0 && <span className="text-red-500 font-semibold mr-2">● {issues.filter(i => i.severity === "high").length} حرجة</span>}
              {issues.filter(i => i.severity === "medium").length > 0 && <span className="text-amber-500 font-semibold mr-2">● {issues.filter(i => i.severity === "medium").length} متوسطة</span>}
              {issues.filter(i => i.severity === "low").length > 0 && <span className="text-blue-500 font-semibold">● {issues.filter(i => i.severity === "low").length} منخفضة</span>}
            </span>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {Object.entries(groupedIssues).map(([type, items]) => {
                const config = typeLabels[type];
                const isOpen = expanded.has(type);
                return (
                  <Card key={type}>
                    <CardHeader className="p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleGroup(type)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {config?.icon}
                          <span className="font-semibold text-sm">{config?.label || type}</span>
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                    {isOpen && (
                      <CardContent className="p-3 pt-0 space-y-1.5">
                        {items.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                            <span className={`mt-0.5 text-xs font-bold ${sevColor(issue.severity)}`}>●</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{issue.recordName}</p>
                              <p className="text-xs text-muted-foreground">{issue.details}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">{TABLE_LABELS[issue.table]}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// =================== 2. BULK DATA CLEANUP ===================

function BulkDataCleanup() {
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [preview, setPreview] = useState<CleanupResult[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const TEXT_FIELDS = [
    "full_name_ar", "full_name_fr", "birthplace_ar", "birthplace_fr",
    "faculty_ar", "faculty_fr", "field_ar", "field_fr",
    "branch_ar", "branch_fr", "specialty_ar", "specialty_fr",
    "supervisor_ar", "co_supervisor_ar", "thesis_title_ar", "thesis_title_fr",
    "jury_president_ar", "jury_president_fr", "jury_members_ar", "jury_members_fr",
    "university_ar", "university_fr", "research_lab_ar",
    "supervisor_university", "co_supervisor_university",
  ];

  const scan = useCallback(async () => {
    setScanning(true);
    const results: CleanupResult[] = [];

    try {
      for (const table of ALL_TABLES) {
        const data = await queryTable(table);
        for (const row of data) {
          for (const field of TEXT_FIELDS) {
            const val = row[field];
            if (!val || typeof val !== "string") continue;
            const cleaned = cleanArabicText(val);
            if (cleaned !== val) {
              results.push({
                table,
                recordId: row.id,
                field,
                oldValue: val,
                newValue: cleaned,
              });
            }
          }
        }
      }

      // Also check professors
      const profs = await queryTable("professors");
      for (const row of profs) {
        for (const field of ["full_name", "rank_label", "university"]) {
          const val = row[field];
          if (!val || typeof val !== "string") continue;
          const cleaned = cleanArabicText(val);
          if (cleaned !== val) {
            results.push({
              table: "professors",
              recordId: row.id,
              field,
              oldValue: val,
              newValue: cleaned,
            });
          }
        }
      }
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("حدث خطأ أثناء الفحص");
    }

    setPreview(results);
    setScanning(false);
  }, []);

  const applyCleanup = async () => {
    setCleaning(true);
    let success = 0;
    let failed = 0;

    // Group by table+recordId
    const grouped = new Map<string, { table: string; id: string; updates: Record<string, string> }>();
    for (const r of preview) {
      const key = `${r.table}::${r.recordId}`;
      if (!grouped.has(key)) grouped.set(key, { table: r.table, id: r.recordId, updates: {} });
      grouped.get(key)!.updates[r.field] = r.newValue;
    }

    for (const entry of grouped.values()) {
      const ok = await updateRecord(entry.table, entry.id, entry.updates);
      if (ok) success += Object.keys(entry.updates).length;
      else failed += Object.keys(entry.updates).length;
    }

    // Log activity
    try {
      if (isElectron()) {
        const db = getDbClient();
        if (db) await db.insert("activity_log", {
          activity_type: "settings_updated",
          description: `تنظيف بيانات جماعي: ${success} حقل تم تنظيفه`,
          entity_type: "bulk_cleanup",
        });
      } else {
        await supabase.from("activity_log").insert({
          activity_type: "settings_updated",
          description: `تنظيف بيانات جماعي: ${success} حقل تم تنظيفه`,
          entity_type: "bulk_cleanup",
        });
      }
    } catch { /* ignore */ }

    toast.success(`تم تنظيف ${success} حقل بنجاح${failed > 0 ? ` (فشل ${failed})` : ""}`);
    setPreview([]);
    setCleaning(false);
    setConfirmOpen(false);
  };

  const groupedByTable = useMemo(() => {
    const map = new Map<string, CleanupResult[]>();
    preview.forEach(r => {
      if (!map.has(r.table)) map.set(r.table, []);
      map.get(r.table)!.push(r);
    });
    return map;
  }, [preview]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />تنظيف البيانات الجماعي
          </h3>
          <p className="text-sm text-muted-foreground">إزالة المسافات الزائدة والأحرف غير المرئية وتوحيد الصيغ</p>
        </div>
        <Button onClick={scan} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          فحص المشاكل
        </Button>
      </div>

      {/* What gets cleaned */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">عمليات التنظيف:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" />إزالة المسافات المزدوجة والزائدة</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" />حذف الأحرف غير المرئية (Zero-width)</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" />توحيد الشرطات بين الأسماء</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" />إزالة المسافات في بداية ونهاية النصوص</div>
          </div>
        </CardContent>
      </Card>

      {!scanning && preview.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">اضغط "فحص المشاكل" للبحث عن بيانات تحتاج تنظيف</p>
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{preview.length} حقل يحتاج تنظيف</Badge>
            <Button onClick={() => setConfirmOpen(true)} className="gap-2" variant="default">
              <Wrench className="h-4 w-4" />تطبيق التنظيف
            </Button>
          </div>

          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {Array.from(groupedByTable.entries()).map(([table, items]) => (
                <Card key={table}>
                  <CardHeader className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{TABLE_LABELS[table]}</span>
                      <Badge variant="outline" className="text-xs">{items.length} تعديل</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1">
                    {items.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="text-xs p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground">{FIELD_LABELS[item.field] || item.field}: </span>
                        <span className="line-through text-destructive/60">"{item.oldValue.substring(0, 50)}"</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium text-primary">"{item.newValue.substring(0, 50)}"</span>
                      </div>
                    ))}
                    {items.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">و {items.length - 10} تعديل آخر...</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التنظيف الجماعي</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تنظيف {preview.length} حقل في {groupedByTable.size} جدول. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={cleaning}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={applyCleanup} disabled={cleaning} className="gap-2">
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              تأكيد التنظيف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =================== 3. DATA HEALTH REPORT ===================

function DataHealthReport() {
  const [healthData, setHealthData] = useState<TableHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const runReport = useCallback(async () => {
    setLoading(true);
    const results: TableHealth[] = [];

    try {
      for (const [table, config] of Object.entries(REQUIRED_FIELDS)) {
        const data = await queryTable(table);
        const fields: FieldHealth[] = [];
        const incompleteRecords: TableHealth["incompleteRecords"] = [];

        // Check all important fields (required + optional useful ones)
        const allFields = [...new Set([
          ...config.fields,
          "full_name_fr", "first_registration_year", "phone_number", "professional_email",
          "university_ar", "research_lab_ar",
        ])];

        for (const field of allFields) {
          let filled = 0;
          let empty = 0;
          for (const row of data) {
            const val = row[field];
            if (val && String(val).trim() !== "") filled++;
            else empty++;
          }
          fields.push({ field, filled, empty, total: data.length, percentage: data.length > 0 ? Math.round((filled / data.length) * 100) : 100 });
        }

        // Find incomplete records (missing required fields)
        for (const row of data) {
          const missing: string[] = [];
          for (const reqField of config.fields) {
            const val = row[reqField];
            if (!val || String(val).trim() === "") {
              missing.push(reqField);
            }
          }
          if (missing.length > 0) {
            incompleteRecords.push({
              id: row.id,
              name: row.full_name_ar || row.full_name || "غير معروف",
              missingFields: missing,
            });
          }
        }

        const requiredFields = fields.filter(f => config.fields.includes(f.field));
        const overallHealth = requiredFields.length > 0
          ? Math.round(requiredFields.reduce((sum, f) => sum + f.percentage, 0) / requiredFields.length)
          : 100;

        results.push({
          table,
          label: config.label,
          totalRecords: data.length,
          overallHealth,
          fields: fields.sort((a, b) => a.percentage - b.percentage),
          incompleteRecords: incompleteRecords.sort((a, b) => b.missingFields.length - a.missingFields.length),
        });
      }
    } catch (err) {
      console.error("Health report error:", err);
      toast.error("حدث خطأ أثناء إنشاء التقرير");
    }

    setHealthData(results.sort((a, b) => a.overallHealth - b.overallHealth));
    setLoading(false);
  }, []);

  const healthColor = (pct: number) => {
    if (pct >= 90) return "text-emerald-600";
    if (pct >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const healthBg = (pct: number) => {
    if (pct >= 90) return "bg-emerald-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />تقرير صحة البيانات
          </h3>
          <p className="text-sm text-muted-foreground">نسبة اكتمال الحقول في كل جدول مع تحديد السجلات الناقصة</p>
        </div>
        <Button onClick={runReport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          إنشاء التقرير
        </Button>
      </div>

      {!loading && healthData.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">اضغط "إنشاء التقرير" لتحليل صحة البيانات</p>
          </CardContent>
        </Card>
      )}

      {healthData.length > 0 && (
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-3">
            {healthData.map(th => {
              const isExpanded = expandedTable === th.table;
              return (
                <Card key={th.table}>
                  <CardHeader
                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedTable(isExpanded ? null : th.table)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${healthColor(th.overallHealth)}`}>
                          {th.overallHealth}%
                        </div>
                        <div>
                          <CardTitle className="text-sm">{th.label}</CardTitle>
                          <CardDescription className="text-xs">
                            {th.totalRecords} سجل — {th.incompleteRecords.length} غير مكتمل
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <Progress value={th.overallHealth} className="h-2" />
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-4 pt-0 space-y-4">
                      <Separator />

                      {/* Field completeness */}
                      <div>
                        <p className="text-sm font-semibold mb-2">اكتمال الحقول:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {th.fields.map(f => (
                            <div key={f.field} className="flex items-center gap-2 text-sm">
                              <div className="w-28 truncate text-muted-foreground text-xs">
                                {FIELD_LABELS[f.field] || f.field}
                              </div>
                              <div className="flex-1">
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${healthBg(f.percentage)}`} style={{ width: `${f.percentage}%` }} />
                                </div>
                              </div>
                              <span className={`text-xs font-semibold w-10 text-left ${healthColor(f.percentage)}`}>
                                {f.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Incomplete records */}
                      {th.incompleteRecords.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            السجلات الناقصة ({th.incompleteRecords.length})
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {th.incompleteRecords.slice(0, 20).map((rec, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                                <span className="font-medium shrink-0">{rec.name}</span>
                                <div className="flex flex-wrap gap-1">
                                  {rec.missingFields.map(f => (
                                    <Badge key={f} variant="outline" className="text-[10px] text-destructive border-destructive/30">
                                      {FIELD_LABELS[f] || f}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {th.incompleteRecords.length > 20 && (
                              <p className="text-xs text-muted-foreground text-center">
                                و {th.incompleteRecords.length - 20} سجل آخر...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// =================== MAIN COMPONENT ===================

export function DataIntegrityTools() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="consistency" dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="consistency" className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />مدقق التناسق
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="h-4 w-4" />تنظيف جماعي
          </TabsTrigger>
          <TabsTrigger value="health" className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />صحة البيانات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consistency" className="mt-4">
          <ConsistencyChecker />
        </TabsContent>
        <TabsContent value="cleanup" className="mt-4">
          <BulkDataCleanup />
        </TabsContent>
        <TabsContent value="health" className="mt-4">
          <DataHealthReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
