import { useEffect, useState, useRef, useCallback } from 'react';
import { getFontByName, getAllFonts, type FontConfig } from '@/lib/arabicFonts';
import { logger } from '@/lib/logger';
import { cacheFontAsset } from '@/lib/database/asset-cache';

// Track loaded fonts globally to avoid duplicate loading
const loadedFonts = new Set<string>();

/**
 * Resolve font URL for Electron's file:// protocol
 */
function resolveElectronFontUrl(url: string): string {
  const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
  if (!isFileProtocol || !url.startsWith('/')) return url;
  return '.' + url;
}

/**
 * Check if URL is remote (needs internet)
 */
function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function loadFontIntoBrowser(font: FontConfig): Promise<boolean> {
  if (!font.url || font.isSystem) return true;
  
  const fontKey = `${font.family}:${font.style}`;
  if (loadedFonts.has(fontKey)) return true;
  
  try {
    let urlToFetch = font.url;
    
    // للخطوط المخصصة من الإنترنت: استخدم التخزين المحلي في Electron
    if (isRemoteUrl(font.url)) {
      urlToFetch = await cacheFontAsset(font.url);
    } else {
      urlToFetch = resolveElectronFontUrl(font.url);
    }
    
    const response = await fetch(urlToFetch);
    if (!response.ok) {
      // Try alternative paths for packaged Electron app (local fonts only)
      const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
      if (isFileProtocol && font.url.startsWith('/fonts/')) {
        const fileName = font.url.replace('/fonts/', '');
        const altPaths = [`../fonts/${fileName}`, `../../fonts/${fileName}`];
        for (const alt of altPaths) {
          try {
            const altResponse = await fetch(alt);
            if (altResponse.ok) {
              const buffer = await altResponse.arrayBuffer();
              const fontFace = new FontFace(font.family, buffer, {
                style: font.style === 'italic' ? 'italic' : 'normal',
                weight: font.style === 'bold' ? 'bold' : 'normal',
              });
              const loaded = await fontFace.load();
              document.fonts.add(loaded);
              loadedFonts.add(fontKey);
              logger.log(`[FontLoader] Loaded font (alt path): ${font.family} (${font.style})`);
              return true;
            }
          } catch { /* try next */ }
        }
      }
      throw new Error(`Failed to fetch font: ${urlToFetch}`);
    }
    
    const buffer = await response.arrayBuffer();
    const fontFace = new FontFace(font.family, buffer, {
      style: font.style === 'italic' ? 'italic' : 'normal',
      weight: font.style === 'bold' ? 'bold' : 'normal',
    });
    
    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);
    loadedFonts.add(fontKey);
    
    logger.log(`[FontLoader] Loaded font: ${font.family} (${font.style})`);
    return true;
  } catch (error) {
    logger.error(`[FontLoader] Failed to load font ${font.family}:`, error);
    return false;
  }
}

/**
 * Hook to load fonts dynamically for preview components
 * @param fontNames - Array of font names to load (from field.font_name)
 * @returns Object with loading state and loaded fonts info
 */
export function useFontLoader(fontNames: (string | undefined | null)[]) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [version, setVersion] = useState(0);
  const prevFontNamesRef = useRef<string>('');
  
  // Force re-render when fonts change
  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);
  
  useEffect(() => {
    // Filter and dedupe font names
    const uniqueFontNames = [...new Set(fontNames.filter(Boolean) as string[])];
    const fontNamesKey = uniqueFontNames.sort().join(',');
    
    // Skip if same fonts as before
    if (fontNamesKey === prevFontNamesRef.current) {
      return;
    }
    prevFontNamesRef.current = fontNamesKey;
    
    if (uniqueFontNames.length === 0) {
      setIsLoading(false);
      return;
    }
    
    let cancelled = false;
    
    async function loadFonts() {
      setIsLoading(true);
      let loaded = 0;
      
      for (const fontName of uniqueFontNames) {
        if (cancelled) break;
        
        const font = getFontByName(fontName);
        if (font) {
          const success = await loadFontIntoBrowser(font);
          if (success) loaded++;
          
          // Also load bold variant if exists
          const boldFont = getAllFonts().find(
            f => f.family === font.family && f.style === 'bold'
          );
          if (boldFont) {
            await loadFontIntoBrowser(boldFont);
          }
        }
      }
      
      if (!cancelled) {
        setLoadedCount(loaded);
        setIsLoading(false);
        forceUpdate(); // Force re-render to apply new fonts
      }
    }
    
    loadFonts();
    
    return () => {
      cancelled = true;
    };
  }, [fontNames.join(','), forceUpdate]); // Join to create stable dependency
  
  return { isLoading, loadedCount, version };
}

/**
 * Get CSS font-family value for a field
 * Returns the font family with fallbacks
 */
export function getFontFamilyCSS(fontName: string | undefined | null): string {
  if (!fontName) {
    return "'IBM Plex Sans Arabic', system-ui, sans-serif";
  }
  
  const font = getFontByName(fontName);
  if (!font) {
    // If font not found in config, try using the font name directly
    // This handles cases where custom fonts are loaded but not yet in the cache
    return `"${fontName}", 'IBM Plex Sans Arabic', system-ui, sans-serif`;
  }
  
  // Use the actual family name from config
  if (font.isArabic) {
    return `"${font.family}", 'Amiri', 'IBM Plex Sans Arabic', sans-serif`;
  }
  
  return `"${font.family}", 'Times New Roman', serif`;
}
