import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { setCurrentUserName } from "@/lib/current-user-store";
import { getDbClient, isElectron } from "@/lib/database/db-client";

export interface AppUser {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "employee";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login: string | null;
  avatar_url?: string | null;
  custom_permissions?: Record<string, boolean> | null;
}

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  isAdmin: false,
  logout: () => {},
});

const REFRESH_INTERVAL = 30_000; // 30 ثانية

export function AuthProvider({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync global store whenever currentUser changes
  useEffect(() => {
    setCurrentUserName(currentUser?.display_name || "النظام");
  }, [currentUser]);

  // مزامنة دورية لبيانات المستخدم (الصلاحيات، الحالة...) من ملف المستخدمين
  useEffect(() => {
    if (!currentUser || !isElectron()) return;
    // لا تقم بالمزامنة للمستخدمين المحليين/الويب
    if (["web-user", "local-admin", "fallback-admin", "legacy-admin"].includes(currentUser.id)) return;

    const refreshUser = async () => {
      try {
        const dbAny = getDbClient() as any;
        if (!dbAny?.refreshUserData) return;
        const result = await dbAny.refreshUserData(currentUser.id);
        if (result.success && result.user) {
          const updated = result.user as AppUser;
          // تحقق من وجود تغيير فعلي قبل التحديث لتجنب إعادة الرسم
          const permChanged = JSON.stringify(updated.custom_permissions) !== JSON.stringify(currentUser.custom_permissions);
          const roleChanged = updated.role !== currentUser.role;
          const activeChanged = updated.is_active !== currentUser.is_active;
          if (permChanged || roleChanged || activeChanged) {
            console.log("[AuthContext] User data refreshed - permissions/role/status updated");
            setCurrentUser(prev => prev ? { ...prev, custom_permissions: updated.custom_permissions, role: updated.role, is_active: updated.is_active } : null);
          }
        }
      } catch (e) {
        // تجاهل الأخطاء - ستتم المحاولة مرة أخرى
      }
    };

    intervalRef.current = setInterval(refreshUser, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentUserName("النظام");
    onLogout?.();
  }, [onLogout]);

  const isAdmin = currentUser?.role === "admin";

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
