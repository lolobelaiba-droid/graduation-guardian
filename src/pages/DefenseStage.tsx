import { useState, useMemo, useCallback } from "react";
import { useNetworkReadOnly } from "@/contexts/NetworkReadOnlyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useColumnVisibility, type ColumnDef } from "@/hooks/useColumnVisibility";
import { ColumnVisibilityDialog } from "@/components/ui/column-visibility-dialog";
import {
  Search,
  Scale,
  MoreHorizontal,
  Eye,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  FilePlus,
  Pencil,
  ClipboardList,
  Download,
  Undo2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  useDefenseStageLmd,
  useDefenseStageScience,
  useDeleteDefenseStageLmd,
  useDeleteDefenseStageScience,
  useUpdateDefenseStageLmd,
  useUpdateDefenseStageScience,
} from "@/hooks/useDefenseStage";
import { StartDefenseProcedureDialog } from "@/components/defense-stage/StartDefenseProcedureDialog";
import { GenerateDocumentDialog } from "@/components/defense-stage/GenerateDocumentDialog";
import { EditDefenseStageDialog } from "@/components/defense-stage/EditDefenseStageDialog";
import type { DefenseStageStudent, DefenseStageStatus, DefenseStageType } from "@/types/defense-stage";
import { stageStatusLabels } from "@/types/defense-stage";
import { calculateRegistrationDetails } from "@/lib/registration-calculation";
import { toast } from "sonner";
import { useRestoreDefenseToPhd } from "@/hooks/useRestoreDefenseToPhd";

const ITEMS_PER_PAGE = 15;

function getDurationSinceCouncil(councilDate: string | null, stageStatus: string) {
  if (!councilDate || stageStatus === 'defended') return null;
  const council = new Date(councilDate);
  if (isNaN(council.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - council.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return { text: '-', color: 'text-foreground', totalDays: 0 };

  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;

  let text: string;
  if (months === 0) {
    text = `${totalDays} يوم`;
  } else if (months === 1) {
    text = days > 0 ? `شهر و ${days} يوم` : 'شهر';
  } else if (months === 2) {
    text = days > 0 ? `شهرين و ${days} يوم` : 'شهرين';
  } else if (months >= 3 && months <= 10) {
    text = days > 0 ? `${months} أشهر و ${days} يوم` : `${months} أشهر`;
  } else {
    text = days > 0 ? `${months} شهر و ${days} يوم` : `${months} شهر`;
  }

  let color: string;
  if (totalDays <= 30) {
    color = 'text-foreground';
  } else if (totalDays <= 60) {
    color = 'text-orange-500';
  } else {
    color = 'text-destructive';
  }

  return { text, color, totalDays };
}

export default function DefenseStage() {
  const { canDelete } = usePermissions();
  const { guardWrite } = useNetworkReadOnly();
  const defenseColumns: ColumnDef[] = useMemo(() => [
    { key: "full_name_ar", label: "الاسم بالعربية" },
    { key: "full_name_fr", label: "الاسم بالفرنسية" },
    { key: "specialty_ar", label: "التخصص" },
    { key: "faculty_ar", label: "الكلية" },
    { key: "supervisor_ar", label: "المشرف" },
    { key: "first_registration_year", label: "سنة أول تسجيل" },
    { key: "registration_count", label: "عدد التسجيلات" },
    { key: "registration_status", label: "حالة التسجيل" },
    { key: "scientific_council_date", label: "تاريخ المجلس العلمي" },
    { key: "duration", label: "المدة منذ المصادقة" },
    { key: "stage_status", label: "الحالة" },
    { key: "actions", label: "إجراءات", alwaysVisible: true },
  ], []);

  const { visibleColumns, isVisible, toggleColumn, setAllVisible, resetToDefaults, visibleCount } = useColumnVisibility("defense-stage-columns", defenseColumns);

  const [activeTab, setActiveTab] = useState("phd_lmd");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ student: DefenseStageStudent; type: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [docGenTarget, setDocGenTarget] = useState<{
    student: DefenseStageStudent;
    documentType: "jury_decision" | "defense_auth" | "defense_minutes";
  } | null>(null);
  const [editTarget, setEditTarget] = useState<DefenseStageStudent | null>(null);

  const { data: lmdStudents = [], isLoading: loadingLmd } = useDefenseStageLmd();
  const { data: scienceStudents = [], isLoading: loadingScience } = useDefenseStageScience();
  const deleteLmd = useDeleteDefenseStageLmd();
  const deleteScience = useDeleteDefenseStageScience();
  const updateLmd = useUpdateDefenseStageLmd();
  const updateScience = useUpdateDefenseStageScience();
  const restoreToPhd = useRestoreDefenseToPhd();

  const isLoading = loadingLmd || loadingScience;
  const students = activeTab === "phd_lmd" ? lmdStudents : scienceStudents;

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) =>
      s.full_name_ar.includes(searchQuery) ||
      s.registration_number.includes(searchQuery) ||
      (s.full_name_fr?.toLowerCase().includes(q) ?? false) ||
      s.specialty_ar.includes(searchQuery)
    );
  }, [students, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async () => {
    if (!guardWrite("حذف سجل المناقشة")) return;
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "phd_lmd") {
        await deleteLmd.mutateAsync(deleteTarget.student.id);
      } else {
        await deleteScience.mutateAsync(deleteTarget.student.id);
      }
    } catch (e) {
      // handled by hook
    }
    setDeleteTarget(null);
  };

  const handleRestoreToPhd = async () => {
    if (!deleteTarget) return;
    try {
      await restoreToPhd.mutateAsync({
        student: deleteTarget.student,
        defenseType: deleteTarget.type as DefenseStageType,
      });
    } catch (e) {
      // handled by hook
    }
    setDeleteTarget(null);
  };

  const handleUpdateStatus = async (student: DefenseStageStudent, newStatus: DefenseStageStatus) => {
    const mutation = activeTab === "phd_lmd" ? updateLmd : updateScience;
    await mutation.mutateAsync({ id: student.id, stage_status: newStatus });
  };

  const handleExportExcel = useCallback(async () => {
    if (filteredStudents.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const typeName = activeTab === "phd_lmd" ? "دكتوراه ل م د" : "دكتوراه علوم";
      const sheet = workbook.addWorksheet(`طور المناقشة - ${typeName}`);

      const columns = [
        { header: "الاسم بالعربية", key: "full_name_ar", width: 30 },
        { header: "الاسم بالفرنسية", key: "full_name_fr", width: 30 },
        { header: "رقم التسجيل", key: "registration_number", width: 18 },
        { header: "تاريخ الميلاد", key: "date_of_birth", width: 15 },
        { header: "مكان الميلاد", key: "birthplace_ar", width: 20 },
        { header: "الجنس", key: "gender", width: 10 },
        { header: "الكلية", key: "faculty_ar", width: 25 },
        { header: "الميدان", key: "field_ar", width: 20 },
        { header: "الشعبة", key: "branch_ar", width: 20 },
        { header: "التخصص", key: "specialty_ar", width: 25 },
        { header: "المشرف", key: "supervisor_ar", width: 25 },
        { header: "المشرف المساعد", key: "co_supervisor_ar", width: 25 },
        { header: "عنوان الأطروحة", key: "thesis_title_ar", width: 40 },
        { header: "سنة أول تسجيل", key: "first_registration_year", width: 18 },
        { header: "مخبر البحث", key: "research_lab_ar", width: 25 },
        { header: "رئيس اللجنة", key: "jury_president_ar", width: 25 },
        { header: "أعضاء اللجنة", key: "jury_members_ar", width: 40 },
        { header: "تاريخ المجلس العلمي", key: "scientific_council_date", width: 20 },
        { header: "تاريخ المناقشة", key: "defense_date", width: 18 },
        { header: "الحالة", key: "stage_status", width: 18 },
        { header: "رقم القرار 961", key: "decision_number", width: 18 },
        { header: "تاريخ القرار 961", key: "decision_date", width: 18 },
        { header: "رقم القرار 962", key: "auth_decision_number", width: 18 },
        { header: "تاريخ القرار 962", key: "auth_decision_date", width: 18 },
      ];

      sheet.columns = columns;
      sheet.views = [{ rightToLeft: true }];

      // Style header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 28;

      filteredStudents.forEach((s) => {
        const formatDate = (d: string | null) => {
          if (!d) return "";
          const date = new Date(d);
          if (isNaN(date.getTime())) return d;
          return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
        };

        sheet.addRow({
          full_name_ar: s.full_name_ar,
          full_name_fr: s.full_name_fr || "",
          registration_number: s.registration_number,
          date_of_birth: formatDate(s.date_of_birth),
          birthplace_ar: s.birthplace_ar,
          gender: s.gender === "male" ? "ذكر" : s.gender === "female" ? "أنثى" : s.gender || "",
          faculty_ar: s.faculty_ar,
          field_ar: s.field_ar,
          branch_ar: s.branch_ar,
          specialty_ar: s.specialty_ar,
          supervisor_ar: s.supervisor_ar,
          co_supervisor_ar: s.co_supervisor_ar || "",
          thesis_title_ar: s.thesis_title_ar || "",
          first_registration_year: s.first_registration_year || "",
          research_lab_ar: s.research_lab_ar || "",
          jury_president_ar: s.jury_president_ar,
          jury_members_ar: s.jury_members_ar,
          scientific_council_date: formatDate(s.scientific_council_date),
          defense_date: formatDate(s.defense_date),
          stage_status: stageStatusLabels[s.stage_status]?.ar || s.stage_status,
          decision_number: s.decision_number || "",
          decision_date: s.decision_date || "",
          auth_decision_number: s.auth_decision_number || "",
          auth_decision_date: s.auth_decision_date || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `طور_المناقشة_${typeName.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${filteredStudents.length} طالب بنجاح`);
    } catch (err) {
      console.error(err);
      toast.error("فشل في تصدير البيانات");
    }
  }, [filteredStudents, activeTab]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            طلبة في طور المناقشة
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة إجراءات المناقشة - مقرر اللجنة وترخيص المناقشة
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2" disabled={students.length === 0}>
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button onClick={() => setShowStartDialog(true)} className="gap-2">
            <Scale className="h-4 w-4" />
            بدء إجراءات المناقشة
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="phd_lmd" className="gap-2">
              دكتوراه ل م د
              <Badge variant="secondary" className="text-xs">{lmdStudents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="phd_science" className="gap-2">
              دكتوراه علوم
              <Badge variant="secondary" className="text-xs">{scienceStudents.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رقم التسجيل..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pr-10"
            />
          </div>
          <ColumnVisibilityDialog
            columns={defenseColumns}
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
            onSelectAll={setAllVisible}
            onReset={resetToDefaults}
            visibleCount={visibleCount}
          />
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">جاري تحميل البيانات...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Scale className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">لا يوجد طلبة في طور المناقشة</p>
              <p className="text-sm mt-2">اضغط على "بدء إجراءات المناقشة" لإضافة طالب</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                   <TableHeader>
                    <TableRow>
                      {isVisible("full_name_ar") && <TableHead className="text-right">الاسم بالعربية</TableHead>}
                      {isVisible("full_name_fr") && <TableHead className="text-right">الاسم بالفرنسية</TableHead>}
                      {isVisible("specialty_ar") && <TableHead className="text-right">التخصص</TableHead>}
                      {isVisible("faculty_ar") && <TableHead className="text-right">الكلية</TableHead>}
                      {isVisible("supervisor_ar") && <TableHead className="text-right">المشرف</TableHead>}
                      {isVisible("first_registration_year") && <TableHead className="text-right">سنة أول تسجيل</TableHead>}
                      {isVisible("registration_count") && <TableHead className="text-right">عدد التسجيلات</TableHead>}
                      {isVisible("registration_status") && <TableHead className="text-right">حالة التسجيل</TableHead>}
                      {isVisible("scientific_council_date") && <TableHead className="text-right">تاريخ المجلس العلمي</TableHead>}
                      {isVisible("duration") && <TableHead className="text-right">المدة منذ المصادقة</TableHead>}
                      {isVisible("stage_status") && <TableHead className="text-right">الحالة</TableHead>}
                      <TableHead className="text-right w-12">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow key={student.id}>
                        {isVisible("full_name_ar") && <TableCell className="font-medium">{student.full_name_ar}</TableCell>}
                        {isVisible("full_name_fr") && <TableCell className="text-muted-foreground">{student.full_name_fr || "-"}</TableCell>}
                        {isVisible("specialty_ar") && <TableCell>{student.specialty_ar}</TableCell>}
                        {isVisible("faculty_ar") && <TableCell>{student.faculty_ar}</TableCell>}
                        {isVisible("supervisor_ar") && <TableCell className="text-muted-foreground">{student.supervisor_ar}</TableCell>}
                        {isVisible("first_registration_year") && <TableCell>{student.first_registration_year || "-"}</TableCell>}
                        {isVisible("registration_count") && <TableCell>
                          {(() => {
                            if (!student.first_registration_year) return "-";
                            let refYear: number;
                            if (student.scientific_council_date) {
                              const scDate = new Date(student.scientific_council_date);
                              refYear = scDate.getMonth() >= 8 ? scDate.getFullYear() : scDate.getFullYear() - 1;
                            } else if (student.defense_date) {
                              const dDate = new Date(student.defense_date);
                              refYear = dDate.getMonth() >= 8 ? dDate.getFullYear() : dDate.getFullYear() - 1;
                            } else {
                              const now = new Date();
                              refYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                            }
                            const refAcYear = `${refYear}/${refYear + 1}`;
                            const phdType = activeTab === "phd_lmd" ? "phd_lmd" : "phd_science";
                            const details = calculateRegistrationDetails(refAcYear, student.first_registration_year, phdType as any);
                            return details.registrationCount ?? "-";
                          })()}
                        </TableCell>}
                        {isVisible("registration_status") && <TableCell>
                          {(() => {
                            if (!student.first_registration_year) return "-";
                            let refYear: number;
                            if (student.scientific_council_date) {
                              const scDate = new Date(student.scientific_council_date);
                              refYear = scDate.getMonth() >= 8 ? scDate.getFullYear() : scDate.getFullYear() - 1;
                            } else if (student.defense_date) {
                              const dDate = new Date(student.defense_date);
                              refYear = dDate.getMonth() >= 8 ? dDate.getFullYear() : dDate.getFullYear() - 1;
                            } else {
                              const now = new Date();
                              refYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                            }
                            const refAcYear = `${refYear}/${refYear + 1}`;
                            const phdType = activeTab === "phd_lmd" ? "phd_lmd" : "phd_science";
                            const details = calculateRegistrationDetails(refAcYear, student.first_registration_year, phdType as any);
                            if (details.registrationCount === null) return "-";
                            return (
                              <Badge variant="outline" className={details.isLate ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-500/10 text-green-600 border-green-500/20"}>
                                {details.isLate ? "متأخر" : "منتظم"}
                              </Badge>
                            );
                          })()}
                        </TableCell>}
                        {isVisible("scientific_council_date") && <TableCell>
                          {(() => {
                            const duration = getDurationSinceCouncil(student.scientific_council_date, student.stage_status);
                            const dateColor = duration ? duration.color : 'text-foreground';
                            if (!student.scientific_council_date) return "-";
                            const d = new Date(student.scientific_council_date);
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            return <span className={dateColor}>{`${day}/${month}/${year}`}</span>;
                          })()}
                        </TableCell>}
                        {isVisible("duration") && <TableCell>
                          {(() => {
                            const duration = getDurationSinceCouncil(student.scientific_council_date, student.stage_status);
                            if (!duration) return "-";
                            return <span className={`font-medium ${duration.color}`}>{duration.text}</span>;
                          })()}
                        </TableCell>}
                        {isVisible("stage_status") && <TableCell>
                          <Badge
                            variant="outline"
                            className={stageStatusLabels[student.stage_status]?.color}
                          >
                            {stageStatusLabels[student.stage_status]?.ar}
                          </Badge>
                        </TableCell>}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDocGenTarget({ student, documentType: "jury_decision" })}>
                                <FilePlus className="h-4 w-4 ml-2" />
                                توليد مقرر تعيين اللجنة
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDocGenTarget({ student, documentType: "defense_auth" })}>
                                <FileText className="h-4 w-4 ml-2" />
                                توليد ترخيص المناقشة
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDocGenTarget({ student, documentType: "defense_minutes" })}>
                                <ClipboardList className="h-4 w-4 ml-2" />
                                توليد محضر المناقشة
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditTarget(student)}>
                                <Pencil className="h-4 w-4 ml-2" />
                                تعديل البيانات
                              </DropdownMenuItem>
                              {student.stage_status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(student, 'under_review')}>
                                  <CheckCircle className="h-4 w-4 ml-2" />
                                  قيد الخبرة
                                </DropdownMenuItem>
                              )}
                              {(student.stage_status === 'pending' || student.stage_status === 'under_review') && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(student, 'authorized')}>
                                  <CheckCircle className="h-4 w-4 ml-2" />
                                  ترخيص المناقشة
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleUpdateStatus(student, 'defended')}>
                                <CheckCircle className="h-4 w-4 ml-2" />
                                انتهت إجراءات المناقشة
                              </DropdownMenuItem>
                              {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget({
                                  student,
                                  type: activeTab,
                                })}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} من {filteredStudents.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StartDefenseProcedureDialog open={showStartDialog} onOpenChange={setShowStartDialog} />

      <GenerateDocumentDialog
        open={!!docGenTarget}
        onOpenChange={(open) => !open && setDocGenTarget(null)}
        student={docGenTarget?.student || null}
        studentType={activeTab as DefenseStageType}
        documentType={docGenTarget?.documentType || "jury_decision"}
      />

      <EditDefenseStageDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        student={editTarget}
        studentType={activeTab as DefenseStageType}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف من طور المناقشة</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ماذا تريد أن تفعل بالطالب <strong className="text-foreground">{deleteTarget?.student.full_name_ar}</strong>؟
                </p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-3"
                    onClick={handleRestoreToPhd}
                    disabled={restoreToPhd.isPending}
                  >
                    <Undo2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="text-right">
                      <div className="font-medium">إرجاع إلى قاعدة بيانات طلبة الدكتوراه</div>
                      <div className="text-xs text-muted-foreground">سيتم نقل الطالب مع الحفاظ على بياناته</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-3 border-destructive/30 hover:bg-destructive/5"
                    onClick={handleDelete}
                    disabled={deleteLmd.isPending || deleteScience.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                    <div className="text-right">
                      <div className="font-medium text-destructive">حذف نهائياً</div>
                      <div className="text-xs text-muted-foreground">سيتم حذف الطالب بشكل دائم ولا يمكن التراجع</div>
                    </div>
                  </Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
