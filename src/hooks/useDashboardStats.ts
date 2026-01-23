import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalStudents: number;
  totalCertificates: number;
  certificatesThisMonth: number;
  averageGpa: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // Get total students
      const { count: studentsCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      // Get total certificates
      const { count: certificatesCount } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true });

      // Get certificates this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyCount } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // Get average GPA
      const { data: gpaData } = await supabase
        .from("students")
        .select("gpa")
        .not("gpa", "is", null);

      const averageGpa = gpaData && gpaData.length > 0
        ? gpaData.reduce((sum, s) => sum + (s.gpa || 0), 0) / gpaData.length
        : 0;

      return {
        totalStudents: studentsCount || 0,
        totalCertificates: certificatesCount || 0,
        certificatesThisMonth: monthlyCount || 0,
        averageGpa: Math.round(averageGpa * 100) / 100,
      };
    },
  });
}

export function useSpecialtyDistribution() {
  return useQuery({
    queryKey: ["specialty-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("specialty");

      if (error) throw error;

      // Count students per specialty
      const distribution: Record<string, number> = {};
      data?.forEach((student) => {
        const specialty = student.specialty || "غير محدد";
        distribution[specialty] = (distribution[specialty] || 0) + 1;
      });

      return Object.entries(distribution).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });
}
