import type { CertificateType } from "@/types/certificates";

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

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_ROWS = 500;

export const getDbFieldKey = (fieldKey: string): string => {
  const mappings: Record<string, string> = {
    'date_of_birth_ar': 'date_of_birth',
    'date_of_birth_fr': 'date_of_birth',
  };
  return mappings[fieldKey] || fieldKey;
};

// PhD LMD certificate fields
export const phdLmdCertificateFields: FieldDefinition[] = [
  { key: 'student_number', name_ar: 'رقم الشهادة', name_fr: 'Numéro de certificat', required: true },
  { key: 'full_name_ar', name_ar: 'الاسم بالعربية', name_fr: 'Nom en arabe', required: true },
  { key: 'full_name_fr', name_ar: 'الاسم بالفرنسية', name_fr: 'Nom en français', required: false },
  { key: 'gender', name_ar: 'الجنس', name_fr: 'Sexe', required: false },
  { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Date de naissance', required: true },
  { key: 'birthplace_ar', name_ar: 'مكان الميلاد بالعربية', name_fr: 'Lieu de naissance (ar)', required: true },
  { key: 'birthplace_fr', name_ar: 'مكان الميلاد بالفرنسية', name_fr: 'Lieu de naissance (fr)', required: false },
  { key: 'university_ar', name_ar: 'الجامعة بالعربية', name_fr: 'Université (ar)', required: false },
  { key: 'university_fr', name_ar: 'الجامعة بالفرنسية', name_fr: 'Université (fr)', required: false },
  { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
  { key: 'faculty_fr', name_ar: 'الكلية بالفرنسية', name_fr: 'Faculté (fr)', required: false },
  { key: 'field_ar', name_ar: 'الميدان', name_fr: 'Domaine', required: true },
  { key: 'field_fr', name_ar: 'الميدان بالفرنسية', name_fr: 'Domaine (fr)', required: false },
  { key: 'branch_ar', name_ar: 'الشعبة بالعربية', name_fr: 'Filière (ar)', required: true },
  { key: 'branch_fr', name_ar: 'الشعبة بالفرنسية', name_fr: 'Filière (fr)', required: false },
  { key: 'specialty_ar', name_ar: 'التخصص بالعربية', name_fr: 'Spécialité (ar)', required: true },
  { key: 'specialty_fr', name_ar: 'التخصص بالفرنسية', name_fr: 'Spécialité (fr)', required: false },
  { key: 'defense_date', name_ar: 'تاريخ المناقشة', name_fr: 'Date de soutenance', required: true },
  { key: 'mention', name_ar: 'التقدير', name_fr: 'Mention', required: false },
  { key: 'supervisor_ar', name_ar: 'المشرف', name_fr: 'Directeur de thèse', required: true },
  { key: 'co_supervisor_ar', name_ar: 'مساعد المشرف', name_fr: 'Co-directeur', required: false },
  { key: 'supervisor_university', name_ar: 'جامعة انتماء المشرف', name_fr: 'Université du directeur', required: false },
  { key: 'co_supervisor_university', name_ar: 'جامعة انتماء مساعد المشرف', name_fr: 'Université du co-directeur', required: false },
  { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة بالعربية', name_fr: 'Titre de thèse (ar)', required: true },
  { key: 'thesis_title_fr', name_ar: 'عنوان الأطروحة بالفرنسية', name_fr: 'Titre de thèse (fr)', required: false },
  { key: 'thesis_language', name_ar: 'لغة الأطروحة', name_fr: 'Langue de thèse', required: false },
  { key: 'jury_president_ar', name_ar: 'رئيس اللجنة', name_fr: 'Président du jury', required: true },
  { key: 'jury_president_fr', name_ar: 'رئيس اللجنة بالفرنسية', name_fr: 'Président du jury (fr)', required: false },
  { key: 'jury_members_ar', name_ar: 'أعضاء اللجنة', name_fr: 'Membres du jury', required: true },
  { key: 'jury_members_fr', name_ar: 'أعضاء اللجنة بالفرنسية', name_fr: 'Membres du jury (fr)', required: false },
  { key: 'first_registration_year', name_ar: 'سنة أول تسجيل', name_fr: 'Année de 1ère inscription', required: false },
  { key: 'registration_count', name_ar: 'عدد التسجيلات', name_fr: 'Nombre d\'inscriptions', required: false },
  { key: 'research_lab_ar', name_ar: 'مخبر البحث', name_fr: 'Laboratoire', required: false },
  { key: 'scientific_council_date', name_ar: 'تاريخ المصادقة', name_fr: 'Date du conseil scientifique', required: false },
  { key: 'employment_status', name_ar: 'الحالة الوظيفية', name_fr: 'Statut professionnel', required: false },
  { key: 'registration_type', name_ar: 'نوع التسجيل', name_fr: 'Type d\'inscription', required: false },
  { key: 'professional_email', name_ar: 'البريد الإلكتروني', name_fr: 'Email', required: false },
  { key: 'phone_number', name_ar: 'رقم الهاتف', name_fr: 'Téléphone', required: false },
  { key: 'notes', name_ar: 'ملاحظات', name_fr: 'Notes', required: false },
];

// PhD Science certificate fields (same as LMD but without field_ar/field_fr)
export const phdScienceCertificateFields: FieldDefinition[] = [
  { key: 'student_number', name_ar: 'رقم الشهادة', name_fr: 'Numéro de certificat', required: true },
  { key: 'full_name_ar', name_ar: 'الاسم بالعربية', name_fr: 'Nom en arabe', required: true },
  { key: 'full_name_fr', name_ar: 'الاسم بالفرنسية', name_fr: 'Nom en français', required: false },
  { key: 'gender', name_ar: 'الجنس', name_fr: 'Sexe', required: false },
  { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Date de naissance', required: true },
  { key: 'birthplace_ar', name_ar: 'مكان الميلاد بالعربية', name_fr: 'Lieu de naissance (ar)', required: true },
  { key: 'birthplace_fr', name_ar: 'مكان الميلاد بالفرنسية', name_fr: 'Lieu de naissance (fr)', required: false },
  { key: 'university_ar', name_ar: 'الجامعة بالعربية', name_fr: 'Université (ar)', required: false },
  { key: 'university_fr', name_ar: 'الجامعة بالفرنسية', name_fr: 'Université (fr)', required: false },
  { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
  { key: 'faculty_fr', name_ar: 'الكلية بالفرنسية', name_fr: 'Faculté (fr)', required: false },
  { key: 'field_ar', name_ar: 'الميدان', name_fr: 'Domaine', required: false },
  { key: 'field_fr', name_ar: 'الميدان بالفرنسية', name_fr: 'Domaine (fr)', required: false },
  { key: 'branch_ar', name_ar: 'الشعبة بالعربية', name_fr: 'Filière (ar)', required: true },
  { key: 'branch_fr', name_ar: 'الشعبة بالفرنسية', name_fr: 'Filière (fr)', required: false },
  { key: 'specialty_ar', name_ar: 'التخصص بالعربية', name_fr: 'Spécialité (ar)', required: true },
  { key: 'specialty_fr', name_ar: 'التخصص بالفرنسية', name_fr: 'Spécialité (fr)', required: false },
  { key: 'defense_date', name_ar: 'تاريخ المناقشة', name_fr: 'Date de soutenance', required: true },
  { key: 'mention', name_ar: 'التقدير', name_fr: 'Mention', required: false },
  { key: 'supervisor_ar', name_ar: 'المشرف', name_fr: 'Directeur de thèse', required: true },
  { key: 'co_supervisor_ar', name_ar: 'مساعد المشرف', name_fr: 'Co-directeur', required: false },
  { key: 'supervisor_university', name_ar: 'جامعة انتماء المشرف', name_fr: 'Université du directeur', required: false },
  { key: 'co_supervisor_university', name_ar: 'جامعة انتماء مساعد المشرف', name_fr: 'Université du co-directeur', required: false },
  { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة بالعربية', name_fr: 'Titre de thèse (ar)', required: true },
  { key: 'thesis_title_fr', name_ar: 'عنوان الأطروحة بالفرنسية', name_fr: 'Titre de thèse (fr)', required: false },
  { key: 'thesis_language', name_ar: 'لغة الأطروحة', name_fr: 'Langue de thèse', required: false },
  { key: 'jury_president_ar', name_ar: 'رئيس اللجنة', name_fr: 'Président du jury', required: true },
  { key: 'jury_president_fr', name_ar: 'رئيس اللجنة بالفرنسية', name_fr: 'Président du jury (fr)', required: false },
  { key: 'jury_members_ar', name_ar: 'أعضاء اللجنة', name_fr: 'Membres du jury', required: true },
  { key: 'jury_members_fr', name_ar: 'أعضاء اللجنة بالفرنسية', name_fr: 'Membres du jury (fr)', required: false },
  { key: 'first_registration_year', name_ar: 'سنة أول تسجيل', name_fr: 'Année de 1ère inscription', required: false },
  { key: 'registration_count', name_ar: 'عدد التسجيلات', name_fr: 'Nombre d\'inscriptions', required: false },
  { key: 'research_lab_ar', name_ar: 'مخبر البحث', name_fr: 'Laboratoire', required: false },
  { key: 'scientific_council_date', name_ar: 'تاريخ المصادقة', name_fr: 'Date du conseil scientifique', required: false },
  { key: 'employment_status', name_ar: 'الحالة الوظيفية', name_fr: 'Statut professionnel', required: false },
  { key: 'registration_type', name_ar: 'نوع التسجيل', name_fr: 'Type d\'inscription', required: false },
  { key: 'professional_email', name_ar: 'البريد الإلكتروني', name_fr: 'Email', required: false },
  { key: 'phone_number', name_ar: 'رقم الهاتف', name_fr: 'Téléphone', required: false },
  { key: 'notes', name_ar: 'ملاحظات', name_fr: 'Notes', required: false },
];

// Master certificate fields (simpler - no thesis/jury/supervisor)
export const masterCertificateFields: FieldDefinition[] = [
  { key: 'student_number', name_ar: 'رقم الشهادة', name_fr: 'Numéro de certificat', required: true },
  { key: 'full_name_ar', name_ar: 'الاسم بالعربية', name_fr: 'Nom en arabe', required: true },
  { key: 'full_name_fr', name_ar: 'الاسم بالفرنسية', name_fr: 'Nom en français', required: false },
  { key: 'gender', name_ar: 'الجنس', name_fr: 'Sexe', required: false },
  { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Date de naissance', required: true },
  { key: 'birthplace_ar', name_ar: 'مكان الميلاد بالعربية', name_fr: 'Lieu de naissance (ar)', required: true },
  { key: 'birthplace_fr', name_ar: 'مكان الميلاد بالفرنسية', name_fr: 'Lieu de naissance (fr)', required: false },
  { key: 'university_ar', name_ar: 'الجامعة بالعربية', name_fr: 'Université (ar)', required: false },
  { key: 'university_fr', name_ar: 'الجامعة بالفرنسية', name_fr: 'Université (fr)', required: false },
  { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
  { key: 'faculty_fr', name_ar: 'الكلية بالفرنسية', name_fr: 'Faculté (fr)', required: false },
  { key: 'branch_ar', name_ar: 'الشعبة بالعربية', name_fr: 'Filière (ar)', required: true },
  { key: 'branch_fr', name_ar: 'الشعبة بالفرنسية', name_fr: 'Filière (fr)', required: false },
  { key: 'specialty_ar', name_ar: 'التخصص بالعربية', name_fr: 'Spécialité (ar)', required: true },
  { key: 'specialty_fr', name_ar: 'التخصص بالفرنسية', name_fr: 'Spécialité (fr)', required: false },
  { key: 'defense_date', name_ar: 'تاريخ المناقشة', name_fr: 'Date de soutenance', required: true },
  { key: 'mention', name_ar: 'التقدير', name_fr: 'Mention', required: false },
  { key: 'supervisor_ar', name_ar: 'المشرف', name_fr: 'Directeur', required: false },
  { key: 'first_registration_year', name_ar: 'سنة أول تسجيل', name_fr: 'Année de 1ère inscription', required: false },
  { key: 'research_lab_ar', name_ar: 'مخبر البحث', name_fr: 'Laboratoire', required: false },
  { key: 'scientific_council_date', name_ar: 'تاريخ المصادقة', name_fr: 'Date du conseil', required: false },
  { key: 'professional_email', name_ar: 'البريد الإلكتروني', name_fr: 'Email', required: false },
  { key: 'phone_number', name_ar: 'رقم الهاتف', name_fr: 'Téléphone', required: false },
];

export const getCertificateFields = (type: CertificateType): FieldDefinition[] => {
  switch (type) {
    case 'phd_lmd': return phdLmdCertificateFields;
    case 'phd_science': return phdScienceCertificateFields;
    case 'master': return masterCertificateFields;
  }
};

export const getCertificateTable = (type: CertificateType): string => {
  switch (type) {
    case 'phd_lmd': return 'phd_lmd_certificates';
    case 'phd_science': return 'phd_science_certificates';
    case 'master': return 'master_certificates';
  }
};
