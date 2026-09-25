import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

// Loads pretrained face detection + expression models from a CDN.
// Models are trained on a massive FER+ / AffectNet-style dataset.
// We map the 7 base expressions into a single "distress level".

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model';

export type FaceDistress = {
  hasFace: boolean;
  expression: string | null;     // dominant expression
  probability: number;           // 0..1
  distressScore: number;         // 0..100, how distressed the person is
  distressLevel: 'none' | 'mild' | 'severe';
};

const EMPTY: FaceDistress = {
  hasFace: false,
  expression: null,
  probability: 0,
  distressScore: 0,
  distressLevel: 'none',
};

let modelLoadPromise: Promise<void> | null = null;
function loadModels(): Promise<void> {
  if (modelLoadPromise) return modelLoadPromise;
  modelLoadPromise = (async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  })();
  return modelLoadPromise;
}

export function useFaceDistress(active: boolean) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distress, setDistress] = useState<FaceDistress>(EMPTY);
  const busyRef = useRef(false);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    loadModels()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(err => {
        console.error('[FaceDistress] Failed to load models:', err);
        if (!cancelled) setError(err?.message || 'Failed to load face models');
      });
    return () => { cancelled = true; };
  }, [active]);

  const analyze = useCallback(async (source: HTMLCanvasElement | HTMLVideoElement | null) => {
    if (!ready || !source || busyRef.current) return;
    busyRef.current = true;
    try {
      const detections = await faceapi
        .detectAllFaces(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceExpressions();

      if (!detections.length) {
        setDistress(EMPTY);
        return;
      }

      // Pick the largest face
      const main = detections.reduce((biggest, d) => {
        const a = d.detection.box.area;
        return a > biggest.detection.box.area ? d : biggest;
      });

      const expr = main.expressions as unknown as Record<string, number>;
      // Distress = sad + fearful + angry + disgusted ; positive = happy + surprised + neutral
      const sad = expr.sad ?? 0;
      const fearful = expr.fearful ?? 0;
      const angry = expr.angry ?? 0;
      const disgusted = expr.disgusted ?? 0;
      const distressRaw = sad * 1.0 + fearful * 1.4 + angry * 0.8 + disgusted * 0.7;
      const instant = Math.min(100, Math.round(distressRaw * 100));
      // Temporal smoothing — rolling avg over last 5 samples to suppress flicker
      historyRef.current.push(instant);
      if (historyRef.current.length > 5) historyRef.current.shift();
      const distressScore = Math.round(
        historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length
      );

      let dominant = 'neutral';
      let dominantProb = 0;
      for (const [k, v] of Object.entries(expr)) {
        if (v > dominantProb) { dominantProb = v; dominant = k; }
      }

      setDistress({
        hasFace: true,
        expression: dominant,
        probability: dominantProb,
        distressScore,
        distressLevel: distressScore > 55 ? 'severe' : distressScore > 25 ? 'mild' : 'none',
      });
    } catch (err) {
      console.error('[FaceDistress] analyze error:', err);
    } finally {
      busyRef.current = false;
    }
  }, [ready]);

  return { ready, error, distress, analyze };
}