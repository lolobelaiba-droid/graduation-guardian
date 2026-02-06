import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import PhdStudents from "@/pages/PhdStudents";
import Templates from "@/pages/Templates";
import PrintCertificates from "@/pages/PrintCertificates";
import ActivityLog from "@/pages/ActivityLog";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// التحقق من بيئة Electron
const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronAPI;

const App = () => {
  useEffect(() => {
    // في بيئة Electron، لا نحتاج لـ beforeunload لأن Electron يتعامل مع الإغلاق
    if (isElectronEnv) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "هل أنت متأكد من إغلاق التطبيق؟ تأكد من حفظ نسخة احتياطية من بياناتك قبل الإغلاق.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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
            <Route path="/students" element={<Students />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/print" element={<PrintCertificates />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
