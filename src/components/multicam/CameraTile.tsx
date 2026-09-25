import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Maximize2, RefreshCw, Video, VideoOff, Flame, Cloud, User, Brain, Mic, MicOff,
  Circle, Volume2, VolumeX,
} from 'lucide-react';
import { useCameraPipeline } from '@/hooks/useCameraPipeline';
import { useCctvTalk } from '@/hooks/useCctvTalk';
import { clipFileName, recordClip, saveClip } from '@/lib/clipRecorder';
import type { CameraConfig, DetectionEvent, MultiCamSettings } from '@/types/multicam';

interface Props {
  camera: CameraConfig;
  settings: MultiCamSettings;
  /** Returns the id of the stored event so a clip can be attached to it later. */
  onEvent: (evt: Omit<DetectionEvent, 'id'>) => string | void;
  onClip?: (eventId: string, clipFile: string, clipUrl: string) => void;
  onExpand?: (id: string) => void;
  compact?: boolean;
  /** Speaker + push-to-talk are only offered on cameras that have two-way audio. */
  audioControls?: boolean;
}

const statusStyle: Record<string, string> = {
  online: 'bg-success/15 text-success',
  connecting: 'bg-warning/15 text-warning',
  error: 'bg-destructive/15 text-destructive',
  offline: 'bg-muted text-muted-foreground',
};

/** Only these really matter — object sightings are informational, never red. */
const EMERGENCY_TYPES = new Set<DetectionEvent['type']>([
  'fire', 'smoke', 'face-distress', 'audio-distress',
]);

export default function CameraTile({
  camera, settings, onEvent, onClip, onExpand, compact, audioControls,
}: Props) {
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const recordingRef = useRef(false);
  const [speaker, setSpeaker] = useState(false);
  const [clipNote, setClipNote] = useState('');

  const handleEvent = useCallback((evt: Omit<DetectionEvent, 'id'>) => {
    const id = onEvent(evt);
    if (!EMERGENCY_TYPES.has(evt.type) || recordingRef.current) return id;
    const video = videoRef.current;
    if (!video || typeof id !== 'string') return id;
    recordingRef.current = true;
    setClipNote('Recording a 10 second clip…');
    void recordClip(video)
      .then(async blob => {
        if (!blob) { setClipNote('Could not record a clip from this camera.'); return; }
        const name = clipFileName(camera.name, evt.type);
        const where = await saveClip(blob, name);
        onClip?.(id, name, URL.createObjectURL(blob));
        setClipNote(`Clip saved to ${where}`);
      })
      .finally(() => {
        recordingRef.current = false;
        window.setTimeout(() => setClipNote(''), 6000);
      });
    return id;
  }, [camera.name, onClip, onEvent]);

  const { videoRef, runtime, reconnect } = useCameraPipeline({ camera, settings, onEvent: handleEvent });
  const talk = useCctvTalk(settings.pythonServer, camera.id);

  // Speaker: unmute the live feed so the operator hears the camera.
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = !(audioControls && speaker);
  }, [speaker, audioControls, videoRef, runtime.status]);

  // Draw per-camera detection overlay (boxes + fire box)
  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const sx = canvas.width / 320;
    const sy = canvas.height / Math.max(1, Math.round((video.videoHeight / video.videoWidth) * 320));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.font = '600 16px Inter, sans-serif';
    for (const o of runtime.objects) {
      const [x, y, w, h] = o.bbox;
      ctx.strokeStyle = o.label === 'person' ? 'hsl(150 90% 50%)' : 'hsl(190 90% 55%)';
      ctx.strokeRect(x * sx, y * sy, w * sx, h * sy);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const text = `${o.label} ${(o.confidence * 100).toFixed(0)}%`;
      const tw = ctx.measureText(text).width + 8;
      ctx.fillRect(x * sx, y * sy - 20, tw, 20);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x * sx + 4, y * sy - 5);
    }
    if (runtime.fire.detected && runtime.fire.bbox) {
      const [x, y, w, h] = runtime.fire.bbox;
      ctx.strokeStyle = 'hsl(0 90% 55%)';
      ctx.lineWidth = 4;
      ctx.strokeRect(x * sx, y * sy, w * sx, h * sy);
    }
  }, [runtime.objects, runtime.fire, videoRef]);

  const Badge = ({ on, icon: Icon, label, alert = true }: { on: boolean; icon: typeof Flame; label: string; alert?: boolean }) => (
    <span
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold ${
        on
          ? alert ? 'bg-destructive/20 text-destructive' : 'bg-primary/15 text-primary'
          : 'bg-muted/60 text-muted-foreground'
      }`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-foreground truncate">{camera.name}</div>
          <div className="text-[13px] text-muted-foreground truncate">{camera.location || 'No location'}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {camera.recording && (
            <span className="flex items-center gap-1 text-[13px] font-semibold text-destructive">
              <Circle className="w-2.5 h-2.5 fill-destructive animate-pulse" /> REC
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${statusStyle[runtime.status]}`}>
            {runtime.status === 'online' ? 'Live' : runtime.status}
          </span>
          {audioControls && (
            <>
              <button
                onClick={() => setSpeaker(s => !s)}
                className={`p-1.5 rounded hover:bg-muted ${speaker ? 'text-primary' : 'text-muted-foreground'}`}
                title={speaker ? 'Mute camera sound' : 'Hear camera sound'}
                aria-pressed={speaker}
              >
                {speaker ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onMouseDown={talk.startTalk}
                onMouseUp={talk.stopTalk}
                onMouseLeave={talk.stopTalk}
                onTouchStart={talk.startTalk}
                onTouchEnd={talk.stopTalk}
                className={`p-1.5 rounded hover:bg-muted ${talk.talking ? 'text-destructive' : 'text-muted-foreground'}`}
                title="Hold to talk through this camera"
              >
                {talk.talking ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            </>
          )}
          <button onClick={reconnect} className="p-1.5 rounded hover:bg-muted" title="Reconnect this camera">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          {onExpand && (
            <button onClick={() => onExpand(camera.id)} className="p-1.5 rounded hover:bg-muted" title="Fullscreen">
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Video */}
      <div className="relative bg-background aspect-video">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-contain"
        />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Live transcription of what this camera hears */}
        {camera.enabled && (
          <div className="absolute top-2 left-2 z-10 max-w-[70%] rounded-md bg-background/85 border border-border px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Mic className="w-3 h-3" /> Live transcription
            </div>
            <p aria-live="polite" className="mt-0.5 max-h-20 overflow-y-auto text-[13px] leading-snug text-foreground">
              {runtime.transcript || (
                <span className={runtime.audioTone === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                  {runtime.audioMessage}
                </span>
              )}
            </p>
          </div>
        )}

        {runtime.status !== 'online' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-center px-3">
            <VideoOff className="w-7 h-7 text-muted-foreground" />
            <span className="text-[14px] font-semibold text-muted-foreground">
              {runtime.status === 'connecting' ? 'Connecting…' : runtime.error || 'Offline'}
            </span>
          </div>
        )}
        {talk.error && (
          <div className="absolute top-2 right-2 z-10 rounded bg-destructive/90 text-destructive-foreground text-[12px] px-2 py-1">
            {talk.error}
          </div>
        )}
        {clipNote && (
          <div className="absolute bottom-10 left-2 z-10 rounded bg-background/90 border border-border text-[12px] px-2 py-1">
            {clipNote}
          </div>
        )}
        {(runtime.fire.detected || runtime.audioDistress.detected) && (
          <div className="absolute bottom-0 left-0 right-0 bg-destructive/90 text-destructive-foreground text-[14px] font-bold px-3 py-1.5">
            {runtime.fire.detected ? '🔥 Fire detected' : `😨 "${runtime.audioDistress.keyword}"`} — {camera.name}
          </div>
        )}
      </div>

      {/* Stats */}
      {!compact && (
        <div className="px-3 py-2 flex flex-wrap items-center gap-1.5 border-t border-border">
          <Badge on={camera.aiEnabled} icon={Brain} label={camera.aiEnabled ? 'AI on' : 'AI off'} alert={false} />
          <Badge on={runtime.fire.detected} icon={Flame} label="Fire" />
          <Badge on={runtime.smoke.detected} icon={Cloud} label="Smoke" />
          <Badge on={runtime.humanCount > 0} icon={User} label={`Human ${runtime.humanCount}`} alert={false} />
          <Badge on={runtime.audioDistress.detected} icon={Mic} label="Audio" />
          <span className="ml-auto flex items-center gap-2 text-[13px] font-mono text-muted-foreground">
            <Video className="w-3.5 h-3.5" />
            {runtime.fps} FPS · {runtime.latencyMs}ms · S:{runtime.saliencyScore}
          </span>
        </div>
      )}
    </div>
  );
}
