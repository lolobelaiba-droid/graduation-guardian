import { useState } from "react";
import { Loader2, Undo2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { CertificateType, Certificate } from "@/types/certificates";

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Certificate | null;
  certificateType: CertificateType;
  onDeletePermanently: () => void;
  onRestoreToDatabase: () => void;
  isDeleting: boolean;
  isRestoring: boolean;
}

export function DeleteStudentDialog({
  open,
  onOpenChange,
  student,
  certificateType,
  onDeletePermanently,
  onRestoreToDatabase,
  isDeleting,
  isRestoring,
}: DeleteStudentDialogProps) {
  const [deleteOption, setDeleteOption] = useState<"restore" | "permanent">("restore");

  // Check if it's a PhD type (can be restored) or Master (only permanent delete)
  const isPhdType = certificateType === "phd_lmd" || certificateType === "phd_science";
  const isLoading = isDeleting || isRestoring;

  const handleConfirm = () => {
    if (deleteOption === "restore" && isPhdType) {
      onRestoreToDatabase();
    } else {
      onDeletePermanently();
    }
  };

  const getTypeLabel = () => {
    switch (certificateType) {
      case "phd_lmd":
        return "دكتوراه ل م د";
      case "phd_science":
        return "دكتوراه علوم";
      case "master":
        return "ماجستير";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            حذف طالب من قاعدة البيانات
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            {student && (
              <span className="block mb-3 font-medium text-foreground">
                {student.full_name_ar}
              </span>
            )}
            {isPhdType ? (
              <span>اختر طريقة الحذف المناسبة:</span>
            ) : (
              <span>سيتم حذف هذا الطالب نهائياً ولا يمكن التراجع عن هذا الإجراء.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isPhdType && (
          <div className="py-4">
            <RadioGroup
              value={deleteOption}
              onValueChange={(v) => setDeleteOption(v as "restore" | "permanent")}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="restore" id="restore" className="mt-1" />
                <Label htmlFor="restore" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Undo2 className="h-4 w-4 text-primary" />
                    إرجاع إلى قاعدة بيانات طلبة الدكتوراه
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    سيتم نقل الطالب إلى قاعدة بيانات طلبة {getTypeLabel()} مع الاحتفاظ ببياناته الأساسية
                  </p>
                </Label>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors">
                <RadioGroupItem value="permanent" id="permanent" className="mt-1" />
                <Label htmlFor="permanent" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium text-destructive">
                    <Trash2 className="h-4 w-4" />
                    حذف نهائي
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    سيتم حذف الطالب نهائياً ولا يمكن استرجاعه
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            variant={deleteOption === "permanent" || !isPhdType ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التنفيذ...
              </>
            ) : deleteOption === "restore" && isPhdType ? (
              <>
                <Undo2 className="h-4 w-4" />
                إرجاع الطالب
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                حذف نهائي
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
