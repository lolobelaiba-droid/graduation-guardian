import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CertificateType = 
  | "bachelor" 
  | "master" 
  | "phd" 
  | "training" 
  | "excellence" 
  | "participation" 
  | "attendance" 
  | "achievement";

export interface Template {
  id: string;
  template_name: string;
  certificate_type: CertificateType;
  language: string;
  background_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  id: string;
  template_id: string;
  field_name: string;
  field_type: string;
  field_key: string;
  position_x: number;
  position_y: number;
  font_size: number;
  font_name: string;
  font_color: string;
  text_align: string;
  created_at: string;
}

export interface TemplateWithFields extends Template {
  template_fields: TemplateField[];
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });
}

export function useTemplatesWithFields() {
  return useQuery({
    queryKey: ["templates-with-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select(`
          *,
          template_fields (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TemplateWithFields[];
    },
  });
}

export function useActiveTemplates() {
  return useQuery({
    queryKey: ["active-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("is_active", true)
        .order("template_name");

      if (error) throw error;
      return data as Template[];
    },
  });
}

export function useToggleTemplateActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("templates")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["active-templates"] });
      toast.success(data.is_active ? "تم تفعيل القالب" : "تم تعطيل القالب");
    },
    onError: (error) => {
      toast.error("فشل في تحديث حالة القالب: " + error.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: template } = await supabase
        .from("templates")
        .select("template_name")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("templates").delete().eq("id", id);

      if (error) throw error;

      if (template) {
        await supabase.from("activity_log").insert({
          activity_type: "template_deleted",
          description: `تم حذف قالب ${template.template_name}`,
          entity_type: "template",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["active-templates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم حذف القالب بنجاح");
    },
    onError: (error) => {
      toast.error("فشل في حذف القالب: " + error.message);
    },
  });
}

export const certificateTypeLabels: Record<CertificateType, string> = {
  bachelor: "بكالوريوس",
  master: "ماجستير",
  phd: "دكتوراه",
  training: "دورة تدريبية",
  excellence: "تميز",
  participation: "مشاركة",
  attendance: "حضور",
  achievement: "إنجاز",
};
