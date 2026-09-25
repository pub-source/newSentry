/**
 * Lightweight performance / throttling utilities for the MSDS pipeline.
 *
 * Goals:
 *  - keep video rendering at display rate while AI analysis runs slower
 *  - never queue stale frames: always analyse the newest available frame
 *  - coalesce React state updates so detection does not cause render storms
 *  - measure real latency with `performance.now()` only (no expensive APIs)
 *
 * Nothing here touches the DOM, the backend, or model code, so it can be
 * reused unchanged when analysis eventually moves to a worker/backend.
 */

/** Target sampling rates (frames analysed per second) for each stage. */
export const AI_RATES = {
  /** COCO-SSD object detection */
  object: 8,
  /** Low-level saliency (sobel / motion energy) */
  saliency: 12,
  /** Fire + smoke signature analysis */
  fire: 3,
  /** Face expression / distress analysis */
  face: 3,
  /** YAMNet audio classification */
  audio: 3,
  /** React state publication rate for metrics/results */
  ui: 8,
} as const;

export type AiStage = keyof typeof AI_RATES;

/** Minimum rate adaptive throttling may fall back to, per stage. */
const MIN_RATES: Record<string, number> = {
  object: 2,
  saliency: 4,
  fire: 1,
  face: 1,
  audio: 1,
  ui: 4,
};

export const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * Simple monotonic rate limiter. Does not accumulate timers — callers ask
 * "may I run now?" from an existing loop (rAF or a single interval).
 */
export class RateLimiter {
  private interval: number;
  private last = 0;

  constructor(fps: number) {
    this.interval = 1000 / Math.max(0.1, fps);
  }

  setFps(fps: number) {
    this.interval = 1000 / Math.max(0.1, fps);
  }

  get fps() {
    return 1000 / this.interval;
  }

  /** True at most `fps` times per second. */
  shouldRun(t: number = now()): boolean {
    if (t - this.last < this.interval) return false;
    this.last = t;
    return true;
  }

  reset() {
    this.last = 0;
  }
}

/**
 * Runs an async job over the *latest* submitted value only.
 *
 * If a job is in flight when new input arrives, the previous pending input is
 * discarded (counted as a dropped/stale frame) and only the newest one is
 * processed once the current job settles. This keeps freshness instead of
 * building a backlog.
 */
export class LatestOnlyRunner<TIn, TOut = void> {
  private running = false;
  private pending: TIn | null = null;
  private hasPending = false;
  /** Number of inputs discarded because a newer one arrived first. */
  dropped = 0;
  /** EMA of job duration in ms. */
  latencyMs = 0;

  constructor(
    private job: (input: TIn) => Promise<TOut> | TOut,
    private onResult?: (out: TOut, latencyMs: number) => void,
  ) {}

  get busy() {
    return this.running;
  }

  submit(input: TIn) {
    if (this.running) {
      if (this.hasPending) this.dropped++;
      this.pending = input;
      this.hasPending = true;
      return;
    }
    void this.run(input);
  }

  private async run(input: TIn) {
    this.running = true;
    const started = now();
    try {
      const out = await this.job(input);
      const dt = now() - started;
      this.latencyMs = this.latencyMs === 0 ? dt : this.latencyMs * 0.7 + dt * 0.3;
      this.onResult?.(out, dt);
    } catch {
      /* stage failures must never break the loop */
    } finally {
      this.running = false;
      if (this.hasPending) {
        const next = this.pending as TIn;
        this.pending = null;
        this.hasPending = false;
        void this.run(next);
      }
    }
  }

  cancelPending() {
    this.pending = null;
    this.hasPending = false;
  }
}

/**
 * Coalesces frequent value updates into a throttled publish (default 8 Hz).
 * The most recent value always wins; a trailing publish guarantees the final
 * value is never lost.
 */
export class ThrottledPublisher<T> {
  private limiter: RateLimiter;
  private pending: T | null = null;
  private hasPending = false;
  private timer: number | null = null;

  constructor(private publish: (value: T) => void, fps: number = AI_RATES.ui) {
    this.limiter = new RateLimiter(fps);
  }

  setFps(fps: number) {
    this.limiter.setFps(fps);
  }

  /** Queue a value; it is published at most `fps` times per second. */
  push(value: T) {
    this.pending = value;
    this.hasPending = true;
    if (this.limiter.shouldRun()) {
      this.flush();
      return;
    }
    if (this.timer === null) {
      this.timer = window.setTimeout(() => {
        this.timer = null;
        if (this.hasPending) this.flush();
      }, 1000 / Math.max(0.1, this.limiter.fps));
    }
  }

  /** Publish immediately (used for emergency-critical values). */
  flush() {
    if (!this.hasPending) return;
    const v = this.pending as T;
    this.hasPending = false;
    this.pending = null;
    this.publish(v);
  }

  dispose() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    this.hasPending = false;
  }
}

export interface PerfSnapshot {
  videoFps: number;
  aiFps: number;
  latencyMs: number;
  dropped: number;
  status: 'IDLE' | 'NORMAL' | 'THROTTLED';
  stageFps: Record<string, number>;
}

/**
 * Global, dependency-free performance tracker. Counters are incremented from
 * the hot loops (cheap integer math) and sampled at ~2 Hz by the UI panel,
 * so the monitor itself never causes render churn.
 */
class PerfMonitor {
  private videoFrames = 0;
  private aiFrames = 0;
  private windowStart = now();
  private latencyEma = 0;
  private droppedTotal = 0;
  private scale = 1; // adaptive multiplier applied to configured AI rates
  private snapshot: PerfSnapshot = {
    videoFps: 0,
    aiFps: 0,
    latencyMs: 0,
    dropped: 0,
    status: 'IDLE',
    stageFps: {},
  };
  private listeners = new Set<(s: PerfSnapshot) => void>();

  markVideoFrame() {
    this.videoFrames++;
    this.maybeRoll();
  }

  markAiFrame(latencyMs: number) {
    this.aiFrames++;
    this.latencyEma = this.latencyEma === 0 ? latencyMs : this.latencyEma * 0.8 + latencyMs * 0.2;
    this.maybeRoll();
  }

  markDropped(count = 1) {
    this.droppedTotal += count;
  }

  reset() {
    this.videoFrames = 0;
    this.aiFrames = 0;
    this.droppedTotal = 0;
    this.latencyEma = 0;
    this.scale = 1;
    this.windowStart = now();
    this.snapshot = { videoFps: 0, aiFps: 0, latencyMs: 0, dropped: 0, status: 'IDLE', stageFps: {} };
    this.emit();
  }

  /**
   * Adaptive throttling: if AI latency grows past a budget we reduce the
   * sampling rate rather than let work pile up; when it recovers we drift
   * back toward the configured target. Deliberately slow and asymmetric so
   * the rate does not oscillate.
   */
  private adapt() {
    const budget = 120; // ms of comfortable per-job latency
    if (this.latencyEma > budget * 2) this.scale = Math.max(0.25, this.scale - 0.15);
    else if (this.latencyEma > budget) this.scale = Math.max(0.4, this.scale - 0.05);
    else if (this.latencyEma > 0 && this.latencyEma < budget * 0.6) this.scale = Math.min(1, this.scale + 0.03);
  }

  /** Effective (possibly throttled) target FPS for a stage. */
  rateFor(stage: AiStage): number {
    const target = AI_RATES[stage];
    const min = MIN_RATES[stage] ?? 1;
    return Math.max(min, target * this.scale);
  }

  get throttled() {
    return this.scale < 0.95;
  }

  private maybeRoll() {
    const t = now();
    const elapsed = t - this.windowStart;
    if (elapsed < 500) return;
    const secs = elapsed / 1000;
    const videoFps = this.videoFrames / secs;
    const aiFps = this.aiFrames / secs;
    this.videoFrames = 0;
    this.aiFrames = 0;
    this.windowStart = t;
    this.adapt();
    this.snapshot = {
      videoFps: Math.round(videoFps * 10) / 10,
      aiFps: Math.round(aiFps * 10) / 10,
      latencyMs: Math.round(this.latencyEma),
      dropped: this.droppedTotal,
      status: videoFps < 1 && aiFps < 1 ? 'IDLE' : this.throttled ? 'THROTTLED' : 'NORMAL',
      stageFps: {
        object: Math.round(this.rateFor('object') * 10) / 10,
        saliency: Math.round(this.rateFor('saliency') * 10) / 10,
        fire: Math.round(this.rateFor('fire') * 10) / 10,
        face: Math.round(this.rateFor('face') * 10) / 10,
      },
    };
    this.emit();
  }

  private emit() {
    this.listeners.forEach(l => l(this.snapshot));
  }

  get(): PerfSnapshot {
    return this.snapshot;
  }

  subscribe(fn: (s: PerfSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => { this.listeners.delete(fn); };
  }
}

export const perfMonitor = new PerfMonitor();
