import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { detectObjects, loadDetector } from '@/lib/detectionEngine';
import { computeSaliency, computeSaliencyScore } from '@/lib/saliency';
import { createFireState, detectFire } from '@/lib/fireDetection';
import { describeAudioStatus, getAudioEvents } from '@/lib/multiCamServer';
import { useFaceDistress } from '@/hooks/useFaceDistress';
import type {
  CameraConfig, CameraRuntime, DetectionEvent, MultiCamSettings,
} from '@/types/multicam';
import { hlsUrlFor } from '@/types/multicam';

const HUMAN_LABELS = new Set(['person']);
/** Live CCTV text disappears this long after the last words were heard. */
const TRANSCRIPT_CLEAR_MS = 5000;

const emptyRuntime = (cameraId: string): CameraRuntime => ({
  cameraId,
  status: 'offline',
  error: null,
  fps: 0,
  latencyMs: 0,
  saliencyScore: 0,
  attentionScore: 0,
  objects: [],
  humanCount: 0,
  fire: { detected: false, confidence: 0 },
  smoke: { detected: false, confidence: 0 },
  faceDistress: { detected: false, label: '', confidence: 0 },
  audioDistress: { detected: false, keyword: '', confidence: 0, transcript: '' },
  transcript: '',
  audioListening: false,
  audio: null,
  audioMessage: 'Connect this camera to start listening.',
  audioTone: 'wait',
  audioBackendReachable: true,
  lastDetectionAt: null,
  detections: 0,
  alerts: 0,
});


interface Options {
  camera: CameraConfig;
  settings: MultiCamSettings;
  onEvent?: (evt: Omit<DetectionEvent, 'id'>) => void;
}

/**
 * One fully independent Multimodal Saliency Detection pipeline per camera:
 * its own HLS player, frame queue, fire/saliency state, face session,
 * Whisper audio polling, statistics and fault-tolerant reconnect.
 */
export function useCameraPipeline({ camera, settings, onEvent }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fireStateRef = useRef(createFireState());
  const prevFrameRef = useRef<ImageData | null>(null);
  const busyRef = useRef(false);
  const framesRef = useRef(0);
  const lastFpsRef = useRef(Date.now());
  const lastAudioRef = useRef<string | undefined>(undefined);
  const lastShownRef = useRef<string>('');
  const clearTimerRef = useRef<number | undefined>(undefined);

  const cooldownRef = useRef<Record<string, number>>({});
  const retryRef = useRef(0);
  const runtimeRef = useRef<CameraRuntime>(emptyRuntime(camera.id));

  const [runtime, setRuntime] = useState<CameraRuntime>(() => emptyRuntime(camera.id));
  const [nonce, setNonce] = useState(0);
  const face = useFaceDistress(camera.enabled && camera.aiEnabled);

  const patch = useCallback((p: Partial<CameraRuntime>) => {
    runtimeRef.current = { ...runtimeRef.current, ...p };
    setRuntime(runtimeRef.current);
  }, []);

  /** Newest Whisper sentence replaces the old one and clears after 5 s. */
  const showTranscript = useCallback((text: string) => {
    patch({ transcript: text });
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => patch({ transcript: '' }), TRANSCRIPT_CLEAR_MS);
  }, [patch]);

  useEffect(() => () => { if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current); }, []);

  const snapshot = useCallback(() => {
    const c = workRef.current;
    try { return c ? c.toDataURL('image/jpeg', 0.5) : undefined; } catch { return undefined; }
  }, []);

  const emit = useCallback(
    (type: DetectionEvent['type'], label: string, confidence: number, withSnapshot = true) => {
      const now = Date.now();
      const key = `${type}:${label}`;
      if (cooldownRef.current[key] && now - cooldownRef.current[key] < 15000) return;
      cooldownRef.current[key] = now;
      runtimeRef.current.alerts += 1;
      onEvent?.({
        cameraId: camera.id,
        cameraName: camera.name,
        location: camera.location,
        type,
        label,
        confidence,
        timestamp: new Date().toISOString(),
        snapshot: withSnapshot ? snapshot() : undefined,
      });
    },
    [camera.id, camera.name, camera.location, onEvent, snapshot],
  );

  // ---- Stream: independent HLS session, auto-reconnect on failure ----------
  const url = hlsUrlFor(camera, settings);

  useEffect(() => {
    if (!camera.enabled) {
      patch({ status: 'offline', error: null });
      return;
    }
    let cancelled = false;
    let retryTimer: number | undefined;
    patch({ status: 'connecting', error: null });

    const attach = () => {
      const video = videoRef.current;
      if (!video || cancelled) return;
      const t0 = performance.now();

      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: false,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          manifestLoadingTimeOut: 12000,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 8,
          fragLoadingRetryDelay: 1000,
          maxBufferLength: 12,
          backBufferLength: 6,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          retryRef.current = 0;
          patch({ status: 'online', error: null, latencyMs: Math.round(performance.now() - t0) });
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal || cancelled) return;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            patch({ status: 'connecting', error: 'Recovering video playback…' });
            hls.recoverMediaError();
            return;
          }
          // Fault tolerance: only THIS camera reconnects after HLS.js exhausts its own retries.
          patch({ status: 'connecting', error: 'Waiting for camera stream…' });
          hls.destroy();
          hlsRef.current = null;
          retryRef.current += 1;
          retryTimer = window.setTimeout(attach, Math.min(15000, 1500 * retryRef.current));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().then(() => patch({ status: 'online' })).catch(() => {
          patch({ status: 'error', error: 'Playback blocked' });
        });
      } else {
        patch({ status: 'error', error: 'HLS unsupported in this browser' });
      }
    };

    attach();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      const v = videoRef.current;
      if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    };
  }, [url, camera.enabled, nonce, patch]);

  // ---- FPS counter ---------------------------------------------------------
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastFpsRef.current) / 1000;
      const fps = elapsed > 0 ? Math.round(framesRef.current / elapsed) : 0;
      framesRef.current = 0;
      lastFpsRef.current = now;
      patch({ fps });
    }, 1000);
    return () => window.clearInterval(id);
  }, [patch]);

  // ---- Detection loop (independent per camera) -----------------------------
  useEffect(() => {
    if (!camera.enabled || !camera.aiEnabled) return;
    let stopped = false;
    void loadDetector().catch(() => {});

    if (!workRef.current) workRef.current = document.createElement('canvas');

    const tick = async () => {
      if (stopped || busyRef.current) return;
      const video = videoRef.current;
      const canvas = workRef.current;
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;
      busyRef.current = true;
      const started = performance.now();
      try {
        const w = 320;
        const h = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * 320));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        framesRef.current += 1;

        const frame = ctx.getImageData(0, 0, w, h);

        // Objects + humans
        const objects = await detectObjects(canvas, settings.objectThreshold);
        const humanCount = objects.filter(o => HUMAN_LABELS.has(o.label)).length;

        // Saliency
        const sal = computeSaliency(frame, prevFrameRef.current, 'sobel', 40);
        prevFrameRef.current = frame;
        const saliencyScore = computeSaliencyScore(sal);
        const objectScore = objects.length > 0
          ? Math.max(...objects.map(object => object.confidence * 100))
          : 0;
        const audioScore = runtimeRef.current.audioDistress.detected
          ? runtimeRef.current.audioDistress.confidence * 100
          : 0;
        const attentionScore = Math.min(100, Math.round(
          0.5 * saliencyScore + 0.3 * objectScore + 0.2 * audioScore,
        ));

        // Fire + smoke (own detector state -> own temporal smoothing)
        const fire = detectFire(frame, fireStateRef.current, objects);

        // Facial expression
        await face.analyze(canvas);

        patch({
          objects,
          humanCount,
          saliencyScore,
          attentionScore,
          fire: {
            detected: fire.fireDetected && fire.confidence >= settings.fireThreshold,
            confidence: fire.confidence,
            bbox: fire.smoothedBbox,
          },
          smoke: { detected: fire.smokeEmergency, confidence: fire.smokeRatio },
          lastDetectionAt: new Date().toISOString(),
          detections: runtimeRef.current.detections + objects.length,
          latencyMs: Math.round(performance.now() - started),
        });

        if (objects.length) emit('object', objects[0].label, objects[0].confidence, false);
        if (humanCount > 0) emit('human', `${humanCount} person(s)`, 0.9, false);
        if (fire.fireDetected && fire.confidence >= settings.fireThreshold) emit('fire', 'Fire detected', fire.confidence);
        if (fire.smokeEmergency) emit('smoke', 'Smoke / low visibility', fire.smokeRatio);
        if (saliencyScore > 70) emit('saliency', `High saliency (${saliencyScore})`, saliencyScore / 100, false);
        if (attentionScore > 70) emit('saliency', `High attention (${attentionScore})`, attentionScore / 100, false);
      } catch {
        /* keep this camera alive */
      } finally {
        busyRef.current = false;
      }
    };

    const id = window.setInterval(tick, 350);
    return () => { stopped = true; window.clearInterval(id); };
  }, [camera.enabled, camera.aiEnabled, settings.objectThreshold, settings.fireThreshold, face, patch, emit]);

  // Facial distress -> runtime + event
  useEffect(() => {
    const d = face.distress;
    const detected = d.hasFace && d.distressLevel !== 'none';
    patch({
      faceDistress: {
        detected,
        label: d.expression ?? '',
        confidence: d.distressScore / 100,
      },
    });
    if (d.distressLevel === 'severe') emit('face-distress', d.expression || 'distress', d.distressScore / 100);
  }, [face.distress, patch, emit]);

  // ---- Audio: RTSP audio -> ffmpeg -> Whisper on the backend ---------------
  // The browser never opens a microphone. Listening runs whenever the camera is
  // connected, independently of the AI detection switch.
  useEffect(() => {
    if (!camera.enabled) {
      patch({
        audioListening: false,
        audioMessage: 'Connect this camera to start listening.',
        audioTone: 'wait',
      });
      return;
    }
    let stopped = false;
    let inFlight = false;
    patch({ audioListening: true, audioMessage: 'Starting to listen…', audioTone: 'wait' });

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { events, status } = await getAudioEvents(
          settings.pythonServer, camera.id, lastAudioRef.current,
        );
        if (stopped) return;
        const described = describeAudioStatus(status, true);
        patch({
          audio: status,
          audioBackendReachable: true,
          audioMessage: described.message,
          audioTone: described.tone,
        });

        // New events are authoritative; when a poll brings none but the backend
        // already holds a transcript we still show it, so the panel is never
        // stuck on "no speech yet" while the backend has words.
        const fresh = events ?? [];
        if (fresh.length) {
          lastAudioRef.current = fresh[fresh.length - 1].timestamp;
          const spoken = fresh.map(e => e.transcript).filter(Boolean).join(' ').trim();
          if (spoken && spoken !== lastShownRef.current) {
            lastShownRef.current = spoken;
            showTranscript(spoken);
          }
          for (const e of fresh) {
            if (e.confidence < settings.audioThreshold) continue;
            patch({
              audioDistress: {
                detected: true, keyword: e.keyword, confidence: e.confidence, transcript: e.transcript,
              },
            });
            emit('audio-distress', e.keyword || e.transcript, e.confidence);
          }
        } else if (
          status?.last_transcript
          && !runtimeRef.current.transcript
          && status.last_transcript !== lastShownRef.current
        ) {
          lastShownRef.current = status.last_transcript;
          showTranscript(status.last_transcript);
        }
      } catch (err) {
        if (stopped) return;
        const message = err instanceof Error ? err.message : String(err);
        const described = describeAudioStatus(null, false);
        patch({
          audioBackendReachable: false,
          audioMessage: `${described.message} (${message})`,
          audioTone: 'error',
        });
      } finally {
        inFlight = false;
      }
    };

    const id = window.setInterval(poll, 1500);
    void poll();
    return () => { stopped = true; window.clearInterval(id); patch({ audioListening: false }); };
  }, [camera.enabled, camera.id, settings.pythonServer, settings.audioThreshold, patch, emit, showTranscript]);


  const reconnect = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    retryRef.current = 0;
    patch({ status: 'connecting', error: null });
    setNonce(n => n + 1);
  }, [patch]);

  return { videoRef, runtime, reconnect, streamUrl: url, faceReady: face.ready };
}
