import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { setCurrentUserName } from "@/lib/current-user-store";

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

export function AuthProvider({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Sync global store whenever currentUser changes
  useEffect(() => {
    setCurrentUserName(currentUser?.display_name || "النظام");
  }, [currentUser]);

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
