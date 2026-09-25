import { useRef, useEffect, useState, useCallback } from 'react';
import type { DetectedObject, AudioFeatures } from '@/types/dashboard';
import { Maximize2, Minimize2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface FusedDetectionViewProps {
  sourceCanvas: HTMLCanvasElement | null;
  objects: DetectedObject[];
  audioFeatures: AudioFeatures;
  attentionScore: number;
  saliencyScore: number;
  active: boolean;
  transcript: string;
  interimTranscript: string;
  speechListening: boolean;
  /** Plain-language state of the camera's audio/Whisper path. */
  audioMessage?: string;
  audioTone?: 'ok' | 'wait' | 'error';
  /** Compact technical line (worker/chunks/Whisper state). */
  audioDiagnostic?: string;
  onToggleSpeech: () => void;

  fireBbox?: [number, number, number, number];
  fireFrameWidth?: number;
  fireFrameHeight?: number;
  /** Speaker OUTPUT only (playback of the camera's audio). */
  cctvAudioEnabled?: boolean;
  cctvAudioAvailable?: boolean;
  onToggleCctvAudio?: () => void;
  /** Microphone INPUT pipeline (Whisper wake-word listening) — independent of the speaker. */
  /** Push-to-talk out of the CCTV speaker. */
  talking?: boolean;
  talkError?: string | null;
  onTalkStart?: () => void;
  onTalkStop?: () => void;
}

// Distress indicators from object/audio context
function inferDistress(objects: DetectedObject[], audioFeatures: AudioFeatures, transcript: string): { activity: string; distressLevel: 'none' | 'warning' | 'critical' } {
  const labels = objects.map(o => o.label);
  const hasPerson = labels.includes('person');
  const personCount = labels.filter(l => l === 'person').length;
  const lower = transcript.toLowerCase();

  // Check speech for distress keywords
  const distressWords = ['help', 'choking', 'choke', 'can\'t breathe', 'cant breathe', 'fall', 'fell', 'trip', 'tripped', 'hurt', 'pain', 'agonizing', 'agony', 'emergency', 'dying', 'heart attack', 'stroke', 'seizure', 'unconscious', 'bleeding', 'broken'];
  const matchedDistress = distressWords.filter(w => lower.includes(w));

  // Audio-based distress
  const isScreaming = audioFeatures.audioEvent === 'scream';
  const isBang = audioFeatures.audioEvent === 'bang';
  const isLoud = audioFeatures.decibel > -10;

  // Determine distress level
  let distressLevel: 'none' | 'warning' | 'critical' = 'none';
  const distressActivities: string[] = [];

  if (matchedDistress.length > 0) {
    distressLevel = 'critical';
    distressActivities.push(`DISTRESS: "${matchedDistress[0]}"`);
  }

  if (isScreaming) {
    distressLevel = 'critical';
    distressActivities.push('SCREAMING DETECTED');
  }

  if (isBang && hasPerson) {
    distressLevel = distressLevel === 'critical' ? 'critical' : 'warning';
    distressActivities.push('Impact/Fall detected');
  }

  // Normal activity inference
  if (distressActivities.length === 0) {
    if (!hasPerson) {
      return { activity: labels.length > 0 ? `Objects: ${[...new Set(labels)].slice(0, 3).join(', ')}` : 'No activity detected', distressLevel: 'none' };
    }

    const activities: string[] = [];
    if (labels.includes('laptop') || labels.includes('keyboard') || labels.includes('mouse')) activities.push('Working on computer');
    if (labels.includes('cell phone')) activities.push('Using phone');
    if (labels.includes('book')) activities.push('Reading');
    if (labels.includes('cup') || labels.includes('wine glass') || labels.includes('bottle')) activities.push('Drinking');
    if (labels.includes('fork') || labels.includes('knife') || labels.includes('spoon') || labels.includes('bowl')) activities.push('Eating');
    if (labels.includes('pizza') || labels.includes('sandwich') || labels.includes('hot dog') || labels.includes('cake')) activities.push('Eating food');
    if (labels.includes('tv') || labels.includes('remote')) activities.push('Watching TV');
    if (labels.includes('scissors')) activities.push('Cutting/Crafting');
    if (labels.includes('toothbrush')) activities.push('Brushing teeth');
    if (labels.includes('tie') || labels.includes('backpack') || labels.includes('suitcase')) activities.push('Getting ready');
    if (labels.includes('sports ball') || labels.includes('tennis racket') || labels.includes('baseball bat')) activities.push('Playing sports');
    if (labels.includes('bicycle') || labels.includes('motorcycle')) activities.push('Riding');
    if (labels.includes('cat') || labels.includes('dog')) activities.push('With pet');
    if (labels.includes('chair') || labels.includes('couch') || labels.includes('bed')) activities.push('Sitting/Resting');
    if (labels.includes('dining table')) activities.push('At table');
    if (labels.includes('microwave') || labels.includes('oven') || labels.includes('sink') || labels.includes('refrigerator')) activities.push('In kitchen');
    if (audioFeatures.speechDetected) activities.push('Speaking');

    if (activities.length === 0) {
      const prefix = personCount > 1 ? `${personCount} people — ` : '';
      return { activity: prefix + 'Standing/Moving', distressLevel: 'none' };
    }

    const prefix = personCount > 1 ? `${personCount} people — ` : '';
    return { activity: prefix + activities.slice(0, 3).join(' • '), distressLevel: 'none' };
  }

  return { activity: distressActivities.join(' | '), distressLevel };
}

export default function FusedDetectionView({
  sourceCanvas,
  objects,
  audioFeatures,
  attentionScore,
  saliencyScore,
  active,
  transcript,
  interimTranscript,
  speechListening,
  audioMessage,
  audioTone,
  audioDiagnostic,

  onToggleSpeech,
  fireBbox,
  fireFrameWidth,
  fireFrameHeight,
  cctvAudioEnabled = false,
  cctvAudioAvailable = false,
  onToggleCctvAudio,
  talking = false,
  talkError,
  onTalkStart,
  onTalkStop,
}: FusedDetectionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activity, setActivity] = useState('No activity detected');
  const [distressLevel, setDistressLevel] = useState<'none' | 'warning' | 'critical'>('none');

  // Update activity & distress inference
  useEffect(() => {
    const result = inferDistress(objects, audioFeatures, transcript);
    setActivity(result.activity);
    setDistressLevel(result.distressLevel);
  }, [objects, audioFeatures, transcript]);

  // Render loop
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const w = canvas.width;
      const h = canvas.height;

      if (sourceCanvas && sourceCanvas.width > 0) {
        ctx.drawImage(sourceCanvas, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
      }

      // High-contrast mode: thicker strokes, pure hues, solid label plates
      const hc = document.documentElement.classList.contains('hc');

      // Draw bounding boxes with enhanced styling
      objects.forEach(obj => {
        const [bx, by, bw, bh] = obj.bbox;
        const sx = w / (sourceCanvas?.width || w);
        const sy = h / (sourceCanvas?.height || h);
        const dx = bx * sx;
        const dy = by * sy;
        const dw = bw * sx;
        const dh = bh * sy;

        const boxColor = hc
          ? (obj.confidence > 0.8 ? '#00ffff' : obj.confidence > 0.5 ? '#ffff00' : '#ff0000')
          : (obj.confidence > 0.8 ? '#00e5ff' : obj.confidence > 0.5 ? '#ffab00' : '#ff1744');

        if (hc) {
          // black halo underneath so the box reads on any background
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 7;
          ctx.strokeRect(dx, dy, dw, dh);
        }

        ctx.shadowColor = boxColor;
        ctx.shadowBlur = hc ? 0 : 8;
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = hc ? 4 : 2;
        ctx.strokeRect(dx, dy, dw, dh);
        ctx.shadowBlur = 0;

        const cornerLen = Math.min(dw, dh) * 0.2;
        ctx.lineWidth = hc ? 6 : 3;
        ctx.beginPath(); ctx.moveTo(dx, dy + cornerLen); ctx.lineTo(dx, dy); ctx.lineTo(dx + cornerLen, dy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx + dw - cornerLen, dy); ctx.lineTo(dx + dw, dy); ctx.lineTo(dx + dw, dy + cornerLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx, dy + dh - cornerLen); ctx.lineTo(dx, dy + dh); ctx.lineTo(dx + cornerLen, dy + dh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx + dw - cornerLen, dy + dh); ctx.lineTo(dx + dw, dy + dh); ctx.lineTo(dx + dw, dy + dh - cornerLen); ctx.stroke();

        const labelText = `${obj.label} ${(obj.confidence * 100).toFixed(0)}%`;
        const labelSize = hc ? 16 : 11;
        ctx.font = `bold ${labelSize}px "JetBrains Mono", monospace`;
        const tm = ctx.measureText(labelText);
        const labelH = labelSize + 8;
        ctx.fillStyle = hc ? '#000000' : 'rgba(0,0,0,0.8)';
        ctx.fillRect(dx, dy - labelH, tm.width + 12, labelH);
        if (hc) {
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(dx, dy - labelH, tm.width + 12, labelH);
        }
        ctx.fillStyle = boxColor;
        ctx.fillText(labelText, dx + 6, dy - 6);
      });

      // Fire saliency box — draws a pulsing red highlight over the flame region
      if (fireBbox) {
        const [fx, fy, fw2, fh2] = fireBbox;
        const srcW = fireFrameWidth || sourceCanvas?.width || w;
        const srcH = fireFrameHeight || sourceCanvas?.height || h;
        const sx = w / srcW;
        const sy = h / srcH;
        const dx = fx * sx;
        const dy = fy * sy;
        const dw = fw2 * sx;
        const dh = fh2 * sy;
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
        const fireColor = hc ? '#ff0000' : '#ff2a2a';
        ctx.save();
        if (hc) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 9;
          ctx.strokeRect(dx, dy, dw, dh);
        }
        ctx.strokeStyle = fireColor;
        ctx.shadowColor = fireColor;
        ctx.shadowBlur = hc ? 0 : 20 * pulse + 8;
        ctx.lineWidth = hc ? 6 : 3;
        ctx.strokeRect(dx, dy, dw, dh);
        ctx.fillStyle = hc
          ? `rgba(255,0,0,${0.25 + 0.15 * pulse})`
          : `rgba(255,42,42,${0.15 + 0.15 * pulse})`;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.shadowBlur = 0;
        const fSize = hc ? 18 : 12;
        ctx.font = `bold ${fSize}px "JetBrains Mono", monospace`;
        const flabel = 'FIRE';
        const ftm = ctx.measureText(flabel);
        const fH = fSize + 8;
        ctx.fillStyle = fireColor;
        ctx.fillRect(dx, dy - fH, ftm.width + 12, fH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(flabel, dx + 6, dy - 6);
        ctx.restore();
      }


      const actBarH = 28;
      const barColor = distressLevel === 'critical' ? 'rgba(220,38,38,0.85)' : distressLevel === 'warning' ? 'rgba(234,179,8,0.85)' : 'rgba(0,0,0,0.75)';
      ctx.fillStyle = barColor;
      ctx.fillRect(0, h - actBarH, w, actBarH);
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = distressLevel !== 'none' ? '#ffffff' : '#00e5ff';
      ctx.fillText(activity, 8, h - 10);

      // Attention score badge
      const scoreText = `ATT: ${attentionScore}`;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      const stm = ctx.measureText(scoreText);
      const scoreColor = attentionScore > 70 ? '#ff1744' : attentionScore > 40 ? '#ffab00' : '#00e676';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(w - stm.width - 16, 24, stm.width + 12, 20);
      ctx.fillStyle = scoreColor;
      ctx.fillText(scoreText, w - stm.width - 10, 39);

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(w - 70, 46, 66, 16);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`${objects.length} objects`, w - 64, 57);

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [active, sourceCanvas, objects, activity, attentionScore, distressLevel, fireBbox, fireFrameWidth, fireFrameHeight]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div id="tour-fused-view" ref={containerRef} className="relative bg-card rounded-md overflow-hidden border border-border panel-glow group flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
        <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">
          CAM 1 — Fused Detection
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent/20 text-accent">AI+DISTRESS</span>
          {distressLevel === 'critical' && (
            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-destructive/80 text-destructive-foreground animate-pulse">ALERT</span>
          )}
          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success' : 'bg-destructive'}`} />
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full aspect-video object-contain bg-background"
      />

      {/* Live CCTV transcription with a plain-language reason when silent. */}
      {(
        <div
          id="tour-live-transcription"
          className="absolute left-2 top-8 z-10 max-w-[70%] rounded-md border border-border bg-background/85 px-2.5 py-1.5"
          role="status"
          aria-live="polite"
        >
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Mic className="h-3 w-3" /> Live transcription
          </div>
          <p className="max-h-24 overflow-y-auto text-[13px] leading-snug text-foreground">
            {transcript}
            {interimTranscript && (
              <span className="text-muted-foreground">{transcript ? ' ' : ''}{interimTranscript}</span>
            )}
            {!transcript && !interimTranscript && (
              <span className={audioTone === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                {audioMessage || (speechListening ? 'Listening… no speech yet' : 'Listening is off')}
              </span>
            )}
          </p>
          {audioDiagnostic && (
            <p className="mt-1 text-[10px] font-mono text-muted-foreground">{audioDiagnostic}</p>
          )}
        </div>
      )}



      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-2 right-2 z-20 p-1.5 rounded bg-background/70 hover:bg-background border border-border hover:border-primary/50 transition-all group-hover:opacity-100 opacity-60"
        title={isFullscreen ? 'Exit fullscreen' : 'Fit to screen'}
      >
        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-primary" /> : <Maximize2 className="w-3.5 h-3.5 text-primary" />}
      </button>

      {/* CCTV speaker toggle — hear the camera's own audio */}
      <button
        onClick={() => onToggleCctvAudio?.()}
        disabled={!cctvAudioAvailable}
        className={`absolute bottom-2 right-[4.5rem] z-20 p-1.5 rounded border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          cctvAudioEnabled
            ? 'bg-primary/20 border-primary/60'
            : 'bg-background/70 border-border hover:border-primary/50'
        }`}
        title={
          !cctvAudioAvailable
            ? 'Connect a CCTV stream to hear its audio'
            : cctvAudioEnabled
              ? 'Speaker ON — you hear the camera. Muting only stops playback; wake-word listening keeps running.'
              : 'Speaker OFF (playback muted). Wake-word listening and audio analysis keep running.'
        }
        aria-label="Toggle CCTV speaker playback (does not affect microphone listening)"
        aria-pressed={cctvAudioEnabled}

      >
        {cctvAudioEnabled
          ? <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse" />
          : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {/* Push-to-talk — speak out of the CCTV speaker */}
      <button
        onMouseDown={() => onTalkStart?.()}
        onMouseUp={() => onTalkStop?.()}
        onMouseLeave={() => talking && onTalkStop?.()}
        onTouchStart={e => { e.preventDefault(); onTalkStart?.(); }}
        onTouchEnd={e => { e.preventDefault(); onTalkStop?.(); }}
        className={`absolute bottom-2 right-10 z-20 p-1.5 rounded border transition-all ${
          talking
            ? 'bg-destructive/30 border-destructive'
            : speechListening
              ? 'bg-success/20 border-success/50'
              : 'bg-background/70 border-border hover:border-primary/50'
        }`}
        title={
          talkError
            ? `Talk failed: ${talkError}`
            : talking
              ? 'Release to send your voice to the CCTV speaker'
              : 'Hold to talk — your voice plays out of the CCTV speaker'
        }
        aria-label="Hold to talk through the CCTV speaker"
        aria-pressed={talking}
      >
        {talking ? (
          <Mic className="w-3.5 h-3.5 text-destructive animate-pulse" />
        ) : speechListening ? (
          <Mic className="w-3.5 h-3.5 text-success" />
        ) : (
          <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Status badges */}
      <div className="absolute bottom-2 left-1 z-10 flex gap-1">
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
          active ? 'bg-success/20 text-success' : 'bg-muted/50 text-muted-foreground'
        }`}>
          {active ? 'FUSED' : 'OFFLINE'}
        </span>
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
          distressLevel === 'critical' ? 'bg-destructive/20 text-destructive animate-pulse' :
          attentionScore > 70 ? 'bg-destructive/20 text-destructive' :
          attentionScore > 40 ? 'bg-warning/20 text-warning' :
          'bg-success/20 text-success'
        }`}>
          α:{attentionScore}
        </span>
      </div>

      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-xs font-mono text-muted-foreground">NO SIGNAL</span>
        </div>
      )}
    </div>
  );
}
