import { useEffect, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import PhdStudents from "@/pages/PhdStudents";
import DefenseStage from "@/pages/DefenseStage";
import Templates from "@/pages/Templates";
import PrintCertificates from "@/pages/PrintCertificates";
import ActivityLog from "@/pages/ActivityLog";
import Settings from "@/pages/Settings";
import Notes from "@/pages/Notes";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/NotFound";
import LoginScreen from "@/components/auth/LoginScreen";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const queryClient = new QueryClient();

// التحقق من بيئة Electron
const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronAPI;

function AutoLogoutWrapper({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [timeoutMinutes, setTimeoutMinutes] = useState<0 | 15 | 30>(0);

  useEffect(() => {
    if (!isElectronEnv) return;
    const db = getDbClient();
    if (!db) return;
    db.getSetting("auto_logout_minutes").then((result: any) => {
      if (result?.success && result.data?.value) {
        const val = parseInt(result.data.value);
        if (val === 15 || val === 30) setTimeoutMinutes(val);
      }
    }).catch(() => {});

    // الاستماع لتغيير الإعداد
    const handler = () => {
      db.getSetting("auto_logout_minutes").then((result: any) => {
        if (result?.success && result.data?.value) {
          const val = parseInt(result.data.value);
          if (val === 0 || val === 15 || val === 30) setTimeoutMinutes(val);
        } else {
          setTimeoutMinutes(0);
        }
      }).catch(() => {});
    };
    window.addEventListener("auto-logout-setting-changed", handler);
    return () => window.removeEventListener("auto-logout-setting-changed", handler);
  }, []);

  useAutoLogout(timeoutMinutes, onLogout);

  return <>{children}</>;
}

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!isElectronEnv);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (isElectronEnv) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "هل أنت متأكد من إغلاق التطبيق؟ تأكد من حفظ نسخة احتياطية من بياناتك قبل الإغلاق.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // في بيئة Electron، عرض شاشة الدخول أولاً
  if (isElectronEnv && !isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LoginScreen onAuthenticated={() => setIsAuthenticated(true)} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AutoLogoutWrapper onLogout={handleLogout}>
        <HashRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/phd-students" element={<PhdStudents />} />
              <Route path="/defense-stage" element={<DefenseStage />} />
              <Route path="/students" element={<Students />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/print" element={<PrintCertificates />} />
              <Route path="/activity" element={<ActivityLog />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notes" element={<Notes />} />
              
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </HashRouter>
      </AutoLogoutWrapper>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
