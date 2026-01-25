import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      // Get counts from all certificate tables
      const [phdLmd, phdScience, master] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("*", { count: "exact", head: true }),
        supabase.from("phd_science_certificates").select("*", { count: "exact", head: true }),
        supabase.from("master_certificates").select("*", { count: "exact", head: true }),
      ]);

      const totalStudents = (phdLmd.count || 0) + (phdScience.count || 0) + (master.count || 0);

      // Get print history count
      const { count: printCount } = await supabase
        .from("print_history")
        .select("*", { count: "exact", head: true });

      // Get this month's prints
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyCount } = await supabase
        .from("print_history")
        .select("*", { count: "exact", head: true })
        .gte("printed_at", startOfMonth.toISOString());

      // Get today's prints
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count: dailyCount } = await supabase
        .from("print_history")
        .select("*", { count: "exact", head: true })
        .gte("printed_at", startOfDay.toISOString());

      return {
        totalStudents,
        totalCertificates: printCount || 0,
        certificatesThisMonth: monthlyCount || 0,
        certificatesToday: dailyCount || 0,
      };
    },
  });
}

export function useFacultyDistribution() {
  return useQuery({
    queryKey: ["faculty_distribution"],
    queryFn: async () => {
      // Get faculties from all certificate tables
      const [phdLmd, phdScience, master] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("faculty_ar"),
        supabase.from("phd_science_certificates").select("faculty_ar"),
        supabase.from("master_certificates").select("faculty_ar"),
      ]);

      const allFaculties = [
        ...(phdLmd.data || []).map(s => s.faculty_ar),
        ...(phdScience.data || []).map(s => s.faculty_ar),
        ...(master.data || []).map(s => s.faculty_ar),
      ];

      // Count by faculty
      const counts: Record<string, number> = {};
      allFaculties.forEach(faculty => {
        if (faculty) {
          counts[faculty] = (counts[faculty] || 0) + 1;
        }
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });
}

export function useMonthlyPrintStats() {
  return useQuery({
    queryKey: ["monthly_print_stats"],
    queryFn: async () => {
      const months = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];

      const currentYear = new Date().getFullYear();
      const monthlyData = [];

      for (let month = 0; month < 12; month++) {
        const startOfMonth = new Date(currentYear, month, 1);
        const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

        const { count } = await supabase
          .from("print_history")
          .select("*", { count: "exact", head: true })
          .gte("printed_at", startOfMonth.toISOString())
          .lte("printed_at", endOfMonth.toISOString());

        monthlyData.push({
          month: months[month],
          certificates: count || 0,
        });
      }

      return monthlyData;
    },
  });
}
