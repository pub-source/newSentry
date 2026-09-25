import { supabase } from '@/integrations/supabase/client';

export type AlertSeverityLevel = 'low' | 'medium' | 'high' | 'critical';

const lastSent = new Map<string, number>();
const inFlight = new Set<string>();
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

export interface AlertEmailInput {
  householdId: string;
  alertType: string;
  message: string;
  severity: AlertSeverityLevel;
  cameraLabel?: string;
  /** Dashboard alert id so the email and the alert log refer to the same event. */
  alertId?: string;
  /** ISO timestamp of the event as logged in the dashboard. */
  occurredAt?: string;
  /** 0..1 model confidence when the trigger exposes one. */
  confidence?: number;
  /** 0..100 saliency/attention score at the time of the event. */
  saliencyScore?: number;
  /** Short, plain-language description of what triggered the alert. */
  trigger?: string;
  /** Extra key/value detection details rendered as a table in the email. */
  details?: Record<string, string | number | boolean | null | undefined>;
  cooldownMs?: number;
}

/**
 * Sends an alert email through the backend edge function.
 * The Brevo API key lives only on the server — never in this bundle.
 *
 * Duplicate suppression is two-layered so React re-renders and repeated
 * detection frames can never fan out into multiple emails:
 *  1. an in-flight guard per event key (same tick / concurrent calls)
 *  2. a cooldown window per event key (default 5 minutes)
 */
export async function sendAlertEmail(input: AlertEmailInput): Promise<{ sent: boolean; reason?: string }> {
  if (!input.householdId) return { sent: false, reason: 'no_household' };

  const key = `${input.householdId}:${input.alertType}:${input.cameraLabel ?? ''}`;
  const cooldown = input.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const now = Date.now();
  if (inFlight.has(key)) return { sent: false, reason: 'in_flight' };
  if (now - (lastSent.get(key) ?? 0) < cooldown) return { sent: false, reason: 'cooldown' };
  lastSent.set(key, now);
  inFlight.add(key);

  const payload = {
    householdId: input.householdId,
    alertType: input.alertType,
    message: input.message,
    severity: input.severity,
    cameraLabel: input.cameraLabel,
    alertId: input.alertId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    confidence: typeof input.confidence === 'number' ? Math.round(input.confidence * 100) / 100 : undefined,
    saliencyScore: input.saliencyScore,
    trigger: input.trigger,
    details: input.details
      ? Object.fromEntries(
          Object.entries(input.details)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [k, String(v)]),
        )
      : undefined,
  };

  try {
    const { data, error } = await supabase.functions.invoke('send-alert-email', { body: payload });
    if (error) {
      console.warn('[alertEmail] failed:', error.message);
      // allow a retry sooner when the send itself failed
      lastSent.delete(key);
      return { sent: false, reason: 'error' };
    }
    return { sent: Boolean((data as { sent?: boolean } | null)?.sent), reason: (data as { reason?: string } | null)?.reason };
  } catch (e) {
    console.warn('[alertEmail] unexpected failure:', e instanceof Error ? e.message : String(e));
    lastSent.delete(key);
    return { sent: false, reason: 'error' };
  } finally {
    inFlight.delete(key);
  }
}
