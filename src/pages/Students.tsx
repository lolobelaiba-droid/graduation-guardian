import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Printer,
  UserPlus,
  Filter,
  X,
  FileSpreadsheet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CertificateType, MentionType, Certificate } from "@/types/certificates";
import { certificateTypeLabels, mentionLabels } from "@/types/certificates";
import StudentDetailsDialog from "@/components/students/StudentDetailsDialog";
import EditStudentDialog from "@/components/students/EditStudentDialog";
import { CreateCertificateFromPhdDialog } from "@/components/students/CreateCertificateFromPhdDialog";
import { DeleteStudentDialog } from "@/components/students/DeleteStudentDialog";
import { AddStudentDialog } from "@/components/print/AddStudentDialog";
import { useRestoreStudentToPhd } from "@/hooks/useRestoreStudent";
import { ImportCertificateExcelDialog } from "@/components/students/import";
import { toast } from "sonner";
import { toWesternNumerals, formatCertificateDate } from "@/lib/numerals";

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCertType, setSelectedCertType] = useState<CertificateType>("phd_lmd");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Certificate | null>(null);
  const [deleteType, setDeleteType] = useState<CertificateType>("phd_lmd");
  
  // Details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Certificate | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Certificate | null>(null);

  // Create certificate from PhD dialog state
  const [createCertDialogOpen, setCreateCertDialogOpen] = useState(false);
  
  // Add Master student dialog state
  const [addMasterDialogOpen, setAddMasterDialogOpen] = useState(false);

  // Import old data dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterFaculty, setFilterFaculty] = useState<string>("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterSupervisor, setFilterSupervisor] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const { data: phdLmdData = [], isLoading: loadingPhdLmd } = usePhdLmdCertificates();
  const { data: phdScienceData = [], isLoading: loadingPhdScience } = usePhdScienceCertificates();
  const { data: masterData = [], isLoading: loadingMaster } = useMasterCertificates();

  const deletePhdLmd = useDeletePhdLmdCertificate();
  const deletePhdScience = useDeletePhdScienceCertificate();
  const deleteMaster = useDeleteMasterCertificate();
  const restoreStudent = useRestoreStudentToPhd();

  const getCurrentData = (): Certificate[] => {
    switch (selectedCertType) {
      case "phd_lmd": return phdLmdData;
      case "phd_science": return phdScienceData;
      case "master": return masterData;
    }
  };

  const isLoading = loadingPhdLmd || loadingPhdScience || loadingMaster;
  const currentData = getCurrentData();

  // Extract unique filter options from current data
  const filterOptions = useMemo(() => {
    const faculties = [...new Set(currentData.map(s => s.faculty_ar).filter(Boolean))].sort();
    const specialties = [...new Set(currentData.map(s => s.specialty_ar).filter(Boolean))].sort();
    const supervisors = [...new Set(currentData.map(s => (s as any).supervisor_ar).filter(Boolean))].sort();
    const years = [...new Set(currentData.map(s => {
      if (!s.defense_date) return null;
      return s.defense_date.substring(0, 4);
    }).filter(Boolean) as string[])].sort().reverse();
    return { faculties, specialties, supervisors, years };
  }, [currentData]);

  const isPhdType = selectedCertType === 'phd_lmd' || selectedCertType === 'phd_science';

  const filteredStudents = currentData.filter((student) => {
    const matchesSearch =
      student.full_name_ar.includes(searchQuery) ||
      student.student_number.includes(searchQuery) ||
      (student.full_name_fr?.includes(searchQuery) ?? false);

    const matchesFaculty = filterFaculty === "all" || student.faculty_ar === filterFaculty;
    const matchesSpecialty = filterSpecialty === "all" || student.specialty_ar === filterSpecialty;
    const matchesSupervisor = filterSupervisor === "all" || (student as any).supervisor_ar === filterSupervisor;
    const matchesYear = filterYear === "all" || (student.defense_date && student.defense_date.startsWith(filterYear));

    return matchesSearch && matchesFaculty && matchesSpecialty && matchesSupervisor && matchesYear;
  });

  const activeFiltersCount = [filterFaculty, filterSpecialty, filterSupervisor, filterYear].filter(v => v !== "all").length;

  const clearAllFilters = () => {
    setFilterFaculty("all");
    setFilterSpecialty("all");
    setFilterSupervisor("all");
    setFilterYear("all");
  };

  const handleDeleteClick = (student: Certificate, type: CertificateType) => {
    setStudentToDelete(student);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeletePermanently = () => {
    if (studentToDelete) {
      switch (deleteType) {
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

  const handleRestoreToDatabase = () => {
    if (studentToDelete && (deleteType === "phd_lmd" || deleteType === "phd_science")) {
      restoreStudent.mutate(
        { student: studentToDelete, certificateType: deleteType },
        {
          onSuccess: () => {
            setDeleteDialogOpen(false);
            setStudentToDelete(null);
          },
        }
      );
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
      "رقم الشهادة": student.student_number,
      "الاسم بالعربية": student.full_name_ar,
      "الاسم بالفرنسية": student.full_name_fr || "",
      "الجنس": student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : student.gender || "",
      "تاريخ الميلاد": student.date_of_birth,
      "مكان الميلاد بالعربية": student.birthplace_ar,
      "مكان الميلاد بالفرنسية": student.birthplace_fr || "",
      "الكلية": student.faculty_ar || "",
      ...((selectedCertType === "phd_lmd" || selectedCertType === "phd_science") && {
        "مخبر البحث": student.research_lab_ar || "",
      }),
      "الشعبة بالعربية": student.branch_ar,
      "الشعبة بالفرنسية": student.branch_fr || "",
      "التخصص بالعربية": student.specialty_ar,
      "التخصص بالفرنسية": student.specialty_fr || "",
      "تاريخ المناقشة": student.defense_date,
      "التقدير": mentionLabels[student.mention as MentionType]?.ar || student.mention,
      ...((selectedCertType === "phd_lmd" || selectedCertType === "phd_science") && {
        "المشرف": (student as any).supervisor_ar || "",
        "سنة أول تسجيل": student.first_registration_year || "",
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
    
    const dateStr = toWesternNumerals(new Date().toLocaleDateString("ar-SA"));
    const fileName = `طلاب_${certificateTypeLabels[selectedCertType].ar}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`تم تصدير ${toWesternNumerals(currentData.length)} طالب`);
  };

  const isMasterType = selectedCertType === 'master';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الطلبة المناقشين</h1>
          <p className="text-muted-foreground mt-1">
            إدارة بيانات الطلاب الذين ناقشوا وحصلوا على شهاداتهم
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            استيراد بيانات قديمة
          </Button>
          {isPhdType && (
            <Button size="sm" className="gap-2" onClick={() => setCreateCertDialogOpen(true)}>
              <Printer className="h-4 w-4" />
              طباعة شهادة جديدة
            </Button>
          )}
          {isMasterType && (
            <Button size="sm" className="gap-2" onClick={() => setAddMasterDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
              إضافة طالب ماجستير
            </Button>
          )}
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
          <div className="bg-card rounded-2xl shadow-card p-4 mb-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم الطالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                فلترة متقدمة
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="mr-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {toWesternNumerals(activeFiltersCount)}
                  </Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-1 text-destructive shrink-0" onClick={clearAllFilters}>
                  <X className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الكلية</label>
                  <Select value={filterFaculty} onValueChange={setFilterFaculty}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {filterOptions.faculties.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">التخصص</label>
                  <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {filterOptions.specialties.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isPhdType && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">المشرف</label>
                    <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {filterOptions.supervisors.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">سنة المناقشة</label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {filterOptions.years.map(y => (
                        <SelectItem key={y} value={y}>{toWesternNumerals(y)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
                          <TableCell>{formatCertificateDate(student.defense_date)}</TableCell>
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
                                  onClick={() => handleDeleteClick(student, selectedCertType)}
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
                    عرض {toWesternNumerals(filteredStudents.length)} من {toWesternNumerals(currentData.length)} طالب
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

      {/* Create Certificate from PhD Database Dialog */}
      <CreateCertificateFromPhdDialog
        open={createCertDialogOpen}
        onOpenChange={setCreateCertDialogOpen}
        certificateType={selectedCertType}
      />

      {/* Add Master Student Dialog */}
      <AddStudentDialog
        open={addMasterDialogOpen}
        onOpenChange={setAddMasterDialogOpen}
        certificateType="master"
      />

      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={studentToDelete}
        certificateType={deleteType}
        onDeletePermanently={handleDeletePermanently}
        onRestoreToDatabase={handleRestoreToDatabase}
        isDeleting={deletePhdLmd.isPending || deletePhdScience.isPending || deleteMaster.isPending}
        isRestoring={restoreStudent.isPending}
      />

      <ImportCertificateExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        certificateType={selectedCertType}
      />
    </div>
  );
}
