/**
 * طبقة تجريد قاعدة البيانات
 * تتيح التبديل بين Supabase (ويب) و SQLite (سطح المكتب)
 */

// التحقق من بيئة التشغيل
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined && 
         window.electronAPI.isElectron === true;
};

// أنواع البيانات
export interface DbResult<T> {
  data: T | null;
  error: Error | null;
}

export interface DbListResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

// الحصول على واجهة قاعدة البيانات المناسبة
export function getDbClient() {
  if (isElectron() && window.electronAPI?.db) {
    return window.electronAPI.db;
  }
  return null; // في الويب، استخدم Supabase مباشرة
}

/**
 * تحويل نتيجة SQLite إلى صيغة Supabase
 */
export function wrapElectronResult<T>(result: { success: boolean; data?: T; error?: string }): DbResult<T> {
  if (result.success) {
    return { data: (result.data ?? null) as T | null, error: null };
  }
  return { data: null, error: new Error(result.error || 'Unknown error') };
}

export function wrapElectronListResult<T>(result: { success: boolean; data?: T[]; error?: string }): DbListResult<T> {
  if (result.success) {
    return { data: (result.data ?? []) as T[], error: null, count: result.data?.length };
  }
  return { data: null, error: new Error(result.error || 'Unknown error') };
}
