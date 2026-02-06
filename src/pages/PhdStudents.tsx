import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  GraduationCap,
  Calendar,
  FileDown,
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
import { Badge } from "@/components/ui/badge";
import {
  usePhdLmdStudents,
  usePhdScienceStudents,
  useDeletePhdLmdStudent,
  useDeletePhdScienceStudent,
} from "@/hooks/usePhdStudents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PhdStudentType, PhdStudent } from "@/types/phd-students";
import { phdStudentTypeLabels, studentStatusLabels } from "@/types/phd-students";
import { AddPhdStudentDialog } from "@/components/phd-students/AddPhdStudentDialog";
import { ViewPhdStudentDialog } from "@/components/phd-students/ViewPhdStudentDialog";
import { EditPhdStudentDialog } from "@/components/phd-students/EditPhdStudentDialog";
import { ImportPhdExcelDialog } from "@/components/phd-students/import";
import { getPhdStudentFields } from "@/components/phd-students/import/types";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import { toast } from "sonner";
import { toWesternNumerals } from "@/lib/numerals";

// Generate academic years from 2000/2001 to current+1
const generateAcademicYears = (): string[] => {
  const years: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let year = 2000; year <= currentYear + 1; year++) {
    years.push(`${year}/${year + 1}`);
  }
  return years;
};

const academicYears = generateAcademicYears();

export default function PhdStudents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PhdStudentType>("phd_lmd");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; type: PhdStudentType } | null>(null);
  
  // Current academic year state
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>(() => {
    // Default to current academic year
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}/${year + 1}`;
  });
  
  // Academic year change confirmation dialog
  const [yearChangeDialogOpen, setYearChangeDialogOpen] = useState(false);
  const [pendingAcademicYear, setPendingAcademicYear] = useState<string>("");
  
  // Handle academic year change with confirmation
  const handleAcademicYearChange = (newYear: string) => {
    if (newYear !== currentAcademicYear && (phdLmdData.length > 0 || phdScienceData.length > 0)) {
      setPendingAcademicYear(newYear);
      setYearChangeDialogOpen(true);
    } else {
      setCurrentAcademicYear(newYear);
    }
  };
  
  const confirmAcademicYearChange = () => {
    setCurrentAcademicYear(pendingAcademicYear);
    setYearChangeDialogOpen(false);
    setPendingAcademicYear("");
  };
  
  // Details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<PhdStudent | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<PhdStudent | null>(null);

  // Add student dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: phdLmdData = [], isLoading: loadingPhdLmd } = usePhdLmdStudents();
  const { data: phdScienceData = [], isLoading: loadingPhdScience } = usePhdScienceStudents();

  const deletePhdLmd = useDeletePhdLmdStudent();
  const deletePhdScience = useDeletePhdScienceStudent();

  const getCurrentData = (): PhdStudent[] => {
    switch (selectedType) {
      case "phd_lmd": return phdLmdData;
      case "phd_science": return phdScienceData;
    }
  };

  const isLoading = loadingPhdLmd || loadingPhdScience;
  const currentData = getCurrentData();

  const filteredStudents = currentData.filter((student) => {
    const matchesSearch =
      student.full_name_ar.includes(searchQuery) ||
      student.registration_number.includes(searchQuery) ||
      (student.full_name_fr?.includes(searchQuery) ?? false);

    return matchesSearch;
  });

  const handleDeleteClick = (id: string, type: PhdStudentType) => {
    setStudentToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (studentToDelete) {
      switch (studentToDelete.type) {
        case "phd_lmd":
          deletePhdLmd.mutate(studentToDelete.id);
          break;
        case "phd_science":
          deletePhdScience.mutate(studentToDelete.id);
          break;
      }
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleViewDetails = (student: PhdStudent) => {
    setSelectedStudent(student);
    setDetailsDialogOpen(true);
  };

  const handleEditStudent = (student: PhdStudent) => {
    setStudentToEdit(student);
    setEditDialogOpen(true);
  };

  const handleDownloadTemplate = () => {
    const fields = getPhdStudentFields(selectedType);
    // Create header row with Arabic field names
    const headers = fields.map(f => f.name_ar);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Set column widths
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قالب الاستيراد");
    
    const fileName = `قالب_استيراد_${phdStudentTypeLabels[selectedType].ar}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("تم تحميل قالب الاستيراد");
  };

  const handleExportExcel = () => {
    if (currentData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const exportData = currentData.map((student) => ({
      "رقم التسجيل": student.registration_number,
      "الاسم بالعربية": student.full_name_ar,
      "الاسم بالفرنسية": student.full_name_fr || "",
      "الجنس": student.gender === "male" ? "ذكر" : "أنثى",
      "تاريخ الميلاد": student.date_of_birth,
      "مكان الميلاد": student.birthplace_ar,
      "الكلية": student.faculty_ar,
      "الشعبة": student.branch_ar,
      "التخصص": student.specialty_ar,
      "المشرف": student.supervisor_ar,
      "سنة أول تسجيل": student.first_registration_year || "",
      "عنوان الأطروحة": student.thesis_title_ar || "",
      "مخبر البحث": student.research_lab_ar || "",
      "البريد الإلكتروني": student.professional_email || "",
      "الهاتف": student.phone_number || "",
      "الحالة": studentStatusLabels[student.status]?.ar || student.status,
      ...(selectedType === "phd_lmd" && {
        "الميدان": (student as any).field_ar || "",
      }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "طلبة الدكتوراه");
    
    const dateStr = toWesternNumerals(new Date().toLocaleDateString("ar-SA"));
    const fileName = `طلبة_${phdStudentTypeLabels[selectedType].ar}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`تم تصدير ${toWesternNumerals(currentData.length)} طالب`);
  };

    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">قاعدة بيانات طلبة الدكتوراه</h1>
              <p className="text-muted-foreground mt-1">
                إدارة بيانات طلبة الدكتوراه قبل المناقشة
              </p>
            </div>
          </div>
        </div>
        
        {/* Current Academic Year Selector */}
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            <span className="font-semibold text-base">السنة الجامعية الحالية:</span>
          </div>
          <div className="w-48">
            <DropdownWithAdd
              value={currentAcademicYear}
              onChange={handleAcademicYearChange}
              optionType="academic_year"
              placeholder="اختر السنة الجامعية"
              defaultOptions={academicYears}
            />
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
          <FileDown className="h-4 w-4" />
          تحميل قالب الاستيراد
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          استيراد Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
          <Download className="h-4 w-4" />
          تصدير Excel
        </Button>
        <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          إضافة طالب
        </Button>
      </div>

      {/* PhD Type Tabs */}
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as PhdStudentType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="phd_lmd">{phdStudentTypeLabels.phd_lmd.ar}</TabsTrigger>
          <TabsTrigger value="phd_science">{phdStudentTypeLabels.phd_science.ar}</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="mt-6">
          {/* Filters */}
          <div className="bg-card rounded-2xl shadow-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم التسجيل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right font-semibold">رقم التسجيل</TableHead>
                        <TableHead className="text-right font-semibold">الاسم بالعربية</TableHead>
                        <TableHead className="text-right font-semibold">التخصص</TableHead>
                        <TableHead className="text-right font-semibold">المشرف</TableHead>
                        <TableHead className="text-right font-semibold">سنة التسجيل</TableHead>
                        <TableHead className="text-right font-semibold">الحالة</TableHead>
                        <TableHead className="text-right font-semibold">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                            لا يوجد طلاب مسجلين
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student, index) => (
                          <TableRow
                            key={student.id}
                            className="hover:bg-muted/30 transition-colors animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell className="font-mono text-sm">{student.registration_number}</TableCell>
                            <TableCell className="font-medium">{student.full_name_ar}</TableCell>
                            <TableCell>{student.specialty_ar}</TableCell>
                            <TableCell className="text-muted-foreground">{student.supervisor_ar}</TableCell>
                            <TableCell>{student.first_registration_year || "-"}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={studentStatusLabels[student.status]?.color || ""}
                              >
                                {studentStatusLabels[student.status]?.ar || student.status}
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
                                  <DropdownMenuItem 
                                    className="gap-2"
                                    onClick={() => handleViewDetails(student)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    عرض التفاصيل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="gap-2"
                                    onClick={() => handleEditStudent(student)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    تعديل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive"
                                    onClick={() => handleDeleteClick(student.id, selectedType)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    عرض {toWesternNumerals(filteredStudents.length)} من {toWesternNumerals(currentData.length)} طالب
                  </p>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Student Dialog */}
      <ViewPhdStudentDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        student={selectedStudent}
        studentType={selectedType}
      />

      {/* Edit Student Dialog */}
      <EditPhdStudentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={studentToEdit}
        studentType={selectedType}
        currentAcademicYear={currentAcademicYear}
      />

      {/* Add Student Dialog */}
      <AddPhdStudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        studentType={selectedType}
        currentAcademicYear={currentAcademicYear}
      />

      {/* Import Excel Dialog */}
      <ImportPhdExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        studentType={selectedType}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الطالب نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Academic Year Change Confirmation Dialog */}
      <AlertDialog open={yearChangeDialogOpen} onOpenChange={setYearChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              ⚠️ تنبيه هام
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              <p className="mb-3">
                سيؤدي تغيير السنة الجامعية الحالية إلى <strong className="text-foreground">{pendingAcademicYear}</strong> إلى:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>تغيير <strong className="text-foreground">سنة التسجيل</strong> (السنة الأولى، الثانية...) لجميع طلبة الدكتوراه تلقائياً</li>
                <li>تحديث <strong className="text-foreground">عدد التسجيلات</strong> لكل طالب بناءً على سنة أول تسجيل</li>
                <li>قد يتغير بعض الطلبة إلى حالة <strong className="text-destructive">متأخر</strong> إذا تجاوزوا المدة القانونية</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setPendingAcademicYear("")}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAcademicYearChange}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              تأكيد التغيير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
