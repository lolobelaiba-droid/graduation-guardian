/**
 * خدمة التخزين المحلي للأصول (خطوط، خلفيات)
 * تعمل في بيئة Electron فقط - تحفظ الملفات محلياً عند أول تحميل
 * ثم تستخدم النسخة المحلية عند عدم توفر الإنترنت
 */

import { isElectron } from './db-client';
import { logger } from '@/lib/logger';

/**
 * التحقق مما إذا كان الرابط رابطاً خارجياً (يحتاج إنترنت)
 */
function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * تخزين ملف من رابط خارجي محلياً وإرجاع الرابط المحلي
 * إذا كان الملف مخزناً مسبقاً، يُرجع الرابط المحلي مباشرة
 * إذا فشل التحميل (لا إنترنت) ولا توجد نسخة محلية، يُرجع الرابط الأصلي
 */
export async function cacheAsset(
  remoteUrl: string,
  type: 'fonts' | 'backgrounds' | 'images'
): Promise<string> {
  // لا تعمل إلا في Electron
  if (!isElectron() || !window.electronAPI?.db?.cacheRemoteFile) {
    return remoteUrl;
  }

  // تجاهل الروابط المحلية
  if (!isRemoteUrl(remoteUrl)) {
    return remoteUrl;
  }

  try {
    const result = await window.electronAPI.db.cacheRemoteFile(remoteUrl, type);
    if (result.success && result.data?.localUrl) {
      logger.log(`[AssetCache] ${result.data.cached ? 'Using cached' : 'Downloaded'}: ${type}/${result.data.fileName}`);
      return result.data.localUrl;
    }
  } catch (error) {
    logger.error(`[AssetCache] Failed to cache ${type} asset:`, error);
  }

  // fallback: محاولة الحصول على نسخة محلية موجودة
  try {
    const cached = await window.electronAPI.db.getCachedFileUrl(remoteUrl, type);
    if (cached.success && cached.data?.localUrl) {
      logger.log(`[AssetCache] Using offline cache: ${type}`);
      return cached.data.localUrl;
    }
  } catch {
    // تجاهل
  }

  return remoteUrl; // fallback to original URL
}

/**
 * تخزين خط مخصص محلياً
 */
export async function cacheFontAsset(fontUrl: string): Promise<string> {
  return cacheAsset(fontUrl, 'fonts');
}

/**
 * تخزين خلفية شهادة محلياً
 */
export async function cacheBackgroundAsset(imageUrl: string): Promise<string> {
  return cacheAsset(imageUrl, 'backgrounds');
}

/**
 * تخزين صورة (شعار الجامعة مثلاً) محلياً
 */
export async function cacheImageAsset(imageUrl: string): Promise<string> {
  return cacheAsset(imageUrl, 'images');
}
