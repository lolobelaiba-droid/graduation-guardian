import { useState } from "react";
import {
  Search,
  Trash2,
  Eye,
  UserPlus,
  Edit,
  Printer,
  MoreHorizontal,
  Calendar,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "create" | "edit" | "delete" | "print";
  description: string;
  studentId?: string;
  createdAt: string;
  createdBy: string;
}

const activities: Activity[] = [
  { id: "1", type: "print", description: "تم طباعة شهادة تخرج للطالب أحمد محمد", studentId: "STU001", createdAt: "2024-01-20T10:30:00", createdBy: "المدير" },
  { id: "2", type: "create", description: "تم إضافة طالب جديد: فاطمة علي", studentId: "STU002", createdAt: "2024-01-20T09:15:00", createdBy: "المدير" },
  { id: "3", type: "edit", description: "تم تعديل بيانات الطالب محمود حسن", studentId: "STU003", createdAt: "2024-01-19T16:45:00", createdBy: "المدير" },
  { id: "4", type: "print", description: "تم طباعة 5 شهادات دفعة واحدة", createdAt: "2024-01-19T14:20:00", createdBy: "المدير" },
  { id: "5", type: "create", description: "تم إنشاء قالب شهادة جديد: شهادة التميز", createdAt: "2024-01-19T11:00:00", createdBy: "المدير" },
  { id: "6", type: "delete", description: "تم حذف الطالب محمد أحمد", createdAt: "2024-01-18T15:30:00", createdBy: "المدير" },
  { id: "7", type: "edit", description: "تم تعديل قالب شهادة التخرج", createdAt: "2024-01-18T10:15:00", createdBy: "المدير" },
  { id: "8", type: "print", description: "تم طباعة شهادة ماجستير للطالب خالد يوسف", studentId: "STU005", createdAt: "2024-01-17T09:00:00", createdBy: "المدير" },
  { id: "9", type: "create", description: "تم إضافة 10 طلاب من ملف Excel", createdAt: "2024-01-16T14:30:00", createdBy: "المدير" },
  { id: "10", type: "edit", description: "تم تحديث إعدادات النظام", createdAt: "2024-01-15T11:45:00", createdBy: "المدير" },
];

const typeIcons = {
  create: UserPlus,
  edit: Edit,
  delete: Trash2,
  print: Printer,
};

const typeColors = {
  create: "bg-success/10 text-success border-success/20",
  edit: "bg-primary/10 text-primary border-primary/20",
  delete: "bg-destructive/10 text-destructive border-destructive/20",
  print: "bg-warning/10 text-warning border-warning/20",
};

const typeLabels = {
  create: "إضافة",
  edit: "تعديل",
  delete: "حذف",
  print: "طباعة",
};

export default function ActivityLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.description.includes(searchQuery);
    const matchesType = selectedType === "all" || activity.type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">سجل الأنشطة</h1>
          <p className="text-muted-foreground mt-1">
            متابعة جميع العمليات والتغييرات في النظام
          </p>
        </div>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          حذف السجلات القديمة
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl shadow-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الوصف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="create">إضافة</SelectItem>
              <SelectItem value="edit">تعديل</SelectItem>
              <SelectItem value="delete">حذف</SelectItem>
              <SelectItem value="print">طباعة</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            تصفية بالتاريخ
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right font-semibold w-24">النوع</TableHead>
                <TableHead className="text-right font-semibold">الوصف</TableHead>
                <TableHead className="text-right font-semibold">رقم الطالب</TableHead>
                <TableHead className="text-right font-semibold">التاريخ</TableHead>
                <TableHead className="text-right font-semibold">المستخدم</TableHead>
                <TableHead className="text-right font-semibold w-20">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity, index) => {
                const Icon = typeIcons[activity.type];
                return (
                  <TableRow
                    key={activity.id}
                    className="hover:bg-muted/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", typeColors[activity.type])}
                      >
                        <Icon className="h-3 w-3" />
                        {typeLabels[activity.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2">{activity.description}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {activity.studentId || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(activity.createdAt)}
                    </TableCell>
                    <TableCell>{activity.createdBy}</TableCell>
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
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {filteredActivities.length} من {activities.length} سجل
          </p>
        </div>
      </div>
    </div>
  );
}
