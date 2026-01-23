import { Users, FileText, Printer, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SpecialtyChart } from "@/components/dashboard/SpecialtyChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { ThemeSelector } from "@/components/dashboard/ThemeSelector";
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
        <div className="flex items-center gap-3">
          <ThemeSelector />
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
          trend={{ value: 12, isPositive: true }}
          variant="blue"
        />
        <StatCard
          title="الشهادات المطبوعة"
          value={isLoading ? "..." : stats?.totalCertificates || 0}
          subtitle="شهادة"
          icon={FileText}
          trend={{ value: 8, isPositive: true }}
          variant="green"
        />
        <StatCard
          title="هذا الشهر"
          value={isLoading ? "..." : stats?.certificatesThisMonth || 0}
          subtitle="شهادة جديدة"
          icon={Printer}
          trend={{ value: 15, isPositive: true }}
          variant="orange"
        />
        <StatCard
          title="القوالب النشطة"
          value={isLoading ? "..." : 0}
          subtitle="قالب"
          icon={TrendingUp}
          variant="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpecialtyChart />
        <MonthlyChart />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
