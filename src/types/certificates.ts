// Certificate Types
export type CertificateType = 'phd_lmd' | 'phd_science' | 'master';
export type TemplateLanguage = 'ar' | 'fr' | 'en' | 'ar_fr' | 'ar_en' | 'fr_en' | 'ar_fr_en';
export type MentionType = 'honorable' | 'very_honorable';

// Base certificate fields that all types share
export interface BaseCertificate {
  id: string;
  student_number: string;
  full_name_ar: string;
  full_name_fr: string | null;
  date_of_birth: string;
  birthplace_ar: string;
  birthplace_fr: string | null;
  university_ar: string | null;
  university_fr: string | null;
  faculty_ar: string;
  faculty_fr: string | null;
  specialty_ar: string;
  specialty_fr: string | null;
  branch_ar: string;
  branch_fr: string | null;
  mention: MentionType;
  defense_date: string;
  certificate_date: string;
  created_at: string;
  updated_at: string;
  first_registration_year?: string | null;
  professional_email?: string | null;
  phone_number?: string | null;
  supervisor_ar: string;
  supervisor_fr?: string | null;
}

// PhD LMD Certificate
export interface PhdLmdCertificate extends BaseCertificate {
  thesis_title_ar: string;
  thesis_title_fr: string | null;
  field_ar: string;
  field_fr: string | null;
  jury_president_ar: string;
  jury_president_fr: string | null;
  jury_members_ar: string;
  jury_members_fr: string | null;
}

// PhD Science Certificate
export interface PhdScienceCertificate extends BaseCertificate {
  thesis_title_ar: string;
  thesis_title_fr: string | null;
  jury_president_ar: string;
  jury_president_fr: string | null;
  jury_members_ar: string;
  jury_members_fr: string | null;
}

// Master Certificate
export interface MasterCertificate extends BaseCertificate {
  // Master only has the base fields
}

// Union type for any certificate
export type Certificate = PhdLmdCertificate | PhdScienceCertificate | MasterCertificate;

// Template
export interface CertificateTemplate {
  id: string;
  template_name: string;
  certificate_type: CertificateType;
  language: TemplateLanguage;
  page_orientation: string;
  page_size: string;
  is_active: boolean;
  background_image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Template Field
export interface TemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_name_ar: string;
  field_name_fr: string | null;
  position_x: number;
  position_y: number;
  font_size: number;
  font_name: string;
  font_color: string;
  text_align: string;
  is_rtl: boolean;
  is_visible: boolean;
  field_order: number;
  created_at: string;
}

// Template with fields
export interface TemplateWithFields extends CertificateTemplate {
  certificate_template_fields: TemplateField[];
}

// Certificate type labels
export const certificateTypeLabels: Record<CertificateType, { ar: string; fr: string; en: string }> = {
  phd_lmd: { ar: 'دكتوراه ل م د', fr: 'Doctorat LMD', en: 'PhD LMD' },
  phd_science: { ar: 'دكتوراه علوم', fr: 'Doctorat Sciences', en: 'PhD Science' },
  master: { ar: 'ماجستير', fr: 'Magister', en: 'Magister' },
};

// Language labels
export const languageLabels: Record<TemplateLanguage, { ar: string; fr: string; en: string }> = {
  ar: { ar: 'العربية', fr: 'Arabe', en: 'Arabic' },
  fr: { ar: 'الفرنسية', fr: 'Français', en: 'French' },
  en: { ar: 'الإنجليزية', fr: 'Anglais', en: 'English' },
  ar_fr: { ar: 'عربي-فرنسي', fr: 'Arabe-Français', en: 'Arabic-French' },
  ar_en: { ar: 'عربي-إنجليزي', fr: 'Arabe-Anglais', en: 'Arabic-English' },
  fr_en: { ar: 'فرنسي-إنجليزي', fr: 'Français-Anglais', en: 'French-English' },
  ar_fr_en: { ar: 'ثلاثي اللغات', fr: 'Trilingue', en: 'Trilingual' },
};

// Mention labels
export const mentionLabels: Record<MentionType, { ar: string; fr: string; en: string }> = {
  honorable: { ar: 'مشرف', fr: 'Honorable', en: 'Honorable' },
  very_honorable: { ar: 'مشرف جدا', fr: 'Très Honorable', en: 'Very Honorable' },
};

// Field definitions for each certificate type
// Field definitions for each certificate type
// Note: thesis_title, jury_president, jury_members are single fields that support both Arabic and French text
export const certificateFields: Record<CertificateType, { key: string; name_ar: string; name_fr: string; required: boolean }[]> = {
  phd_lmd: [
    { key: 'student_number', name_ar: 'الرقم', name_fr: 'N°', required: true },
    { key: 'full_name_ar', name_ar: 'الاسم واللقب (عربي)', name_fr: 'Nom et Prénom (AR)', required: true },
    { key: 'full_name_fr', name_ar: 'الاسم واللقب (فرنسي)', name_fr: 'Nom et Prénom (FR)', required: false },
    { key: 'date_of_birth_ar', name_ar: 'تاريخ الميلاد (عربي)', name_fr: 'Date de naissance (AR)', required: true },
    { key: 'date_of_birth_fr', name_ar: 'تاريخ الميلاد (فرنسي)', name_fr: 'Date de naissance (FR)', required: false },
    { key: 'birthplace_ar', name_ar: 'مكان الميلاد (عربي)', name_fr: 'Lieu de naissance (AR)', required: true },
    { key: 'birthplace_fr', name_ar: 'مكان الميلاد (فرنسي)', name_fr: 'Lieu de naissance (FR)', required: false },
    { key: 'university_ar', name_ar: 'الجامعة (عربي)', name_fr: 'Université (AR)', required: false },
    { key: 'university_fr', name_ar: 'الجامعة (فرنسي)', name_fr: 'Université (FR)', required: false },
    { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
    { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة', name_fr: 'Titre de thèse', required: true },
    { key: 'field_ar', name_ar: 'الميدان (عربي)', name_fr: 'Domaine (AR)', required: true },
    { key: 'field_fr', name_ar: 'الميدان (فرنسي)', name_fr: 'Domaine (FR)', required: false },
    { key: 'branch_ar', name_ar: 'الشعبة (عربي)', name_fr: 'Filière (AR)', required: true },
    { key: 'branch_fr', name_ar: 'الشعبة (فرنسي)', name_fr: 'Filière (FR)', required: false },
    { key: 'specialty_ar', name_ar: 'التخصص (عربي)', name_fr: 'Spécialité (AR)', required: true },
    { key: 'specialty_fr', name_ar: 'التخصص (فرنسي)', name_fr: 'Spécialité (FR)', required: false },
    { key: 'mention_ar', name_ar: 'التقدير (عربي)', name_fr: 'Mention (AR)', required: true },
    { key: 'mention_fr', name_ar: 'التقدير (فرنسي)', name_fr: 'Mention (FR)', required: false },
    { key: 'defense_date_ar', name_ar: 'تاريخ المناقشة (عربي)', name_fr: 'Date de soutenance (AR)', required: true },
    { key: 'defense_date_fr', name_ar: 'تاريخ المناقشة (فرنسي)', name_fr: 'Date de soutenance (FR)', required: false },
    { key: 'jury_president_ar', name_ar: 'رئيس اللجنة', name_fr: 'Président du jury', required: true },
    { key: 'jury_members_ar', name_ar: 'أعضاء اللجنة', name_fr: 'Membres du jury', required: true },
    { key: 'certificate_date_ar', name_ar: 'تاريخ الشهادة (عربي)', name_fr: 'Date du certificat (AR)', required: true },
    { key: 'certificate_date_fr', name_ar: 'تاريخ الشهادة (فرنسي)', name_fr: 'Date du certificat (FR)', required: false },
  ],
  phd_science: [
    { key: 'student_number', name_ar: 'الرقم', name_fr: 'N°', required: true },
    { key: 'full_name_ar', name_ar: 'الاسم واللقب (عربي)', name_fr: 'Nom et Prénom (AR)', required: true },
    { key: 'full_name_fr', name_ar: 'الاسم واللقب (فرنسي)', name_fr: 'Nom et Prénom (FR)', required: false },
    { key: 'date_of_birth_ar', name_ar: 'تاريخ الميلاد (عربي)', name_fr: 'Date de naissance (AR)', required: true },
    { key: 'date_of_birth_fr', name_ar: 'تاريخ الميلاد (فرنسي)', name_fr: 'Date de naissance (FR)', required: false },
    { key: 'birthplace_ar', name_ar: 'مكان الميلاد (عربي)', name_fr: 'Lieu de naissance (AR)', required: true },
    { key: 'birthplace_fr', name_ar: 'مكان الميلاد (فرنسي)', name_fr: 'Lieu de naissance (FR)', required: false },
    { key: 'university_ar', name_ar: 'الجامعة (عربي)', name_fr: 'Université (AR)', required: false },
    { key: 'university_fr', name_ar: 'الجامعة (فرنسي)', name_fr: 'Université (FR)', required: false },
    { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
    { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة', name_fr: 'Titre de thèse', required: true },
    { key: 'branch_ar', name_ar: 'الشعبة (عربي)', name_fr: 'Filière (AR)', required: true },
    { key: 'branch_fr', name_ar: 'الشعبة (فرنسي)', name_fr: 'Filière (FR)', required: false },
    { key: 'specialty_ar', name_ar: 'التخصص (عربي)', name_fr: 'Spécialité (AR)', required: true },
    { key: 'specialty_fr', name_ar: 'التخصص (فرنسي)', name_fr: 'Spécialité (FR)', required: false },
    { key: 'mention_ar', name_ar: 'التقدير (عربي)', name_fr: 'Mention (AR)', required: true },
    { key: 'mention_fr', name_ar: 'التقدير (فرنسي)', name_fr: 'Mention (FR)', required: false },
    { key: 'defense_date_ar', name_ar: 'تاريخ المناقشة (عربي)', name_fr: 'Date de soutenance (AR)', required: true },
    { key: 'defense_date_fr', name_ar: 'تاريخ المناقشة (فرنسي)', name_fr: 'Date de soutenance (FR)', required: false },
    { key: 'jury_president_ar', name_ar: 'رئيس اللجنة', name_fr: 'Président du jury', required: true },
    { key: 'jury_members_ar', name_ar: 'أعضاء اللجنة', name_fr: 'Membres du jury', required: true },
    { key: 'certificate_date_ar', name_ar: 'تاريخ الشهادة (عربي)', name_fr: 'Date du certificat (AR)', required: true },
    { key: 'certificate_date_fr', name_ar: 'تاريخ الشهادة (فرنسي)', name_fr: 'Date du certificat (FR)', required: false },
  ],
  master: [
    { key: 'student_number', name_ar: 'الرقم', name_fr: 'N°', required: true },
    { key: 'full_name_ar', name_ar: 'الاسم واللقب (عربي)', name_fr: 'Nom et Prénom (AR)', required: true },
    { key: 'full_name_fr', name_ar: 'الاسم واللقب (فرنسي)', name_fr: 'Nom et Prénom (FR)', required: false },
    { key: 'date_of_birth_ar', name_ar: 'تاريخ الميلاد (عربي)', name_fr: 'Date de naissance (AR)', required: true },
    { key: 'date_of_birth_fr', name_ar: 'تاريخ الميلاد (فرنسي)', name_fr: 'Date de naissance (FR)', required: false },
    { key: 'birthplace_ar', name_ar: 'مكان الميلاد (عربي)', name_fr: 'Lieu de naissance (AR)', required: true },
    { key: 'birthplace_fr', name_ar: 'مكان الميلاد (فرنسي)', name_fr: 'Lieu de naissance (FR)', required: false },
    { key: 'university_ar', name_ar: 'الجامعة (عربي)', name_fr: 'Université (AR)', required: false },
    { key: 'university_fr', name_ar: 'الجامعة (فرنسي)', name_fr: 'Université (FR)', required: false },
    { key: 'faculty_ar', name_ar: 'الكلية', name_fr: 'Faculté', required: true },
    { key: 'branch_ar', name_ar: 'الشعبة (عربي)', name_fr: 'Filière (AR)', required: true },
    { key: 'branch_fr', name_ar: 'الشعبة (فرنسي)', name_fr: 'Filière (FR)', required: false },
    { key: 'specialty_ar', name_ar: 'التخصص (عربي)', name_fr: 'Spécialité (AR)', required: true },
    { key: 'specialty_fr', name_ar: 'التخصص (فرنسي)', name_fr: 'Spécialité (FR)', required: false },
    { key: 'mention_ar', name_ar: 'التقدير (عربي)', name_fr: 'Mention (AR)', required: true },
    { key: 'mention_fr', name_ar: 'التقدير (فرنسي)', name_fr: 'Mention (FR)', required: false },
    { key: 'defense_date_ar', name_ar: 'تاريخ المناقشة (عربي)', name_fr: 'Date de soutenance (AR)', required: true },
    { key: 'defense_date_fr', name_ar: 'تاريخ المناقشة (فرنسي)', name_fr: 'Date de soutenance (FR)', required: false },
    { key: 'certificate_date_ar', name_ar: 'تاريخ الشهادة (عربي)', name_fr: 'Date du certificat (AR)', required: true },
    { key: 'certificate_date_fr', name_ar: 'تاريخ الشهادة (فرنسي)', name_fr: 'Date du certificat (FR)', required: false },
  ],
};

// Get table name for certificate type
export const getCertificateTable = (type: CertificateType): string => {
  const tables: Record<CertificateType, string> = {
    phd_lmd: 'phd_lmd_certificates',
    phd_science: 'phd_science_certificates',
    master: 'master_certificates',
  };
  return tables[type];
};
