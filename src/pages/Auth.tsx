import IdleHint from '@/components/IdleHint';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shield, UserPlus, QrCode, LogIn, ArrowLeft, Mail, Lock, User, Phone, Camera, Send, KeyRound, Eye, EyeOff, CheckCircle2, Loader2, Video, BellRing, House } from 'lucide-react';
import { Button } from '@/components/ui/button';
import householdBackground from '@/assets/household-bg.jpg';

type AuthMode = 'choose' | 'create' | 'join-qr' | 'join-name' | 'join-submitted' | 'login' | 'forgot';

export default function Auth() {
  const { user, loading, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const [mode, setMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [matchedHousehold, setMatchedHousehold] = useState<{ id: string; name: string } | null>(null);
  const [joinRequestId, setJoinRequestId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (urlCode && !inviteCode) {
      const normalized = normalizeInviteCode(urlCode);
      if (normalized) {
        setInviteCode(normalized);
        setMode('join-qr');
      }
    }
  }, [urlCode, inviteCode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== 'join-qr' || !scanning) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  }, [mode, scanning]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/household" replace />;

  const clearState = () => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setInviteCode('');
    setJoinName('');
    setJoinPhone('');
    setMatchedHousehold(null);
    setScanning(false);
  };

  const normalizeInviteCode = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);

  const extractInviteCode = (rawValue: string) => {
    const raw = rawValue.trim();
    const joinMatch = raw.match(/\/join\/([a-z0-9]{8})/i);
    if (joinMatch?.[1]) return normalizeInviteCode(joinMatch[1]);
    return normalizeInviteCode(raw);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
    setSubmitting(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError('Email is required.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!trimmedEmail.toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are allowed.');
      return;
    }
    if (!password) { setError('Password is required.'); return; }
    const pwIssue = validatePasswordStrength(password);
    if (pwIssue) { setError(pwIssue); return; }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!privacyConsent) {
      setError('You must agree to the Data Privacy Act notice to create an account.');
      return;
    }
    setSubmitting(true);
    // Note: Supabase securely hashes the password server-side (bcrypt) before storage.
    const { error: authError } = await signUp(trimmedEmail, password);
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }
    setSuccess('Account created successfully! Redirecting to sign in...');
    setSubmitting(false);
    setTimeout(() => {
      clearState();
      setMode('login');
    }, 1800);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are allowed.');
      return;
    }
    setSubmitting(true);
    const { error: authError } = await signIn(email, password);
    if (authError) setError(authError.message);
    setSubmitting(false);
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedCode = normalizeInviteCode(inviteCode);
    if (normalizedCode.length !== 8) {
      setError('Invite code must be 8 characters');
      return;
    }
    const { data: hh } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', normalizedCode)
      .maybeSingle();
    if (!hh) {
      setError('Invalid invite code. Ask your household admin for a valid code.');
      return;
    }
    setInviteCode(normalizedCode);
    setMatchedHousehold({ id: hh.id, name: hh.name });
    setMode('join-name');
  };

  const handleSubmitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!joinName.trim()) { setError('Please enter your name'); return; }
    if (!matchedHousehold) { setError('No household selected'); return; }
    setSubmitting(true);
    const { data: inserted, error: insertErr } = await supabase
      .from('join_requests')
      .insert({
        household_id: matchedHousehold.id,
        display_name: joinName.trim(),
        phone_number: joinPhone.trim(),
        status: 'pending',
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      setError(insertErr?.message || 'Failed to submit request');
    } else {
      setJoinRequestId(inserted.id);
      setMode('join-submitted');
    }
    setSubmitting(false);
  };

  const startQrScan = async () => {
    setScanning(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play().catch(() => {}); };
      }
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const scanLoop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || !streamRef.current) {
            if (streamRef.current) requestAnimationFrame(scanLoop);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const normalizedCode = extractInviteCode(barcodes[0].rawValue || '');
              if (!normalizedCode) { setError('Could not read a valid invite code from QR.'); return; }
              setInviteCode(normalizedCode);
              setScanning(false);
              streamRef.current?.getTracks().forEach(t => t.stop());
              streamRef.current = null;
              return;
            }
          } catch {}
          if (streamRef.current) requestAnimationFrame(scanLoop);
        };
        setTimeout(() => requestAnimationFrame(scanLoop), 500);
      } else {
        setError('QR scanning not supported. Enter the code manually.');
        setScanning(false);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {
      setError('Camera access denied. Enter the invite code manually.');
      setScanning(false);
    }
  };

  // Shared subcomponents are defined at module scope below to avoid
  // remounting inputs on every keystroke (which would steal focus).

  // Forgot password
  if (mode === 'forgot') {
    return (
      <PageWrapper>
        {resetSent ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Check your inbox</h2>
            <p className="text-xs text-muted-foreground">We sent a password reset link to your email.</p>
            <BackButton onClick={() => { setMode('login'); setResetSent(false); setResetEmail(''); }} label="Back to sign in" />
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Reset Password</h2>
              <p className="text-xs text-muted-foreground">Enter your email to receive a reset link</p>
            </div>
            <InputField icon={Mail} label="Email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="your@gmail.com" />
            <ErrorMsg msg={error} />
            <PrimaryButton type="submit" disabled={submitting}>
              <KeyRound className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </PrimaryButton>
            <BackButton onClick={() => { setMode('login'); setError(''); }} label="Back to sign in" />
          </form>
        )}
      </PageWrapper>
    );
  }

  // Choose screen
  if (mode === 'choose') {
    return (
      <PageWrapper>
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="relative min-h-48 overflow-hidden border-b border-border px-6 py-7 sm:min-h-56 sm:px-8">
            <img
              src={householdBackground}
              alt="Bright indoor room protected by home cameras"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-background/70" />
            <div className="relative max-w-sm space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-sm font-semibold text-primary">
                <Video className="h-4 w-4" /> Indoor safety, always in view
              </span>
              <h2 className="text-3xl font-bold text-foreground">Welcome to a safer home</h2>
              <p className="text-base leading-relaxed text-foreground/80">
                Connect your household and cameras so MSDS can watch for urgent moments and keep everyone informed.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Video className="h-4 w-4 text-primary" /> Live cameras</div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><BellRing className="h-4 w-4 text-primary" /> Safety alerts</div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><House className="h-4 w-4 text-primary" /> Household access</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { clearState(); setMode('create'); }}
                className="h-auto min-h-28 justify-start gap-4 whitespace-normal p-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <UserPlus className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block text-base font-semibold text-foreground">Create a household</span>
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">Start a protected space for your family.</span>
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => { clearState(); setMode('join-qr'); }}
                className="h-auto min-h-28 justify-start gap-4 whitespace-normal p-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/10">
                  <QrCode className="h-5 w-5 text-accent" />
                </span>
                <span>
                  <span className="block text-base font-semibold text-foreground">Join your household</span>
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">Use the invite code shared by your family.</span>
                </span>
              </Button>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => navigate('/')} className="justify-start gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to welcome
              </Button>
              <Button type="button" onClick={() => { clearState(); setMode('login'); }} className="gap-2">
                <LogIn className="h-4 w-4" /> Sign in
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Join via QR / Invite Code
  if (mode === 'join-qr') {
    return (
      <PageWrapper>
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Join Household</h2>
            <p className="text-xs text-muted-foreground">Scan a QR code or enter an invite code</p>
          </div>

          {scanning ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border aspect-square bg-background">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-primary rounded-xl animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">Point camera at the QR code</p>
              <button onClick={() => setScanning(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">Cancel scan</button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={startQrScan}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-accent/40 text-accent hover:bg-accent/5 hover:border-accent/60 transition-all text-sm font-medium"
              >
                <Camera className="w-4 h-4" />
                Scan QR Code
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">or enter code</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <form onSubmit={handleJoinWithCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(normalizeInviteCode(e.target.value))}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-4 py-3 text-base font-mono text-foreground text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="abc12345"
                    maxLength={8}
                    required
                  />
                </div>
                <ErrorMsg msg={error} />
                <SuccessMsg msg={success} />
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting ? 'Verifying...' : 'Verify Code'}
                </PrimaryButton>
              </form>
            </div>
          )}
          <BackButton onClick={() => { clearState(); setMode('choose'); }} />
        </div>
      </PageWrapper>
    );
  }

  // Join - Enter Name
  if (mode === 'join-name') {
    return (
      <PageWrapper>
        <form onSubmit={handleSubmitJoinRequest} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Join Household</h2>
            <p className="text-xs text-muted-foreground">Enter your details to request access</p>
          </div>
          {matchedHousehold && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5">
              <span className="text-accent text-sm">✓</span>
              <p className="text-xs text-accent font-medium">Joining: {matchedHousehold.name}</p>
            </div>
          )}
          <InputField icon={User} label="Your Name" type="text" value={joinName} onChange={e => setJoinName(e.target.value)} required placeholder="John Doe" />
          <InputField icon={Phone} label="Phone Number (optional)" type="tel" value={joinPhone} onChange={e => setJoinPhone(e.target.value)} placeholder="+1 555-123-4567" />
          <ErrorMsg msg={error} />
          <PrimaryButton type="submit" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Request to Join'}
          </PrimaryButton>
          <BackButton onClick={() => { clearState(); setMode('join-qr'); }} />
        </form>
      </PageWrapper>
    );
  }

  // Join - Submitted waiting
  if (mode === 'join-submitted' && joinRequestId) {
    return (
      <PageWrapper>
        <JoinWaitingScreen
          requestId={joinRequestId}
          householdName={matchedHousehold?.name || ''}
          memberName={joinName}
          onBack={() => { clearState(); setMode('choose'); }}
        />
      </PageWrapper>
    );
  }

  // Sign In
  if (mode === 'login') {
    return (
      <PageWrapper>
        <form onSubmit={handleSignIn} className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-base text-muted-foreground">Sign in to your account</p>
          </div>
          <InputField icon={Mail} label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@gmail.com" />
          <InputField icon={Lock} label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
          <ErrorMsg msg={error} />
          <PrimaryButton type="submit" disabled={submitting}>
            <LogIn className="w-5 h-5" />
            {submitting ? 'Signing in...' : 'Sign In'}
          </PrimaryButton>
          <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="w-full text-base text-muted-foreground hover:text-primary transition-colors py-2">
            Forgot password?
          </button>
          <BackButton onClick={() => { clearState(); setMode('choose'); }} />
        </form>
      </PageWrapper>
    );
  }


  // Create Account
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().toLowerCase().endsWith('@gmail.com');
  const passwordValid = !validatePasswordStrength(password) && password.length > 0;
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmitCreate = emailValid && passwordValid && confirmValid && privacyConsent && !submitting && !success;

  return (
    <PageWrapper>
      <form onSubmit={handleCreateAccount} noValidate aria-busy={submitting} className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
          <p className="text-base text-muted-foreground">Set up your admin account to get started</p>
        </div>

        {sessionStorage.getItem('pending_invite_code') && (
          <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-3">
            <span className="text-accent text-base">✓</span>
            <p className="text-base text-accent font-medium">Joining with code: {sessionStorage.getItem('pending_invite_code')}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="ca-email" className="text-base font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
            <input
              id="ca-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="your@gmail.com"
              className="w-full bg-secondary/60 border border-border rounded-lg pl-11 pr-3 py-3.5 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="ca-password" className="text-base font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
            <input
              id="ca-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              aria-required="true"
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full bg-secondary/60 border border-border rounded-lg pl-11 pr-11 py-3.5 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="ca-confirm" className="text-base font-medium text-foreground">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
            <input
              id="ca-confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!confirmPassword && confirmPassword !== password}
              placeholder="Confirm your password"
              className="w-full bg-secondary/60 border border-border rounded-lg pl-11 pr-11 py-3.5 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(v => !v)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showConfirmPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-sm text-destructive pl-1">Passwords do not match.</p>
          )}
        </div>

        <ErrorMsg msg={error} />
        <SuccessMsg msg={success} />
        <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4">
          <input
            id="ca-privacy"
            type="checkbox"
            checked={privacyConsent}
            onChange={e => setPrivacyConsent(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-border accent-primary cursor-pointer"
          />
          <label htmlFor="ca-privacy" className="text-sm leading-relaxed text-foreground cursor-pointer">
            I agree to the collection, use, and processing of my personal
            information under the Data Privacy Act of 2012 (RA 10173).{' '}
            <button
              type="button"
              onClick={() => setShowPrivacyDialog(true)}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Read full notice
            </button>
          </label>
        </div>
        <div className="relative">
          <IdleHint message="Fill the fields above, then press Create Account" disabled={submitting || !!success} />
        </div>
        <PrimaryButton type="submit" disabled={!canSubmitCreate} aria-label="Create Account">
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Account Created</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>Create Account</span>
            </>
          )}
        </PrimaryButton>
        <button type="button" onClick={() => { clearState(); setMode('login'); }} className="w-full text-base text-muted-foreground hover:text-primary transition-colors py-2">
          Already have an account? Sign in
        </button>
        <BackButton onClick={() => { clearState(); setMode('choose'); }} />
      </form>

      {showPrivacyDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowPrivacyDialog(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Data Privacy Act Notice</h3>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                In compliance with the <span className="text-foreground font-medium">Data Privacy Act of 2012 (Republic Act No. 10173)</span>,
                MSDSystem informs you of the following regarding the personal information collected through this application.
              </p>
              <div>
                <p className="text-foreground font-medium mb-1">Information We Collect</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Account details: email address and hashed password.</li>
                  <li>Household data: names, roles, phone numbers, invite codes.</li>
                  <li>Detection data: camera snapshots, audio events, wake-word matches, alert logs, AI confidence scores, timestamps.</li>
                </ul>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Purpose of Processing</p>
                <p>Data is used solely to operate the multimodal emergency detection service, notify household members, and improve model accuracy.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Storage & Security</p>
                <p>Data is stored on secure cloud infrastructure protected by Row-Level Security policies and encrypted transport (HTTPS/TLS). Access is limited to authorized household members.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Your Rights</p>
                <p>You have the right to be informed, to access, to object, to rectify, to erase, and to data portability. You may withdraw consent at any time by deleting your account.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Sharing</p>
                <p>Your data is not sold or shared with third parties for advertising. It is only shared with members of your household as required by the service.</p>
              </div>
              <p className="text-[10px]">
                By checking the consent box, you acknowledge that you have read this notice and freely give your consent to the processing of your personal information for the purposes stated above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacyDialog(false)}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function validatePasswordStrength(pw: string): string | null {
  // Simplified for accessibility: minimum length only. Supabase server-side
  // enforces its own minimum (default 6 chars); we surface a friendly message.
  if (pw.length < 6) return 'Password must be at least 6 characters.';
  return null;
}


// ---- Module-scope shared subcomponents ----
// IMPORTANT: These MUST live outside the Auth component so React does not
// remount the input nodes on every keystroke (which would steal focus).

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-9 h-9 text-primary" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              MSDSystem
            </h1>
          </div>
          <p className="text-base text-muted-foreground">
            Multimodal Saliency Detection System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-3">
      <span className="text-destructive text-lg">⚠</span>
      <p className="text-base text-destructive">{msg}</p>
    </div>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-3 py-3">
      <span className="text-success text-lg">✓</span>
      <p className="text-base text-success">{msg}</p>
    </div>
  );
}

type InputFieldProps = { icon: any; label: string } & React.InputHTMLAttributes<HTMLInputElement>;
function InputField({ icon: Icon, label, ...props }: InputFieldProps) {
  const autoComplete =
    props.autoComplete ??
    (props.type === 'password' ? 'current-password' : props.type === 'email' ? 'email' : 'off');
  return (
    <div className="space-y-2">
      <label className="text-base font-medium text-foreground">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
        <input
          {...props}
          autoComplete={autoComplete}
          className="w-full bg-secondary/60 border border-border rounded-lg pl-11 pr-3 py-3.5 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>
    </div>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full flex items-center justify-center gap-2 text-lg font-semibold py-4 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
    >
      {children}
    </button>
  );

}

function BackButton({ onClick, label = '← Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
    >
      <ArrowLeft className="w-3 h-3" />
      {label}
    </button>
  );
}

// Waiting screen with realtime polling for admin approval
function JoinWaitingScreen({ requestId, householdName, memberName, onBack }: {
  requestId: string;
  householdName: string;
  memberName: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('join_requests')
        .select('status')
        .eq('id', requestId)
        .single();
      if (data?.status === 'accepted') {
        setStatus('accepted');
        clearInterval(interval);
        sessionStorage.setItem('guest_member', JSON.stringify({ name: memberName, household: householdName }));
        setTimeout(() => navigate('/dashboard'), 1500);
      } else if (data?.status === 'rejected') {
        setStatus('rejected');
        clearInterval(interval);
      }
    }, 3000);

    const channel = supabase
      .channel(`join-request-${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'join_requests',
        filter: `id=eq.${requestId}`,
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        if (newStatus === 'accepted') {
          setStatus('accepted');
          sessionStorage.setItem('guest_member', JSON.stringify({ name: memberName, household: householdName }));
          setTimeout(() => navigate('/dashboard'), 1500);
        } else if (newStatus === 'rejected') {
          setStatus('rejected');
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [requestId, memberName, householdName, navigate]);

  if (status === 'accepted') {
    return (
      <div className="bg-card rounded-xl border border-success/30 shadow-sm p-8 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-base font-semibold text-foreground">Welcome, {memberName}!</h2>
        <p className="text-xs text-muted-foreground">You've been accepted into "{householdName}". Redirecting...</p>
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-8 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">❌</span>
        </div>
        <h2 className="text-base font-semibold text-destructive">Request Declined</h2>
        <p className="text-xs text-muted-foreground">The household admin has declined your request.</p>
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back to start</button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-5 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      <h2 className="text-base font-semibold text-foreground">Waiting for Approval</h2>
      <p className="text-xs text-muted-foreground">
        Your request to join "<span className="font-medium text-foreground">{householdName}</span>" has been sent.
      </p>
      <p className="text-[10px] text-muted-foreground animate-pulse">Listening for response...</p>
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Cancel</button>
    </div>
  );
}
