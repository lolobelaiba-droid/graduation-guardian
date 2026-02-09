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
      {/* University Header - Modern Design */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full -translate-x-16 -translate-y-16 blur-2xl" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/15 rounded-full translate-x-12 translate-y-12 blur-xl" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-6">
            {/* Logo Container */}
            {universitySettings?.universityLogo ? (
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md scale-110" />
                <div className="relative w-20 h-20 md:w-24 md:h-24 bg-card rounded-2xl shadow-lg border border-primary/20 p-3 flex items-center justify-center">
                  <img 
                    src={universitySettings.universityLogo} 
                    alt="شعار الجامعة" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md scale-110" />
                <div className="relative w-20 h-20 md:w-24 md:h-24 bg-card rounded-2xl shadow-lg border border-primary/20 p-3 flex items-center justify-center">
                  <GraduationCap className="w-12 h-12 md:w-14 md:h-14 text-primary" />
                </div>
              </div>
            )}
            
            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                {universityName}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 w-12 bg-gradient-to-l from-primary to-primary/50 rounded-full" />
                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  {subTitle}
                </p>
              </div>
            </div>
          </div>
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
