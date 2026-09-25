import { useRef, useState, useCallback, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import type { DetectedObject } from '@/types/dashboard';

// No hardcoded filter — use priorityObjects param from caller

const MIN_CONFIDENCE = 0.2;

type Box = [number, number, number, number];

function iou(a: Box, b: Box) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter <= 0) return 0;
  return inter / (a[2] * a[3] + b[2] * b[3] - inter);
}

/** Greedy non-maximum suppression, applied per class, plus cross-class
 *  suppression of heavily overlapping duplicates (keeps the higher score). */
function nms(dets: DetectedObject[], sameClassIou = 0.4, crossClassIou = 0.85): DetectedObject[] {
  const sorted = [...dets].sort((a, b) => b.confidence - a.confidence);
  const kept: DetectedObject[] = [];
  for (const d of sorted) {
    const dup = kept.some(k =>
      iou(k.bbox, d.bbox) > (k.label === d.label ? sameClassIou : crossClassIou)
    );
    if (!dup) kept.push(d);
  }
  return kept;
}

/** Drop degenerate/implausible boxes (slivers, full-frame blobs). */
function isPlausible(d: DetectedObject, w: number, h: number) {
  const [, , bw, bh] = d.bbox;
  if (bw < 8 || bh < 8) return false;
  const area = (bw * bh) / (w * h || 1);
  if (area > 0.97) return false;
  const ratio = bw / bh;
  if (ratio > 12 || ratio < 1 / 12) return false;
  return true;
}


interface DetectionStats {
  totalDetected: number;
  filteredPriority: number;
  modelLoaded: boolean;
  modelLoading: boolean;
  modelError: string | null;
}

export function useObjectDetection() {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [stats, setStats] = useState<DetectionStats>({
    totalDetected: 0,
    filteredPriority: 0,
    modelLoaded: false,
    modelLoading: false,
    modelError: null,
  });
  const detectingRef = useRef(false);
  const prevDetsRef = useRef<DetectedObject[]>([]);

  const loadModel = useCallback(async () => {
    if (modelRef.current || stats.modelLoading) return;
    setStats(prev => ({ ...prev, modelLoading: true, modelError: null }));
    try {
      console.log('[ObjectDetection] Loading COCO-SSD model...');
      const model = await cocoSsd.load({ base: 'mobilenet_v2' });
      modelRef.current = model;
      console.log('[ObjectDetection] Model loaded successfully.');
      setStats(prev => ({ ...prev, modelLoaded: true, modelLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading model';
      console.error('[ObjectDetection] Model load failed:', message);
      setStats(prev => ({ ...prev, modelLoading: false, modelError: message }));
    }
  }, [stats.modelLoading]);

  const detect = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement,
    priorityObjects: string[] = [],
    minConfidence: number = MIN_CONFIDENCE,
  ): Promise<DetectedObject[]> => {
    const model = modelRef.current;
    if (!model || detectingRef.current) return [];

    // Check if video is ready
    if (source instanceof HTMLVideoElement && source.readyState < 2) return [];

    detectingRef.current = true;
    try {
      const predictions = await model.detect(source, 40, Math.max(0.05, minConfidence * 0.6));
      const totalDetected = predictions.length;

      const w = 'videoWidth' in source ? source.videoWidth : source.width;
      const h = 'videoHeight' in source ? source.videoHeight : source.height;

      // 1. Confidence + priority-class filter
      let dets: DetectedObject[] = predictions
        .filter(p =>
          p.score >= minConfidence &&
          (priorityObjects.length === 0 || priorityObjects.includes(p.class))
        )
        .map(p => ({
          label: p.class,
          confidence: p.score,
          bbox: [p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]] as [number, number, number, number],
        }));

      // 2. Geometry sanity + non-maximum suppression (removes duplicate/nested boxes)
      dets = nms(dets.filter(d => isPlausible(d, w, h)));

      // 3. Temporal gating + box smoothing: a box must either be confident or
      //    have been seen in the previous frame, and its position is smoothed
      //    with an EMA so the overlay does not jitter.
      const prev = prevDetsRef.current;
      const stable: DetectedObject[] = [];
      for (const d of dets) {
        const match = prev.find(p => p.label === d.label && iou(p.bbox, d.bbox) > 0.3);
        if (!match && d.confidence < 0.55) continue; // unconfirmed, low-confidence → skip
        const bbox: Box = match
          ? (d.bbox.map((v, i) => match.bbox[i] * 0.45 + v * 0.55) as Box)
          : d.bbox;
        stable.push({ ...d, bbox });
      }
      prevDetsRef.current = dets;

      setStats(prev2 => ({
        ...prev2,
        totalDetected,
        filteredPriority: stable.length,
      }));

      return stable;
    } catch (err) {
      console.error('[ObjectDetection] Detection error:', err);
      return [];
    } finally {
      detectingRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      modelRef.current = null;
    };
  }, []);

  return { loadModel, detect, stats };
}
