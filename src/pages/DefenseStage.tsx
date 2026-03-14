import { useState, useMemo } from "react";
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
import type { DefenseStageStudent, DefenseStageStatus } from "@/types/defense-stage";
import { stageStatusLabels } from "@/types/defense-stage";

const ITEMS_PER_PAGE = 15;

export default function DefenseStage() {
  const [activeTab, setActiveTab] = useState("phd_lmd");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: lmdStudents = [], isLoading: loadingLmd } = useDefenseStageLmd();
  const { data: scienceStudents = [], isLoading: loadingScience } = useDefenseStageScience();
  const deleteLmd = useDeleteDefenseStageLmd();
  const deleteScience = useDeleteDefenseStageScience();
  const updateLmd = useUpdateDefenseStageLmd();
  const updateScience = useUpdateDefenseStageScience();

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
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "phd_lmd") {
        await deleteLmd.mutateAsync(deleteTarget.id);
      } else {
        await deleteScience.mutateAsync(deleteTarget.id);
      }
    } catch (e) {
      // handled by hook
    }
    setDeleteTarget(null);
  };

  const handleUpdateStatus = async (student: DefenseStageStudent, newStatus: DefenseStageStatus) => {
    const mutation = activeTab === "phd_lmd" ? updateLmd : updateScience;
    await mutation.mutateAsync({ id: student.id, stage_status: newStatus });
  };

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
        <Button onClick={() => setShowStartDialog(true)} className="gap-2">
          <Scale className="h-4 w-4" />
          بدء إجراءات المناقشة
        </Button>
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
                      <TableHead className="text-right">الاسم بالعربية</TableHead>
                      <TableHead className="text-right">الاسم بالفرنسية</TableHead>
                      <TableHead className="text-right">التخصص</TableHead>
                      <TableHead className="text-right">الكلية</TableHead>
                      <TableHead className="text-right">المشرف</TableHead>
                      <TableHead className="text-right">تاريخ المجلس العلمي</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right w-12">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name_ar}</TableCell>
                        <TableCell className="text-muted-foreground">{student.full_name_fr || "-"}</TableCell>
                        <TableCell>{student.specialty_ar}</TableCell>
                        <TableCell>{student.faculty_ar}</TableCell>
                        <TableCell className="text-muted-foreground">{student.supervisor_ar}</TableCell>
                        <TableCell>
                          {student.scientific_council_date
                            ? new Date(student.scientific_council_date).toLocaleDateString('ar-DZ')
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={stageStatusLabels[student.stage_status]?.color}
                          >
                            {stageStatusLabels[student.stage_status]?.ar}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {student.stage_status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(student, 'authorized')}>
                                  <CheckCircle className="h-4 w-4 ml-2" />
                                  ترخيص المناقشة
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleUpdateStatus(student, 'defended')}>
                                <FileText className="h-4 w-4 ml-2" />
                                تمت المناقشة
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget({
                                  id: student.id,
                                  name: student.full_name_ar,
                                  type: activeTab,
                                })}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الطالب <strong>{deleteTarget?.name}</strong> من طور المناقشة؟
              <br />
              <span className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
