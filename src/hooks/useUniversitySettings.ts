import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export interface UniversitySettings {
  universityName?: string;
  universityNameEn?: string;
  universityLogo?: string;
  universityAddress?: string;
  universityPhone?: string;
  universityEmail?: string;
  universityWebsite?: string;
}

export function useUniversitySettings() {
  return useQuery({
    queryKey: ["university_settings"],
    queryFn: async (): Promise<UniversitySettings> => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAllSettings();
        
        if (result.success && result.data) {
          const settings: UniversitySettings = {};
          result.data.forEach((item: { key: string; value: string | null }) => {
            switch (item.key) {
              case "university_name":
                if (item.value) settings.universityName = item.value;
                break;
              case "university_name_en":
                if (item.value) settings.universityNameEn = item.value;
                break;
              case "university_logo":
                if (item.value) settings.universityLogo = item.value;
                break;
              case "university_address":
                if (item.value) settings.universityAddress = item.value;
                break;
              case "university_phone":
                if (item.value) settings.universityPhone = item.value;
                break;
              case "university_email":
                if (item.value) settings.universityEmail = item.value;
                break;
              case "university_website":
                if (item.value) settings.universityWebsite = item.value;
                break;
            }
          });
          return settings;
        }
        return {};
      }

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .in("key", [
          "university_name",
          "university_name_en", 
          "university_logo",
          "university_address",
          "university_phone",
          "university_email",
          "university_website"
        ]);

      if (error) throw error;
      
      const settings: UniversitySettings = {};
      data?.forEach(item => {
        switch (item.key) {
          case "university_name":
            if (item.value) settings.universityName = item.value;
            break;
          case "university_name_en":
            if (item.value) settings.universityNameEn = item.value;
            break;
          case "university_logo":
            if (item.value) settings.universityLogo = item.value;
            break;
          case "university_address":
            if (item.value) settings.universityAddress = item.value;
            break;
          case "university_phone":
            if (item.value) settings.universityPhone = item.value;
            break;
          case "university_email":
            if (item.value) settings.universityEmail = item.value;
            break;
          case "university_website":
            if (item.value) settings.universityWebsite = item.value;
            break;
        }
      });
      return settings;
    },
  });
}
