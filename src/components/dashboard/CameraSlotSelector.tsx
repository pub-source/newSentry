import { useEffect, useMemo, useState } from 'react';
import { VideoOff, Video, ChevronLeft, ChevronRight, Flame, Users, Mic, MicOff, Smile, Volume2, VolumeX, Gauge, BellRing } from 'lucide-react';
import { useCameraPipeline } from '@/hooks/useCameraPipeline';
import { useCctvTalk } from '@/hooks/useCctvTalk';
import { slotCamera, slotSettings, type CameraSlot } from '@/hooks/useCameraSlots';
import { testCameraAudio } from '@/lib/multiCamServer';
import { Button } from '@/components/ui/button';
import type { CameraRuntime, DetectionEvent } from '@/types/multicam';


/**
 * Left-hand CAM 1..4 selector for the main monitoring frame.
 *
 * Selecting a camera only changes which feed is *displayed*. Every other
 * configured camera keeps streaming and keeps running its own independent
 * saliency pipeline (objects, fire, smoke, faces, CCTV audio).
 *
 * The rail is collapsible: `>>` hides it to give the video more room, `<<`
 * brings it back.
 */
export function CameraSlotSelector({
  slots,
  selected,
  onSelect,
  primaryLive,
  open,
  onToggleOpen,
}: {
  slots: CameraSlot[];
  selected: number;
  onSelect: (index: number) => void;
  /** CAM 1 is the dashboard's fused pipeline — its live state comes from the dashboard. */
  primaryLive: boolean;
  open: boolean;
  onToggleOpen: (open: boolean) => void;
}) {
  if (!open) {
    return (
      <button
        onClick={() => onToggleOpen(true)}
        aria-label="Show camera list"
        title="Show camera list"
        className="self-start flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-2 text-[13px] font-bold text-primary hover:border-primary/60 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
        <span className="lg:[writing-mode:vertical-rl] lg:rotate-180">CAM {selected}</span>
      </button>
    );
  }

  return (
    <div
      className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible shrink-0 lg:w-28"
      role="tablist"
      aria-label="Select camera"
    >
      <button
        onClick={() => onToggleOpen(false)}
        aria-label="Hide camera list"
        title="Hide camera list"
        className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Hide
      </button>
      {[1, 2, 3, 4].map(index => {
        const slot = slots.find(s => s.index === index);
        const live = index === 1 ? primaryLive : !!slot?.connected;
        const active = selected === index;
        return (
          <button
            key={index}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(index)}
            title={slot?.name || `Camera ${index}`}
            className={`min-w-[6.5rem] lg:min-w-0 flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-all ${
              active
                ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {live ? <Video className="w-3.5 h-3.5 text-success" /> : <VideoOff className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className={`text-[13px] font-bold ${active ? 'text-primary' : 'text-foreground'}`}>CAM {index}</span>
            </span>
            <span className="text-[11px] text-muted-foreground truncate w-full">
              {live ? 'Live' : 'Not connected'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Full independent detection pipeline for CAM 2..4.
 *
 * The component stays mounted for every configured slot even when another
 * camera is selected — it is only moved off-screen — so detection, alerts and
 * CCTV audio monitoring never stop when the operator switches views.
 */
export function SlotPipelineView({
  slot,
  monitoring,
  visible,
  onEvent,
  onMetrics,
}: {
  slot: CameraSlot;
  /** Dashboard monitoring switch — stops the AI work when the user presses Stop. */
  monitoring: boolean;
  visible: boolean;
  onEvent?: (evt: Omit<DetectionEvent, 'id'>) => void;
  onMetrics?: (cameraIndex: number, runtime: CameraRuntime) => void;
}) {
  const camera = useMemo(
    () => ({
      ...slotCamera(slot),
      enabled: !!slot.ip.trim() && !!slot.connected,
      aiEnabled: slot.aiEnabled && monitoring,
    }),
    [slot, monitoring],
  );
  const settings = useMemo(() => slotSettings(slot), [slot]);
  const { videoRef, runtime } = useCameraPipeline({ camera, settings, onEvent });
  const talk = useCctvTalk(settings.pythonServer, camera.id);

  const connected = camera.enabled;
  const [speaker, setSpeaker] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = !speaker;
  }, [speaker, runtime.status, videoRef]);

  useEffect(() => {
    onMetrics?.(slot.index, runtime);
  }, [onMetrics, runtime, slot.index]);

  const badge = (ok: boolean, Icon: typeof Flame, text: string) => (
    <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${ok ? 'bg-destructive/20 text-destructive' : 'bg-secondary/40 text-muted-foreground'}`}>
      <Icon className="w-3 h-3" /> {text}
    </span>
  );

  return (
    <div
      aria-hidden={!visible}
      className={
        visible
          ? 'relative bg-card rounded-md overflow-hidden border border-border panel-glow'
          : 'absolute -left-[9999px] top-0 w-[320px] pointer-events-none opacity-0'
      }
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
        <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">
          CAM {slot.index} — {slot.name || 'Camera'}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{runtime.fps} fps</span>
          <span className={`w-2 h-2 rounded-full ${runtime.status === 'online' ? 'bg-success' : connected ? 'bg-warning' : 'bg-destructive'}`} />
        </span>
      </div>

      <video
        ref={videoRef}
        muted={!speaker}
        playsInline
        autoPlay
        className="w-full aspect-video object-contain bg-background"
      />

      {/* Live transcription of what this camera hears + why it is silent */}
      {connected && (
        <div className="absolute top-8 left-2 z-10 max-w-[70%] rounded-md bg-background/85 border border-border px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Mic className="w-3 h-3" /> Live transcription
          </div>
          <p aria-live="polite" className="mt-0.5 max-h-24 overflow-y-auto text-[13px] leading-snug text-foreground">
            {runtime.transcript || (
              <span className={runtime.audioTone === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                {runtime.audioMessage}
              </span>
            )}
          </p>
          {runtime.transcript && runtime.audioTone === 'error' && (
            <p className="mt-0.5 text-[11px] leading-snug text-destructive">{runtime.audioMessage}</p>
          )}
          <p className="mt-1 text-[10px] font-mono text-muted-foreground">
            {runtime.audio?.thread_running ? 'worker on' : 'worker off'}
            {' · '}{runtime.audio?.connected ? 'audio in' : 'no audio'}
            {runtime.audio?.audio_source ? ` · via ${runtime.audio.audio_source}` : ''}
            {' · '}{runtime.audio?.chunks_received ?? 0} chunks
            {' · '}{runtime.audio?.whisper_state ?? (runtime.audioBackendReachable ? '—' : 'offline')}
            {runtime.audio?.last_transcription_at
              ? ` · ${new Date(runtime.audio.last_transcription_at).toLocaleTimeString()}`
              : ''}
          </p>
          {runtime.audio?.ffmpeg_error && (
            <p className="mt-0.5 max-h-8 overflow-hidden text-[10px] font-mono text-muted-foreground">
              {runtime.audio.ffmpeg_error}
            </p>
          )}
          <button
            type="button"
            onClick={async () => {
              setTesting(true); setTestResult('Testing the camera sound…');
              try {
                const r = await testCameraAudio(settings.pythonServer, camera.id);
                setTestResult(
                  r.success
                    ? `Sound OK via ${r.source ?? 'camera'} — heard: "${r.transcript || '(silence)'}"`
                    : `No sound: ${r.error ?? 'unknown problem'}`,
                );
              } catch (err) {
                setTestResult(err instanceof Error ? err.message : String(err));
              } finally {
                setTesting(false);
              }
            }}
            disabled={testing}
            className="mt-1 rounded border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-secondary/50 disabled:opacity-60"
          >
            {testing ? 'Testing…' : 'Test camera sound'}
          </button>
          {testResult && (
            <p className="mt-0.5 max-h-10 overflow-hidden text-[10px] leading-snug text-muted-foreground">
              {testResult}
            </p>
          )}
        </div>
      )}



      {connected && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-gradient-to-t from-background/90 to-transparent">
          {badge(runtime.fire.detected, Flame, `Fire ${Math.round(runtime.fire.confidence * 100)}%`)}
          {badge(runtime.humanCount > 0, Users, `${runtime.humanCount} person`)}
          {badge(runtime.faceDistress.detected, Smile, 'Face distress')}
          {badge(runtime.audioDistress.detected, Mic, runtime.audioDistress.keyword || 'Audio')}
          <span className="flex items-center gap-1 rounded bg-secondary/70 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
            <Gauge className="h-3 w-3" /> Attention {runtime.attentionScore}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">Saliency {runtime.saliencyScore}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-background/80"
              onClick={() => setSpeaker(value => !value)}
              aria-label={speaker ? `Mute CAM ${slot.index}` : `Hear CAM ${slot.index}`}
              title={speaker ? 'Mute camera sound' : 'Hear camera sound'}
            >
              {speaker ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-background/80"
              onMouseDown={talk.startTalk}
              onMouseUp={talk.stopTalk}
              onMouseLeave={talk.stopTalk}
              onTouchStart={talk.startTalk}
              onTouchEnd={talk.stopTalk}
              aria-label={`Hold to talk through CAM ${slot.index}`}
              title="Hold to talk through this camera"
            >
              {talk.talking ? <Mic className="h-4 w-4 text-destructive" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {connected && (runtime.fire.detected || runtime.smoke.detected || runtime.faceDistress.detected || runtime.audioDistress.detected || runtime.attentionScore > 70) && (
        <div className="absolute right-2 top-8 z-10 flex max-w-[42%] items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/90 px-2 py-1.5 text-[12px] font-semibold text-destructive-foreground">
          <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {runtime.fire.detected ? 'Fire detected' : runtime.smoke.detected ? 'Smoke detected' : runtime.audioDistress.detected ? `Safety word: ${runtime.audioDistress.keyword}` : runtime.faceDistress.detected ? 'Facial distress detected' : `High attention: ${runtime.attentionScore}`}
          </span>
        </div>
      )}

      {talk.error && (
        <div className="absolute bottom-12 right-2 z-10 max-w-[70%] rounded border border-destructive/40 bg-background/95 px-2 py-1 text-[11px] text-destructive">
          {talk.error}
        </div>
      )}

      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 text-center px-4">
          <VideoOff className="w-7 h-7 text-muted-foreground" />
          <span className="text-[14px] font-semibold text-muted-foreground">Not connected</span>
          <span className="text-[13px] text-muted-foreground">
            Open Connect and add an IP address for CAM {slot.index}.
          </span>
        </div>
      )}
    </div>
  );
}

export default CameraSlotSelector;
