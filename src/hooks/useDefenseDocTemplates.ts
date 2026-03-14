import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DefenseDocTemplate {
  id: string;
  document_type: string;
  title: string;
  content: string;
  font_family: string;
  font_size: number;
  line_height: number;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  jury_decision_lmd: "مقرر تعيين لجنة المناقشة - دكتوراه ل م د",
  jury_decision_science: "مقرر تعيين لجنة المناقشة - دكتوراه علوم",
  defense_auth_lmd: "الترخيص بالمناقشة - دكتوراه ل م د",
  defense_auth_science: "الترخيص بالمناقشة - دكتوراه علوم",
};

// Available placeholder variables for defense documents
export const AVAILABLE_VARIABLES = [
  { key: "full_name_ar", label: "الاسم الكامل (عربي)" },
  { key: "full_name_fr", label: "الاسم الكامل (فرنسي)" },
  { key: "date_of_birth", label: "تاريخ الميلاد" },
  { key: "birthplace_ar", label: "مكان الميلاد" },
  { key: "registration_number", label: "رقم التسجيل" },
  { key: "university_ar", label: "الجامعة" },
  { key: "faculty_ar", label: "الكلية" },
  { key: "field_ar", label: "الميدان" },
  { key: "branch_ar", label: "الفرع" },
  { key: "specialty_ar", label: "التخصص" },
  { key: "thesis_title_ar", label: "عنوان الأطروحة (عربي)" },
  { key: "thesis_title_fr", label: "عنوان الأطروحة (فرنسي)" },
  { key: "supervisor_ar", label: "المشرف" },
  { key: "co_supervisor_ar", label: "المشرف المساعد" },
  { key: "jury_president_ar", label: "رئيس اللجنة" },
  { key: "jury_members_ar", label: "أعضاء اللجنة" },
  { key: "scientific_council_date", label: "تاريخ المجلس العلمي" },
  { key: "defense_date", label: "تاريخ المناقشة" },
  { key: "signature_title", label: "صفة الموقع" },
  { key: "first_registration_year", label: "سنة أول تسجيل" },
  { key: "research_lab_ar", label: "مخبر البحث" },
];

export function useDefenseDocTemplates() {
  return useQuery({
    queryKey: ["defense_document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defense_document_templates" as any)
        .select("*")
        .order("document_type");

      if (error) throw error;
      return (data || []) as unknown as DefenseDocTemplate[];
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
