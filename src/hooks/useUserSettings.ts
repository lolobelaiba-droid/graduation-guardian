import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CertificateType, TemplateLanguage } from "@/types/certificates";
import type { Json } from "@/integrations/supabase/types";

export interface AppSettings {
  selectedLanguage?: TemplateLanguage;
  selectedCertificateType?: CertificateType;
  lastTemplateId?: string;
  lastSearch?: string;
  lastFilter?: Record<string, unknown>;
}

export function useUserSettings() {
  return useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*");

      if (error) throw error;
      
      const settings: AppSettings = {};
      data.forEach(item => {
        const value = item.setting_value as Record<string, unknown>;
        if (item.setting_key === 'selectedLanguage') {
          settings.selectedLanguage = value?.value as TemplateLanguage;
        } else if (item.setting_key === 'selectedCertificateType') {
          settings.selectedCertificateType = value?.value as CertificateType;
        } else if (item.setting_key === 'lastTemplateId') {
          settings.lastTemplateId = value?.value as string;
        } else if (item.setting_key === 'lastSearch') {
          settings.lastSearch = value?.value as string;
        } else if (item.setting_key === 'lastFilter') {
          settings.lastFilter = value as Record<string, unknown>;
        }
      });
      return settings;
    },
  });
}

export function useSaveSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      // First check if setting exists
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("setting_key", key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({ setting_value: { value } as Json })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert([{ setting_key: key, setting_value: { value } as Json }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });
}
