import { Users, GraduationCap, BookOpen } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { FacultyChart } from "@/components/dashboard/FacultyChart";
import { CertificateTypeChart } from "@/components/dashboard/CertificateTypeChart";
import { GenderChart } from "@/components/dashboard/GenderChart";
import { ThemeSelector } from "@/components/dashboard/ThemeSelector";
import { ExportStatsDialog } from "@/components/dashboard/ExportStatsDialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي طلاب الدكتوراه"
          value={isLoading ? "..." : stats?.totalPhdStudents || 0}
          subtitle="دكتوراه ل م د + دكتوراه علوم"
          icon={Users}
          variant="blue"
        />
        <StatCard
          title="دكتوراه ل م د"
          value={isLoading ? "..." : stats?.phdLmdCount || 0}
          subtitle="طالب"
          icon={GraduationCap}
          variant="green"
        />
        <StatCard
          title="دكتوراه علوم"
          value={isLoading ? "..." : stats?.phdScienceCount || 0}
          subtitle="طالب"
          icon={GraduationCap}
          variant="orange"
        />
        <StatCard
          title="طلاب الماستر"
          value={isLoading ? "..." : stats?.masterCount || 0}
          subtitle="طالب ماستر"
          icon={BookOpen}
          variant="purple"
        />
      </div>

      {/* Charts Row 1 - PhD only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CertificateTypeChart />
        <GenderChart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        <FacultyChart />
      </div>
    </div>
  );
}
