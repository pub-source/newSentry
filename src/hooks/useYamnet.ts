// YAMNet audio classifier (AudioSet, 521 classes) running in-browser via TF.js.
// Loaded lazily from TFHub as a graph model and cached by the existing
// modelCache fetch interceptor. We focus on the distress-relevant classes and
// expose a single 0..100 distress score plus the top matching label.
//
// Model:  https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1
// Input:  Float32Array of 16 kHz mono PCM, length 15600 (~0.975s window).
// Output: scores [N, 521], embeddings [N, 1024], spectrogram [N, 96, 64].

import { useCallback, useEffect, useRef, useState } from 'react';
import { AI_RATES, RateLimiter, perfMonitor, now as perfNow } from '@/lib/performance';
import * as tf from '@tensorflow/tfjs';

const YAMNET_URL =
  'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1/model.json?tfjs-format=file';

// AudioSet ontology indices for distress vs non-distress vocalisations.
// Positive (distress) classes — weight contributes to distress score.
const DISTRESS_CLASSES: Record<number, { label: string; weight: number }> = {
  11: { label: 'Shout',             weight: 0.85 },
  12: { label: 'Bellow',            weight: 0.75 },
  13: { label: 'Whoop',             weight: 0.40 },
  14: { label: 'Yell',              weight: 0.85 },
  15: { label: 'Children shouting', weight: 0.55 },
  16: { label: 'Screaming',         weight: 1.00 },
  19: { label: 'Crying, sobbing',   weight: 0.90 },
  20: { label: 'Baby cry, infant cry', weight: 0.90 },
  22: { label: 'Wail, moan',        weight: 0.85 },
  23: { label: 'Sigh',              weight: 0.10 },
  64: { label: 'Groan',             weight: 0.60 },
};
// Negative (non-emergency vocalisation) — suppresses distress score.
const NEGATIVE_CLASSES = new Set<number>([
  17, 18,            // Whispering, Laughter
  24, 25, 26, 27,    // Giggle, Snicker, Belly laugh, Chuckle/chortle
  63,                // Cheering
  300, 301, 302,     // Music-ish
]);

export interface YamnetResult {
  topLabel: string;
  topScore: number;     // 0..1
  distressScore: number; // 0..100
  ready: boolean;
  error: string | null;
}

const TARGET_SR = 16000;
const WINDOW_SAMPLES = 15600;

function resampleTo16k(input: Float32Array, inputSr: number): Float32Array {
  if (inputSr === TARGET_SR) return input;
  const ratio = inputSr / TARGET_SR;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = src - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

export function useYamnet(enabled: boolean) {
  const [result, setResult] = useState<YamnetResult>({
    topLabel: '—',
    topScore: 0,
    distressScore: 0,
    ready: false,
    error: null,
  });

  const modelRef = useRef<tf.GraphModel | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(0));
  const inferringRef = useRef(false);
  const stoppedRef = useRef(false);

  const start = useCallback(async () => {
    if (modelRef.current && streamRef.current) return;
    stoppedRef.current = false;
    try {
      await tf.ready();
      if (!modelRef.current) {
        const model = await tf.loadGraphModel(YAMNET_URL);
        modelRef.current = model;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;

      const limiter = new RateLimiter(AI_RATES.audio);

      proc.onaudioprocess = async (e) => {
        if (stoppedRef.current) return;
        const ch = e.inputBuffer.getChannelData(0);
        const resampled = resampleTo16k(ch, ctx.sampleRate);
        // append to ring buffer
        const merged = new Float32Array(bufferRef.current.length + resampled.length);
        merged.set(bufferRef.current);
        merged.set(resampled, bufferRef.current.length);
        bufferRef.current = merged;

        if (bufferRef.current.length >= WINDOW_SAMPLES && !inferringRef.current) {
          const window = bufferRef.current.slice(0, WINDOW_SAMPLES);
          // keep ~half-window overlap for responsiveness
          bufferRef.current = bufferRef.current.slice(WINDOW_SAMPLES / 2);

          // Throttle to the configured audio analysis rate.
          if (!limiter.shouldRun(perfNow())) return;

          // Voice-activity gate: skip inference on near-silence so the model
          // is not run continuously on an empty room.
          let sumSq = 0;
          for (let i = 0; i < window.length; i++) sumSq += window[i] * window[i];
          const rms = Math.sqrt(sumSq / window.length);
          if (rms < 0.004) {
            setResult(r => (r.distressScore === 0 && r.topLabel === 'silence'
              ? r
              : { ...r, topLabel: 'silence', topScore: 0, distressScore: 0, ready: true }));
            return;
          }

          inferringRef.current = true;
          const inferStart = perfNow();
          try {
            const input = tf.tensor1d(window);
            const out = modelRef.current!.execute(input) as tf.Tensor[];
            // YAMNet returns [scores, embeddings, spectrogram] in some order;
            // pick the rank-2 tensor with 521 channels.
            const scoresTensor = (Array.isArray(out) ? out : [out])
              .find((t) => t.shape.length === 2 && t.shape[1] === 521) as tf.Tensor2D | undefined;
            if (scoresTensor) {
              const meanScores = scoresTensor.mean(0) as tf.Tensor1D;
              const arr = await meanScores.data();
              meanScores.dispose();
              let topIdx = 0, topScore = 0;
              for (let i = 0; i < arr.length; i++) {
                if (arr[i] > topScore) { topScore = arr[i]; topIdx = i; }
              }
              // Distress score: weighted sum over positive classes, minus negatives.
              let distress = 0;
              for (const [idxStr, meta] of Object.entries(DISTRESS_CLASSES)) {
                const idx = Number(idxStr);
                distress += arr[idx] * meta.weight;
              }
              let negative = 0;
              NEGATIVE_CLASSES.forEach((idx) => { negative += arr[idx] || 0; });
              const finalDistress = Math.max(0, Math.min(100, Math.round((distress - negative * 0.5) * 100)));
              const label =
                DISTRESS_CLASSES[topIdx]?.label ||
                (NEGATIVE_CLASSES.has(topIdx) ? `non-distress (#${topIdx})` : `class #${topIdx}`);
              setResult({
                topLabel: label,
                topScore,
                distressScore: finalDistress,
                ready: true,
                error: null,
              });
            }
            (Array.isArray(out) ? out : [out]).forEach((t) => t.dispose());
            input.dispose();
          } catch (err) {
            console.warn('[YAMNet] inference error', err);
          } finally {
            perfMonitor.markAiFrame(perfNow() - inferStart);
            inferringRef.current = false;
          }
        }
      };

      src.connect(proc);
      proc.connect(ctx.destination);
      setResult((r) => ({ ...r, ready: true, error: null }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'YAMNet failed to start';
      console.error('[YAMNet]', msg);
      setResult((r) => ({ ...r, error: msg, ready: false }));
    }
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    procRef.current?.disconnect();
    procRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    bufferRef.current = new Float32Array(0);
  }, []);

  useEffect(() => {
    if (enabled) { start(); } else { stop(); }
    return stop;
  }, [enabled, start, stop]);

  return result;
}