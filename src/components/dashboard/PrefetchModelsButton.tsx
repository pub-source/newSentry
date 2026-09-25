import { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { prefetchModels } from '@/lib/modelCache';

/**
 * Compact "Prefetch Models" trigger.
 *
 * Model caching/prefetching still lives in `@/lib/modelCache`; this button only
 * warms the cache. No cache statistics are shown to the user.
 */
export default function PrefetchModelsButton({ className = '' }: { className?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');

  const run = async () => {
    if (state === 'busy') return;
    setState('busy');
    try {
      await prefetchModels();
      setState('done');
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === 'busy'}
      title="Download the detection models now so they are ready offline"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-2.5 py-1 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60 ${className}`}
    >
      {state === 'busy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : state === 'done' ? <Check className="w-3.5 h-3.5" />
        : <Download className="w-3.5 h-3.5" />}
      {state === 'busy' ? 'Preparing…' : state === 'done' ? 'Models ready' : 'Prefetch Models'}
    </button>
  );
}
