import { useState } from "react";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  useCertificateTemplates,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/hooks/useCertificates";
import {
  certificateTypeLabels,
  languageLabels,
  type CertificateType,
  type TemplateLanguage,
} from "@/types/certificates";

const typeColors: Record<CertificateType, string> = {
  phd_lmd: "bg-primary/10 text-primary border-primary/20",
  phd_science: "bg-success/10 text-success border-success/20",
  master: "bg-warning/10 text-warning border-warning/20",
};

export default function Templates() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { data: templates = [], isLoading, error } = useCertificateTemplates();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateTemplate.mutate({ id, is_active: !currentStatus });
  };

  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">خطأ في تحميل البيانات: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة القوالب</h1>
          <p className="text-muted-foreground mt-1">
            إنشاء وتعديل قوالب الشهادات الجامعية
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          إنشاء قالب جديد
        </Button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <p>لا توجد قوالب حتى الآن</p>
          <Button size="sm" className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            إنشاء قالب جديد
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, index) => (
            <div
              key={template.id}
              className={cn(
                "bg-card rounded-2xl shadow-card p-6 transition-all duration-300 hover:shadow-elevated animate-fade-in",
                !template.is_active && "opacity-60"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem className="gap-2">
                      <Eye className="h-4 w-4" />
                      معاينة
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Edit className="h-4 w-4" />
                      تحرير
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => handleToggleActive(template.id, template.is_active)}
                    >
                      {template.is_active ? (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          تعطيل
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          تفعيل
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={() => handleDeleteClick(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2">{template.template_name}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className={typeColors[template.certificate_type as CertificateType]}>
                  {certificateTypeLabels[template.certificate_type as CertificateType]?.ar || template.certificate_type}
                </Badge>
                <Badge variant="outline" className="bg-muted">
                  {languageLabels[template.language as TemplateLanguage]?.ar || template.language}
                </Badge>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                <span>{template.page_orientation === "portrait" ? "عمودي" : "أفقي"}</span>
                <span>{new Date(template.created_at).toLocaleDateString("ar-SA")}</span>
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    template.is_active ? "bg-success" : "bg-muted-foreground"
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {template.is_active ? "مفعّل" : "معطّل"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا القالب نهائياً ولا يمكن التراجع عن هذا الإجراء.
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
