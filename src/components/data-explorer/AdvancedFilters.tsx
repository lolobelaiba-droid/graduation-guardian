import { useState, useEffect, useMemo } from "react";
import { Filter, Calendar, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SearchResult } from "@/hooks/useDataExplorer";

export interface FilterConfig {
  faculty?: string;
  specialty?: string;
  supervisor?: string;
  status?: string;
  gender?: string;
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  entityType?: string;
}

interface Props {
  results: SearchResult[];
  onFilteredResults: (filtered: SearchResult[]) => void;
}

function extractUniqueValues(results: SearchResult[], field: string): string[] {
  const values = new Set<string>();
  results.forEach(r => {
    const v = r.raw[field];
    if (v && typeof v === "string" && v.trim()) values.add(v.trim());
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b, "ar"));
}

export function AdvancedFilters({ results, onFilteredResults }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({});

  const faculties = useMemo(() => extractUniqueValues(results, "faculty_ar"), [results]);
  const specialties = useMemo(() => extractUniqueValues(results, "specialty_ar"), [results]);
  const supervisors = useMemo(() => extractUniqueValues(results, "supervisor_ar"), [results]);
  const statuses = useMemo(() => {
    const vals = new Set<string>();
    results.forEach(r => {
      const s = r.raw.stage_status || r.raw.status;
      if (s && typeof s === "string") vals.add(s);
    });
    return Array.from(vals).sort();
  }, [results]);

  const activeCount = Object.values(filters).filter(v => v && v.trim()).length;

  useEffect(() => {
    if (activeCount === 0) {
      onFilteredResults(results);
      return;
    }
    const filtered = results.filter(r => {
      if (filters.faculty && r.raw.faculty_ar !== filters.faculty) return false;
      if (filters.specialty && r.raw.specialty_ar !== filters.specialty) return false;
      if (filters.supervisor && r.raw.supervisor_ar !== filters.supervisor) return false;
      if (filters.gender && r.raw.gender !== filters.gender) return false;
      if (filters.status) {
        const s = (r.raw.stage_status || r.raw.status) as string;
        if (s !== filters.status) return false;
      }
      if (filters.entityType) {
        if (r.type !== filters.entityType) return false;
      }
      if (filters.dateFrom || filters.dateTo) {
        const dateField = filters.dateField || "defense_date";
        const dateVal = r.raw[dateField] as string;
        if (!dateVal) return false;
        if (filters.dateFrom && dateVal < filters.dateFrom) return false;
        if (filters.dateTo && dateVal > filters.dateTo) return false;
      }
      return true;
    });
    onFilteredResults(filtered);
  }, [filters, results]);

  const clearFilters = () => setFilters({});

  const updateFilter = (key: keyof FilterConfig, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === "__all__" ? undefined : value }));
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: "معلق", approved: "معتمد", defended: "ناقش", active: "نشط", suspended: "متوقف",
  };

  const ENTITY_LABELS: Record<string, string> = {
    professor: "أساتذة", phd_student: "طلبة دكتوراه", defense_student: "طور المناقشة", certificate: "شهادات",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant={expanded ? "secondary" : "outline"} size="sm" className="gap-2" onClick={() => setExpanded(!expanded)}>
          <Filter className="h-4 w-4" />
          فلاتر متقدمة
          {activeCount > 0 && <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeCount}</Badge>}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3" />مسح الفلاتر
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {/* Entity type */}
          <div className="space-y-1">
            <Label className="text-xs">نوع السجل</Label>
            <Select value={filters.entityType || "__all__"} onValueChange={v => updateFilter("entityType", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Faculty */}
          {faculties.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">الكلية</Label>
              <Select value={filters.faculty || "__all__"} onValueChange={v => updateFilter("faculty", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">الكل</SelectItem>
                  {faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Specialty */}
          {specialties.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">التخصص</Label>
              <Select value={filters.specialty || "__all__"} onValueChange={v => updateFilter("specialty", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">الكل</SelectItem>
                  {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Supervisor */}
          {supervisors.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">المشرف</Label>
              <Select value={filters.supervisor || "__all__"} onValueChange={v => updateFilter("supervisor", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">الكل</SelectItem>
                  {supervisors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gender */}
          <div className="space-y-1">
            <Label className="text-xs">الجنس</Label>
            <Select value={filters.gender || "__all__"} onValueChange={v => updateFilter("gender", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                <SelectItem value="male">ذكر</SelectItem>
                <SelectItem value="female">أنثى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          {statuses.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">الحالة</Label>
              <Select value={filters.status || "__all__"} onValueChange={v => updateFilter("status", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">الكل</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date range */}
          <div className="space-y-1">
            <Label className="text-xs">حقل التاريخ</Label>
            <Select value={filters.dateField || "defense_date"} onValueChange={v => updateFilter("dateField", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="defense_date">تاريخ المناقشة</SelectItem>
                <SelectItem value="first_registration_year">سنة التسجيل</SelectItem>
                <SelectItem value="certificate_date">تاريخ الشهادة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" className="h-9 text-xs" value={filters.dateFrom || ""} onChange={e => updateFilter("dateFrom", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" className="h-9 text-xs" value={filters.dateTo || ""} onChange={e => updateFilter("dateTo", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
