import { PhdStudentType } from "@/types/phd-students";

export type ImportStep = "upload" | "mode" | "mapping" | "preview" | "importing" | "complete";

export type ImportMode = "append" | "replace";

export interface ColumnMapping {
  [excelColumn: string]: string;
}

export interface ImportProgress {
  current: number;
  total: number;
}

export interface ImportResults {
  success: number;
  failed: number;
  errors: string[];
}

export interface FieldDefinition {
  key: string;
  name_ar: string;
  name_fr: string;
  required: boolean;
}

export interface ExcelRow {
  [key: string]: unknown;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_ROWS = 500;

// Database field keys that are actually stored
export const getDbFieldKey = (fieldKey: string): string => {
  const mappings: Record<string, string> = {
    'date_of_birth_ar': 'date_of_birth',
    'date_of_birth_fr': 'date_of_birth',
  };
  return mappings[fieldKey] || fieldKey;
};

// PhD student fields definition
export const phdLmdStudentFields: FieldDefinition[] = [
  { key: 'registration_number', name_ar: 'رقم التسجيل', name_fr: 'Numéro d\'inscription', required: true },
  { key: 'full_name_ar', name_ar: 'الاسم بالعربية', name_fr: 'Nom en arabe', required: true },
  { key: 'full_name_fr', name_ar: 'الاسم بالفرنسية', name_fr: 'Nom en français', required: false },
  { key: 'gender', name_ar: 'الجنس', name_fr: 'Sexe', required: true },
  { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Date de naissance', required: true },
  { key: 'birthplace_ar', name_ar: 'مكان الميلاد بالعربية', name_fr: 'Lieu de naissance (ar)', required: true },
  { key: 'birthplace_fr', name_ar: 'مكان الميلاد بالفرنسية', name_fr: 'Lieu de naissance (fr)', required: false },
  { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
  { key: 'field_ar', name_ar: 'الميدان', name_fr: 'Domaine', required: true },
  { key: 'field_fr', name_ar: 'الميدان بالفرنسية', name_fr: 'Domaine (fr)', required: false },
  { key: 'branch_ar', name_ar: 'الشعبة بالعربية', name_fr: 'Filière (ar)', required: true },
  { key: 'branch_fr', name_ar: 'الشعبة بالفرنسية', name_fr: 'Filière (fr)', required: false },
  { key: 'specialty_ar', name_ar: 'التخصص بالعربية', name_fr: 'Spécialité (ar)', required: true },
  { key: 'specialty_fr', name_ar: 'التخصص بالفرنسية', name_fr: 'Spécialité (fr)', required: false },
  { key: 'first_registration_year', name_ar: 'سنة أول تسجيل', name_fr: 'Année de 1ère inscription', required: true },
  { key: 'supervisor_ar', name_ar: 'المشرف', name_fr: 'Directeur de thèse', required: true },
  { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة', name_fr: 'Titre de thèse', required: false },
  { key: 'research_lab_ar', name_ar: 'مخبر البحث', name_fr: 'Laboratoire de recherche', required: true },
  { key: 'professional_email', name_ar: 'البريد الإلكتروني', name_fr: 'Email', required: false },
  { key: 'phone_number', name_ar: 'رقم الهاتف', name_fr: 'Téléphone', required: false },
  { key: 'status', name_ar: 'الحالة', name_fr: 'Statut', required: false },
];

export const phdScienceStudentFields: FieldDefinition[] = [
  { key: 'registration_number', name_ar: 'رقم التسجيل', name_fr: 'Numéro d\'inscription', required: true },
  { key: 'full_name_ar', name_ar: 'الاسم بالعربية', name_fr: 'Nom en arabe', required: true },
  { key: 'full_name_fr', name_ar: 'الاسم بالفرنسية', name_fr: 'Nom en français', required: false },
  { key: 'gender', name_ar: 'الجنس', name_fr: 'Sexe', required: true },
  { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Date de naissance', required: true },
  { key: 'birthplace_ar', name_ar: 'مكان الميلاد بالعربية', name_fr: 'Lieu de naissance (ar)', required: true },
  { key: 'birthplace_fr', name_ar: 'مكان الميلاد بالفرنسية', name_fr: 'Lieu de naissance (fr)', required: false },
  { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
  { key: 'branch_ar', name_ar: 'الشعبة بالعربية', name_fr: 'Filière (ar)', required: true },
  { key: 'branch_fr', name_ar: 'الشعبة بالفرنسية', name_fr: 'Filière (fr)', required: false },
  { key: 'specialty_ar', name_ar: 'التخصص بالعربية', name_fr: 'Spécialité (ar)', required: true },
  { key: 'specialty_fr', name_ar: 'التخصص بالفرنسية', name_fr: 'Spécialité (fr)', required: false },
  { key: 'first_registration_year', name_ar: 'سنة أول تسجيل', name_fr: 'Année de 1ère inscription', required: true },
  { key: 'supervisor_ar', name_ar: 'المشرف', name_fr: 'Directeur de thèse', required: true },
  { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة', name_fr: 'Titre de thèse', required: false },
  { key: 'research_lab_ar', name_ar: 'مخبر البحث', name_fr: 'Laboratoire de recherche', required: false },
  { key: 'professional_email', name_ar: 'البريد الإلكتروني', name_fr: 'Email', required: false },
  { key: 'phone_number', name_ar: 'رقم الهاتف', name_fr: 'Téléphone', required: false },
  { key: 'status', name_ar: 'الحالة', name_fr: 'Statut', required: false },
];

export const getPhdStudentFields = (type: PhdStudentType): FieldDefinition[] => {
  return type === 'phd_lmd' ? phdLmdStudentFields : phdScienceStudentFields;
};

export const getPhdStudentTable = (type: PhdStudentType): string => {
  return type === 'phd_lmd' ? 'phd_lmd_students' : 'phd_science_students';
};
