import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { perfMonitor, AI_RATES, type PerfSnapshot } from '@/lib/performance';

/**
 * Compact pipeline performance panel — samples the shared perf monitor at
 * ~2 Hz (the monitor's own roll rate), so it adds no measurable overhead.
 */
export default function PerformanceMonitor() {
  const [snap, setSnap] = useState<PerfSnapshot>(() => perfMonitor.get());

  useEffect(() => perfMonitor.subscribe(setSnap), []);

  const statusColor =
    snap.status === 'THROTTLED'
      ? 'bg-warning/20 text-warning'
      : snap.status === 'NORMAL'
      ? 'bg-success/20 text-success'
      : 'bg-muted text-muted-foreground';

  const rows: Array<[string, string]> = [
    ['Video FPS', snap.videoFps.toFixed(1)],
    ['AI FPS', snap.aiFps.toFixed(1)],
    ['Latency', `${snap.latencyMs} ms`],
    ['Stale frames', String(snap.dropped)],
  ];

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" /> Pipeline Performance
        </span>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor}`}>
          {snap.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-secondary/40 rounded px-2 py-1">
            <p className="text-[9px] font-mono text-muted-foreground">{label}</p>
            <p className="text-sm font-mono text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[9px] font-mono text-muted-foreground leading-relaxed">
        Targets — obj {AI_RATES.object}fps · sal {AI_RATES.saliency}fps · fire {AI_RATES.fire}fps · face {AI_RATES.face}fps · UI {AI_RATES.ui}Hz
      </p>
      {snap.status === 'THROTTLED' && (
        <p className="text-[9px] font-mono text-warning">
          Adaptive throttle active — analysing at obj {snap.stageFps.object}fps / sal {snap.stageFps.saliency}fps.
        </p>
      )}
    </div>
  );
}
