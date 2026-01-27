import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience, master] = await Promise.all([
          db.getAll('phd_lmd_certificates'),
          db.getAll('phd_science_certificates'),
          db.getAll('master_certificates'),
        ]);

        const phdLmdCount = phdLmd.success ? (phdLmd.data?.length || 0) : 0;
        const phdScienceCount = phdScience.success ? (phdScience.data?.length || 0) : 0;
        const masterCount = master.success ? (master.data?.length || 0) : 0;

        return {
          totalPhdStudents: phdLmdCount + phdScienceCount,
          masterCount,
          phdLmdCount,
          phdScienceCount,
        };
      }

      // Web mode - use Supabase
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
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_certificates'),
          db.getAll('phd_science_certificates'),
        ]);

        const allFaculties = [
          ...((phdLmd.data as Array<{ faculty_ar: string }>) || []).map(s => s.faculty_ar),
          ...((phdScience.data as Array<{ faculty_ar: string }>) || []).map(s => s.faculty_ar),
        ];

        const counts: Record<string, number> = {};
        allFaculties.forEach(faculty => {
          if (faculty) {
            counts[faculty] = (counts[faculty] || 0) + 1;
          }
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
      }

      // Web mode - use Supabase
      const [phdLmd, phdScience] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("faculty_ar"),
        supabase.from("phd_science_certificates").select("faculty_ar"),
      ]);

      const allFaculties = [
        ...(phdLmd.data || []).map(s => s.faculty_ar),
        ...(phdScience.data || []).map(s => s.faculty_ar),
      ];

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
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_certificates'),
          db.getAll('phd_science_certificates'),
        ]);

        const allGenders = [
          ...((phdLmd.data as Array<{ gender: string }>) || []).map(s => s.gender),
          ...((phdScience.data as Array<{ gender: string }>) || []).map(s => s.gender),
        ];

        const maleCount = allGenders.filter(g => g === 'male').length;
        const femaleCount = allGenders.filter(g => g === 'female').length;

        return [
          { name: 'ذكور', value: maleCount },
          { name: 'إناث', value: femaleCount },
        ];
      }

      // Web mode - use Supabase
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
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_certificates'),
          db.getAll('phd_science_certificates'),
        ]);

        return [
          { name: 'دكتوراه ل م د', value: phdLmd.data?.length || 0 },
          { name: 'دكتوراه علوم', value: phdScience.data?.length || 0 },
        ];
      }

      // Web mode - use Supabase
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
