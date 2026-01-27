import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { CertificateService } from "@/lib/database/certificate-service";
import { TemplateService, TemplateFieldService } from "@/lib/database/template-service";
import { toast } from "sonner";
import type { 
  CertificateType, 
  PhdLmdCertificate, 
  PhdScienceCertificate, 
  MasterCertificate,
  CertificateTemplate,
  TemplateField,
  TemplateWithFields,
  TemplateLanguage
} from "@/types/certificates";
import type { Json } from "@/integrations/supabase/types";

// ============================================
// PhD LMD Certificates
// ============================================
export function usePhdLmdCertificates() {
  return useQuery({
    queryKey: ["phd_lmd_certificates"],
    queryFn: async () => {
      if (isElectron()) {
        const { data, error } = await CertificateService.getAll('phd_lmd');
        if (error) throw error;
        return data as PhdLmdCertificate[];
      }

      const { data, error } = await supabase
        .from("phd_lmd_certificates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PhdLmdCertificate[];
    },
  });
}

export function useCreatePhdLmdCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PhdLmdCertificate, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const result = await CertificateService.create('phd_lmd', data as Record<string, unknown>);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: certificate, error } = await supabase
        .from("phd_lmd_certificates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة طالب دكتوراه ل م د: ${data.full_name_ar}`,
        entity_id: certificate.id,
        entity_type: "phd_lmd_certificate",
      });

      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إضافة الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الطالب: " + error.message);
    },
  });
}

export function useUpdatePhdLmdCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PhdLmdCertificate> & { id: string }) => {
      if (isElectron()) {
        const result = await CertificateService.update('phd_lmd', id, data as Record<string, unknown>);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: certificate, error } = await supabase
        .from("phd_lmd_certificates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeletePhdLmdCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const result = await CertificateService.delete('phd_lmd', id);
        if (result.error) throw result.error;
        return;
      }

      const { error } = await supabase.from("phd_lmd_certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}

// ============================================
// PhD Science Certificates
// ============================================
export function usePhdScienceCertificates() {
  return useQuery({
    queryKey: ["phd_science_certificates"],
    queryFn: async () => {
      if (isElectron()) {
        const { data, error } = await CertificateService.getAll('phd_science');
        if (error) throw error;
        return data as PhdScienceCertificate[];
      }

      const { data, error } = await supabase
        .from("phd_science_certificates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PhdScienceCertificate[];
    },
  });
}

export function useCreatePhdScienceCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PhdScienceCertificate, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const result = await CertificateService.create('phd_science', data as Record<string, unknown>);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: certificate, error } = await supabase
        .from("phd_science_certificates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة طالب دكتوراه علوم: ${data.full_name_ar}`,
        entity_id: certificate.id,
        entity_type: "phd_science_certificate",
      });

      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إضافة الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الطالب: " + error.message);
    },
  });
}

export function useUpdatePhdScienceCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PhdScienceCertificate> & { id: string }) => {
      if (isElectron()) {
        const result = await CertificateService.update('phd_science', id, data as Record<string, unknown>);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: certificate, error } = await supabase
        .from("phd_science_certificates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeletePhdScienceCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const result = await CertificateService.delete('phd_science', id);
        if (result.error) throw result.error;
        return;
      }

      const { error } = await supabase.from("phd_science_certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}

// ============================================
// Master Certificates
// ============================================
export function useMasterCertificates() {
  return useQuery({
    queryKey: ["master_certificates"],
    queryFn: async () => {
      if (isElectron()) {
        const { data, error } = await CertificateService.getAll('master');
        if (error) throw error;
        return data as MasterCertificate[];
      }

      const { data, error } = await supabase
        .from("master_certificates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MasterCertificate[];
    },
  });
}

export function useCreateMasterCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MasterCertificate, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const result = await CertificateService.create('master', data as Record<string, unknown>);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: certificate, error } = await supabase
        .from("master_certificates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة طالب ماجستير: ${data.full_name_ar}`,
        entity_id: certificate.id,
        entity_type: "master_certificate",
      });

      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إضافة الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الطالب: " + error.message);
    },
  });
}

export function useUpdateMasterCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MasterCertificate> & { id: string }) => {
      if (isElectron()) {
        const result = await CertificateService.update('master', id, data as Record<string, unknown>);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: certificate, error } = await supabase
        .from("master_certificates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_certificates"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeleteMasterCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const result = await CertificateService.delete('master', id);
        if (result.error) throw result.error;
        return;
      }

      const { error } = await supabase.from("master_certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_certificates"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}

// ============================================
// Templates
// ============================================
export function useCertificateTemplates() {
  return useQuery({
    queryKey: ["certificate_templates"],
    queryFn: async () => {
      if (isElectron()) {
        const { data, error } = await TemplateService.getAll();
        if (error) throw error;
        return data as CertificateTemplate[];
      }

      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CertificateTemplate[];
    },
  });
}

export function useTemplateWithFields(templateId: string | null) {
  return useQuery({
    queryKey: ["template_with_fields", templateId],
    queryFn: async () => {
      if (!templateId) return null;

      if (isElectron()) {
        const { data, error } = await TemplateService.getWithFields(templateId);
        if (error) throw error;
        return data as TemplateWithFields;
      }

      const { data, error } = await supabase
        .from("certificate_templates")
        .select(`
          *,
          certificate_template_fields (*)
        `)
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data as TemplateWithFields;
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      template_name: string; 
      certificate_type: CertificateType; 
      language: TemplateLanguage;
      page_orientation?: string;
    }) => {
      if (isElectron()) {
        const result = await TemplateService.create(data);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: template, error } = await supabase
        .from("certificate_templates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "template_added",
        description: `تم إنشاء قالب: ${data.template_name}`,
        entity_id: template.id,
        entity_type: "template",
      });

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate_templates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إنشاء القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في إنشاء القالب: " + error.message);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CertificateTemplate> & { id: string }) => {
      if (isElectron()) {
        const result = await TemplateService.update(id, data);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: template, error } = await supabase
        .from("certificate_templates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate_templates"] });
      toast.success("تم تحديث القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث القالب: " + error.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const result = await TemplateService.delete(id);
        if (result.error) throw result.error;
        return;
      }

      const { error } = await supabase.from("certificate_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate_templates"] });
      toast.success("تم حذف القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف القالب: " + error.message);
    },
  });
}

// ============================================
// Template Fields
// ============================================
export function useTemplateFields(templateId: string | null) {
  return useQuery({
    queryKey: ["template_fields", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      if (isElectron()) {
        const { data, error } = await TemplateFieldService.getByTemplateId(templateId);
        if (error) throw error;
        return data as TemplateField[];
      }

      const { data, error } = await supabase
        .from("certificate_template_fields")
        .select("*")
        .eq("template_id", templateId)
        .order("field_order");

      if (error) throw error;
      return data as TemplateField[];
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TemplateField, 'id' | 'created_at'>) => {
      if (isElectron()) {
        const result = await TemplateFieldService.create(data);
        if (result.error) throw result.error;
        return result.data;
      }

      const { data: field, error } = await supabase
        .from("certificate_template_fields")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return field;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["template_fields", variables.template_id] });
      queryClient.invalidateQueries({ queryKey: ["template_with_fields", variables.template_id] });
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الحقل: " + error.message);
    },
  });
}

export function useUpdateTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template_id, ...data }: Partial<TemplateField> & { id: string; template_id: string }) => {
      if (isElectron()) {
        const result = await TemplateFieldService.update(id, data);
        if (result.error) throw result.error;
        return { field: result.data, template_id };
      }

      const { data: field, error } = await supabase
        .from("certificate_template_fields")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { field, template_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["template_fields", result.template_id] });
      queryClient.invalidateQueries({ queryKey: ["template_with_fields", result.template_id] });
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث الحقل: " + error.message);
    },
  });
}

export function useDeleteTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template_id }: { id: string; template_id: string }) => {
      if (isElectron()) {
        const result = await TemplateFieldService.delete(id);
        if (result.error) throw result.error;
        return { template_id };
      }

      const { error } = await supabase.from("certificate_template_fields").delete().eq("id", id);
      if (error) throw error;
      return { template_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["template_fields", result.template_id] });
      queryClient.invalidateQueries({ queryKey: ["template_with_fields", result.template_id] });
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الحقل: " + error.message);
    },
  });
}

// ============================================
// User Settings
// ============================================
export function useUserSettings() {
  return useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAllUserSettings();
        if (result.success && result.data) {
          const settings: Record<string, unknown> = {};
          (result.data as Array<{ setting_key: string; setting_value: unknown }>).forEach(item => {
            settings[item.setting_key] = item.setting_value;
          });
          return settings;
        }
        return {};
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select("*");

      if (error) throw error;
      
      const settings: Record<string, unknown> = {};
      data.forEach(item => {
        settings[item.setting_key] = item.setting_value;
      });
      return settings;
    },
  });
}

export function useSaveUserSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      if (isElectron()) {
        const db = getDbClient()!;
        await db.setUserSetting(key, JSON.stringify(value));
        return;
      }

      // First check if setting exists
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("setting_key", key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({ setting_value: value as Json })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert([{ setting_key: key, setting_value: value as Json }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });
}

// ============================================
// Bulk Operations
// ============================================
export function useBulkCreateTemplateFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields: Omit<TemplateField, 'id' | 'created_at'>[]) => {
      if (isElectron()) {
        const db = getDbClient()!;
        const results = [];
        for (const field of fields) {
          const electronField = {
            ...field,
            is_rtl: field.is_rtl ? 1 : 0,
            is_visible: field.is_visible ? 1 : 0
          };
          const result = await db.insert('certificate_template_fields', electronField);
          if (result.success) {
            results.push(result.data);
          }
        }
        return results;
      }

      const { data, error } = await supabase
        .from("certificate_template_fields")
        .insert(fields)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        const templateId = variables[0].template_id;
        queryClient.invalidateQueries({ queryKey: ["template_fields", templateId] });
        queryClient.invalidateQueries({ queryKey: ["template_with_fields", templateId] });
      }
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الحقول: " + error.message);
    },
  });
}
