// Certificate Types
export type CertificateType = 'phd_lmd' | 'phd_science' | 'master';
export type TemplateLanguage = 'ar' | 'fr' | 'en' | 'ar_fr' | 'ar_en' | 'fr_en' | 'ar_fr_en';
export type MentionType = 'excellent' | 'very_good' | 'good' | 'fairly_good' | 'passable';

// Base certificate fields that all types share
export interface BaseCertificate {
  id: string;
  student_number: string;
  full_name_ar: string;
  full_name_fr: string | null;
  date_of_birth: string;
  birthplace_ar: string;
  birthplace_fr: string | null;
  specialty_ar: string;
  specialty_fr: string | null;
  branch_ar: string;
  branch_fr: string | null;
  mention: MentionType;
  defense_date: string;
  certificate_date: string;
  created_at: string;
  updated_at: string;
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
  master: { ar: 'ماجستير', fr: 'Master', en: 'Master' },
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
  excellent: { ar: 'ممتاز', fr: 'Excellent', en: 'Excellent' },
  very_good: { ar: 'جيد جداً', fr: 'Très Bien', en: 'Very Good' },
  good: { ar: 'جيد', fr: 'Bien', en: 'Good' },
  fairly_good: { ar: 'مقبول جيد', fr: 'Assez Bien', en: 'Fairly Good' },
  passable: { ar: 'مقبول', fr: 'Passable', en: 'Passable' },
};

// Field definitions for each certificate type
export const certificateFields: Record<CertificateType, { key: string; name_ar: string; name_fr: string; required: boolean }[]> = {
  phd_lmd: [
    { key: 'student_number', name_ar: 'الرقم', name_fr: 'Numéro', required: true },
    { key: 'full_name_ar', name_ar: 'الاسم واللقب', name_fr: 'Nom et Prénom', required: true },
    { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Né(e) le', required: true },
    { key: 'birthplace_ar', name_ar: 'مكان الميلاد', name_fr: 'Lieu de naissance', required: true },
    { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة', name_fr: 'Titre de thèse', required: true },
    { key: 'field_ar', name_ar: 'الميدان', name_fr: 'Domaine', required: true },
    { key: 'branch_ar', name_ar: 'الشعبة', name_fr: 'Filière', required: true },
    { key: 'specialty_ar', name_ar: 'التخصص', name_fr: 'Spécialité', required: true },
    { key: 'mention', name_ar: 'التقدير', name_fr: 'Mention', required: true },
    { key: 'defense_date', name_ar: 'تاريخ المناقشة', name_fr: 'Date de soutenance', required: true },
    { key: 'jury_president_ar', name_ar: 'رئيس اللجنة', name_fr: 'Président du jury', required: true },
    { key: 'jury_members_ar', name_ar: 'أعضاء اللجنة', name_fr: 'Membres du jury', required: true },
    { key: 'certificate_date', name_ar: 'تاريخ الشهادة', name_fr: 'Date du certificat', required: true },
  ],
  phd_science: [
    { key: 'student_number', name_ar: 'الرقم', name_fr: 'Numéro', required: true },
    { key: 'full_name_ar', name_ar: 'الاسم واللقب', name_fr: 'Nom et Prénom', required: true },
    { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Né(e) le', required: true },
    { key: 'birthplace_ar', name_ar: 'مكان الميلاد', name_fr: 'Lieu de naissance', required: true },
    { key: 'thesis_title_ar', name_ar: 'عنوان الأطروحة', name_fr: 'Titre de thèse', required: true },
    { key: 'branch_ar', name_ar: 'الشعبة', name_fr: 'Filière', required: true },
    { key: 'specialty_ar', name_ar: 'التخصص', name_fr: 'Spécialité', required: true },
    { key: 'mention', name_ar: 'التقدير', name_fr: 'Mention', required: true },
    { key: 'defense_date', name_ar: 'تاريخ المناقشة', name_fr: 'Date de soutenance', required: true },
    { key: 'jury_president_ar', name_ar: 'رئيس اللجنة', name_fr: 'Président du jury', required: true },
    { key: 'jury_members_ar', name_ar: 'أعضاء اللجنة', name_fr: 'Membres du jury', required: true },
    { key: 'certificate_date', name_ar: 'تاريخ الشهادة', name_fr: 'Date du certificat', required: true },
  ],
  master: [
    { key: 'student_number', name_ar: 'الرقم', name_fr: 'Numéro', required: true },
    { key: 'full_name_ar', name_ar: 'الاسم واللقب', name_fr: 'Nom et Prénom', required: true },
    { key: 'date_of_birth', name_ar: 'تاريخ الميلاد', name_fr: 'Né(e) le', required: true },
    { key: 'birthplace_ar', name_ar: 'مكان الميلاد', name_fr: 'Lieu de naissance', required: true },
    { key: 'branch_ar', name_ar: 'الشعبة', name_fr: 'Filière', required: true },
    { key: 'specialty_ar', name_ar: 'التخصص', name_fr: 'Spécialité', required: true },
    { key: 'mention', name_ar: 'التقدير', name_fr: 'Mention', required: true },
    { key: 'defense_date', name_ar: 'تاريخ المناقشة', name_fr: 'Date de soutenance', required: true },
    { key: 'certificate_date', name_ar: 'تاريخ الشهادة', name_fr: 'Date du certificat', required: true },
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
