import IdleHint from '@/components/IdleHint';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, LogOut, ArrowLeft, Copy, QrCode, AlertTriangle, Users, Volume2, Plus, X, Check, Mail, Bell, ChevronRight } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import TutorialOverlay, { type TutorialStep } from '@/components/dashboard/TutorialOverlay';
import householdBg from '@/assets/household-bg.jpg';
import NotificationSettings from '@/components/household/NotificationSettings';


interface Household {
  id: string;
  name: string;
  invite_code: string;
}

interface Member {
  id: string;
  display_name: string;
  phone_number: string;
  is_admin: boolean;
  user_id: string;
}

interface JoinRequest {
  id: string;
  household_id: string;
  display_name: string;
  phone_number: string;
  status: string;
  created_at: string;
}

interface WakeWord {
  id: string;
  phrase: string;
  is_emergency: boolean;
  action_type: string;
}

// Module-scope input component — must NOT be defined inside the page
// component, otherwise React remounts the <input> on every keystroke
// and steals focus after a single character.
function HInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-[15px] font-semibold text-foreground/80">{label}</label>
      <input
        {...props}
        className="w-full bg-background/80 border border-border rounded-lg px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
      />
    </div>
  );
}


export default function HouseholdPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [wakeWords, setWakeWords] = useState<WakeWord[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [tab, setTab] = useState<'setup' | 'manage'>('setup');
  const [loadingData, setLoadingData] = useState(true);

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');

  const [newPhrase, setNewPhrase] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [actionType, setActionType] = useState<'in_app' | 'email'>('email');
  const [showAddPhrase, setShowAddPhrase] = useState(false);

  const [showEmergency, setShowEmergency] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (loading || loadingData || !user) return;
    const key = `msds-household-tutorial-done-${user.id}`;
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(t);
    }
  }, [loading, loadingData, user, tab]);

  const normalizeInviteCode = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);

  const fetchHousehold = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    // A user may end up in more than one household; always use the newest one
    // (maybeSingle() would error out when several rows match).
    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const membership = memberships?.[0];


    if (membership) {
      const { data: hh } = await supabase.from('households').select('*').eq('id', membership.household_id).single();
      if (hh) {
        setHousehold(hh);
        setTab('manage');
        const [memRes, wwRes, jrRes] = await Promise.all([
          supabase.from('household_members').select('*').eq('household_id', hh.id),
          supabase.from('wake_words').select('*').eq('household_id', hh.id),
          supabase.from('join_requests').select('*').eq('household_id', hh.id).eq('status', 'pending'),
        ]);
        setMembers(memRes.data || []);
        setWakeWords((wwRes.data as WakeWord[]) || []);
        setJoinRequests((jrRes.data as JoinRequest[]) || []);
      }
    } else {
      const pendingCode = sessionStorage.getItem('pending_invite_code');
      if (pendingCode) {
        setMode('join');
        setInviteCode(normalizeInviteCode(pendingCode));
        sessionStorage.removeItem('pending_invite_code');
      }
      setTab('setup');
    }
    setLoadingData(false);
  }, [user]);

  useEffect(() => { fetchHousehold(); }, [fetchHousehold]);

  const fullName = `${firstName.trim()} ${surname.trim()}`.trim();

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!user || !firstName.trim() || !surname.trim() || !phoneNumber.trim() || !householdName.trim()) {
      setFormError('Please fill in the household name, your first name, surname and phone number.');
      return;
    }
    const { data: hh, error: hhErr } = await supabase.from('households').insert({ name: householdName.trim(), created_by: user.id }).select().single();
    if (hhErr || !hh) { setFormError(hhErr?.message || 'Could not create the household. Please try again.'); return; }
    const { error: memErr } = await supabase.from('household_members').insert({ household_id: hh.id, user_id: user.id, display_name: fullName, phone_number: phoneNumber, is_admin: true });
    if (memErr) { setFormError(memErr.message); return; }
    await supabase.from('wake_words').insert({ household_id: hh.id, phrase: '911', is_emergency: true, created_by: user.id, action_type: 'both' });
    await fetchHousehold();
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const normalizedCode = normalizeInviteCode(inviteCode);
    if (!user || !firstName.trim() || !surname.trim() || !phoneNumber.trim() || normalizedCode.length !== 8) {
      setFormError('All fields are required and the invite code must be 8 characters.');
      return;
    }
    const { data: hh } = await supabase.from('households').select('id').eq('invite_code', normalizedCode).maybeSingle();
    if (!hh) { setFormError('Invalid invite code'); return; }
    const { error: memErr } = await supabase.from('household_members').insert({ household_id: hh.id, user_id: user.id, display_name: fullName, phone_number: phoneNumber, is_admin: false });
    if (memErr) { setFormError(memErr.message); return; }
    await fetchHousehold();
  };


  const handleAddWakeWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !newPhrase.trim()) return;
    await supabase.from('wake_words').insert({ household_id: household.id, phrase: newPhrase.trim().toLowerCase(), is_emergency: isEmergency, created_by: user?.id, action_type: actionType });
    setNewPhrase('');
    setIsEmergency(false);
    setActionType('email');
    setShowAddPhrase(false);
    fetchHousehold();
  };

  const handleDeleteWakeWord = async (id: string) => {
    await supabase.from('wake_words').delete().eq('id', id);
    fetchHousehold();
  };

  const handleAcceptJoinRequest = async (req: JoinRequest) => {
    await supabase.from('household_members').insert({ household_id: req.household_id, display_name: req.display_name, phone_number: req.phone_number || '', is_admin: false, user_id: null });
    await supabase.from('join_requests').update({ status: 'accepted' }).eq('id', req.id);
    fetchHousehold();
  };

  const handleRejectJoinRequest = async (id: string) => {
    await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', id);
    fetchHousehold();
  };

  const copyInviteCode = () => {
    if (!household) return;
    navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (showEmergency) {
    return (
      <div className="min-h-screen bg-destructive/5 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto animate-pulse">
            <span className="text-4xl">🚨</span>
          </div>
          <h1 className="text-2xl font-bold text-destructive">EMERGENCY</h1>
          <p className="text-sm text-foreground">A 911 trigger was detected. Tap below to call emergency services.</p>
          <a href="tel:911" className="block w-full py-4 px-6 bg-destructive text-destructive-foreground font-bold text-lg rounded-xl hover:bg-destructive/90 transition-all shadow-lg">
            📞 CALL 911
          </a>
          <button onClick={() => setShowEmergency(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Dismiss (false alarm)
          </button>
        </div>
      </div>
    );
  }

  const actionConfig = {
    in_app: { icon: Bell, label: 'In-App', color: 'text-primary', bg: 'bg-primary/10', desc: 'Alert shown inside the dashboard only' },
    email: { icon: Mail, label: 'Email', color: 'text-accent', bg: 'bg-accent/10', desc: 'Email notification sent to your recipients' },
  };

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Friendly household background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${householdBg})` }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-background/80 backdrop-blur-[2px]" />
      {/* Header */}
      <header id="hh-tour-header" className="border-b border-border bg-card/70 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground tracking-tight">Household</h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowTutorial(true)} className="p-1 rounded hover:bg-muted transition-colors" title="Replay tutorial">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </button>
          <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
          <button onClick={signOut} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {tab === 'setup' && (
          <div id="hh-tour-setup" className="space-y-5 max-w-2xl mx-auto">
            {/* Mode Toggle */}
            <div id="hh-tour-mode" className="flex rounded-lg border border-border overflow-hidden">
              {(['create', 'join'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setFormError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 text-base font-semibold py-3.5 transition-all ${
                    mode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'create' ? <><Users className="w-4 h-4" /> Create Household</> : <><QrCode className="w-4 h-4" /> Join Household</>}
                </button>
              ))}
            </div>

            <form
              onSubmit={mode === 'create' ? handleCreateHousehold : handleJoinHousehold}
              id="hh-tour-form" className="bg-card/95 rounded-xl border border-border shadow-sm p-6 space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  {mode === 'create' ? 'New Household' : 'Join Existing'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === 'create' ? 'Create a household and become the admin' : 'Enter an invite code to join'}
                </p>
              </div>

              {mode === 'create' && (
                <HInput label="Household Name" type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)} placeholder="My Home" required autoComplete="off" />
              )}
              {mode === 'join' && (
                <HInput label="Invite Code" type="text" value={inviteCode} onChange={e => setInviteCode(normalizeInviteCode(e.target.value))} placeholder="abc12345" required autoComplete="off" />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <HInput label="First Name" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required autoComplete="given-name" />
                <HInput label="Surname" type="text" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Santos" required autoComplete="family-name" />
              </div>
              <HInput label="Phone Number" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+63 917 123 4567" required autoComplete="tel" />


              {formError && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                  <span className="text-destructive text-sm">⚠</span>
                  <p className="text-xs text-destructive">{formError}</p>
                </div>
              )}

              <div className="relative">
                <IdleHint message={mode === 'create' ? 'Fill your details, then press Create Household' : 'Enter the invite code, then press Join Household'} />
                <button type="submit" className="w-full flex items-center justify-center gap-2 text-lg font-bold py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm">
                  {mode === 'create' ? 'Create Household' : 'Join Household'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'manage' && household && (
          <div className="space-y-6">
            {/* Overview strip — quick household stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Household', value: household.name, Icon: Shield },
                { label: 'Members', value: String(members.length), Icon: Users },
                { label: 'Wake words', value: String(wakeWords.length), Icon: Volume2 },
                { label: 'Pending requests', value: String(joinRequests.length), Icon: AlertTriangle },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="bg-card/95 rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-base font-semibold text-foreground truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Household Info Card */}
            <div id="hh-tour-invite" className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{household.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">Invite Code:</span>
                      <code className="text-sm font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">{household.invite_code}</code>
                      <button onClick={copyInviteCode} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowQr(p => !p)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-all">
                      <QrCode className="w-3.5 h-3.5" />
                      {showQr ? 'Hide' : 'QR'}
                    </button>
                    <button onClick={() => setShowEmergency(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Test 911
                    </button>
                  </div>
                </div>

                {showQr && (
                  <div className="flex flex-col items-center gap-3 pt-4 border-t border-border">
                    <div className="p-3 bg-white rounded-xl">
                      <QRCodeSVG
                        value={`${window.location.origin}/join/${household.invite_code}`}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scan to join • Code: <code className="text-primary font-medium">{household.invite_code}</code>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Residents & requests */}
            <div className="grid gap-6 lg:grid-cols-2 items-start">
            <div id="hh-tour-members" className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Members ({members.length})</h3>
              </div>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">{m.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{m.display_name}</span>
                        {m.is_admin && (
                          <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">ADMIN</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{m.phone_number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests */}
            {joinRequests.length > 0 && (
              <div className="bg-card rounded-xl border border-warning/30 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">Pending Requests ({joinRequests.length})</h3>
                </div>
                <div className="space-y-2">
                  {joinRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-foreground">{req.display_name}</span>
                        {req.phone_number && <span className="text-xs text-muted-foreground ml-2">{req.phone_number}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAcceptJoinRequest(req)} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-all">
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button onClick={() => handleRejectJoinRequest(req.id)} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all">
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>

            {/* Safety & alert settings */}
            <div className="grid gap-6 lg:grid-cols-2 items-start">
            <div id="hh-tour-wakewords" className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Wake Words & Phrases</h3>
                </div>
                <div className="relative">
                  <IdleHint message="Tap + Add Phrase to create a wake word" disabled={showAddPhrase} />
                  <button
                    onClick={() => setShowAddPhrase(p => !p)}
                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      showAddPhrase
                        ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                        : 'border-primary/30 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {showAddPhrase ? <><X className="w-3 h-3" /> Cancel</> : <><Plus className="w-3 h-3" /> Add Phrase</>}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Each phrase triggers a specific action when detected in real-time audio transcription.
              </p>

              {/* Wake Word List */}
              <div className="space-y-2">
                {wakeWords.map(w => {
                  const ac = actionConfig[w.action_type as keyof typeof actionConfig] || actionConfig.email;
                  const ActionIcon = ac.icon;
                  return (
                    <div key={w.id} className="bg-secondary/40 rounded-lg px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-foreground">"{w.phrase}"</span>
                          {w.is_emergency && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> EMERGENCY
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleDeleteWakeWord(w.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded ${ac.bg} ${ac.color}`}>
                          <ActionIcon className="w-3 h-3" />
                          {ac.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{ac.desc}</span>
                      </div>
                    </div>
                  );
                })}
                {wakeWords.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No wake words configured. Add one to get started.</p>
                )}
              </div>

              {/* Add Phrase Form */}
              {showAddPhrase && (
                <form onSubmit={handleAddWakeWord} className="border border-primary/20 rounded-xl p-4 space-y-4 bg-primary/5">
                  <h4 className="text-sm font-semibold text-foreground">New Phrase</h4>

                  <HInput label="Phrase to detect" type="text" value={newPhrase} onChange={e => setNewPhrase(e.target.value)} placeholder="help, intruder, fire..." required />

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Action Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['in_app', 'email'] as const).map(opt => {
                        const cfg = actionConfig[opt];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setActionType(opt)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                              actionType === opt
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${actionType === opt ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`text-xs font-medium ${actionType === opt ? 'text-primary' : 'text-foreground'}`}>
                              {cfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEmergency(p => !p)}
                    className={`w-full flex items-center justify-center gap-2 text-xs font-medium py-2.5 rounded-lg border transition-all ${
                      isEmergency
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {isEmergency ? 'Emergency ON — triggers 911 prompt' : 'Mark as Emergency'}
                  </button>

                  <button type="submit" className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all">
                    <Plus className="w-4 h-4" />
                    Add Phrase
                  </button>
                </form>
              )}
            </div>

            <NotificationSettings householdId={household.id} />
            </div>

            {/* Go to Dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              id="hh-tour-goto" className="w-full flex items-center justify-center gap-2 text-sm font-medium py-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
            >
              Go to Monitoring Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <TutorialOverlay
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        onFinish={() => {
          if (user) {
            try { localStorage.setItem(`msds-household-tutorial-done-${user.id}`, '1'); } catch { /* noop */ }
          }
        }}
        steps={tab === 'setup' ? ([
          {
            selector: '#hh-tour-header',
            placement: 'bottom',
            title: 'Household Setup',
            body: 'Hi, I am MSDS. A household lets multiple people share the same monitoring, alerts, and wake words. Let me show you how to set one up.',
            narration: 'Hi, I am MSDS. This is the household setup page. Let me walk you through it.',
          },
          {
            selector: '#hh-tour-mode',
            placement: 'bottom',
            title: 'Create or Join',
            body: 'Pick Create Household to start a new one and become admin, or Join Household if someone already sent you an invite code.',
            narration: 'Choose whether to create a new household or join an existing one with an invite code.',
          },
          {
            selector: '#hh-tour-form',
            placement: 'top',
            title: 'Your Details',
            body: 'Fill in your display name and phone number. These are used to identify you and to route alerts to the right member.',
            narration: 'Fill in your details. These are used to identify you and route alerts.',
          },
        ] as TutorialStep[]) : ([
          {
            selector: '#hh-tour-header',
            placement: 'bottom',
            title: 'Household Dashboard',
            body: 'Hi, I am MSDS. This is where you manage your household: invite people, review members, and configure the phrases that trigger alerts.',
            narration: 'Hi, I am MSDS. This is your household management page.',
          },
          {
            selector: '#hh-tour-invite',
            placement: 'bottom',
            title: 'Invite Code & QR',
            body: 'Share this invite code or QR so family members can join your household. Only members inside the household receive alerts and updates.',
            narration: 'Share the invite code or QR so family can join your household.',
          },
          {
            selector: '#hh-tour-members',
            placement: 'top',
            title: 'Members',
            body: 'All people currently in your household. Admins can manage invites, wake words, and accept new join requests.',
            narration: 'These are the people currently in your household.',
          },
          {
            selector: '#hh-tour-wakewords',
            placement: 'top',
            title: 'Wake Words & Phrases',
            body: 'Add spoken phrases like help, fire, or intruder. When the microphone hears them, I trigger the matching action for everyone in the household.',
            narration: 'Add phrases like help, fire, or intruder. When heard, I trigger the matching alert.',
          },
          {
            selector: '#hh-tour-goto',
            placement: 'top',
            title: 'Back to Monitoring',
            body: 'When you are ready, jump back to the monitoring dashboard to start watching, listening, and detecting emergencies in real time.',
            narration: 'When you are ready, go back to the monitoring dashboard to start detection.',
          },
        ] as TutorialStep[])}
      />
    </div>
  );
}
