// Multimodal fire + smoke + visibility detection with false-alarm filtering.
//
// Visual pipeline (single frame):
//   1. Fire-color sampling   -> firePixelRatio, candidate bbox, flicker variance
//   2. Smoke-color sampling  -> smokeRatio (desaturated grey, mid brightness)
//   3. Visibility analysis   -> contrast (std-dev), edge density, saturation,
//                               brightness -> 0..100 (100 = clear)
//   4. False-alarm filter    -> rejects fire inside TV/phone/laptop/monitor
//                               bboxes, very small flames (lighter/candle),
//                               static red surfaces (low flicker),
//                               planar uniform regions (posters/wallpapers)
//
// Decision: real fire requires color + flicker. Smoke-only emergencies fire
// when smoke coverage is high AND visibility drops below threshold.

import type { DetectedObject } from '@/types/dashboard';

export interface SaliencyBreakdown {
  fireColor: number;        // points from fire-colored pixel coverage
  flicker: number;          // points from temporal flicker variance
  smoke: number;            // points from smoke coverage
  visibility: number;       // points from visibility loss
  screenSuppression: number; // negative points from TV/phone/laptop flagging
  otherSuppression: number;  // negative points from size/planar/static rejects
  total: number;            // clamped 0..100 final fire saliency score
  suppressed: boolean;
  suppressionLabel?: string;
}

export interface FireDetectionResult {
  detected: boolean;             // real fire OR smoke-induced low-visibility emergency
  fireDetected: boolean;         // real fire signature confirmed
  smokeEmergency: boolean;       // smoke + low visibility
  confidence: number;            // 0..1 fused
  firePixelRatio: number;
  flickerScore: number;
  smokeRatio: number;            // 0..1 portion of frame matching smoke palette
  visibility: number;            // 0..100 (100 = clear, 0 = blinded by smoke)
  contrast: number;              // luminance std-dev (0..1)
  edgeDensity: number;           // 0..1
  saturation: number;            // 0..1
  rejectedReason?: string;
  bbox?: [number, number, number, number];
  /** Temporally smoothed bbox — stable across frames for overlay rendering */
  smoothedBbox?: [number, number, number, number];
  saliency: SaliencyBreakdown;
}

export interface FireDetectorState {
  history: number[];             // recent fire-pixel ratios (flicker)
  smokeHistory: number[];        // recent smoke ratios (rising smoke trend)
  visibilityHistory: number[];   // recent visibility scores (drop trend)
  lastBbox: [number, number, number, number] | null;
  smoothBbox: [number, number, number, number] | null; // EMA-smoothed bbox
  missFrames: number;            // frames since last raw bbox (hold before clearing)
}

export function createFireState(): FireDetectorState {
  return {
    history: [],
    smokeHistory: [],
    visibilityHistory: [],
    lastBbox: null,
    smoothBbox: null,
    missFrames: 0,
  };
}

const SCREEN_LABELS = new Set(['tv', 'cell phone', 'laptop', 'monitor']);

const MIN_FIRE_RATIO = 0.004;
const LIGHTER_AREA_RATIO = 0.002;
const MIN_FLICKER = 0.000002;
// Smoke emergency: smoke must cover meaningful area AND drop visibility.
const SMOKE_COVERAGE_HIGH = 0.18;     // ≥18% of frame
const VISIBILITY_LOW = 45;            // visibility score (0..100)
// Poster/wallpaper guard: fire bbox sitting in a very flat, low-edge region.
const PLANAR_EDGE_DENSITY = 0.03;

// Temporal smoothing: exponential moving average on the bbox, with a hold
// window so a couple of dropped frames don't make the overlay flicker off.
const BBOX_SMOOTHING = 0.35;   // weight of the newest measurement
const BBOX_HOLD_FRAMES = 6;    // frames to keep the last box when detection drops

function smoothBbox(
  state: FireDetectorState,
  raw: [number, number, number, number] | undefined,
): [number, number, number, number] | undefined {
  if (raw) {
    state.missFrames = 0;
    if (!state.smoothBbox) {
      state.smoothBbox = [...raw] as [number, number, number, number];
    } else {
      const a = BBOX_SMOOTHING;
      state.smoothBbox = state.smoothBbox.map(
        (v, i) => v * (1 - a) + raw[i] * a,
      ) as [number, number, number, number];
    }
    return state.smoothBbox.map(Math.round) as [number, number, number, number];
  }

  state.missFrames++;
  if (state.smoothBbox && state.missFrames <= BBOX_HOLD_FRAMES) {
    return state.smoothBbox.map(Math.round) as [number, number, number, number];
  }
  if (state.missFrames > BBOX_HOLD_FRAMES) state.smoothBbox = null;
  return undefined;
}

function bboxOverlap(a: [number, number, number, number], b: [number, number, number, number]) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  const ix = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const iy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  const inter = ix * iy;
  const area = aw * ah;
  return area > 0 ? inter / area : 0;
}

export function detectFire(
  frame: ImageData,
  state: FireDetectorState,
  objects: DetectedObject[] = [],
): FireDetectionResult {
  const { data, width, height } = frame;
  const step = 4;

  // Single pass: fire pixels, smoke pixels, luminance stats, simple edge count.
  let fireCount = 0;
  let smokeCount = 0;
  let minX = width, minY = height, maxX = 0, maxY = 0;

  let lumSum = 0, lumSqSum = 0, lumN = 0;
  let satSum = 0;
  let edgeCount = 0, edgeN = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // luminance + saturation (cheap HSV-ish)
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const sat = max === 0 ? 0 : (max - min) / max;
      lumSum += lum; lumSqSum += lum * lum; lumN++;
      satSum += sat;

      // FIRE: strong red, mid green, low blue, R>G>B
      if (r > 200 && g > 100 && g < 200 && b < 100 && r > g + 40 && g > b + 20) {
        fireCount++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      // SMOKE: low saturation, mid-high luminance, near-grey (R≈G≈B), slight warm/cool ok
      if (sat < 0.18 && lum > 0.30 && lum < 0.88 && (max - min) < 30) {
        smokeCount++;
      }

      // Edge sample: horizontal luminance gradient with neighbour `step` away
      if (x + step < width) {
        const j = (y * width + (x + step)) * 4;
        const lumN2 = (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) / 255;
        if (Math.abs(lum - lumN2) > 0.08) edgeCount++;
        edgeN++;
      }
    }
  }

  const sampledTotal = Math.ceil(width / step) * Math.ceil(height / step);
  const ratio = fireCount / sampledTotal;
  const smokeRatio = smokeCount / sampledTotal;

  const meanLum = lumSum / Math.max(1, lumN);
  const varLum = Math.max(0, lumSqSum / Math.max(1, lumN) - meanLum * meanLum);
  const contrast = Math.sqrt(varLum);                   // 0..~0.5
  const meanSat = satSum / Math.max(1, lumN);           // 0..1
  const edgeDensity = edgeN ? edgeCount / edgeN : 0;    // 0..1

  // Visibility heuristic: high contrast + edges + saturation => clear (100).
  // Low contrast + few edges + desaturated + bright haze => smoke-blinded (0).
  const visibility = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (contrast / 0.25) * 45 +    // contrast contributes 0..45
        (edgeDensity / 0.20) * 30 + // edges 0..30
        (meanSat / 0.35) * 25,      // saturation 0..25
      ),
    ),
  );

  // Flicker
  state.history.push(ratio);
  if (state.history.length > 10) state.history.shift();
  const mean = state.history.reduce((s, v) => s + v, 0) / state.history.length;
  const variance =
    state.history.reduce((s, v) => s + (v - mean) ** 2, 0) / state.history.length;

  // Smoke + visibility temporal trend
  state.smokeHistory.push(smokeRatio);
  if (state.smokeHistory.length > 12) state.smokeHistory.shift();
  state.visibilityHistory.push(visibility);
  if (state.visibilityHistory.length > 12) state.visibilityHistory.shift();

  let bbox: [number, number, number, number] | undefined;
  if (fireCount > 0 && maxX > minX && maxY > minY) {
    bbox = [minX, minY, maxX - minX, maxY - minY];
    state.lastBbox = bbox;
  }

  const smoothedBbox = smoothBbox(state, bbox);

  // ---- Saliency score breakdown (0..100) ----
  const firePts = Math.min(40, (ratio / 0.05) * 40);
  const flickerPts = Math.min(25, variance * 25000000);
  const smokePts = Math.min(20, (smokeRatio / SMOKE_COVERAGE_HIGH) * 20);
  const visPts = Math.min(15, ((100 - visibility) / 100) * 15);
  const positive = firePts + flickerPts + smokePts + visPts;

  const makeSaliency = (
    screenSuppression: number,
    otherSuppression: number,
    suppressionLabel?: string,
  ): SaliencyBreakdown => ({
    fireColor: Math.round(firePts * 10) / 10,
    flicker: Math.round(flickerPts * 10) / 10,
    smoke: Math.round(smokePts * 10) / 10,
    visibility: Math.round(visPts * 10) / 10,
    screenSuppression: -Math.round(screenSuppression * 10) / 10,
    otherSuppression: -Math.round(otherSuppression * 10) / 10,
    total: Math.max(0, Math.round(positive - screenSuppression - otherSuppression)),
    suppressed: screenSuppression + otherSuppression > 0,
    suppressionLabel,
  });

  const baseResult = {
    firePixelRatio: ratio,
    flickerScore: variance,
    smokeRatio,
    visibility,
    contrast,
    edgeDensity,
    saturation: meanSat,
    bbox,
    smoothedBbox,
  };

  // ---- Smoke-only emergency (no flames visible yet, but room is filling) ----
  const smokeRising =
    state.smokeHistory.length >= 6 &&
    state.smokeHistory[state.smokeHistory.length - 1] >
      state.smokeHistory[0] + 0.05;
  const visibilityDropping =
    state.visibilityHistory.length >= 6 &&
    state.visibilityHistory[0] - visibility > 15;
  const smokeEmergency =
    smokeRatio >= SMOKE_COVERAGE_HIGH &&
    visibility <= VISIBILITY_LOW &&
    (smokeRising || visibilityDropping);

  // ---- Fire rejection ladder ----
  if (ratio < MIN_FIRE_RATIO) {
    return {
      ...baseResult,
      detected: smokeEmergency,
      fireDetected: false,
      smokeEmergency,
      confidence: smokeEmergency ? 0.6 + Math.min(0.3, smokeRatio) : 0,
      rejectedReason: smokeEmergency
        ? `heavy smoke (${Math.round(smokeRatio * 100)}%) — visibility ${visibility}/100`
        : ratio === 0 ? undefined : 'too small (lighter/candle)',
      saliency: makeSaliency(0, smokeEmergency ? 0 : firePts + flickerPts, smokeEmergency ? undefined : 'sub-threshold fire pixels'),
    };
  }

  if (bbox) {
    const areaRatio = (bbox[2] * bbox[3]) / (width * height);
    if (areaRatio < LIGHTER_AREA_RATIO) {
      return {
        ...baseResult,
        detected: smokeEmergency,
        fireDetected: false,
        smokeEmergency,
        confidence: smokeEmergency ? 0.6 : 0.2,
        rejectedReason: 'flame too small (likely lighter/candle)',
        saliency: makeSaliency(0, firePts + flickerPts, 'flame too small (lighter/candle)'),
      };
    }

    // Screen / device false alarm — fire "inside" a TV/phone/laptop/monitor
    // Trigger if the fire bbox mostly sits inside a screen OR the screen mostly
    // sits inside the fire bbox (covers zoomed-in TVs that fill the frame).
    for (const obj of objects) {
      if (!SCREEN_LABELS.has(obj.label)) continue;
      const fireInsideScreen = bboxOverlap(bbox, obj.bbox);
      const screenInsideFire = bboxOverlap(obj.bbox, bbox);
      if (fireInsideScreen > 0.4 || screenInsideFire > 0.5) {
        return {
          ...baseResult,
          detected: false,
          fireDetected: false,
          smokeEmergency: false,
          confidence: 0,
          rejectedReason: `fire inside ${obj.label} screen — ignored`,
          saliency: makeSaliency(positive, 0, `fire inside ${obj.label} screen`),
        };
      }
    }

    // Poster / wallpaper guard: fire candidate sits in a very low-edge,
    // low-flicker region => printed/displayed surface, not a real flame.
    if (edgeDensity < PLANAR_EDGE_DENSITY && variance < MIN_FLICKER * 2) {
      return {
        ...baseResult,
        detected: false,
        fireDetected: false,
        smokeEmergency: false,
        confidence: 0.15,
        rejectedReason: 'flat planar region (poster / wallpaper / advert)',
        saliency: makeSaliency(0, positive, 'flat planar region (poster/wallpaper)'),
      };
    }
  }

  if (state.history.length >= 5 && variance < MIN_FLICKER) {
    return {
      ...baseResult,
      detected: smokeEmergency,
      fireDetected: false,
      smokeEmergency,
      confidence: smokeEmergency ? 0.6 : 0.3,
      rejectedReason: 'no flicker — static red object',
      saliency: makeSaliency(0, smokeEmergency ? firePts : firePts + flickerPts, 'no flicker — static red object'),
    };
  }

  // ---- Real fire confidence ----
  let conf = Math.min(1, ratio * 30 + Math.min(0.5, variance * 50000));
  // Smoke + flames together is the strongest possible signal -> boost.
  if (smokeRatio > 0.08) conf = Math.min(1, conf + 0.15);
  // Vanishing visibility while flames present -> boost.
  if (visibility < 60) conf = Math.min(1, conf + 0.1);

  const fireDetected = conf > 0.3;
  return {
    ...baseResult,
    detected: fireDetected || smokeEmergency,
    fireDetected,
    smokeEmergency,
    confidence: conf,
    saliency: makeSaliency(0, 0),
  };
}