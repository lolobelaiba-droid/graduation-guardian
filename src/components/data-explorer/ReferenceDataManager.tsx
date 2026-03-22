import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Loader2, Pencil, RefreshCw, CheckCircle, AlertTriangle, Building2, GraduationCap, BookOpen, FlaskConical, Layers, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { getCurrentUserName } from "@/lib/current-user-store";
import { toast } from "sonner";

// Tables to scan for reference data
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

interface RefCategory {
  key: string;
  label: string;
  icon: React.ElementType;
  fields: { table: string; column: string }[];
}

const CATEGORIES: RefCategory[] = [
  {
    key: "university",
    label: "الجامعات",
    icon: Building2,
    fields: [
      ...ALL_TABLES.map(t => ({ table: t, column: "university_ar" })),
      ...ALL_TABLES.map(t => ({ table: t, column: "supervisor_university" })),
      ...ALL_TABLES.map(t => ({ table: t, column: "co_supervisor_university" })),
      { table: "professors", column: "university" },
    ],
  },
  {
    key: "faculty",
    label: "الكليات",
    icon: GraduationCap,
    fields: ALL_TABLES.map(t => ({ table: t, column: "faculty_ar" })),
  },
  {
    key: "field",
    label: "الميادين",
    icon: Globe,
    fields: ALL_TABLES.filter(t => !t.includes("master")).map(t => ({ table: t, column: "field_ar" })),
  },
  {
    key: "branch",
    label: "الشعب / الفروع",
    icon: Layers,
    fields: ALL_TABLES.map(t => ({ table: t, column: "branch_ar" })),
  },
  {
    key: "specialty",
    label: "التخصصات",
    icon: BookOpen,
    fields: ALL_TABLES.map(t => ({ table: t, column: "specialty_ar" })),
  },
  {
    key: "research_lab",
    label: "مخابر البحث",
    icon: FlaskConical,
    fields: ALL_TABLES.map(t => ({ table: t, column: "research_lab_ar" })),
  },
];

interface ValueOccurrence {
  value: string;
  count: number;
  tables: { table: string; column: string; count: number; ids: string[] }[];
}

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

async function updateRecords(table: string, column: string, ids: string[], newValue: string): Promise<boolean> {
  try {
    if (isElectron()) {
      const db = getDbClient();
      if (!db) return false;
      for (const id of ids) {
        await db.update(table, id, { [column]: newValue });
      }
      return true;
    } else {
      for (const id of ids) {
        const { error } = await (supabase as any)
          .from(table)
          .update({ [column]: newValue })
          .eq("id", id);
        if (error) throw error;
      }
      return true;
    }
  } catch (err) {
    console.error("Update error:", err);
    return false;
  }
}

export function ReferenceDataManager() {
  const [selectedCategory, setSelectedCategory] = useState<string>("university");
  const [occurrences, setOccurrences] = useState<ValueOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editingValue, setEditingValue] = useState<ValueOccurrence | null>(null);
  const [newValue, setNewValue] = useState("");
  const [editMode, setEditMode] = useState<"global" | "selective">("global");
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const category = CATEGORIES.find(c => c.key === selectedCategory)!;

  const loadData = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    setFilterText("");

    try {
      // Collect all data from relevant tables
      const valueMap = new Map<string, { count: number; tables: Map<string, { column: string; count: number; ids: string[] }> }>();

      const tablesToQuery = [...new Set(category.fields.map(f => f.table))];
      const tableDataMap = new Map<string, any[]>();

      // Fetch all tables in parallel
      const results = await Promise.all(tablesToQuery.map(async t => ({ table: t, data: await queryTable(t) })));
      results.forEach(r => tableDataMap.set(r.table, r.data));

      // Process each field mapping
      for (const field of category.fields) {
        const tableData = tableDataMap.get(field.table) || [];
        for (const row of tableData) {
          const val = row[field.column];
          if (!val || String(val).trim() === "") continue;
          const trimmed = String(val).trim();

          if (!valueMap.has(trimmed)) {
            valueMap.set(trimmed, { count: 0, tables: new Map() });
          }
          const entry = valueMap.get(trimmed)!;
          entry.count++;

          const tableKey = `${field.table}::${field.column}`;
          if (!entry.tables.has(tableKey)) {
            entry.tables.set(tableKey, { column: field.column, count: 0, ids: [] });
          }
          const tableEntry = entry.tables.get(tableKey)!;
          tableEntry.count++;
          tableEntry.ids.push(row.id);
        }
      }

      // Convert to array
      const result: ValueOccurrence[] = [];
      valueMap.forEach((entry, value) => {
        const tables: ValueOccurrence["tables"] = [];
        entry.tables.forEach((te, key) => {
          const [table] = key.split("::");
          tables.push({ table, column: te.column, count: te.count, ids: te.ids });
        });
        result.push({ value, count: entry.count, tables });
      });

      // Sort by count desc
      result.sort((a, b) => b.count - a.count);
      setOccurrences(result);
    } catch (err) {
      console.error("Load ref data error:", err);
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const filtered = useMemo(() => {
    if (!filterText) return occurrences;
    const lower = filterText.toLowerCase();
    return occurrences.filter(o => o.value.toLowerCase().includes(lower));
  }, [occurrences, filterText]);

  const openEdit = (occ: ValueOccurrence) => {
    setEditingValue(occ);
    setNewValue(occ.value);
    setEditMode("global");
    setSelectedTables(new Set(occ.tables.map(t => `${t.table}::${t.column}`)));
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!editingValue || !newValue.trim()) return;
    if (newValue.trim() === editingValue.value) {
      toast.info("لم يتم تغيير القيمة");
      return;
    }

    setSaving(true);
    try {
      let totalUpdated = 0;
      const tablesToUpdate = editMode === "global"
        ? editingValue.tables
        : editingValue.tables.filter(t => selectedTables.has(`${t.table}::${t.column}`));

      for (const tableInfo of tablesToUpdate) {
        const success = await updateRecords(tableInfo.table, tableInfo.column, tableInfo.ids, newValue.trim());
        if (success) totalUpdated += tableInfo.count;
      }

      // Log activity
      try {
        if (isElectron()) {
          const db = getDbClient();
          if (db) {
            await db.insert("activity_log", {
              activity_type: "settings_updated",
              description: `تعديل بيانات مرجعية: "${editingValue.value}" → "${newValue.trim()}" (${totalUpdated} سجل)`,
              entity_type: "reference_data",
              created_by: getCurrentUserName(),
            });
          }
        } else {
          await supabase.from("activity_log").insert({
            activity_type: "settings_updated",
            description: `تعديل بيانات مرجعية: "${editingValue.value}" → "${newValue.trim()}" (${totalUpdated} سجل)`,
            entity_type: "reference_data",
            created_by: getCurrentUserName(),
          });
        }
      } catch { /* ignore logging errors */ }

      toast.success(`تم تعديل ${totalUpdated} سجل بنجاح`);
      setEditDialog(false);
      loadData();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const toggleTable = (key: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <Button
              key={cat.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setSelectedCategory(cat.key)}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="تصفية القيم..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pr-9"
            dir="rtl"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />تحديث
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="mr-2 text-muted-foreground">جارٍ التحميل...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              إجمالي القيم الفريدة: <span className="font-bold text-foreground">{occurrences.length}</span>
              {filterText && filtered.length !== occurrences.length && (
                <span> — عرض <span className="font-bold text-foreground">{filtered.length}</span></span>
              )}
            </p>
          </div>

          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="space-y-1.5">
              {filtered.map((occ, idx) => (
                <Card key={occ.value} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8 text-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{occ.value}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {occ.tables.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] py-0">
                            {TABLE_LABELS[t.table] || t.table}
                            {t.column !== category.fields[0]?.column && (
                              <span className="opacity-60 mr-1">({t.column.replace(/_ar$/, "").replace(/_/g, " ")})</span>
                            )}
                            <span className="font-bold mr-1">×{t.count}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{occ.count}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => openEdit(occ)}
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">لا توجد قيم مطابقة</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              تعديل قيمة مرجعية
            </DialogTitle>
            <DialogDescription>
              تعديل القيمة وتطبيقها على السجلات المرتبطة
            </DialogDescription>
          </DialogHeader>

          {editingValue && (
            <div className="space-y-4">
              {/* Current value */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">القيمة الحالية</p>
                <p className="font-semibold">{editingValue.value}</p>
                <p className="text-xs text-muted-foreground mt-1">موجودة في {editingValue.count} سجل</p>
              </div>

              {/* New value */}
              <div>
                <Label>القيمة الجديدة</Label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  dir="rtl"
                  className="mt-1"
                  placeholder="أدخل القيمة المصححة..."
                />
              </div>

              <Separator />

              {/* Edit scope */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">نطاق التعديل</Label>
                <RadioGroup value={editMode} onValueChange={(v) => setEditMode(v as "global" | "selective")} className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setEditMode("global")}>
                    <RadioGroupItem value="global" id="global" className="mt-0.5" />
                    <div>
                      <Label htmlFor="global" className="font-medium cursor-pointer flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        تعديل شامل
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        تطبيق التعديل في جميع الجداول ({editingValue.count} سجل)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setEditMode("selective")}>
                    <RadioGroupItem value="selective" id="selective" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="selective" className="font-medium cursor-pointer flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-amber-500" />
                        تعديل انتقائي
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        اختر الجداول التي تريد تطبيق التعديل عليها
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Selective tables */}
              {editMode === "selective" && (
                <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">اختر الجداول:</p>
                  {editingValue.tables.map((t, i) => {
                    const key = `${t.table}::${t.column}`;
                    const isChecked = selectedTables.has(key);
                    return (
                      <label key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTable(key)}
                          className="rounded border-input"
                        />
                        <span className="text-sm flex-1">
                          {TABLE_LABELS[t.table] || t.table}
                          {t.column !== category.fields[0]?.column && (
                            <span className="text-muted-foreground mr-1">({t.column.replace(/_ar$/, "").replace(/_/g, " ")})</span>
                          )}
                        </span>
                        <Badge variant="outline" className="text-xs">{t.count} سجل</Badge>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Preview */}
              {newValue.trim() && newValue.trim() !== editingValue.value && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">معاينة التعديل:</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="line-through text-destructive/70">{editingValue.value}</span>
                    <span>←</span>
                    <span className="font-semibold text-primary">{newValue.trim()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    سيتم تعديل{" "}
                    {editMode === "global"
                      ? `${editingValue.count} سجل في جميع الجداول`
                      : `${editingValue.tables.filter(t => selectedTables.has(`${t.table}::${t.column}`)).reduce((sum, t) => sum + t.count, 0)} سجل في الجداول المختارة`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={saving}>إلغاء</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !newValue.trim() || newValue.trim() === editingValue?.value || (editMode === "selective" && selectedTables.size === 0)}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {editMode === "global" ? "تعديل الكل" : "تعديل المختار"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
