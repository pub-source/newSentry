import type { SaliencyMode } from '@/types/dashboard';

export function computeSaliency(
  currentFrame: ImageData,
  previousFrame: ImageData | null,
  mode: SaliencyMode,
  threshold: number
): ImageData {
  const w = currentFrame.width;
  const h = currentFrame.height;
  const src = currentFrame.data;
  const out = new ImageData(w, h);
  const dst = out.data;

  // Convert to grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
  }

  if (mode === 'motion' && previousFrame) {
    const prevSrc = previousFrame.data;
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const prevGray = 0.299 * prevSrc[idx] + 0.587 * prevSrc[idx + 1] + 0.114 * prevSrc[idx + 2];
      const diff = Math.abs(gray[i] - prevGray);
      const val = diff > threshold ? Math.min(255, diff * 2) : 0;
      dst[idx] = val;         // R - use cyan heatmap
      dst[idx + 1] = val;
      dst[idx + 2] = val;
      dst[idx + 3] = 255;
    }
  } else if (mode === 'sobel' || (mode === 'motion' && !previousFrame)) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const gx =
          -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
          - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
          - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
        const gy =
          -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
          + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
        const mag = Math.sqrt(gx * gx + gy * gy);
        const val = mag > threshold ? Math.min(255, mag) : 0;
        const oi = idx * 4;
        dst[oi] = val;
        dst[oi + 1] = val;
        dst[oi + 2] = val;
        dst[oi + 3] = 255;
      }
    }
  } else if (mode === 'laplacian') {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const lap =
          gray[(y - 1) * w + x] + gray[(y + 1) * w + x]
          + gray[y * w + (x - 1)] + gray[y * w + (x + 1)]
          - 4 * gray[idx];
        const val = Math.abs(lap) > threshold ? Math.min(255, Math.abs(lap) * 2) : 0;
        const oi = idx * 4;
        dst[oi] = val;
        dst[oi + 1] = val;
        dst[oi + 2] = val;
        dst[oi + 3] = 255;
      }
    }
  }

  return out;
}

export function applyHeatmapColor(saliencyData: ImageData): ImageData {
  const out = new ImageData(saliencyData.width, saliencyData.height);
  const src = saliencyData.data;
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const val = src[i]; // grayscale value
    // Cool (blue/cyan) to warm (yellow/red) colormap
    if (val < 64) {
      dst[i] = 0;
      dst[i + 1] = Math.floor(val * 4);
      dst[i + 2] = Math.floor(128 + val * 2);
    } else if (val < 128) {
      const t = val - 64;
      dst[i] = 0;
      dst[i + 1] = Math.floor(128 + t * 2);
      dst[i + 2] = Math.floor(255 - t * 4);
    } else if (val < 192) {
      const t = val - 128;
      dst[i] = Math.floor(t * 4);
      dst[i + 1] = 255;
      dst[i + 2] = 0;
    } else {
      const t = val - 192;
      dst[i] = 255;
      dst[i + 1] = Math.floor(255 - t * 4);
      dst[i + 2] = 0;
    }
    dst[i + 3] = val > 10 ? Math.min(255, val + 50) : 0;
  }

  return out;
}

export function computeSaliencyScore(saliencyData: ImageData): number {
  const src = saliencyData.data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < src.length; i += 4) {
    sum += src[i];
    count++;
  }
  return Math.min(100, Math.round((sum / count) * 100 / 255));
}
