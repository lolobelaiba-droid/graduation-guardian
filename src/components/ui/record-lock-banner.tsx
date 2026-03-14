import { AlertTriangle } from "lucide-react";

interface RecordLockBannerProps {
  isLocked: boolean;
  lockedBy: string | null;
}

/**
 * شريط تحذير يظهر عند قفل السجل بواسطة جهاز آخر
 */
export function RecordLockBanner({ isLocked, lockedBy }: RecordLockBannerProps) {
  if (!isLocked) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive" dir="rtl">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">هذا السجل قيد التعديل حالياً</p>
        <p className="text-xs mt-0.5 opacity-80">
          يتم تعديله من قبل الجهاز: <span className="font-mono font-bold">{lockedBy || "غير معروف"}</span>
        </p>
      </div>
    </div>
  );
}
