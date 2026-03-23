/**
 * Hook لاستخدام الصور محلياً في Electron
 * في سطح المكتب: فقط الملفات المحلية (file://, data:, مسارات نسبية)
 * الروابط الخارجية (https://) تُرفض تماماً في Electron
 */
import { useState, useEffect, useRef } from 'react';
import { isElectron } from '@/lib/database/db-client';

function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function useCachedImageUrl(remoteUrl: string | null | undefined): string | null {
  const [localUrl, setLocalUrl] = useState<string | null>(remoteUrl || null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!remoteUrl) {
      setLocalUrl(null);
      prevUrlRef.current = null;
      return;
    }

    if (remoteUrl === prevUrlRef.current) return;
    prevUrlRef.current = remoteUrl;

    // في Electron: رفض الروابط الخارجية نهائياً
    if (isElectron() && isRemoteUrl(remoteUrl)) {
      setLocalUrl(null);
      return;
    }

    setLocalUrl(remoteUrl);
  }, [remoteUrl]);

  return localUrl;
}
