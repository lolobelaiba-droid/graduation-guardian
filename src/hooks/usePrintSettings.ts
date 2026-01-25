import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrintSettings {
  paperSize: string;
  customWidth: number;
  customHeight: number;
  orientation: string;
  marginTop: number;
  marginBottom: number;
  marginRight: number;
  marginLeft: number;
}

// Paper sizes with dimensions in mm
export const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  a0: { width: 841, height: 1189 },
  a1: { width: 594, height: 841 },
  a2: { width: 420, height: 594 },
  a3: { width: 297, height: 420 },
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  a6: { width: 105, height: 148 },
  b4: { width: 250, height: 353 },
  b5: { width: 176, height: 250 },
  letter: { width: 216, height: 279 },
  legal: { width: 216, height: 356 },
  tabloid: { width: 279, height: 432 },
  executive: { width: 184, height: 267 },
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: "a4",
  customWidth: 210,
  customHeight: 297,
  orientation: "portrait",
  marginTop: 20,
  marginBottom: 20,
  marginRight: 15,
  marginLeft: 15,
};

export function usePrintSettings() {
  return useQuery({
    queryKey: ["print_settings"],
    queryFn: async (): Promise<PrintSettings> => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .in("key", [
          "print_paper_size",
          "print_custom_width",
          "print_custom_height",
          "print_orientation",
          "print_margin_top",
          "print_margin_bottom",
          "print_margin_right",
          "print_margin_left",
        ]);

      if (error) {
        console.error("Error loading print settings:", error);
        return DEFAULT_PRINT_SETTINGS;
      }

      const settings = { ...DEFAULT_PRINT_SETTINGS };
      
      data?.forEach((setting) => {
        switch (setting.key) {
          case "print_paper_size":
            if (setting.value) settings.paperSize = setting.value;
            break;
          case "print_custom_width":
            if (setting.value) settings.customWidth = parseFloat(setting.value);
            break;
          case "print_custom_height":
            if (setting.value) settings.customHeight = parseFloat(setting.value);
            break;
          case "print_orientation":
            if (setting.value) settings.orientation = setting.value;
            break;
          case "print_margin_top":
            if (setting.value) settings.marginTop = parseFloat(setting.value);
            break;
          case "print_margin_bottom":
            if (setting.value) settings.marginBottom = parseFloat(setting.value);
            break;
          case "print_margin_right":
            if (setting.value) settings.marginRight = parseFloat(setting.value);
            break;
          case "print_margin_left":
            if (setting.value) settings.marginLeft = parseFloat(setting.value);
            break;
        }
      });

      return settings;
    },
  });
}

// Get paper dimensions based on settings
export function getPaperDimensions(settings: PrintSettings): { width: number; height: number } {
  if (settings.paperSize === "custom") {
    return { width: settings.customWidth, height: settings.customHeight };
  }
  
  const size = PAPER_SIZES[settings.paperSize];
  if (size) {
    return size;
  }
  
  // Default to A4
  return { width: 210, height: 297 };
}

// Fetch print settings synchronously (for use in non-hook contexts)
export async function fetchPrintSettings(): Promise<PrintSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .in("key", [
      "print_paper_size",
      "print_custom_width",
      "print_custom_height",
      "print_orientation",
      "print_margin_top",
      "print_margin_bottom",
      "print_margin_right",
      "print_margin_left",
    ]);

  if (error) {
    console.error("Error loading print settings:", error);
    return DEFAULT_PRINT_SETTINGS;
  }

  const settings = { ...DEFAULT_PRINT_SETTINGS };
  
  data?.forEach((setting) => {
    switch (setting.key) {
      case "print_paper_size":
        if (setting.value) settings.paperSize = setting.value;
        break;
      case "print_custom_width":
        if (setting.value) settings.customWidth = parseFloat(setting.value);
        break;
      case "print_custom_height":
        if (setting.value) settings.customHeight = parseFloat(setting.value);
        break;
      case "print_orientation":
        if (setting.value) settings.orientation = setting.value;
        break;
      case "print_margin_top":
        if (setting.value) settings.marginTop = parseFloat(setting.value);
        break;
      case "print_margin_bottom":
        if (setting.value) settings.marginBottom = parseFloat(setting.value);
        break;
      case "print_margin_right":
        if (setting.value) settings.marginRight = parseFloat(setting.value);
        break;
      case "print_margin_left":
        if (setting.value) settings.marginLeft = parseFloat(setting.value);
        break;
    }
  });

  return settings;
}
