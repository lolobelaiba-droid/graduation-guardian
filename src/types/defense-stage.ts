// Defense Stage Student Types (between PhD candidates and defended students)

export type DefenseStageType = 'phd_lmd' | 'phd_science';

export type DefenseStageStatus = 'pending' | 'authorized' | 'defended';

export interface DefenseStageStudent {
  id: string;
  registration_number: string;
  full_name_ar: string;
  full_name_fr: string | null;
  gender: string | null;
  date_of_birth: string;
  birthplace_ar: string;
  birthplace_fr: string | null;
  university_ar: string | null;
  university_fr: string | null;
  faculty_ar: string;
  faculty_fr: string | null;
  field_ar: string;
  field_fr: string | null;
  branch_ar: string;
  branch_fr: string | null;
  specialty_ar: string;
  specialty_fr: string | null;
  first_registration_year: string | null;
  professional_email: string | null;
  phone_number: string | null;
  supervisor_ar: string;
  co_supervisor_ar: string | null;
  supervisor_university: string | null;
  co_supervisor_university: string | null;
  thesis_title_ar: string | null;
  thesis_title_fr: string | null;
  thesis_language: string | null;
  research_lab_ar: string | null;
  employment_status: string | null;
  registration_type: string | null;
  inscription_status: string | null;
  current_year: string | null;
  registration_count: number | null;
  notes: string | null;
  // Defense stage specific fields
  jury_president_ar: string;
  jury_president_fr: string | null;
  jury_members_ar: string;
  jury_members_fr: string | null;
  scientific_council_date: string;
  stage_status: DefenseStageStatus;
  defense_date: string | null;
  province: string | null;
  signature_title: string | null;
  decree_training: string | null;
  decree_accreditation: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const defenseStageTableMap: Record<DefenseStageType, string> = {
  phd_lmd: 'defense_stage_lmd',
  phd_science: 'defense_stage_science',
};

export const stageStatusLabels: Record<DefenseStageStatus, { ar: string; color: string }> = {
  pending: { ar: 'في الانتظار', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  authorized: { ar: 'مرخص', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  defended: { ar: 'تمت المناقشة', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};
