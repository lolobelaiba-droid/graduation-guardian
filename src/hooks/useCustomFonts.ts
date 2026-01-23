import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomFont {
  id: string;
  font_name: string;
  font_family: string;
  font_url: string;
  font_weight: string;
  font_style: string;
  is_arabic: boolean;
  created_at: string;
}

export function useCustomFonts() {
  return useQuery({
    queryKey: ["custom_fonts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fonts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomFont[];
    },
  });
}

export function useCreateCustomFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (font: Omit<CustomFont, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("custom_fonts")
        .insert(font)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_fonts"] });
      toast.success("تم إضافة الخط بنجاح");
    },
    onError: (error) => {
      toast.error("فشل في إضافة الخط: " + error.message);
    },
  });
}

export function useDeleteCustomFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fontId: string) => {
      const { error } = await supabase
        .from("custom_fonts")
        .delete()
        .eq("id", fontId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_fonts"] });
      toast.success("تم حذف الخط");
    },
    onError: (error) => {
      toast.error("فشل في حذف الخط: " + error.message);
    },
  });
}

// Load a custom font into the document
export async function loadCustomFont(font: CustomFont): Promise<void> {
  const fontFace = new FontFace(font.font_family, `url(${font.font_url})`, {
    weight: font.font_weight,
    style: font.font_style as FontFaceSetLoadStatus,
  });

  try {
    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);
  } catch (error) {
    console.error(`Failed to load font ${font.font_name}:`, error);
  }
}

// Load all custom fonts
export async function loadAllCustomFonts(fonts: CustomFont[]): Promise<void> {
  await Promise.all(fonts.map(loadCustomFont));
}
