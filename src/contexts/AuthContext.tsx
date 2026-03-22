import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface AppUser {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "employee";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login: string | null;
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

  const logout = useCallback(() => {
    setCurrentUser(null);
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
