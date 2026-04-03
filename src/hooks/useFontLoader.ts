import { useEffect, useState, useRef, useCallback } from 'react';
import { getFontByName, getAllFonts, type FontConfig } from '@/lib/arabicFonts';
import { logger } from '@/lib/logger';
import { isElectron } from '@/lib/database/db-client';

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

/**
 * Check if URL is a file:// protocol URL (Electron local files)
 */
function isFileUrl(url: string): boolean {
  return url.startsWith('file://');
}

/**
 * Try fetching a font from multiple possible paths
 */
async function tryFetchFont(url: string): Promise<Response | null> {
  // Try the URL as-is first
  try {
    const response = await fetch(url);
    if (response.ok) return response;
  } catch { /* continue */ }

  // For file:// URLs in Electron, try reading via IPC as fallback
  if (isFileUrl(url) && window.electronAPI?.db?.getCachedFileUrl) {
    // Extract just the file name and try to locate it in the cache
    const fileName = url.split('/').pop() || '';
    if (fileName) {
      try {
        // Try fetching from the known cache directory via alternative paths
        const basePaths = [
          url.replace('file:///', '').replace('file://', ''), // absolute path
        ];
        for (const bp of basePaths) {
          try {
            const fileUrl = `file:///${bp.replace(/\\/g, '/')}`;
            const resp = await fetch(fileUrl);
            if (resp.ok) return resp;
          } catch { /* next */ }
        }
      } catch { /* continue */ }
    }
  }

  return null;
}

async function loadFontIntoBrowser(font: FontConfig): Promise<boolean> {
  if (!font.url || font.isSystem) return true;
  
  const fontKey = `${font.family}:${font.style}`;
  if (loadedFonts.has(fontKey)) return true;
  
  try {
    let buffer: ArrayBuffer | null = null;
    
    // في Electron: استخدام IPC لقراءة ملف الخط مباشرة (أكثر موثوقية من fetch لـ file://)
    if (isElectron() && (window.electronAPI?.db as any)?.readFontFile) {
      try {
        const result = await (window.electronAPI.db as any).readFontFile(font.url);
        if (result?.success && result.data?.buffer) {
          buffer = result.data.buffer;
          logger.log(`[FontLoader] Read font via IPC: ${font.family}`);
        }
      } catch (e) {
        logger.error(`[FontLoader] IPC readFontFile failed for ${font.family}:`, e);
      }
    }
    
    // Fallback: fetch (للويب أو إذا فشل IPC)
    if (!buffer) {
      // في Electron: رفض الروابط الخارجية نهائياً
      if (isElectron() && isRemoteUrl(font.url)) {
        logger.error(`[FontLoader] Blocked remote URL in desktop mode: ${font.url}`);
        return false;
      }
      
      let urlToFetch = font.url;
      
      // في Electron: إعادة بناء مسار الخط
      if (isElectron() && isFileUrl(font.url) && (window.electronAPI?.db as any)?.resolveFontPath) {
        try {
          const resolved = await (window.electronAPI.db as any).resolveFontPath(font.url);
          if (resolved?.success && resolved.data) {
            urlToFetch = resolved.data;
          }
        } catch { /* use original URL */ }
      } else if (!isFileUrl(font.url)) {
        urlToFetch = resolveElectronFontUrl(font.url);
      }
      
      const response = await tryFetchFont(urlToFetch);
      
      if (!response) {
        throw new Error(`Failed to fetch font: ${urlToFetch}`);
      }
      
      buffer = await response.arrayBuffer();
    }
    
    // Validate font data (check magic bytes)
    const header = new Uint8Array(buffer, 0, 4);
    const magic = String.fromCharCode(...header);
    const validSignatures = ['\x00\x01\x00\x00', 'OTTO', 'wOFF', 'wOF2', 'true', 'typ1'];
    const isValidFont = validSignatures.some(sig => magic.startsWith(sig)) || header[0] === 0;
    if (!isValidFont) {
      logger.error(`[FontLoader] Invalid font file for ${font.family}: magic="${magic}" (hex: ${Array.from(header).map(b => b.toString(16)).join(' ')})`);
      throw new Error(`Invalid font data for ${font.family} - file may be corrupted. Please re-upload the font.`);
    }
    
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
