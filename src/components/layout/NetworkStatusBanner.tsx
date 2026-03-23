import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff, Settings, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNetworkReadOnly } from "@/contexts/NetworkReadOnlyContext";

const isElectronEnv = typeof window !== "undefined" && !!(window as any).electronAPI;

export function NetworkStatusBanner() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isReadOnly, setDisconnected } = useNetworkReadOnly();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isElectronEnv) return;

    const api = (window as any).electronAPI;
    api.startNetworkMonitor?.();

    const cleanupError = api.onNetworkError?.(() => {
      setDisconnected(true);
      setShowBanner(true);
      setDismissed(false);
      toast({
        variant: "destructive",
        title: "⚠️ فشل الاتصال بالمجلد المشترك!",
        description: "تم تفعيل وضع القراءة فقط. لا يمكن إجراء أي تعديلات حتى استعادة الاتصال.",
        duration: 10000,
      });
    });

    const cleanupRestored = api.onNetworkRestored?.(() => {
      setDisconnected(false);
      setShowBanner(false);
      toast({
        title: "✅ تم استعادة الاتصال بالشبكة",
        description: "تم إلغاء وضع القراءة فقط. يمكنك متابعة العمل بشكل طبيعي.",
        duration: 5000,
      });
    });

    return () => {
      cleanupError?.();
      cleanupRestored?.();
    };
  }, [toast, setDisconnected]);

  if (!isElectronEnv || !showBanner || dismissed) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 rounded-full bg-destructive/20 p-1.5">
          {isReadOnly ? (
            <ShieldAlert className="h-4 w-4 text-destructive" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive truncate">
            {isReadOnly
              ? "⛔ وضع القراءة فقط — الكتابة معطلة"
              : "انقطع الاتصال بالمجلد المشترك"}
          </p>
          <p className="text-xs text-destructive/70 truncate">
            {isReadOnly
              ? "لا يمكن إضافة أو تعديل أو حذف البيانات حتى استعادة الاتصال بالشبكة"
              : "قد يكون عنوان IP الجهاز الرئيسي قد تغير أو أن الشبكة مقطوعة"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5 text-xs"
          onClick={() => navigate("/settings?tab=network")}
        >
          <Settings className="h-3.5 w-3.5" />
          تحديث الإعدادات
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive/60 hover:text-destructive"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
