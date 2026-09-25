import { useEffect, useMemo, useRef, useState } from 'react';
import { speak, stopSpeaking } from '@/lib/speech';
import { Button } from '@/components/ui/button';

export interface TutorialStep {
  /** CSS selector resolved at step activation */
  selector: string;
  /** Fallback: nth child (1-based) within the resolved selector */
  childIndex?: number;
  title: string;
  body: string;
  narration?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  implementation?: string;
  code?: string;
}

interface Props {
  steps: TutorialStep[];
  open: boolean;
  onClose: () => void;
  onFinish?: () => void;
}

interface Rect { x: number; y: number; w: number; h: number }

function resolveTarget(step: TutorialStep): Element | null {
  const root = document.querySelector(step.selector);
  if (!root) return null;
  if (step.childIndex && step.childIndex > 0) {
    const child = root.children[step.childIndex - 1];
    return child ?? root;
  }
  return root;
}

export default function TutorialOverlay({ steps, open, onClose, onFinish }: Props) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [muted, setMuted] = useState(false);
  const rafRef = useRef<number | null>(null);

  const step = steps[idx];

  // Reset when opened
  useEffect(() => { if (open) setIdx(0); }, [open]);

  // Track target rect (poll on resize/scroll/mutation)
  useEffect(() => {
    if (!open || !step) return;
    const update = () => {
      const el = resolveTarget(step);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    update();
    const tick = () => {
      update();
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    window.addEventListener('resize', update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', update);
    };
  }, [open, step]);

  // Narration
  useEffect(() => {
    if (!open || !step || muted) return;
    const text = step.narration || `${step.title}. ${step.body}`;
    speak(text);
    return () => { stopSpeaking(); };
  }, [open, step, muted]);

  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    const cardW = 340;
    const cardH = step?.code ? 330 : 220;
    const pad = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placement = step?.placement ?? 'auto';
    let left = rect.x + rect.w / 2 - cardW / 2;
    let top = rect.y + rect.h + pad;
    if (placement === 'top' || (placement === 'auto' && top + cardH > vh - 8)) {
      top = Math.max(8, rect.y - cardH - pad);
    }
    if (placement === 'left') { left = rect.x - cardW - pad; top = rect.y; }
    if (placement === 'right') { left = rect.x + rect.w + pad; top = rect.y; }
    if (placement === 'center') { left = vw / 2 - cardW / 2; top = vh / 2 - cardH / 2; }
    left = Math.max(8, Math.min(left, vw - cardW - 8));
    top = Math.max(8, Math.min(top, vh - cardH - 8));
    return { left, top, width: cardW };
  }, [rect, step]);

  if (!open || !step) return null;

  const finish = () => {
    stopSpeaking();
    onFinish?.();
    onClose();
  };

  const pad = 8;
  const spot = rect
    ? { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }
    : null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fade-in" aria-live="polite">
      {/* Dimming with SVG spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={() => setIdx(i => Math.min(i + 1, steps.length - 1))}>
        <defs>
          <mask id="tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.x}
                y={spot.y}
                width={spot.w}
                height={spot.h}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(6,10,20,0.78)" mask="url(#tutorial-mask)" />
        {spot && (
          <rect
            x={spot.x}
            y={spot.y}
            width={spot.w}
            height={spot.h}
            rx={12}
            ry={12}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Narration card */}
      <div
        className="absolute max-h-[calc(100vh-16px)] overflow-y-auto bg-card border border-primary/40 rounded-lg shadow-2xl p-4 pointer-events-auto animate-scale-in"
        style={cardStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {/* AI avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary">MSDS</span>
                <span className="text-muted-foreground/40">·</span>
                <h4 className="text-xs font-semibold text-foreground tracking-tight truncate">{step.title}</h4>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{idx + 1}/{steps.length}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
            {step.implementation && (
              <div className="mt-2 rounded-md border border-border bg-secondary/40 px-2.5 py-2">
                <span className="block text-[9px] font-semibold uppercase text-muted-foreground">Implemented in</span>
                <code className="mt-0.5 block break-all text-[10px] text-primary">{step.implementation}</code>
              </div>
            )}
            {step.code && (
              <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-secondary p-2.5 text-[10px] leading-relaxed text-foreground">
                <code>{step.code}</code>
              </pre>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= idx ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={finish}
              className="h-8 px-2 text-[10px] font-mono text-muted-foreground"
            >
              Skip tour
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMuted(m => !m)}
              className="h-8 px-2 text-[10px] font-mono text-muted-foreground"
              title={muted ? 'Unmute narration' : 'Mute narration'}
            >
              {muted ? 'Unmute' : 'Mute'}
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="h-8 text-[10px] font-mono"
            >
              Back
            </Button>
            {idx < steps.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}
                className="h-8 text-[10px] font-mono"
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={finish}
                className="h-8 text-[10px] font-mono"
              >
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}