/**
 * KPI Calculator based on the document template:
 * 
 * General KPI = (0.30 × Flow Effectiveness) + (0.25 × Speed of Achievement) 
 *             + (0.25 × Time Quality) + (0.20 × Administrative Effectiveness)
 */

interface KpiInput {
  totalRegistered: number;
  totalDefended: number;
  defendedStudents: Array<{
    registration_count?: number | null;
    first_registration_year?: string | null;
    defense_date?: string | null;
    scientific_council_date?: string | null;
    _type: string;
  }>;
}

export interface KpiResult {
  general: number;
  flowEffectiveness: number;
  speedOfAchievement: number;
  timeQuality: number;
  administrativeEffectiveness: number;
}

function extractLowerYear(registrationYear: string | null | undefined): number | null {
  if (!registrationYear) return null;
  const match = registrationYear.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * معيار الفعالية التدفقية (30%): نسبة المناقشين من إجمالي المسجلين
 */
function calcFlowEffectiveness(totalRegistered: number, totalDefended: number): number {
  if (totalRegistered === 0) return 0;
  return Math.min(100, (totalDefended / totalRegistered) * 100);
}

/**
 * معيار سرعة الإنجاز (25%): يعتمد على متوسط سنوات التسجيل
 * LMD: 3 سنوات قانونية، Science: 5 سنوات
 */
function calcSpeedOfAchievement(students: KpiInput['defendedStudents']): number {
  if (students.length === 0) return 0;
  
  const scores: number[] = [];
  for (const s of students) {
    const regCount = s.registration_count;
    if (!regCount) continue;
    
    const legalDuration = s._type === 'phd_science' ? 5 : 3;
    // Score: 100 if within legal duration, decreasing by 15 per extra year
    const score = Math.max(0, 100 - Math.max(0, regCount - legalDuration) * 15);
    scores.push(score);
  }
  
  if (scores.length === 0) return 50; // default
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * معيار الجودة الزمنية (25%): نسبة الطلبة النظاميين من إجمالي المناقشين
 * نظامي = registration_count <= legal duration
 */
function calcTimeQuality(students: KpiInput['defendedStudents']): number {
  if (students.length === 0) return 0;
  
  let regular = 0;
  let counted = 0;
  
  for (const s of students) {
    const regCount = s.registration_count;
    if (!regCount) continue;
    counted++;
    
    const legalDuration = s._type === 'phd_science' ? 5 : 3;
    if (regCount <= legalDuration) regular++;
  }
  
  if (counted === 0) return 50;
  return (regular / counted) * 100;
}

/**
 * معيار الفعالية الإدارية (20%): سرعة معالجة الملفات
 * أقل من 3 أشهر = 100، 3-6 أشهر = 70، أكثر من 6 أشهر = 40
 */
function calcAdministrativeEffectiveness(students: KpiInput['defendedStudents']): number {
  if (students.length === 0) return 0;
  
  const scores: number[] = [];
  
  for (const s of students) {
    if (!s.scientific_council_date || !s.defense_date) continue;
    
    const council = new Date(s.scientific_council_date);
    const defense = new Date(s.defense_date);
    if (isNaN(council.getTime()) || isNaN(defense.getTime())) continue;
    
    const diffMs = Math.abs(council.getTime() - defense.getTime());
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
    
    if (diffMonths < 3) scores.push(100);
    else if (diffMonths <= 6) scores.push(70);
    else scores.push(40);
  }
  
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function calculateKpi(input: KpiInput): KpiResult {
  const flowEffectiveness = calcFlowEffectiveness(input.totalRegistered, input.totalDefended);
  const speedOfAchievement = calcSpeedOfAchievement(input.defendedStudents);
  const timeQuality = calcTimeQuality(input.defendedStudents);
  const administrativeEffectiveness = calcAdministrativeEffectiveness(input.defendedStudents);
  
  const general = 
    0.30 * flowEffectiveness +
    0.25 * speedOfAchievement +
    0.25 * timeQuality +
    0.20 * administrativeEffectiveness;
  
  return {
    general,
    flowEffectiveness,
    speedOfAchievement,
    timeQuality,
    administrativeEffectiveness,
  };
}

/**
 * حساب مدة المعالجة بالأشهر والأيام
 */
export function calcProcessingTime(councilDate: string, defenseDate: string): { months: number; days: number; totalDays: number } | null {
  if (!councilDate || !defenseDate) return null;
  
  const council = new Date(councilDate);
  const defense = new Date(defenseDate);
  if (isNaN(council.getTime()) || isNaN(defense.getTime())) return null;
  
  const diffMs = Math.abs(council.getTime() - defense.getTime());
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  
  return { months, days, totalDays };
}

/**
 * تحديد حالة التسجيل (نظامي / متأخر)
 */
export function getRegistrationStatus(regCount: number | null | undefined, type: string): 'regular' | 'delayed' | 'unknown' {
  if (!regCount) return 'unknown';
  const legalDuration = type === 'phd_science' ? 5 : 3;
  return regCount <= legalDuration ? 'regular' : 'delayed';
}
