import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { fetchCollection, COLLECTIONS } from "@/hooks/useDataExplorer";
import { toast } from "sonner";

interface DuplicateGroup {
  key: string;
  records: { table: string; tableLabel: string; record: any }[];
}

// Simple normalize for comparison
function normalize(name: string): string {
  return (name || "")
    .replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, " ")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .trim()
    .toLowerCase();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateDetector({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [scanned, setScanned] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setDuplicates([]);
    try {
      const allRecords: { table: string; tableLabel: string; record: any }[] = [];
      for (const col of COLLECTIONS) {
        const data = await fetchCollection(col.table);
        data.forEach(r => allRecords.push({ table: col.table, tableLabel: col.label, record: r }));
      }

      // Group by normalized name + DOB
      const groups = new Map<string, typeof allRecords>();
      allRecords.forEach(item => {
        const name = normalize(item.record.full_name_ar || item.record.full_name || "");
        const dob = item.record.date_of_birth || "";
        if (!name) return;
        const key = `${name}||${dob}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      });

      // Filter groups with records in multiple tables
      const dups: DuplicateGroup[] = [];
      groups.forEach((records, key) => {
        const uniqueTables = new Set(records.map(r => r.table));
        if (uniqueTables.size > 1 || records.length > 1) {
          dups.push({ key, records });
        }
      });

      setDuplicates(dups.sort((a, b) => b.records.length - a.records.length));
      setScanned(true);

      if (dups.length === 0) {
        toast.success("لم يتم العثور على أي تكرارات");
      } else {
        toast.warning(`تم العثور على ${dups.length} مجموعة مكررة`);
      }
    } catch (err) {
      console.error("Duplicate scan error:", err);
      toast.error("حدث خطأ أثناء الفحص");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />كشف التكرارات عبر الجداول
          </DialogTitle>
        </DialogHeader>

        {!scanned && !loading && (
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <p className="text-muted-foreground">يقوم هذا الفحص بمسح جميع قواعد البيانات للكشف عن السجلات المكررة (نفس الاسم وتاريخ الميلاد)</p>
            <Button onClick={scan} className="gap-2">
              <Search className="h-4 w-4" />بدء الفحص
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">جارٍ فحص جميع الجداول...</p>
          </div>
        )}

        {scanned && !loading && (
          <>
            {duplicates.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <p className="font-semibold text-lg">لا توجد تكرارات</p>
                <p className="text-sm text-muted-foreground">جميع السجلات فريدة عبر الجداول</p>
              </div>
            ) : (
              <ScrollArea className="h-[55vh]">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    تم العثور على <span className="font-bold text-foreground">{duplicates.length}</span> مجموعة مكررة
                  </p>
                  {duplicates.map((group, idx) => {
                    const displayName = group.records[0]?.record?.full_name_ar || group.records[0]?.record?.full_name || "—";
                    const dob = group.records[0]?.record?.date_of_birth || "";
                    return (
                      <Card key={idx} className="p-4 border-amber-200 dark:border-amber-800">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{displayName}</p>
                            {dob && <p className="text-xs text-muted-foreground">تاريخ الميلاد: {dob}</p>}
                          </div>
                          <Badge variant="destructive" className="text-xs">{group.records.length} سجلات</Badge>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {group.records.map((rec, ri) => (
                            <div key={ri} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                              <Badge variant="outline" className="text-[10px] shrink-0">{rec.tableLabel}</Badge>
                              <span className="text-muted-foreground truncate">
                                {rec.record.specialty_ar || rec.record.rank_label || ""} {rec.record.supervisor_ar ? `— ${rec.record.supervisor_ar}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={scan} className="gap-2">
                <Search className="h-4 w-4" />إعادة الفحص
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
