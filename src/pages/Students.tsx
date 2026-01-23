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
  usePhdLmdCertificates,
  usePhdScienceCertificates,
  useMasterCertificates,
  useDeletePhdLmdCertificate,
  useDeletePhdScienceCertificate,
  useDeleteMasterCertificate,
} from "@/hooks/useCertificates";
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
import type { CertificateType, MentionType, Certificate } from "@/types/certificates";
import { certificateTypeLabels, mentionLabels } from "@/types/certificates";
import StudentDetailsDialog from "@/components/students/StudentDetailsDialog";
import EditStudentDialog from "@/components/students/EditStudentDialog";
import { AddStudentDialog } from "@/components/print/AddStudentDialog";
import { ImportExcelDialog } from "@/components/print/ImportExcelDialog";
import { toast } from "sonner";

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCertType, setSelectedCertType] = useState<CertificateType>("phd_lmd");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; type: CertificateType } | null>(null);
  
  // Details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Certificate | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Certificate | null>(null);

  // Add student dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: phdLmdData = [], isLoading: loadingPhdLmd } = usePhdLmdCertificates();
  const { data: phdScienceData = [], isLoading: loadingPhdScience } = usePhdScienceCertificates();
  const { data: masterData = [], isLoading: loadingMaster } = useMasterCertificates();

  const deletePhdLmd = useDeletePhdLmdCertificate();
  const deletePhdScience = useDeletePhdScienceCertificate();
  const deleteMaster = useDeleteMasterCertificate();

  const getCurrentData = (): Certificate[] => {
    switch (selectedCertType) {
      case "phd_lmd": return phdLmdData;
      case "phd_science": return phdScienceData;
      case "master": return masterData;
    }
  };

  const isLoading = loadingPhdLmd || loadingPhdScience || loadingMaster;
  const currentData = getCurrentData();

  const filteredStudents = currentData.filter((student) => {
    const matchesSearch =
      student.full_name_ar.includes(searchQuery) ||
      student.student_number.includes(searchQuery) ||
      (student.full_name_fr?.includes(searchQuery) ?? false);

    return matchesSearch;
  });

  const handleDeleteClick = (id: string, type: CertificateType) => {
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
        case "master":
          deleteMaster.mutate(studentToDelete.id);
          break;
      }
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleViewDetails = (student: Certificate) => {
    setSelectedStudent(student);
    setDetailsDialogOpen(true);
  };

  const handleEditStudent = (student: Certificate) => {
    setStudentToEdit(student);
    setEditDialogOpen(true);
  };

  const handleExportExcel = () => {
    if (currentData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const exportData = currentData.map((student) => ({
      "رقم الطالب": student.student_number,
      "الاسم بالعربية": student.full_name_ar,
      "الاسم بالفرنسية": student.full_name_fr || "",
      "تاريخ الميلاد": student.date_of_birth,
      "مكان الميلاد بالعربية": student.birthplace_ar,
      "مكان الميلاد بالفرنسية": student.birthplace_fr || "",
      "الشعبة بالعربية": student.branch_ar,
      "الشعبة بالفرنسية": student.branch_fr || "",
      "التخصص بالعربية": student.specialty_ar,
      "التخصص بالفرنسية": student.specialty_fr || "",
      "تاريخ المناقشة": student.defense_date,
      "التقدير": mentionLabels[student.mention as MentionType]?.ar || student.mention,
      ...((selectedCertType === "phd_lmd" || selectedCertType === "phd_science") && {
        "عنوان الأطروحة": (student as any).thesis_title_ar || "",
        "رئيس اللجنة": (student as any).jury_president_ar || "",
        "أعضاء اللجنة": (student as any).jury_members_ar || "",
      }),
      ...(selectedCertType === "phd_lmd" && {
        "الميدان بالعربية": (student as any).field_ar || "",
        "الميدان بالفرنسية": (student as any).field_fr || "",
      }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    
    const fileName = `طلاب_${certificateTypeLabels[selectedCertType].ar}_${new Date().toLocaleDateString("ar-SA")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`تم تصدير ${currentData.length} طالب`);
  };

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
      </div>

      {/* Certificate Type Tabs */}
      <Tabs value={selectedCertType} onValueChange={(v) => setSelectedCertType(v as CertificateType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="phd_lmd">{certificateTypeLabels.phd_lmd.ar}</TabsTrigger>
          <TabsTrigger value="phd_science">{certificateTypeLabels.phd_science.ar}</TabsTrigger>
          <TabsTrigger value="master">{certificateTypeLabels.master.ar}</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCertType} className="mt-6">
          {/* Filters */}
          <div className="bg-card rounded-2xl shadow-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم الطالب..."
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
                        <TableHead className="text-right font-semibold">الرقم</TableHead>
                        <TableHead className="text-right font-semibold">الاسم بالعربية</TableHead>
                        <TableHead className="text-right font-semibold">الاسم بالفرنسية</TableHead>
                        <TableHead className="text-right font-semibold">التخصص</TableHead>
                        <TableHead className="text-right font-semibold">التقدير</TableHead>
                        <TableHead className="text-right font-semibold">تاريخ المناقشة</TableHead>
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
                          <TableCell className="font-mono text-sm">{student.student_number}</TableCell>
                          <TableCell className="font-medium">{student.full_name_ar}</TableCell>
                          <TableCell className="text-muted-foreground">{student.full_name_fr || "-"}</TableCell>
                          <TableCell>{student.specialty_ar}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {mentionLabels[student.mention as MentionType]?.ar || student.mention}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(student.defense_date).toLocaleDateString("ar-SA")}</TableCell>
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
                                  onClick={() => handleDeleteClick(student.id, selectedCertType)}
                                >
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
                    عرض {filteredStudents.length} من {currentData.length} طالب
                  </p>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        student={selectedStudent}
        certificateType={selectedCertType}
      />

      {/* Edit Student Dialog */}
      <EditStudentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={studentToEdit}
        certificateType={selectedCertType}
      />

      {/* Add Student Dialog */}
      <AddStudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        certificateType={selectedCertType}
      />

      {/* Import Excel Dialog */}
      <ImportExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        certificateType={selectedCertType}
      />
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
    </div>
  );
}
