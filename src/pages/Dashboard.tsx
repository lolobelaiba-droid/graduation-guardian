import { Users, FileText, Printer, CalendarDays } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { FacultyChart } from "@/components/dashboard/FacultyChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
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
            مرحباً بك في نظام إدارة الشهادات الجامعية
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ThemeSelector />
          <ExportStatsDialog />
          <Link to="/print">
            <Button size="lg" className="gap-2 shadow-lg">
              <Printer className="h-5 w-5" />
              طباعة شهادة جديدة
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الطلاب"
          value={isLoading ? "..." : stats?.totalStudents || 0}
          subtitle="طالب مسجل"
          icon={Users}
          variant="blue"
        />
        <StatCard
          title="الشهادات المطبوعة"
          value={isLoading ? "..." : stats?.totalCertificates || 0}
          subtitle="شهادة"
          icon={FileText}
          variant="green"
        />
        <StatCard
          title="هذا الشهر"
          value={isLoading ? "..." : stats?.certificatesThisMonth || 0}
          subtitle="شهادة"
          icon={Printer}
          variant="orange"
        />
        <StatCard
          title="اليوم"
          value={isLoading ? "..." : stats?.certificatesToday || 0}
          subtitle="شهادة"
          icon={CalendarDays}
          variant="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CertificateTypeChart />
        <GenderChart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FacultyChart />
        <MonthlyChart />
      </div>
    </div>
  );
}
