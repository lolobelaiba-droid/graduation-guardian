import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "blue" | "emerald" | "rose" | "amber" | "violet" | "slate";

export interface ThemeConfig {
  id: ColorTheme;
  name: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: "blue",
    name: "الأزرق الكلاسيكي",
    preview: {
      primary: "hsl(217 91% 60%)",
      secondary: "hsl(222 47% 11%)",
      accent: "hsl(217 91% 50%)",
    },
  },
  {
    id: "emerald",
    name: "الأخضر الزمردي",
    preview: {
      primary: "hsl(160 84% 39%)",
      secondary: "hsl(158 64% 12%)",
      accent: "hsl(160 84% 30%)",
    },
  },
  {
    id: "rose",
    name: "الوردي العصري",
    preview: {
      primary: "hsl(346 77% 50%)",
      secondary: "hsl(346 47% 15%)",
      accent: "hsl(346 77% 40%)",
    },
  },
  {
    id: "amber",
    name: "الذهبي الدافئ",
    preview: {
      primary: "hsl(38 92% 50%)",
      secondary: "hsl(28 47% 15%)",
      accent: "hsl(38 92% 40%)",
    },
  },
  {
    id: "violet",
    name: "البنفسجي الأنيق",
    preview: {
      primary: "hsl(262 83% 58%)",
      secondary: "hsl(262 47% 12%)",
      accent: "hsl(262 83% 48%)",
    },
  },
  {
    id: "slate",
    name: "الرمادي الحديث",
    preview: {
      primary: "hsl(215 25% 27%)",
      secondary: "hsl(215 28% 17%)",
      accent: "hsl(215 25% 40%)",
    },
  },
];

const THEME_STORAGE_KEY = "app-color-theme";

export function useColorTheme() {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && themes.some((t) => t.id === stored)) {
        return stored as ColorTheme;
      }
    }
    return "blue";
  });

  const applyTheme = useCallback((theme: ColorTheme) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    themes.forEach((t) => root.classList.remove(`theme-${t.id}`));
    
    // Add new theme class only if not blue (blue is default/root)
    if (theme !== "blue") {
      root.classList.add(`theme-${theme}`);
    }
    
    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Force a repaint to ensure CSS variables are applied
    root.style.display = 'none';
    root.offsetHeight; // Trigger reflow
    root.style.display = '';
  }, []);

  useEffect(() => {
    applyTheme(colorTheme);
  }, [colorTheme, applyTheme]);

  const changeTheme = useCallback((theme: ColorTheme) => {
    setColorTheme(theme);
  }, []);

  return {
    colorTheme,
    changeTheme,
    themes,
  };
}
