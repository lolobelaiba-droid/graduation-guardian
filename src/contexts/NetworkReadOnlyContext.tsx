import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { toast } from "sonner";

const isElectronEnv = typeof window !== "undefined" && !!(window as any).electronAPI;

interface NetworkReadOnlyContextType {
  /** true = الشبكة مقطوعة والجهاز فرعي → وضع القراءة فقط */
  isReadOnly: boolean;
  /** سبب القراءة فقط */
  readOnlyReason: string | null;
  /** تحديث الحالة يدوياً */
  setDisconnected: (val: boolean) => void;
  /** تحقق قبل أي عملية كتابة، يُرجع true إذا مسموح */
  guardWrite: (actionLabel?: string) => boolean;
}

const NetworkReadOnlyContext = createContext<NetworkReadOnlyContextType>({
  isReadOnly: false,
  readOnlyReason: null,
  setDisconnected: () => {},
  guardWrite: () => true,
});

export function NetworkReadOnlyProvider({ children }: { children: ReactNode }) {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isSecondaryDevice, setIsSecondaryDevice] = useState(false);

  // التحقق إذا كان الجهاز فرعي (يستخدم مسار شبكي)
  useEffect(() => {
    if (!isElectronEnv) return;
    const api = (window as any).electronAPI;
    
    api.db?.getNetworkConfig?.().then((result: any) => {
      if (result?.success && result.data?.shared_path) {
        const path = result.data.shared_path;
        // المسار الشبكي يبدأ بـ \\ أو // (UNC path)
        const isNetworkPath = path.startsWith("\\\\") || path.startsWith("//");
        setIsSecondaryDevice(isNetworkPath);
      }
    }).catch(() => {});
  }, []);

  // الاستماع لأحداث الشبكة
  useEffect(() => {
    if (!isElectronEnv) return;
    const api = (window as any).electronAPI;

    api.startNetworkMonitor?.();

    const cleanupError = api.onNetworkError?.(() => {
      setIsDisconnected(true);
    });

    const cleanupRestored = api.onNetworkRestored?.(() => {
      setIsDisconnected(false);
    });

    return () => {
      cleanupError?.();
      cleanupRestored?.();
    };
  }, []);

  const isReadOnly = isElectronEnv && isSecondaryDevice && isDisconnected;
  const readOnlyReason = isReadOnly ? "انقطع الاتصال بالمجلد المشترك. الكتابة معطلة حتى استعادة الاتصال." : null;

  const guardWrite = useCallback((actionLabel?: string): boolean => {
    if (isReadOnly) {
      toast.error("وضع القراءة فقط", {
        description: `لا يمكن ${actionLabel || "تنفيذ هذا الإجراء"} أثناء انقطاع الاتصال بالشبكة.`,
        duration: 4000,
      });
      return false;
    }
    return true;
  }, [isReadOnly]);

  return (
    <NetworkReadOnlyContext.Provider value={{ 
      isReadOnly, 
      readOnlyReason, 
      setDisconnected: setIsDisconnected,
      guardWrite 
    }}>
      {children}
    </NetworkReadOnlyContext.Provider>
  );
}

export function useNetworkReadOnly() {
  return useContext(NetworkReadOnlyContext);
}
