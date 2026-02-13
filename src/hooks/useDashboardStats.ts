import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        // Fetch from both candidates and certificates tables
        const [phdLmdStudents, phdScienceStudents, phdLmdCerts, phdScienceCerts] = await Promise.all([
          db.getAll('phd_lmd_students'),
          db.getAll('phd_science_students'),
          db.getAll('phd_lmd_certificates'),
          db.getAll('phd_science_certificates'),
        ]);

        const phdLmdStudentsCount = phdLmdStudents.success ? (phdLmdStudents.data?.length || 0) : 0;
        const phdScienceStudentsCount = phdScienceStudents.success ? (phdScienceStudents.data?.length || 0) : 0;
        const phdLmdCertsCount = phdLmdCerts.success ? (phdLmdCerts.data?.length || 0) : 0;
        const phdScienceCertsCount = phdScienceCerts.success ? (phdScienceCerts.data?.length || 0) : 0;

        const delayedCandidatesElectron =
          ((phdLmdStudents.data as Array<{ registration_count: number | null }>) || []).filter(s => s.registration_count && s.registration_count > 3).length +
          ((phdScienceStudents.data as Array<{ registration_count: number | null }>) || []).filter(s => s.registration_count && s.registration_count > 5).length;

        const delayedDefendedElectron =
          ((phdLmdCerts.data as Array<{ registration_count: number | null }>) || []).filter(s => s.registration_count && s.registration_count > 3).length +
          ((phdScienceCerts.data as Array<{ registration_count: number | null }>) || []).filter(s => s.registration_count && s.registration_count > 5).length;

        return {
          // PhD Candidates (pre-defense)
          totalPhdCandidates: phdLmdStudentsCount + phdScienceStudentsCount,
          phdLmdCandidatesCount: phdLmdStudentsCount,
          phdScienceCandidatesCount: phdScienceStudentsCount,
          delayedCandidates: delayedCandidatesElectron,
          // Defended Students (post-defense with certificates)
          totalDefendedStudents: phdLmdCertsCount + phdScienceCertsCount,
          phdLmdDefendedCount: phdLmdCertsCount,
          phdScienceDefendedCount: phdScienceCertsCount,
          delayedDefended: delayedDefendedElectron,
        };
      }

      // Web mode - use Supabase
      const [phdLmdStudents, phdScienceStudents, phdLmdCerts, phdScienceCerts,
             phdLmdStudentsReg, phdScienceStudentsReg, phdLmdCertsReg, phdScienceCertsReg] = await Promise.all([
        supabase.from("phd_lmd_students").select("*", { count: "exact", head: true }),
        supabase.from("phd_science_students").select("*", { count: "exact", head: true }),
        supabase.from("phd_lmd_certificates").select("*", { count: "exact", head: true }),
        supabase.from("phd_science_certificates").select("*", { count: "exact", head: true }),
        supabase.from("phd_lmd_students").select("registration_count"),
        supabase.from("phd_science_students").select("registration_count"),
        supabase.from("phd_lmd_certificates").select("registration_count"),
        supabase.from("phd_science_certificates").select("registration_count"),
      ]);

      const delayedCandidates =
        (phdLmdStudentsReg.data || []).filter(s => s.registration_count && s.registration_count > 3).length +
        (phdScienceStudentsReg.data || []).filter(s => s.registration_count && s.registration_count > 5).length;

      const delayedDefended =
        (phdLmdCertsReg.data || []).filter(s => s.registration_count && s.registration_count > 3).length +
        (phdScienceCertsReg.data || []).filter(s => s.registration_count && s.registration_count > 5).length;

      return {
        // PhD Candidates (pre-defense)
        totalPhdCandidates: (phdLmdStudents.count || 0) + (phdScienceStudents.count || 0),
        phdLmdCandidatesCount: phdLmdStudents.count || 0,
        phdScienceCandidatesCount: phdScienceStudents.count || 0,
        delayedCandidates,
        // Defended Students (post-defense with certificates)
        totalDefendedStudents: (phdLmdCerts.count || 0) + (phdScienceCerts.count || 0),
        phdLmdDefendedCount: phdLmdCerts.count || 0,
        phdScienceDefendedCount: phdScienceCerts.count || 0,
        delayedDefended,
      };
    },
  });
}

// Faculty distribution for PhD candidates
export function useFacultyDistributionCandidates() {
  return useQuery({
    queryKey: ["faculty_distribution_candidates"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_students'),
          db.getAll('phd_science_students'),
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
        supabase.from("phd_lmd_students").select("faculty_ar"),
        supabase.from("phd_science_students").select("faculty_ar"),
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

// Faculty distribution for defended students (certificates)
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

// Gender distribution for PhD candidates
export function useGenderDistributionCandidates() {
  return useQuery({
    queryKey: ["gender_distribution_candidates"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_students'),
          db.getAll('phd_science_students'),
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
        supabase.from("phd_lmd_students").select("gender"),
        supabase.from("phd_science_students").select("gender"),
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

// Gender distribution for defended students
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

// PhD type distribution for candidates
export function usePhdTypeDistributionCandidates() {
  return useQuery({
    queryKey: ["phd_type_distribution_candidates"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_students'),
          db.getAll('phd_science_students'),
        ]);

        return [
          { name: 'دكتوراه ل م د', value: phdLmd.data?.length || 0 },
          { name: 'دكتوراه علوم', value: phdScience.data?.length || 0 },
        ];
      }

      // Web mode - use Supabase
      const [phdLmd, phdScience] = await Promise.all([
        supabase.from("phd_lmd_students").select("*", { count: "exact", head: true }),
        supabase.from("phd_science_students").select("*", { count: "exact", head: true }),
      ]);

      return [
        { name: 'دكتوراه ل م د', value: phdLmd.count || 0 },
        { name: 'دكتوراه علوم', value: phdScience.count || 0 },
      ];
    },
  });
}

// Certificate type distribution for defended students
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

/**
 * Extract the lower year from a registration year string like "2020/2021"
 */
function extractLowerYear(registrationYear: string | null): number | null {
  if (!registrationYear) return null;
  
  // Handle format like "2020/2021" - take the first (lower) year
  const match = registrationYear.match(/(\d{4})/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extract year from a date string
 */
function extractYearFromDate(dateString: string | null): number | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  return date.getFullYear();
}

interface RegistrationStats {
  phdLmdAverage: number | null;
  phdScienceAverage: number | null;
  overallAverage: number | null;
  phdLmdCount: number;
  phdScienceCount: number;
  totalCount: number;
}

export function useAverageRegistrationYears() {
  return useQuery({
    queryKey: ["average_registration_years"],
    queryFn: async (): Promise<RegistrationStats> => {
      if (isElectron()) {
        const db = getDbClient()!;
        const [phdLmd, phdScience] = await Promise.all([
          db.getAll('phd_lmd_certificates'),
          db.getAll('phd_science_certificates'),
        ]);

        const phdLmdData = (phdLmd.data as Array<{ first_registration_year: string | null; defense_date: string | null }>) || [];
        const phdScienceData = (phdScience.data as Array<{ first_registration_year: string | null; defense_date: string | null }>) || [];

        const calculateAverage = (data: Array<{ first_registration_year: string | null; defense_date: string | null }>) => {
          const validYears: number[] = [];
          
          for (const student of data) {
            const registrationYear = extractLowerYear(student.first_registration_year);
            const defenseYear = extractYearFromDate(student.defense_date);
            
            if (registrationYear && defenseYear && defenseYear >= registrationYear) {
              validYears.push(defenseYear - registrationYear);
            }
          }
          
          if (validYears.length === 0) return null;
          return validYears.reduce((sum, y) => sum + y, 0) / validYears.length;
        };

        const phdLmdAverage = calculateAverage(phdLmdData);
        const phdScienceAverage = calculateAverage(phdScienceData);
        
        // Calculate overall average
        const allData = [...phdLmdData, ...phdScienceData];
        const overallAverage = calculateAverage(allData);

        return {
          phdLmdAverage,
          phdScienceAverage,
          overallAverage,
          phdLmdCount: phdLmdData.length,
          phdScienceCount: phdScienceData.length,
          totalCount: allData.length,
        };
      }

      // Web mode - use Supabase
      const [phdLmd, phdScience] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("first_registration_year, defense_date"),
        supabase.from("phd_science_certificates").select("first_registration_year, defense_date"),
      ]);

      const phdLmdData = phdLmd.data || [];
      const phdScienceData = phdScience.data || [];

      const calculateAverage = (data: Array<{ first_registration_year: string | null; defense_date: string | null }>) => {
        const validYears: number[] = [];
        
        for (const student of data) {
          const registrationYear = extractLowerYear(student.first_registration_year);
          const defenseYear = extractYearFromDate(student.defense_date);
          
          if (registrationYear && defenseYear && defenseYear >= registrationYear) {
            validYears.push(defenseYear - registrationYear);
          }
        }
        
        if (validYears.length === 0) return null;
        return validYears.reduce((sum, y) => sum + y, 0) / validYears.length;
      };

      const phdLmdAverage = calculateAverage(phdLmdData);
      const phdScienceAverage = calculateAverage(phdScienceData);
      
      // Calculate overall average
      const allData = [...phdLmdData, ...phdScienceData];
      const overallAverage = calculateAverage(allData);

      return {
        phdLmdAverage,
        phdScienceAverage,
        overallAverage,
        phdLmdCount: phdLmdData.length,
        phdScienceCount: phdScienceData.length,
        totalCount: allData.length,
      };
    },
  });
}
