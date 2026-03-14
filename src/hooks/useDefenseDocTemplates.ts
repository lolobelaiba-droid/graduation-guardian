import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomVariable {
  key: string;
  label: string;
}

export interface JuryTableSettings {
  font_size: number;
  border_color: string;
  header_bg: string;
  padding: number;
  show_number: boolean;
  show_rank: boolean;
  show_university: boolean;
  show_role: boolean;
  col_number_width: number;
  col_name_width: number;
  col_rank_width: number;
  col_university_width: number;
  col_role_width: number;
  include_abbreviation: boolean;
}

export const DEFAULT_JURY_TABLE_SETTINGS: JuryTableSettings = {
  font_size: 12,
  border_color: "#333",
  header_bg: "#f0f0f0",
  padding: 8,
  show_number: true,
  show_rank: true,
  show_university: true,
  show_role: true,
  col_number_width: 6,
  col_name_width: 24,
  col_rank_width: 18,
  col_university_width: 28,
  col_role_width: 24,
  include_abbreviation: true,
};

export interface DefenseDocTemplate {
  id: string;
  document_type: string;
  title: string;
  content: string;
  font_family: string;
  font_size: number;
  line_height: number;
  custom_variables: CustomVariable[];
  jury_table_settings: JuryTableSettings;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  jury_decision_lmd: "مقرر تعيين لجنة المناقشة - دكتوراه ل م د",
  jury_decision_science: "مقرر تعيين لجنة المناقشة - دكتوراه علوم",
  defense_auth_lmd: "الترخيص بالمناقشة - دكتوراه ل م د",
  defense_auth_science: "الترخيص بالمناقشة - دكتوراه علوم",
};

// Default placeholder variables for defense documents
export const DEFAULT_VARIABLES: CustomVariable[] = [
  { key: "decision_number", label: "رقم مقرر اللجنة" },
  { key: "decision_date", label: "تاريخ مقرر اللجنة" },
  { key: "auth_decision_number", label: "رقم مقرر الترخيص" },
  { key: "auth_decision_date", label: "تاريخ مقرر الترخيص" },
  { key: "dean_letter_number", label: "رقم إرسال العميد" },
  { key: "dean_letter_date", label: "تاريخ إرسال العميد" },
  { key: "faculty_head_title", label: "صفة رئيس الكلية/المعهد (عميد/مدير)" },
  { key: "full_name_ar", label: "الاسم الكامل (عربي)" },
  { key: "full_name_fr", label: "الاسم الكامل (فرنسي)" },
  { key: "gender", label: "الجنس" },
  { key: "date_of_birth", label: "تاريخ الميلاد" },
  { key: "birthplace_ar", label: "مكان الميلاد" },
  { key: "province", label: "الولاية" },
  { key: "registration_number", label: "رقم التسجيل" },
  { key: "university_ar", label: "الجامعة" },
  { key: "faculty_ar", label: "الكلية" },
  { key: "field_ar", label: "الميدان" },
  { key: "branch_ar", label: "الفرع" },
  { key: "specialty_ar", label: "التخصص" },
  { key: "thesis_title_ar", label: "عنوان الأطروحة (عربي)" },
  { key: "thesis_title_fr", label: "عنوان الأطروحة (فرنسي)" },
  { key: "supervisor_ar", label: "المشرف" },
  { key: "supervisor_university", label: "جامعة المشرف" },
  { key: "co_supervisor_ar", label: "المشرف المساعد" },
  { key: "co_supervisor_university", label: "جامعة المشرف المساعد" },
  { key: "jury_president_ar", label: "رئيس اللجنة" },
  { key: "jury_members_ar", label: "أعضاء اللجنة" },
  { key: "scientific_council_date", label: "تاريخ المجلس العلمي" },
  { key: "defense_date", label: "تاريخ المناقشة" },
  { key: "signature_title", label: "صفة الموقع" },
  { key: "first_registration_year", label: "سنة أول تسجيل" },
  { key: "research_lab_ar", label: "مخبر البحث" },
  { key: "current_year", label: "السنة الجامعية" },
  { key: "decree_training", label: "قرار تنظيم التكوين" },
  { key: "decree_accreditation", label: "قرار التأهيل" },
  { key: "jury_table", label: "جدول أعضاء اللجنة (ديناميكي)" },
];

export function getTemplateVariables(template: DefenseDocTemplate): CustomVariable[] {
  const customs = Array.isArray(template.custom_variables) ? template.custom_variables : [];
  return [...DEFAULT_VARIABLES, ...customs];
}

export function useDefenseDocTemplates() {
  return useQuery({
    queryKey: ["defense_document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defense_document_templates" as any)
        .select("*")
        .order("document_type");

      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        custom_variables: Array.isArray(d.custom_variables) ? d.custom_variables : [],
      })) as DefenseDocTemplate[];
    },
  });
}

export function useUpdateDefenseDocTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<DefenseDocTemplate> & { id: string }) => {
      const { id, ...updates } = template;
      const { error } = await supabase
        .from("defense_document_templates" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_document_templates"] });
    },
  });
}
