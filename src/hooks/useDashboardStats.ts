import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      // Get counts from PhD tables only for main stats, master count separate
      const [phdLmd, phdScience, master] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("*", { count: "exact", head: true }),
        supabase.from("phd_science_certificates").select("*", { count: "exact", head: true }),
        supabase.from("master_certificates").select("*", { count: "exact", head: true }),
      ]);

      const totalPhdStudents = (phdLmd.count || 0) + (phdScience.count || 0);
      const masterCount = master.count || 0;

      return {
        totalPhdStudents,
        masterCount,
        phdLmdCount: phdLmd.count || 0,
        phdScienceCount: phdScience.count || 0,
      };
    },
  });
}

export function useFacultyDistribution() {
  return useQuery({
    queryKey: ["faculty_distribution"],
    queryFn: async () => {
      // Get faculties from PhD tables only (exclude master)
      const [phdLmd, phdScience] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("faculty_ar"),
        supabase.from("phd_science_certificates").select("faculty_ar"),
      ]);

      const allFaculties = [
        ...(phdLmd.data || []).map(s => s.faculty_ar),
        ...(phdScience.data || []).map(s => s.faculty_ar),
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

export function useGenderDistribution() {
  return useQuery({
    queryKey: ["gender_distribution"],
    queryFn: async () => {
      // Get gender from PhD tables only (exclude master)
      const [phdLmd, phdScience] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("gender"),
        supabase.from("phd_science_certificates").select("gender"),
      ]);

      const allGenders = [
        ...(phdLmd.data || []).map(s => s.gender),
        ...(phdScience.data || []).map(s => s.gender),
      ];

      const maleCount = allGenders.filter(g => g === 'male').length;
      const femaleCount = allGenders.filter(g => g === 'female').length;

      return [
        { name: 'ذكور', value: maleCount },
        { name: 'إناث', value: femaleCount },
      ];
    },
  });
}

export function useCertificateTypeDistribution() {
  return useQuery({
    queryKey: ["certificate_type_distribution"],
    queryFn: async () => {
      // Only PhD types (exclude master from chart)
      const [phdLmd, phdScience] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("*", { count: "exact", head: true }),
        supabase.from("phd_science_certificates").select("*", { count: "exact", head: true }),
      ]);

      return [
        { name: 'دكتوراه ل م د', value: phdLmd.count || 0 },
        { name: 'دكتوراه علوم', value: phdScience.count || 0 },
      ];
    },
  });
}
