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

// قائمة الدوال المطلوبة من واجهة قاعدة البيانات
const REQUIRED_DB_METHODS = [
  'getAll', 'getById', 'insert', 'update', 'delete', 'deleteAll', 'search',
  'getSetting', 'setSetting', 'getAllSettings',
  'getUserSetting', 'setUserSetting', 'getAllUserSettings',
  'getTemplateWithFields', 'getFieldsByTemplateId',
  'getDropdownOptionsByType', 'deleteOldActivities',
  'exportAllData', 'importAllData', 'getPath',
  'saveBackupToFolder', 'listBackups', 'loadBackupFromFolder', 'deleteBackupFromFolder'
];

let _diagnosticLogged = false;

// الحصول على واجهة قاعدة البيانات المناسبة
export function getDbClient() {
  if (isElectron() && window.electronAPI?.db) {
    const db = window.electronAPI.db;
    
    // تشخيص: طباعة الدوال المتوفرة مرة واحدة
    if (!_diagnosticLogged) {
      _diagnosticLogged = true;
      const available: string[] = [];
      const missing: string[] = [];
      REQUIRED_DB_METHODS.forEach(method => {
        if (typeof (db as unknown as Record<string, unknown>)[method] === 'function') {
          available.push(method);
        } else {
          missing.push(method);
        }
      });
      
      console.log('[DB Client] Electron mode detected');
      console.log('[DB Client] Available methods:', available.length, '/', REQUIRED_DB_METHODS.length);
      if (missing.length > 0) {
        console.error('[DB Client] ⚠️ MISSING METHODS:', missing.join(', '));
        console.error('[DB Client] ⚠️ تأكد من تحديث ملفات electron/preload.cjs و electron/database/ipc-handlers.cjs');
      }
    }
    
    // إنشاء proxy يعالج الدوال المفقودة بدون crash
    return new Proxy(db, {
      get(target, prop: string) {
        const value = (target as unknown as Record<string, unknown>)[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        // إذا كانت الدالة مفقودة، نُرجع دالة بديلة تُرجع خطأ واضح
        if (REQUIRED_DB_METHODS.includes(prop)) {
          console.error(`[DB Client] Method "${prop}" is not available. Update your Electron files!`);
          return (..._args: unknown[]) => {
            return Promise.resolve({ 
              success: false, 
              error: `Method "${prop}" is not available in your Electron version. Please rebuild the desktop app with updated files.`,
              data: null 
            });
          };
        }
        return value;
      }
    });
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
