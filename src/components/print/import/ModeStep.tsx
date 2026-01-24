import { Database, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImportMode } from "./types";

interface ModeStepProps {
  existingCount: number;
  newCount: number;
  onModeSelect: (mode: ImportMode) => void;
  onBack: () => void;
}

export function ModeStep({ existingCount, newCount, onModeSelect, onBack }: ModeStepProps) {
  return (
    <div className="space-y-6">
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          يوجد حالياً <strong>{existingCount}</strong> سجل في قاعدة البيانات. 
          أنت على وشك استيراد <strong>{newCount}</strong> سجل جديد.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Append Option */}
        <div 
          className="border-2 rounded-xl p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
          onClick={() => onModeSelect("append")}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <Plus className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">إضافة إلى البيانات الموجودة</h3>
              <p className="text-sm text-muted-foreground">
                سيتم إضافة السجلات الجديدة مع الاحتفاظ بجميع البيانات الحالية
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded-full">
              <Database className="h-4 w-4" />
              <span>{existingCount} + {newCount} = {existingCount + newCount} سجل</span>
            </div>
          </div>
        </div>

        {/* Replace Option */}
        <div 
          className="border-2 rounded-xl p-6 cursor-pointer hover:border-destructive hover:bg-destructive/5 transition-all group"
          onClick={() => onModeSelect("replace")}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <RefreshCw className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">استبدال جميع البيانات</h3>
              <p className="text-sm text-muted-foreground">
                سيتم حذف جميع البيانات الحالية واستبدالها بالسجلات الجديدة
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive px-3 py-1.5 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              <span>حذف {existingCount} → إضافة {newCount} سجل</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start pt-4">
        <Button variant="outline" onClick={onBack}>
          رجوع
        </Button>
      </div>
    </div>
  );
}
