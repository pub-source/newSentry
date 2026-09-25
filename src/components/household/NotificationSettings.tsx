import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, Plus, X, Check, ShieldCheck } from 'lucide-react';

interface Settings {
  in_app_enabled: boolean;
  sound_enabled: boolean;
  sound_volume: number;
  email_enabled: boolean;
  severity_threshold: 'low' | 'medium' | 'high' | 'critical';
  cooldown_seconds: number;
}

interface Recipient {
  id: string;
  email: string;
  label: string | null;
  enabled: boolean;
}

const DEFAULTS: Settings = {
  in_app_enabled: true,
  sound_enabled: true,
  sound_volume: 0.8,
  email_enabled: true,
  severity_threshold: 'high',
  cooldown_seconds: 300,
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function NotificationSettings({ householdId }: { householdId: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState('');

  const load = useCallback(async () => {
    const [sRes, rRes] = await Promise.all([
      supabase.from('notification_settings').select('*').eq('household_id', householdId).maybeSingle(),
      supabase.from('notification_recipients').select('id, email, label, enabled').eq('household_id', householdId).order('created_at'),
    ]);
    if (sRes.data) setSettings({ ...DEFAULTS, ...(sRes.data as unknown as Settings) });
    setRecipients((rRes.data as Recipient[]) ?? []);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error: err } = await supabase
      .from('notification_settings')
      .upsert({ household_id: householdId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'household_id' });
    if (err) { setError(err.message); return; }
    setError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setError('Please enter a valid email address.'); return; }
    const { error: err } = await supabase.from('notification_recipients').insert({ household_id: householdId, email });
    if (err) { setError(err.message); return; }
    setNewEmail('');
    setError('');
    load();
  };

  const sendTest = async () => {
    setTestResult('Sending…');
    setError('');
    const { data, error: err } = await supabase.functions.invoke('send-alert-email', {
      body: {
        householdId,
        severity: 'critical',
        alertType: 'Test alert',
        message: 'This is a test alert from your MSDS dashboard.',
        trigger: 'Manual test',
      },
    });
    if (err) {
      const detail = (err as { context?: { text?: () => Promise<string> } }).context?.text
        ? await (err as { context: { text: () => Promise<string> } }).context.text()
        : err.message;
      setTestResult(`Failed: ${detail}`);
      return;
    }
    const res = data as { sent?: boolean; reason?: string; recipients?: number } | null;
    setTestResult(res?.sent ? `Sent to ${res.recipients} recipient(s). Check your inbox and spam folder.` : `Not sent (${res?.reason ?? 'unknown'})`);
  };

  const removeRecipient = async (id: string) => {
    await supabase.from('notification_recipients').delete().eq('id', id);
    load();
  };

  const Toggle = ({ on, onClick, label, icon: Icon }: { on: boolean; onClick: () => void; label: string; icon: typeof Bell }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all ${
        on ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'
      }`}
    >
      <span className="flex items-center gap-2 text-base font-medium text-foreground">
        <Icon className={`w-5 h-5 ${on ? 'text-primary' : 'text-muted-foreground'}`} />
        {label}
      </span>
      <span className={`text-sm font-semibold ${on ? 'text-primary' : 'text-muted-foreground'}`}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );

  return (
    <div className="bg-card/70 backdrop-blur-sm border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notifications
        </h3>
        {saved && <span className="text-sm text-primary flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
      </div>

      <p className="text-sm text-muted-foreground">
        SMS notifications have been removed. Alerts are delivered <strong>in-app</strong> and by <strong>email</strong>.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle on={settings.in_app_enabled} label="In-App Alerts" icon={Bell} onClick={() => save({ in_app_enabled: !settings.in_app_enabled })} />
        <Toggle on={settings.sound_enabled} label="Alert Sound" icon={Bell} onClick={() => save({ sound_enabled: !settings.sound_enabled })} />
        <Toggle on={settings.email_enabled} label="Email Alerts" icon={Mail} onClick={() => save({ email_enabled: !settings.email_enabled })} />
        <div className="px-4 py-3 rounded-lg border border-border space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Volume</label>
          <input
            type="range" min={0} max={1} step={0.05} value={settings.sound_volume}
            onChange={e => save({ sound_volume: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Minimum severity for email</label>
          <select
            value={settings.severity_threshold}
            onChange={e => save({ severity_threshold: e.target.value as Settings['severity_threshold'] })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-base text-foreground"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Repeat cooldown (seconds)</label>
          <input
            type="number" min={0} step={30} value={settings.cooldown_seconds}
            onChange={e => save({ cooldown_seconds: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-base text-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Email recipients</label>
        {recipients.map(r => (
          <div key={r.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-4 py-2.5">
            <span className="text-base text-foreground break-all">{r.email}</span>
            <button onClick={() => removeRecipient(r.id)} className="text-muted-foreground hover:text-destructive p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {recipients.length === 0 && <p className="text-sm text-muted-foreground">No recipients yet. Add one to receive email alerts.</p>}
        <form onSubmit={addRecipient} className="flex gap-2">
          <input
            type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            placeholder="name@example.com"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-base text-foreground"
          />
          <button type="submit" className="flex items-center gap-1 px-4 rounded-lg bg-primary text-primary-foreground text-base font-medium">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={sendTest}
          className="w-full px-4 py-3 rounded-lg border border-primary text-primary text-base font-semibold hover:bg-primary/10"
        >
          Send test email
        </button>
        {testResult && <p className="text-sm text-foreground break-words">{testResult}</p>}
      </div>

      <div className="flex items-start gap-2 text-sm text-muted-foreground border-t border-border pt-4">
        <ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <span>Email is delivered by <strong>Brevo</strong> from the secure backend. The API key is stored as a server secret and is never available to this app.</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
