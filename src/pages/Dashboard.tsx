import { Users, GraduationCap, Award, Database } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { FacultyChart } from "@/components/dashboard/FacultyChart";
import { CertificateTypeChart } from "@/components/dashboard/CertificateTypeChart";
import { GenderChart } from "@/components/dashboard/GenderChart";
import { AverageRegistrationYears } from "@/components/dashboard/AverageRegistrationYears";
import { ThemeSelector } from "@/components/dashboard/ThemeSelector";
import { ExportStatsDialog } from "@/components/dashboard/ExportStatsDialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUniversitySettings } from "@/hooks/useUniversitySettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: universitySettings } = useUniversitySettings();

  const universityName = universitySettings?.universityName || "جامعة العربي بن مهيدي أم البواقي";
  const subTitle = "نيابة المديرية للدراسات العليا والبحث العلمي";

  return (
    <div className="space-y-8">
      {/* University Header */}
      <div className="bg-card rounded-2xl shadow-card p-6 border border-border">
        <div className="flex items-center justify-center gap-6">
          {universitySettings?.universityLogo && (
            <img 
              src={universitySettings.universityLogo} 
              alt="شعار الجامعة" 
              className="w-20 h-20 object-contain"
            />
          )}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              {universityName}
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              {subTitle}
            </p>
          </div>
          {universitySettings?.universityLogo && (
            <img 
              src={universitySettings.universityLogo} 
              alt="شعار الجامعة" 
              className="w-20 h-20 object-contain opacity-0 md:opacity-100"
            />
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">لوحة التحكم</h2>
          <p className="text-muted-foreground mt-1">
            مرحباً بك في نظام إدارة شهادات الدكتوراه
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ThemeSelector />
          <ExportStatsDialog />
          <Link to="/print">
            <Button size="lg" className="gap-2 shadow-lg">
              طباعة شهادة جديدة
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Grid - Split by Data Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PhD Candidates Stats */}
        <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Database className="h-5 w-5" />
            <h2 className="text-lg font-semibold">قاعدة بيانات طلبة الدكتوراه</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="إجمالي الطلبة"
              value={isLoading ? "..." : stats?.totalPhdCandidates || 0}
              subtitle="طالب دكتوراه"
              icon={Users}
              variant="blue"
              compact
            />
            <StatCard
              title="دكتوراه ل م د"
              value={isLoading ? "..." : stats?.phdLmdCandidatesCount || 0}
              subtitle="طالب"
              icon={GraduationCap}
              variant="green"
              compact
            />
            <StatCard
              title="دكتوراه علوم"
              value={isLoading ? "..." : stats?.phdScienceCandidatesCount || 0}
              subtitle="طالب"
              icon={GraduationCap}
              variant="orange"
              compact
            />
          </div>
        </div>

        {/* Defended Students Stats */}
        <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            <h2 className="text-lg font-semibold">قاعدة بيانات الطلبة المناقشين</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="إجمالي المناقشين"
              value={isLoading ? "..." : stats?.totalDefendedStudents || 0}
              subtitle="طالب ناقش"
              icon={Award}
              variant="purple"
              compact
            />
            <StatCard
              title="دكتوراه ل م د"
              value={isLoading ? "..." : stats?.phdLmdDefendedCount || 0}
              subtitle="شهادة"
              icon={GraduationCap}
              variant="green"
              compact
            />
            <StatCard
              title="دكتوراه علوم"
              value={isLoading ? "..." : stats?.phdScienceDefendedCount || 0}
              subtitle="شهادة"
              icon={GraduationCap}
              variant="orange"
              compact
            />
          </div>
        </div>
      </div>

      {/* Charts with Tabs for Data Source */}
      <Tabs defaultValue="candidates" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="candidates" className="gap-2">
            <Database className="h-4 w-4" />
            طلبة الدكتوراه
          </TabsTrigger>
          <TabsTrigger value="defended" className="gap-2">
            <Award className="h-4 w-4" />
            الطلبة المناقشين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CertificateTypeChart dataSource="candidates" />
            <GenderChart dataSource="candidates" />
            <FacultyChart dataSource="candidates" />
          </div>
        </TabsContent>

        <TabsContent value="defended" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CertificateTypeChart dataSource="defended" />
            <GenderChart dataSource="defended" />
            <FacultyChart dataSource="defended" />
          </div>
          {/* Average Registration Years - Only for defended students */}
          <div className="grid grid-cols-1 gap-6 mt-6">
            <AverageRegistrationYears />
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          الحقوق محفوظة © نيابة مديرية الجامعة للبحث العلمي 2026 - جامعة أم البواقي
        </p>
      </footer>
    </div>
  );
}
