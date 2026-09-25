import { useEffect, useRef } from 'react';

/**
 * Keeps the device awake (screen on) while monitoring is running so the
 * browser doesn't suspend camera/audio processing when the phone idles.
 * Re-acquires the lock when the tab becomes visible again.
 *
 * Note: browsers cannot keep a web app processing after the browser is
 * fully closed — this only keeps an open tab alive.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const request = async () => {
      if (!active || cancelled) return;
      const nav = navigator as Navigator & { wakeLock?: WakeLock };
      if (!nav.wakeLock) return;
      try {
        lockRef.current = await nav.wakeLock.request('screen');
      } catch {
        // Denied (e.g. low battery) — safe to ignore
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
