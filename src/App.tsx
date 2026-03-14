import { useEffect, useState } from "react";
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
import { isElectron } from "@/lib/database/db-client";

const queryClient = new QueryClient();

// التحقق من بيئة Electron
const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronAPI;

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!isElectronEnv);

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
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
