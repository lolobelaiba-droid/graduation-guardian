// PhD Student Types (pre-defense, without certificate/jury fields)
export type PhdStudentType = 'phd_lmd' | 'phd_science';

// Base PhD student fields
export interface BasePhdStudent {
  id: string;
  registration_number: string;
  full_name_ar: string;
  full_name_fr: string | null;
  gender: string;
  date_of_birth: string;
  birthplace_ar: string;
  birthplace_fr: string | null;
  university_ar: string | null;
  university_fr: string | null;
  faculty_ar: string;
  faculty_fr: string | null;
  branch_ar: string;
  branch_fr: string | null;
  specialty_ar: string;
  specialty_fr: string | null;
  first_registration_year: string | null;
  professional_email: string | null;
  phone_number: string | null;
  supervisor_ar: string;
  thesis_title_ar: string | null;
  thesis_title_fr: string | null;
  research_lab_ar: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // New fields
  co_supervisor_ar: string | null;
  supervisor_university: string | null;
  co_supervisor_university: string | null;
  employment_status: string | null;
  registration_type: string | null;
  inscription_status: string | null;
}

// PhD LMD Student (has field_ar/field_fr)
export interface PhdLmdStudent extends BasePhdStudent {
  field_ar: string;
  field_fr: string | null;
}

// PhD Science Student
export interface PhdScienceStudent extends BasePhdStudent {
  // No additional fields beyond base
}

// Union type for any PhD student
export type PhdStudent = PhdLmdStudent | PhdScienceStudent;

// Student type labels
export const phdStudentTypeLabels: Record<PhdStudentType, { ar: string; fr: string }> = {
  phd_lmd: { ar: 'دكتوراه ل م د', fr: 'Doctorat LMD' },
  phd_science: { ar: 'دكتوراه علوم', fr: 'Doctorat Sciences' },
};

// Get table name for student type
export const getPhdStudentTable = (type: PhdStudentType): string => {
  const tables: Record<PhdStudentType, string> = {
    phd_lmd: 'phd_lmd_students',
    phd_science: 'phd_science_students',
  };
  return tables[type];
};

// Status labels
export const studentStatusLabels: Record<string, { ar: string; color: string }> = {
  active: { ar: 'نشط', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  graduated: { ar: 'تخرج', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  suspended: { ar: 'معلق', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  withdrawn: { ar: 'منسحب', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};
