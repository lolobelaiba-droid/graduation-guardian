/**
 * Hook لتخزين خلفيات الشهادات محلياً في Electron
 * يحوّل روابط Supabase Storage إلى روابط محلية file://
 */
import { useState, useEffect, useRef } from 'react';
import { isElectron } from '@/lib/database/db-client';
import { cacheBackgroundAsset } from '@/lib/database/asset-cache';

/**
 * يأخذ رابط صورة (قد يكون من Supabase) ويُرجع رابطاً يعمل محلياً
 */
export function useCachedImageUrl(remoteUrl: string | null | undefined): string | null {
  const [localUrl, setLocalUrl] = useState<string | null>(remoteUrl || null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!remoteUrl) {
      setLocalUrl(null);
      prevUrlRef.current = null;
      return;
    }

    // تجنب إعادة التحميل لنفس الرابط
    if (remoteUrl === prevUrlRef.current) return;
    prevUrlRef.current = remoteUrl;

    // في الويب أو إذا كان رابطاً محلياً، استخدمه مباشرة
    if (!isElectron() || !remoteUrl.startsWith('http')) {
      setLocalUrl(remoteUrl);
      return;
    }

    let cancelled = false;

    cacheBackgroundAsset(remoteUrl).then((resolved) => {
      if (!cancelled) {
        setLocalUrl(resolved);
      }
    }).catch(() => {
      if (!cancelled) {
        setLocalUrl(remoteUrl); // fallback
      }
    });

    return () => { cancelled = true; };
  }, [remoteUrl]);

  return localUrl;
}
