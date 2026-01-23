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

      return {
        totalStudents,
        totalCertificates: printCount || 0,
        certificatesThisMonth: monthlyCount || 0,
        averageGpa: 0, // Not applicable in new schema
      };
    },
  });
}

export function useSpecialtyDistribution() {
  return useQuery({
    queryKey: ["specialty_distribution"],
    queryFn: async () => {
      // Get specialties from all certificate tables
      const [phdLmd, phdScience, master] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("specialty_ar"),
        supabase.from("phd_science_certificates").select("specialty_ar"),
        supabase.from("master_certificates").select("specialty_ar"),
      ]);

      const allSpecialties = [
        ...(phdLmd.data || []).map(s => s.specialty_ar),
        ...(phdScience.data || []).map(s => s.specialty_ar),
        ...(master.data || []).map(s => s.specialty_ar),
      ];

      // Count by specialty
      const counts: Record<string, number> = {};
      allSpecialties.forEach(specialty => {
        if (specialty) {
          counts[specialty] = (counts[specialty] || 0) + 1;
        }
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });
}
