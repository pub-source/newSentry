import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface Props {
  /** Message shown in the bubble. */
  message: string;
  /** Idle delay in ms before the bubble appears. */
  delay?: number;
  /** Hide the hint entirely (e.g. the user already did the action). */
  disabled?: boolean;
  /** Where the bubble sits relative to its anchor. */
  placement?: 'top' | 'bottom';
  className?: string;
}

/**
 * Shows a floating bubble with a bouncing arrow after the user has been
 * inactive for `delay` ms. Any pointer / key / scroll activity resets it.
 * Place inside a `relative` container that wraps the button it points at.
 */
/**
 * Global kill switch — once the system is actually working (camera connected /
 * monitoring running) every hint stops animating so nothing burns frames.
 */
let suppressed = false;
const SUPPRESS_EVENT = 'msds-hints-suppressed';

export function setHintsSuppressed(value: boolean) {
  if (suppressed === value) return;
  suppressed = value;
  window.dispatchEvent(new CustomEvent(SUPPRESS_EVENT));
}

export function areHintsSuppressed() {
  return suppressed;
}

export default function IdleHint({
  message,
  delay = 3000,
  disabled = false,
  placement = 'top',
  className = '',
}: Props) {
  const [show, setShow] = useState(false);
  const [off, setOff] = useState(suppressed);

  useEffect(() => {
    const sync = () => setOff(suppressed);
    window.addEventListener(SUPPRESS_EVENT, sync);
    return () => window.removeEventListener(SUPPRESS_EVENT, sync);
  }, []);

  useEffect(() => {
    if (disabled || off) { setShow(false); return; }
    let timer = window.setTimeout(() => setShow(true), delay);
    const reset = () => {
      setShow(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShow(true), delay);
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [delay, disabled, off]);


  if (disabled || off || !show) return null;

  const pos = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute right-0 z-40 ${pos} pointer-events-none animate-[idle-float_1.4s_ease-in-out_infinite] ${className}`}
    >
      <div className="flex flex-col items-center gap-1">
        {placement === 'bottom' && <ArrowUp className="w-5 h-5 text-primary drop-shadow" />}
        <div className="whitespace-nowrap rounded-xl border border-primary/40 bg-primary text-primary-foreground px-3 py-2 text-[14px] font-semibold shadow-lg">
          {message}
        </div>
        {placement === 'top' && <ArrowDown className="w-5 h-5 text-primary drop-shadow" />}
      </div>
    </div>
  );
}
