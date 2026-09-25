import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import PrefetchModelsButton from '@/components/dashboard/PrefetchModelsButton';
import {
  Play, Square, RefreshCw, CheckCircle2, XCircle, Loader2, Grid2x2,
  Square as SquareIcon, Columns2, Brain, VideoOff,
  ChevronDown, ChevronUp, Eye, EyeOff, Copy, Check, Wifi,
} from 'lucide-react';
import {
  backendHint,
  getMultiStatus,
  startCamera,
  stopCamera,
  syncCameras,
  testCamera,
  type BackendCameraStatus,
  type BackendStatus,
} from '@/lib/multiCamServer';
import {
  useCameraSlots,
  slotPath,
  slotRtsp,
  slotRtspMasked,
  slotRtspWithPort,
  AUTO_RTSP_PORTS,
  loadServerHost,
  serverUrlFor,
  DEFAULT_RTSP_PORT,
  DEFAULT_STREAM_PATH,
  type CameraSlot,
  type SlotCount,
} from '@/hooks/useCameraSlots';
import IpAddressHelp from './IpAddressHelp';
import IdleHint from '@/components/IdleHint';

interface Props {
  /** Called with the backend-reported HLS URL for camera 1 (drives the main dashboard). */
  onStream: (url: string) => void;
  playbackError?: string | null;
  playing?: boolean;
}

const Dot = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className="flex items-center gap-1.5 text-[14px] font-semibold">
    {ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
    <span className={ok ? 'text-success' : 'text-muted-foreground'}>{label}</span>
  </span>
);

/** Small live HLS preview inside the card — uses ONLY the URL the backend returned. */
function Preview({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (d.fatal && d.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    }
    return () => {
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [url]);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-background border border-border">
      <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full object-contain" />
      {!url && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <VideoOff className="w-6 h-6" />
          <span className="text-[14px] font-semibold">Offline</span>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  allSlots,
  server,
  serverOk,
  mediamtx,
  onRename,
  onIp,
  onAi,
  onPatch,
  onConnected,
  onStream,
}: {
  slot: CameraSlot;
  /** Every configured slot — synced together so cameras never evict each other. */
  allSlots: CameraSlot[];
  server: string;
  serverOk: boolean;
  mediamtx: boolean;
  onRename: (v: string) => void;
  onIp: (v: string) => void;
  onAi: (v: boolean) => void;
  onPatch: (v: Partial<CameraSlot>) => void;
  onConnected: (v: { connected: boolean; streamUrl: string }) => void;
  onStream?: (url: string) => void;
}) {
  const [status, setStatus] = useState<BackendCameraStatus | null>(null);
  const [busy, setBusy] = useState<'' | 'check' | 'start' | 'stop' | 'test'>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const pushedRef = useRef(false);
  const lastRef = useRef('');
  const id = `slot-${slot.index}`;

  const apply = useCallback((c: BackendCameraStatus | null) => {
    setStatus(c);
    const url = c?.stream_local || c?.stream || '';
    const live = !!c?.ffmpeg && !!c?.hls_ready && !!url;
    const key = `${live}|${live ? url : ''}`;
    if (lastRef.current !== key) {
      lastRef.current = key;
      onConnected({ connected: live, streamUrl: live ? url : '' });
    }
    if (live && !pushedRef.current) { pushedRef.current = true; onStream?.(url); }
    if (!live) pushedRef.current = false;
  }, [onConnected, onStream]);

  const check = useCallback(async (silent = true) => {
    if (!silent) { setBusy('check'); setError(''); }
    try {
      const s = await getMultiStatus(server);
      const mine = s.cameras.find(c => c.id === id) ?? null;
      apply(mine);
      if (!silent) {
        setMessage(
          mine
            ? `Camera ${mine.ffmpeg ? 'reachable' : 'not streaming'} · MediaMTX ${s.mediamtx ? 'running' : 'down'} · FFmpeg ${mine.ffmpeg ? 'running' : 'stopped'} · HLS ${mine.hls_ready ? 'ready' : 'missing'}`
            : 'Local server reachable — press Connect to start this camera.',
        );
        if (mine?.error) setError(mine.error);
      }
      return mine;
    } catch {
      apply(null);
      if (!silent) {
        setMessage('');
        setError(backendHint(server) || `Could not reach the local server at ${server}.`);
      }
      return null;
    } finally {
      if (!silent) setBusy('');
    }
  }, [server, id, apply]);

  // Auto-poll: when the backend reports ready, playback starts automatically.
  useEffect(() => {
    if (!slot.ip.trim()) return;
    const t = window.setInterval(() => { void check(true); }, 2500);
    return () => window.clearInterval(t);
  }, [slot.ip, check]);

  const handleConnect = async () => {
    if (!slot.ip.trim()) { setError('Enter the camera IP address first.'); return; }
    setBusy('start'); setError(''); setMessage(`Connecting ${slot.name}…`);
    try {
      // Auto port: find a port this camera actually answers on, then remember it.
      let active = slot;
      if (!(Number(slot.port) > 0)) {
        setMessage(`Looking for the right port on ${slot.ip}…`);
        for (const port of AUTO_RTSP_PORTS) {
          try {
            const probe = await testCamera(server, slotRtspWithPort(slot, port));
            if (probe.success) { active = { ...slot, port }; onPatch({ port }); break; }
          } catch { /* try the next port */ }
        }
        if (!(Number(active.port) > 0)) active = { ...slot, port: DEFAULT_RTSP_PORT };
        setMessage(`Connecting ${slot.name} on port ${active.port}…`);
      }

      // Sync EVERY configured camera, otherwise the backend drops the others.
      const configured = allSlots.filter(s => s.ip.trim());
      const payload = (configured.length ? configured : [active]).map(s => {
        const cur = s.index === active.index ? active : s;
        return {
          id: `slot-${cur.index}`, path: slotPath(cur), name: cur.name, location: '',
          rtspUrl: slotRtsp(cur), enabled: true, aiEnabled: cur.aiEnabled,
          recording: false, createdAt: new Date().toISOString(),
        };
      });
      await syncCameras(server, payload);
      const res = await startCamera(server, id);
      if (!res.success) { setError(res.error || 'The local server could not start FFmpeg for this camera.'); return; }
      if (res.stream) { pushedRef.current = true; onConnected({ connected: true, streamUrl: res.stream }); onStream?.(res.stream); }
      setMessage(`Online — publishing ${slotPath(slot)} through MediaMTX.`);
      await check(true);
    } catch {
      setError(backendHint(server) || `Could not reach the local server at ${server}.`);
    } finally { setBusy(''); }
  };

  const handleDisconnect = async () => {
    setBusy('stop'); pushedRef.current = false;
    try {
      await stopCamera(server, id);
      apply(null);
      setMessage(`${slot.name} disconnected.`);
      setError('');
    } catch {
      setError('Could not stop this camera on the local server.');
    } finally { setBusy(''); }
  };

  const rtspUrl = slotRtsp(slot);

  const handleCopy = async () => {
    if (!rtspUrl) return;
    try {
      await navigator.clipboard.writeText(rtspUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  const handleTest = async () => {
    if (!rtspUrl) { setTestResult({ ok: false, text: 'Enter the camera IP address first.' }); return; }
    setBusy('test'); setTestResult(null);
    try {
      const res = await testCamera(server, rtspUrl);
      setTestResult(res.success
        ? { ok: true, text: res.info || 'Connection successful — the camera answered.' }
        : { ok: false, text: res.error || 'The camera did not answer on this address.' });
    } catch {
      setTestResult({ ok: false, text: backendHint(server) || `Could not reach the local server at ${server}.` });
    } finally { setBusy(''); }
  };

  const live = !!status?.ffmpeg && !!status?.hls_ready;
  const streamUrl = live ? (status?.stream_local || status?.stream || '') : '';

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[16px] font-bold">CAM{slot.index}</span>
        <span className={`text-[14px] font-bold px-2.5 py-0.5 rounded-full ${live ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
          {live ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-end">
        <div className="space-y-1 min-w-0">
          <label className="text-[14px] font-semibold">Camera name</label>
          <input
            value={slot.name}
            onChange={e => onRename(e.target.value)}
            placeholder="Front Door"
            className="w-full text-[15px] px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide camera login details' : 'Show camera login details'}
          title={expanded ? 'Hide login details' : 'Show login details'}
          className="justify-self-center h-9 w-9 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="space-y-1 min-w-0">
          <label className="text-[14px] font-semibold">Camera IP address</label>
          <div className="flex items-center gap-2">
            <input
              value={slot.ip}
              onChange={e => onIp(e.target.value)}
              placeholder="192.168.18.98"
              className="w-full min-w-0 text-[15px] px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <IpAddressHelp />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <label className="text-[14px] font-semibold">Username</label>
              <input
                value={slot.username ?? ''}
                onChange={e => onPatch({ username: e.target.value })}
                autoComplete="off"
                placeholder="admin"
                className="w-full text-[15px] px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[14px] font-semibold">Password</label>
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={slot.password ?? ''}
                  onChange={e => onPatch({ password: e.target.value })}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full min-w-0 text-[15px] px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <label className="text-[14px] font-semibold">Stream path</label>
              <input
                value={slot.streamPath ?? DEFAULT_STREAM_PATH}
                onChange={e => onPatch({ streamPath: e.target.value })}
                placeholder={DEFAULT_STREAM_PATH}
                className="w-full text-[15px] px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[14px] font-semibold">Port (leave empty for Auto)</label>
              <input
                inputMode="numeric"
                value={Number(slot.port) > 0 ? String(slot.port) : ''}
                onChange={e => onPatch({ port: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                placeholder="Auto" 
                className="w-full text-[15px] px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <label className="text-[14px] font-semibold">RTSP URL (Auto-generated)</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={showPassword ? rtspUrl : slotRtspMasked(slot)}
                placeholder="rtsp://username:password@192.168.18.98:554/stream1"
                className="w-full min-w-0 text-[15px] px-3 py-2.5 rounded-lg border border-input bg-muted/60 text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy RTSP URL"
                className="shrink-0 flex items-center gap-1.5 text-[14px] font-semibold px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={busy !== ''}
              className="flex items-center gap-2 text-[15px] font-semibold px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-50"
            >
              {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Test connection
            </button>
            {testResult && (
              <span className={`text-[14px] font-semibold break-all ${testResult.ok ? 'text-success' : 'text-destructive'}`}>
                {testResult.text}
              </span>
            )}
          </div>
        </div>
      )}


      <Preview url={streamUrl} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <IdleHint
            message={slot.ip.trim() ? 'Press Connect to start this camera' : 'Type the camera IP address, then press Connect'}
            disabled={live || busy !== ''}
          />
          <button
            onClick={handleConnect}
            disabled={busy !== ''}
            className="w-full flex items-center justify-center gap-2 text-[15px] font-bold px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
          >
            {busy === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {busy === 'start' ? 'Connecting…' : 'Connect'}
          </button>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={busy !== '' || !live}
          className="flex items-center gap-2 text-[15px] font-semibold px-3 py-2.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          <Square className="w-4 h-4" /> Disconnect
        </button>
        <button
          onClick={() => check(false)}
          disabled={busy !== ''}
          className="flex items-center gap-2 text-[15px] font-semibold px-3 py-2.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${busy === 'check' ? 'animate-spin' : ''}`} /> Check
        </button>
        <button
          onClick={() => onAi(!slot.aiEnabled)}
          className={`flex items-center gap-2 text-[15px] font-semibold px-3 py-2.5 rounded-lg border transition-colors ${
            slot.aiEnabled ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
          }`}
          title="AI detection only — this never stops the stream"
        >
          <Brain className="w-4 h-4" /> AI {slot.aiEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-background/60 border border-border">
        <Dot ok={serverOk && mediamtx} label="MediaMTX" />
        <Dot ok={!!status?.ffmpeg} label="FFmpeg" />
        <Dot ok={!!status?.hls_ready} label="HLS" />
        <Dot ok={slot.aiEnabled} label="AI detection" />
        <Dot ok={live} label="Camera" />
        <PrefetchModelsButton className="ml-auto" />
      </div>

      {message && <p className="text-[14px] text-success break-all">{message}</p>}
      {status?.error && <p className="text-[14px] text-destructive break-all">{status.error}</p>}
      {error && (
        <p className="text-[14px] text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg break-all">{error}</p>
      )}
    </div>
  );
}

export const MultiCameraConnect = ({ onStream, playbackError, playing }: Props) => {
  const { count, slots, activeSlots, setCount, updateSlot } = useCameraSlots();
  const [backend, setBackend] = useState<BackendStatus | null>(null);
  const server = serverUrlFor(loadServerHost());

  useEffect(() => {
    const poll = async () => {
      try { setBackend(await getMultiStatus(server)); } catch { setBackend(null); }
    };
    void poll();
    const t = window.setInterval(poll, 4000);
    return () => window.clearInterval(t);
  }, [server]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[16px] font-bold">Cameras</label>
        <p className="text-[15px] text-muted-foreground">
          Add up to 4 cameras. Type only a camera name and its IP address — the stream is set up for
          you through MediaMTX, and each camera runs its own saliency detection pipeline.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-[15px] font-semibold">Number of cameras</label>
        <div className="flex flex-wrap items-center gap-2">
          {([1, 2, 3, 4] as SlotCount[]).map(n => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[15px] font-bold border transition-colors ${
                count === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              }`}
            >
              {n === 1 ? <SquareIcon className="w-4 h-4" /> : n === 2 ? <Columns2 className="w-4 h-4" /> : <Grid2x2 className="w-4 h-4" />}
              {n} camera{n === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-secondary/30 border border-border">
        <Dot ok={!!backend} label="Local server" />
        <Dot ok={!!backend?.mediamtx} label="MediaMTX" />
        <Dot ok={!!backend?.whisper} label="Audio (Whisper)" />
      </div>

      <div className={`grid gap-4 ${count === 1 ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
        {activeSlots.map(slot => (
          <SlotCard
            key={slot.index}
            slot={slot}
            allSlots={slots}
            server={server}
            serverOk={!!backend}
            mediamtx={!!backend?.mediamtx}
            onRename={v => updateSlot(slot.index, { name: v })}
            onIp={v => updateSlot(slot.index, { ip: v })}
            onAi={v => updateSlot(slot.index, { aiEnabled: v })}
            onPatch={v => updateSlot(slot.index, v)}
            onConnected={v => updateSlot(slot.index, v)}
            onStream={slot.index === 1 ? onStream : undefined}
          />
        ))}
      </div>

      {playing && <p className="text-[15px] font-semibold text-success">Camera 1 online in the dashboard.</p>}
      {playbackError && (
        <p className="text-[14px] text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg">
          Playback error: {playbackError}
        </p>
      )}
    </div>
  );
};

export default MultiCameraConnect;
