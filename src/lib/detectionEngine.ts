import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import type { DetectedObject } from '@/types/dashboard';

/**
 * Shared COCO-SSD weights (loaded once), but every camera pipeline keeps its
 * own detection state / queue, so cameras never block or clobber each other.
 */
let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let model: cocoSsd.ObjectDetection | null = null;

export function loadDetector() {
  if (!modelPromise) {
    modelPromise = cocoSsd.load({ base: 'mobilenet_v2' }).then(m => {
      model = m;
      return m;
    });
  }
  return modelPromise;
}

export const detectorReady = () => model !== null;

export async function detectObjects(
  source: HTMLCanvasElement | HTMLVideoElement,
  minConfidence = 0.4,
): Promise<DetectedObject[]> {
  const m = model ?? (await loadDetector());
  const predictions = await m.detect(source, 20, minConfidence);
  return predictions.map(p => ({
    label: p.class,
    confidence: p.score,
    bbox: [p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]] as [number, number, number, number],
  }));
}
