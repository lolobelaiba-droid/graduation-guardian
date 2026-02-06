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
  Loader2,
  RefreshCw,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useActivityLog, useDeleteOldActivities, activityTypeLabels, activityTypeIcons, type ActivityType } from "@/hooks/useActivityLog";
import { toWesternNumerals } from "@/lib/numerals";

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

// Map activity types to icon types
const activityTypeToIcon: Record<ActivityType, keyof typeof typeIcons> = {
  student_added: "create",
  student_updated: "edit",
  student_deleted: "delete",
  template_added: "create",
  template_updated: "edit",
  template_deleted: "delete",
  certificate_printed: "print",
  settings_updated: "edit",
  backup_created: "create",
};

export default function ActivityLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<typeof activities[0] | null>(null);

  const { data: activities = [], isLoading, refetch } = useActivityLog();
  const deleteOldActivities = useDeleteOldActivities();

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.description.includes(searchQuery);
    const matchesType = selectedType === "all" || activity.activity_type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return toWesternNumerals(formatted);
  };

  const handleDeleteOld = () => {
    deleteOldActivities.mutate(30, {
      onSuccess: () => {
        setShowDeleteDialog(false);
      },
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
            حذف السجلات القديمة
          </Button>
        </div>
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
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {Object.entries(activityTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-semibold w-32">النوع</TableHead>
                  <TableHead className="text-right font-semibold">الوصف</TableHead>
                  <TableHead className="text-right font-semibold">المعرّف</TableHead>
                  <TableHead className="text-right font-semibold">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold">المستخدم</TableHead>
                  <TableHead className="text-right font-semibold w-20">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد أنشطة مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivities.map((activity, index) => {
                    const iconType = activityTypeToIcon[activity.activity_type];
                    const Icon = typeIcons[iconType];
                    return (
                      <TableRow
                        key={activity.id}
                        className="hover:bg-muted/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("gap-1", typeColors[iconType])}
                          >
                            <Icon className="h-3 w-3" />
                            {activityTypeLabels[activity.activity_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2">{activity.description}</p>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {activity.entity_id ? toWesternNumerals(activity.entity_id.slice(0, 8)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {activity.created_at ? formatDate(activity.created_at) : "-"}
                        </TableCell>
                        <TableCell>{activity.created_by || "-"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                            <DropdownMenuItem className="gap-2" onClick={() => setSelectedActivity(activity)}>
                                <Eye className="h-4 w-4" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {toWesternNumerals(filteredActivities.length)} من {toWesternNumerals(activities.length)} سجل
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السجلات القديمة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف جميع السجلات الأقدم من 30 يوماً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOld}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteOldActivities.isPending}
            >
              {deleteOldActivities.isPending ? "جاري الحذف..." : "حذف السجلات"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Details Dialog */}
      <AlertDialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              تفاصيل النشاط
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-right">
                {selectedActivity && (() => {
                  const iconType = activityTypeToIcon[selectedActivity.activity_type];
                  const Icon = typeIcons[iconType];
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">النوع:</span>
                        <Badge variant="outline" className={cn("gap-1", typeColors[iconType])}>
                          <Icon className="h-3 w-3" />
                          {activityTypeLabels[selectedActivity.activity_type]}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">الوصف:</span>
                        <p className="text-sm text-muted-foreground mt-1">{selectedActivity.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-sm font-medium text-foreground">المعرّف:</span>
                          <p className="text-sm text-muted-foreground font-mono mt-1">
                            {selectedActivity.entity_id ? toWesternNumerals(selectedActivity.entity_id) : "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">نوع الكيان:</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedActivity.entity_type || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-sm font-medium text-foreground">التاريخ:</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedActivity.created_at ? formatDate(selectedActivity.created_at) : "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">المستخدم:</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedActivity.created_by || "-"}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إغلاق</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
