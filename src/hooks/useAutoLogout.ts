import { useEffect, useRef, useCallback } from "react";

type AutoLogoutTimeout = 0 | 15 | 30; // 0 = disabled

/**
 * Hook لقفل التطبيق تلقائياً بعد فترة عدم نشاط
 */
export function useAutoLogout(
  timeoutMinutes: AutoLogoutTimeout,
  onLogout: () => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = timeoutMinutes > 0;

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLogout();
    }, timeoutMinutes * 60 * 1000);
  }, [enabled, timeoutMinutes, onLogout]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    
    // تهيئة المؤقت
    resetTimer();

    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [enabled, resetTimer]);
}
