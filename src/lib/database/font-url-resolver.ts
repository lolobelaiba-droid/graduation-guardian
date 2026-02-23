/**
 * حل مسارات الخطوط ديناميكياً في بيئة Electron
 * يحول اسم الملف المخزن في قاعدة البيانات إلى رابط file:// كامل
 * باستخدام مسار userData الحالي من الـ Bridge
 */

import { isElectron } from './db-client';
import { logger } from '@/lib/logger';

let cachedDataPath: string | null = null;

/**
 * Get the userData path from Electron bridge (cached)
 */
async function getDataPath(): Promise<string | null> {
  if (cachedDataPath) return cachedDataPath;
  
  if (!isElectron() || !window.electronAPI?.db?.getPath) return null;
  
  try {
    const result = await window.electronAPI.db.getPath();
    if (result.success && result.data) {
      // getPath returns the DB path like "C:\Users\X\AppData\...\data\database.sqlite"
      // We need the data directory (parent of database file)
      const dbPath = result.data as string;
      // Extract directory: remove the filename to get the data dir
      const dataDir = dbPath.replace(/[/\\][^/\\]+$/, '');
      cachedDataPath = dataDir;
      logger.log('[FontResolver] Data path resolved:', dataDir);
      return dataDir;
    }
  } catch (error) {
    logger.error('[FontResolver] Failed to get data path:', error);
  }
  return null;
}

/**
 * Check if a font_url is just a filename (portable format)
 * i.e. not a full file:// URL and not an http(s) URL
 */
function isFileNameOnly(fontUrl: string): boolean {
  if (!fontUrl) return false;
  return !fontUrl.startsWith('file://') && 
         !fontUrl.startsWith('http://') && 
         !fontUrl.startsWith('https://') &&
         !fontUrl.startsWith('/');
}

/**
 * Resolve a font URL for Electron
 * - If it's a fileName only → construct full file:// URL from userData path
 * - If it's already a file:// URL → return as-is  
 * - If it's an http URL → return as-is
 */
export async function resolveElectronFontUrl(fontUrl: string): Promise<string> {
  if (!isElectron()) return fontUrl;
  
  // Already a full URL, return as-is
  if (fontUrl.startsWith('file://') || fontUrl.startsWith('http://') || fontUrl.startsWith('https://')) {
    return fontUrl;
  }
  
  // It's a fileName only - resolve dynamically
  if (isFileNameOnly(fontUrl)) {
    const dataDir = await getDataPath();
    if (dataDir) {
      // Fonts are stored in {dataDir}/cache/fonts/{fileName}
      const fullPath = `${dataDir}/cache/fonts/${fontUrl}`.replace(/\\/g, '/');
      const fileUrl = `file:///${fullPath.replace(/^\/+/, '')}`;
      logger.log(`[FontResolver] Resolved: ${fontUrl} → ${fileUrl}`);
      return fileUrl;
    }
  }
  
  return fontUrl;
}

/**
 * Extract just the fileName from a full file:// URL or path
 * Used when migrating from full paths to portable fileName-only storage
 */
export function extractFileName(fontUrl: string): string {
  if (!fontUrl) return fontUrl;
  // Get the last segment after any / or \
  const parts = fontUrl.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || fontUrl;
}

/**
 * Clear the cached data path (useful for testing)
 */
export function clearCachedDataPath(): void {
  cachedDataPath = null;
}
