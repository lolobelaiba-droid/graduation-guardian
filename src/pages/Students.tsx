import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  gpa: number;
  status: "active" | "graduated" | "suspended";
}

const students: Student[] = [
  { id: "1", studentId: "STU001", firstName: "أحمد", lastName: "محمد", email: "ahmed@university.edu", specialty: "هندسة الحاسوب", gpa: 3.85, status: "active" },
  { id: "2", studentId: "STU002", firstName: "فاطمة", lastName: "علي", email: "fatima@university.edu", specialty: "هندسة الحاسوب", gpa: 3.92, status: "graduated" },
  { id: "3", studentId: "STU003", firstName: "محمود", lastName: "حسن", email: "mahmoud@university.edu", specialty: "الهندسة المدنية", gpa: 3.45, status: "active" },
  { id: "4", studentId: "STU004", firstName: "عائشة", lastName: "خليل", email: "aisha@university.edu", specialty: "إدارة الأعمال", gpa: 3.78, status: "active" },
  { id: "5", studentId: "STU005", firstName: "خالد", lastName: "يوسف", email: "khaled@university.edu", specialty: "الهندسة الكهربائية", gpa: 3.65, status: "graduated" },
  { id: "6", studentId: "STU006", firstName: "نور", lastName: "محمود", email: "noor@university.edu", specialty: "هندسة الحاسوب", gpa: 3.88, status: "active" },
  { id: "7", studentId: "STU007", firstName: "سارة", lastName: "أحمد", email: "sara@university.edu", specialty: "الصيدلة", gpa: 3.72, status: "active" },
  { id: "8", studentId: "STU008", firstName: "علي", lastName: "إبراهيم", email: "ali@university.edu", specialty: "القانون", gpa: 3.51, status: "suspended" },
  { id: "9", studentId: "STU009", firstName: "هند", lastName: "سعد", email: "hend@university.edu", specialty: "الطب البشري", gpa: 3.95, status: "active" },
  { id: "10", studentId: "STU010", firstName: "إبراهيم", lastName: "فارس", email: "ibrahim@university.edu", specialty: "الهندسة المعمارية", gpa: 3.68, status: "graduated" },
];

const statusStyles = {
  active: "bg-success/10 text-success border-success/20",
  graduated: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels = {
  active: "نشط",
  graduated: "متخرج",
  suspended: "موقوف",
};

const specialties = [
  "الكل",
  "هندسة الحاسوب",
  "الهندسة المدنية",
  "إدارة الأعمال",
  "الهندسة الكهربائية",
  "الصيدلة",
  "القانون",
  "الطب البشري",
  "الهندسة المعمارية",
];

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("الكل");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.firstName.includes(searchQuery) ||
      student.lastName.includes(searchQuery) ||
      student.studentId.includes(searchQuery) ||
      student.email.includes(searchQuery);

    const matchesSpecialty =
      selectedSpecialty === "الكل" || student.specialty === selectedSpecialty;

    const matchesStatus =
      selectedStatus === "all" || student.status === selectedStatus;

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الطلاب</h1>
          <p className="text-muted-foreground mt-1">
            إدارة بيانات الطلاب المسجلين في النظام
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            استيراد Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة طالب
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl shadow-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الطالب أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="التخصص" />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="graduated">متخرج</SelectItem>
              <SelectItem value="suspended">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right font-semibold">رقم الطالب</TableHead>
                <TableHead className="text-right font-semibold">الاسم الكامل</TableHead>
                <TableHead className="text-right font-semibold">البريد الإلكتروني</TableHead>
                <TableHead className="text-right font-semibold">التخصص</TableHead>
                <TableHead className="text-right font-semibold">المعدل</TableHead>
                <TableHead className="text-right font-semibold">الحالة</TableHead>
                <TableHead className="text-right font-semibold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, index) => (
                <TableRow
                  key={student.id}
                  className="hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                  <TableCell className="font-medium">
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.email}
                  </TableCell>
                  <TableCell>{student.specialty}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-semibold",
                        student.gpa >= 3.7
                          ? "text-success"
                          : student.gpa >= 3.0
                          ? "text-primary"
                          : "text-warning"
                      )}
                    >
                      {student.gpa.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("font-medium", statusStyles[student.status])}
                    >
                      {statusLabels[student.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="h-4 w-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {filteredStudents.length} من {students.length} طالب
          </p>
        </div>
      </div>
    </div>
  );
}
