import { useEffect, useCallback, useState } from "react";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";

interface RecordLockResult {
  isLocked: boolean;
  lockedBy: string | null;
  acquireLock: () => Promise<boolean>;
  releaseLock: () => void;
  checkLock: () => Promise<boolean>;
}

/**
 * Hook لإدارة قفل السجلات عند التعديل في بيئة الشبكة
 */
export function useRecordLock(tableName: string, recordId: string | null): RecordLockResult {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  const checkLock = useCallback(async (): Promise<boolean> => {
    if (!isElectron() || !recordId) return false;
    const db = getDbClient();
    if (!db || !('checkRecordLock' in db)) return false;

    try {
      const result = await (db as any).checkRecordLock(tableName, recordId);
      if (result.success && result.data?.locked) {
        setIsLocked(true);
        setLockedBy(result.data.lockedBy || "جهاز آخر");
        return true;
      }
      setIsLocked(false);
      setLockedBy(null);
      return false;
    } catch {
      return false;
    }
  }, [tableName, recordId]);

  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!isElectron() || !recordId) return true;
    const db = getDbClient();
    if (!db || !('acquireRecordLock' in db)) return true;

    try {
      const result = await (db as any).acquireRecordLock(tableName, recordId);
      if (result.success && result.data) {
        if (!result.data.acquired) {
          const who = result.data.lockedBy || "جهاز آخر";
          toast.warning(`هذا السجل قيد التعديل حالياً من قبل "${who}"`, {
            description: "يرجى المحاولة لاحقاً أو التنسيق مع المستخدم الآخر",
            duration: 5000,
          });
          setIsLocked(true);
          setLockedBy(who);
          return false;
        }
        setIsLocked(false);
        setLockedBy(null);
        return true;
      }
      return true;
    } catch {
      return true;
    }
  }, [tableName, recordId]);

  const releaseLock = useCallback(() => {
    if (!isElectron() || !recordId) return;
    const db = getDbClient();
    if (!db || !('releaseRecordLock' in db)) return;

    (db as any).releaseRecordLock(tableName, recordId).catch(() => {});
    setIsLocked(false);
    setLockedBy(null);
  }, [tableName, recordId]);

  // تحرير القفل عند unmount
  useEffect(() => {
    return () => {
      if (recordId && isElectron()) {
        const db = getDbClient();
        if (db && 'releaseRecordLock' in db) {
          (db as any).releaseRecordLock(tableName, recordId).catch(() => {});
        }
      }
    };
  }, [tableName, recordId]);

  return { isLocked, lockedBy, acquireLock, releaseLock, checkLock };
}
