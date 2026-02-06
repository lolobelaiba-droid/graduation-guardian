import type { PhdStudentType } from "@/types/phd-students";

/**
 * Extract the start year from an academic year string (e.g., "2020/2021" gives 2020)
 */
export function extractStartYear(academicYear: string): number | null {
  if (!academicYear) return null;
  const parts = academicYear.split('/');
  if (parts.length >= 1 && parts[0]) {
    const year = parseInt(parts[0], 10);
    if (!isNaN(year)) {
      return year;
    }
  }
  return null;
}

/**
 * Get the current year label based on registration count
 */
export function getCurrentYearLabel(registrationCount: number, phdType: PhdStudentType): string {
  const yearLabels: Record<number, string> = {
    1: "السنة الأولى",
    2: "السنة الثانية",
    3: "السنة الثالثة",
    4: "السنة الرابعة",
    5: "السنة الخامسة",
    6: "السنة السادسة",
  };

  // For LMD: max normal is 3 years + 2 extensions (5 total)
  // For Science: max normal is 6 years
  const maxNormalYears = phdType === 'phd_lmd' ? 5 : 6;

  if (registrationCount > maxNormalYears) {
    return "متأخر";
  }

  // For LMD: years 4 and 5 are extensions
  if (phdType === 'phd_lmd') {
    if (registrationCount === 4) return "تمديد أول";
    if (registrationCount === 5) return "تمديد ثان";
    return yearLabels[registrationCount] || "متأخر";
  }

  // For Science: direct year labels
  return yearLabels[registrationCount] || "متأخر";
}

/**
 * Calculate registration details based on current academic year and first registration year
 */
export function calculateRegistrationDetails(
  currentAcademicYear: string,
  firstRegistrationYear: string,
  phdType: PhdStudentType
): {
  registrationCount: number | null;
  currentYear: string;
  isLate: boolean;
} {
  const currentStartYear = extractStartYear(currentAcademicYear);
  const firstStartYear = extractStartYear(firstRegistrationYear);

  if (!currentStartYear || !firstStartYear) {
    return {
      registrationCount: null,
      currentYear: "",
      isLate: false,
    };
  }

  // Calculate the difference (registrations = difference + 1 because first year counts as 1)
  const registrationCount = currentStartYear - firstStartYear + 1;

  if (registrationCount < 1) {
    return {
      registrationCount: null,
      currentYear: "",
      isLate: false,
    };
  }

  const currentYear = getCurrentYearLabel(registrationCount, phdType);
  const maxNormalYears = phdType === 'phd_lmd' ? 5 : 6;
  const isLate = registrationCount > maxNormalYears;

  return {
    registrationCount,
    currentYear,
    isLate,
  };
}

/**
 * Get inscription status based on current year value
 * If current_year is "متأخر", inscription_status should also be "متأخر"
 * unless manually changed to "مقصى" or "منقطع"
 */
export function getDefaultInscriptionStatus(
  currentYear: string,
  existingInscriptionStatus?: string
): string {
  // If current year is "متأخر"
  if (currentYear === "متأخر") {
    // Keep existing status if it's "مقصى" or "منقطع"
    if (existingInscriptionStatus === "مقصى" || existingInscriptionStatus === "منقطع") {
      return existingInscriptionStatus;
    }
    // Otherwise set to "متأخر"
    return "متأخر";
  }
  
  // If not late, keep existing or return empty
  return existingInscriptionStatus || "";
}
