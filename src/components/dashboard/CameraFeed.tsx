import { useRef, useEffect, useState, useCallback } from 'react';
import type { CameraState, SaliencyMode, DetectedObject } from '@/types/dashboard';
import { computeSaliency, applyHeatmapColor, computeSaliencyScore } from '@/lib/saliency';
import { RateLimiter, LatestOnlyRunner, ThrottledPublisher, perfMonitor, now as perfNow } from '@/lib/performance';


interface DetectionStats {
  totalDetected: number;
  filteredPriority: number;
  modelLoaded: boolean;
  modelLoading: boolean;
  modelError: string | null;
}

interface CameraFeedProps {
  camera: CameraState;
  mirror: boolean;
  showBoundingBoxes: boolean;
  showHeatmap: boolean;
  heatmapOpacity: number;
  saliencyMode: SaliencyMode;
  threshold: number;
  simulationMode: boolean;
  priorityObjects: string[];
  detectionStats: DetectionStats;
  onFpsUpdate: (cameraId: number, fps: number) => void;
  onObjectsUpdate: (cameraId: number, objects: DetectedObject[]) => void;
  onSaliencyScoreUpdate: (cameraId: number, score: number) => void;
  onFrameCapture?: (canvas: HTMLCanvasElement) => void;
  onDetectFrame?: (video: HTMLVideoElement) => Promise<DetectedObject[]>;
  noSignalMessage?: string;
}

export default function CameraFeed({
  camera,
  mirror,
  showBoundingBoxes,
  showHeatmap,
  heatmapOpacity,
  saliencyMode,
  threshold,
  simulationMode,
  priorityObjects,
  detectionStats,
  onFpsUpdate,
  onObjectsUpdate,
  onSaliencyScoreUpdate,
  onFrameCapture,
  onDetectFrame,
  noSignalMessage,
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const fpsCountRef = useRef(0);
  const fpsTimeRef = useRef(perfNow());
  const animRef = useRef<number>(0);
  const detectedObjectsRef = useRef<DetectedObject[]>([]);
  const [simObjects] = useState<DetectedObject[]>(() => {
    if (!simulationMode) return [];
    return [
      { label: 'person', confidence: 0.92, bbox: [50, 30, 120, 200] },
      { label: 'laptop', confidence: 0.85, bbox: [200, 150, 100, 80] },
      { label: 'cup', confidence: 0.73, bbox: [320, 180, 40, 50] },
    ];
  });

  // Latest callbacks/settings kept in refs so the render loop never has to be
  // torn down and rebuilt when a parent re-renders.
  const cbRef = useRef({ onFpsUpdate, onObjectsUpdate, onSaliencyScoreUpdate, onFrameCapture, onDetectFrame, mirror, saliencyMode, threshold });
  cbRef.current = { onFpsUpdate, onObjectsUpdate, onSaliencyScoreUpdate, onFrameCapture, onDetectFrame, mirror, saliencyMode, threshold };

  // Set stream on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !camera.stream) return;
    video.srcObject = camera.stream;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [camera.stream, camera.label]);

  // Single render/analysis loop.
  //  - display: every animation frame (smooth video)
  //  - saliency: throttled to the saliency target rate
  //  - object detection: throttled, latest-frame-only (no backlog)
  //  - React updates: coalesced through throttled publishers
  useEffect(() => {
    if (!camera.active && !simulationMode) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;
    const cameraId = camera.id;

    const saliencyLimiter = new RateLimiter(perfMonitor.rateFor('saliency'));
    const objectLimiter = new RateLimiter(perfMonitor.rateFor('object'));

    const saliencyPublisher = new ThrottledPublisher<number>(score => {
      cbRef.current.onSaliencyScoreUpdate(cameraId, score);
    });
    const objectsPublisher = new ThrottledPublisher<DetectedObject[]>(objs => {
      cbRef.current.onObjectsUpdate(cameraId, objs);
    });

    // Object detection consumes the newest frame only; if a detection is still
    // running when the next slot comes up, the stale frame is dropped.
    const detectRunner = new LatestOnlyRunner<HTMLVideoElement, DetectedObject[]>(
      async src => (await cbRef.current.onDetectFrame?.(src)) ?? [],
      (objs, latency) => {
        detectedObjectsRef.current = objs;
        objectsPublisher.push(objs);
        perfMonitor.markAiFrame(latency);
      },
    );

    let lastDropped = 0;
    let capturedOnce = false;

    const render = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;
      const t = perfNow();
      const { mirror: mirrored, saliencyMode: mode, threshold: thr } = cbRef.current;

      // --- Display: draw video frame or simulation every rAF tick ---
      if (video && video.readyState >= 2) {
        ctx.save();
        if (mirrored) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else if (simulationMode) {
        const ts = t / 1000;
        const imgData = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const nx = x / w;
            const ny = y / h;
            const v1 = Math.sin(nx * 20 + ts * 1.5) * Math.cos(ny * 15 + ts * 0.9);
            const v2 = Math.sin((nx + ny) * 12 + ts * 2) * 0.5;
            const v3 = Math.cos(nx * 8 - ny * 6 + ts * 1.2) * 0.3;
            const v = (v1 + v2 + v3) * 0.5 + 0.5;
            const brightness = Math.floor(v * 220 + 20);
            imgData.data[i] = Math.floor(brightness * 0.4);
            imgData.data[i + 1] = Math.floor(brightness * 0.7);
            imgData.data[i + 2] = brightness;
            imgData.data[i + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
      perfMonitor.markVideoFrame();

      // --- Saliency: throttled, shares this already-drawn canvas ---
      saliencyLimiter.setFps(perfMonitor.rateFor('saliency'));
      if (saliencyLimiter.shouldRun(t)) {
        try {
          const started = perfNow();
          const frameData = ctx.getImageData(0, 0, w, h);
          const saliencyData = computeSaliency(frameData, prevFrameRef.current, mode, thr);
          prevFrameRef.current = frameData;
          saliencyPublisher.push(computeSaliencyScore(saliencyData));
          perfMonitor.markAiFrame(perfNow() - started);
        } catch {}
      }

      // --- Object detection: throttled + latest-frame-only ---
      if (!simulationMode && video && cbRef.current.onDetectFrame) {
        objectLimiter.setFps(perfMonitor.rateFor('object'));
        if (video.readyState >= 2 && objectLimiter.shouldRun(t)) {
          detectRunner.submit(video);
          if (detectRunner.dropped !== lastDropped) {
            perfMonitor.markDropped(detectRunner.dropped - lastDropped);
            lastDropped = detectRunner.dropped;
          }
        }
      }

      // Publish the shared source canvas once — the reference never changes,
      // so re-emitting it every frame only produced wasted work.
      if (!capturedOnce) {
        capturedOnce = true;
        cbRef.current.onFrameCapture?.(canvas);
      }

      // Simulation mode: still report objects for other panels (throttled)
      if (simulationMode && simObjects.length > 0) {
        objectsPublisher.push(simObjects);
      }

      // FPS counter — published at most once per second
      fpsCountRef.current++;
      if (t - fpsTimeRef.current >= 1000) {
        cbRef.current.onFpsUpdate(cameraId, fpsCountRef.current);
        fpsCountRef.current = 0;
        fpsTimeRef.current = t;
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      detectRunner.cancelPending();
      saliencyPublisher.dispose();
      objectsPublisher.dispose();
      prevFrameRef.current = null;
    };
  }, [camera.active, camera.id, simulationMode, simObjects]);


  return (
    <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow group">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
          CAM {camera.id} — Raw Feed
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            {camera.fps} FPS
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${camera.active || simulationMode ? 'bg-success' : 'bg-destructive'}`} />
        </div>
      </div>

      {/* Video (hidden, used as source) */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />

      {/* Canvas (displayed) — clean raw feed */}
      <canvas
        ref={canvasRef}
        width={camera.active ? 640 : 320}
        height={camera.active ? 480 : 240}
        className="w-full h-full object-contain aspect-video bg-background"
      />

      {/* Status badges */}
      <div className="absolute bottom-1 left-1 z-10 flex gap-1">
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
          detectionStats.modelLoaded ? 'bg-success/20 text-success' :
          detectionStats.modelLoading ? 'bg-warning/20 text-warning' :
          'bg-muted/50 text-muted-foreground'
        }`}>
          {detectionStats.modelLoading ? 'LOADING…' : detectionStats.modelLoaded ? 'MODEL OK' : 'NO MODEL'}
        </span>
        {detectionStats.modelLoaded && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-secondary/60 text-secondary-foreground">
            {detectionStats.filteredPriority}/{detectionStats.totalDetected} obj
          </span>
        )}
      </div>

      {/* Saliency score badge */}
      <div className="absolute bottom-1 right-1 z-10">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          camera.saliencyScore > 60 ? 'bg-destructive/80 text-destructive-foreground' :
          camera.saliencyScore > 30 ? 'bg-warning/80 text-warning-foreground' :
          'bg-secondary/80 text-secondary-foreground'
        }`}>
          S:{camera.saliencyScore}
        </span>
      </div>

      {detectionStats.modelError && (
        <div className="absolute top-8 left-1 right-1 z-10">
          <span className="text-[9px] font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded block truncate">
            ⚠ {detectionStats.modelError}
          </span>
        </div>
      )}

      {!camera.active && !simulationMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center">
          <span className="text-xs font-mono text-muted-foreground">
            {noSignalMessage ?? 'NO SIGNAL'}
          </span>
        </div>
      )}
    </div>
  );
}
