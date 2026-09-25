import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DetectionFeedbackProps {
  householdId: string | null;
  eventType: string;        // 'fire' | 'facial_distress' | 'audio_scream' | ...
  confidence: number;       // 0..1
  audioEvent?: string;
  visualContext?: Record<string, unknown>;
  compact?: boolean;
}

// Tiny inline widget: lets the user tag the *current* detection as
// correct or a false positive. Rows go to detection_feedback table
// and form the basis of dataset improvement over time.
export default function DetectionFeedback({
  householdId, eventType, confidence, audioEvent, visualContext, compact,
}: DetectionFeedbackProps) {
  const [submitted, setSubmitted] = useState<null | 'correct' | 'false_positive'>(null);
  const [busy, setBusy] = useState(false);

  async function send(label: 'correct' | 'false_positive') {
    if (!householdId || busy || submitted) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const row: Record<string, unknown> = {
        household_id: householdId,
        event_type: eventType,
        label,
        confidence,
        audio_event: audioEvent ?? null,
        visual_context: visualContext ?? {},
      };
      if (user?.id) row.submitted_by = user.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('detection_feedback').insert(row as any);
      setSubmitted(label);
    } catch (err) {
      console.error('[DetectionFeedback] insert failed', err);
    } finally {
      setBusy(false);
    }
  }

  if (!householdId) return null;
  if (submitted) {
    return (
      <div className="flex items-center gap-1 text-[8px] font-mono text-success">
        <Check className="w-2.5 h-2.5" />
        <span>Recorded as {submitted === 'correct' ? '✓ correct' : '✗ false alarm'}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'mt-1'}`}>
      <span className="text-[8px] font-mono text-muted-foreground">Was this right?</span>
      <button
        onClick={() => send('correct')}
        disabled={busy}
        className="px-1 py-0.5 rounded bg-success/15 hover:bg-success/30 border border-success/40 text-success disabled:opacity-50"
        title="Mark as correct detection"
      >
        <ThumbsUp className="w-2.5 h-2.5" />
      </button>
      <button
        onClick={() => send('false_positive')}
        disabled={busy}
        className="px-1 py-0.5 rounded bg-destructive/15 hover:bg-destructive/30 border border-destructive/40 text-destructive disabled:opacity-50"
        title="Mark as false alarm"
      >
        <ThumbsDown className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}