import { useState, useMemo } from "react";
import { Database, Search, User, Hash, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  certificateTypeLabels,
  mentionLabels,
  type CertificateType,
  type MentionType,
} from "@/types/certificates";
import { toWesternNumerals } from "@/lib/numerals";

interface StudentRecord {
  id: string;
  full_name_ar: string;
  full_name_fr?: string | null;
  student_number: string;
  specialty_ar: string;
  faculty_ar?: string;
  supervisor_ar?: string;
  mention: string;
  created_at?: string | null;
  certificateType: CertificateType;
}

interface BrowseDatabaseDialogProps {
  students: StudentRecord[];
  onSelect: (student: StudentRecord) => void;
}

export function BrowseDatabaseDialog({ students, onSelect }: BrowseDatabaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = students;

    if (typeFilter !== "all") {
      result = result.filter(s => s.certificateType === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(s =>
        s.full_name_ar?.toLowerCase().includes(q) ||
        s.full_name_fr?.toLowerCase().includes(q) ||
        s.student_number?.toLowerCase().includes(q) ||
        s.specialty_ar?.toLowerCase().includes(q) ||
        (s.faculty_ar && s.faculty_ar.toLowerCase().includes(q)) ||
        (s.supervisor_ar && s.supervisor_ar.toLowerCase().includes(q))
      );
    }

    return result;
  }, [students, search, typeFilter]);

  const handleSelect = (student: StudentRecord) => {
    onSelect(student);
    setOpen(false);
    setSearch("");
    setTypeFilter("all");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          تصفح قاعدة البيانات
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            اختيار طالب من قاعدة البيانات
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث بالاسم، رقم الشهادة، التخصص، الكلية، المشرف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
              autoFocus
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="phd_lmd">{certificateTypeLabels.phd_lmd.ar}</SelectItem>
              <SelectItem value="phd_science">{certificateTypeLabels.phd_science.ar}</SelectItem>
              <SelectItem value="master">{certificateTypeLabels.master.ar}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{toWesternNumerals(filtered.length)}</Badge>
          <span>طالب</span>
          {search && <span>— نتائج البحث عن "{search}"</span>}
        </div>

        <ScrollArea className="h-[50vh] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-[250px]">الاسم الكامل</TableHead>
                <TableHead className="text-right">رقم الشهادة</TableHead>
                <TableHead className="text-right">الكلية</TableHead>
                <TableHead className="text-right">التخصص</TableHead>
                <TableHead className="text-right">المشرف</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">التقدير</TableHead>
                <TableHead className="text-center w-[80px]">اختيار</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search ? `لا توجد نتائج لـ "${search}"` : "لا يوجد طلاب"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((student) => (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelect(student)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.full_name_ar}</p>
                        {student.full_name_fr && (
                          <p className="text-xs text-muted-foreground" dir="ltr">{student.full_name_fr}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{toWesternNumerals(student.student_number)}</TableCell>
                    <TableCell className="text-sm">{student.faculty_ar || "-"}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{student.specialty_ar}</TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate">{student.supervisor_ar || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          student.certificateType === 'phd_lmd' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                          student.certificateType === 'phd_science' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                          'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {certificateTypeLabels[student.certificateType].ar}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {mentionLabels[student.mention as MentionType]?.ar || student.mention}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        اختيار
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
