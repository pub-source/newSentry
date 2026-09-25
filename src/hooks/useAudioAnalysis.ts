import { useRef, useCallback, useState, useEffect } from 'react';
import type { AudioFeatures, AudioEventType } from '@/types/dashboard';
import { AI_RATES, RateLimiter, ThrottledPublisher, now as perfNow } from '@/lib/performance';

function classifyAudioEvent(
  freqData: Uint8Array,
  timeData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  speechDetected: boolean,
  db: number
): AudioEventType {
  const binSize = sampleRate / fftSize;

  // Helper: average energy in Hz range
  const bandEnergy = (lo: number, hi: number) => {
    const loBin = Math.floor(lo / binSize);
    const hiBin = Math.min(Math.floor(hi / binSize), freqData.length - 1);
    let sum = 0;
    for (let i = loBin; i <= hiBin; i++) sum += freqData[i];
    return sum / (hiBin - loBin + 1);
  };

  // Transient detection: high zero-crossing rate in time domain
  let zeroCrossings = 0;
  for (let i = 1; i < timeData.length; i++) {
    if ((timeData[i] >= 128) !== (timeData[i - 1] >= 128)) zeroCrossings++;
  }
  const zcr = zeroCrossings / timeData.length;

  const lowEnergy = bandEnergy(20, 300);     // bass/bang
  const midEnergy = bandEnergy(300, 3000);   // speech
  const highEnergy = bandEnergy(3000, 8000); // clap/scream harmonics
  const veryHighEnergy = bandEnergy(8000, 16000);

  // BANG: sudden loud low-frequency burst
  if (db > -15 && lowEnergy > 80 && lowEnergy > midEnergy * 1.5 && zcr < 0.15) {
    return 'bang';
  }

  // CLAP: broadband transient, high ZCR, energy spread across all bands
  if (db > -20 && zcr > 0.25 && highEnergy > 40 && veryHighEnergy > 25 && midEnergy > 30) {
    return 'clap';
  }

  // SCREAM: loud, high pitch, strong high-frequency energy
  if (db > -15 && highEnergy > 50 && midEnergy > 50 && highEnergy > lowEnergy * 1.2) {
    return 'scream';
  }

  // SPEECH: moderate mid-frequency energy, lower ZCR
  if (speechDetected && midEnergy > 40) {
    return 'speech';
  }

  return 'none';
}

export function useAudioAnalysis() {
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({
    decibel: -60,
    speechDetected: false,
    pitchEstimate: 0,
    waveform: new Array(64).fill(0),
    audioEvent: 'none',
  });

  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const publisherRef = useRef<ThrottledPublisher<AudioFeatures> | null>(null);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      contextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);
      const freqData = new Uint8Array(bufferLength);

      // Analysis (incl. the O(n^2) autocorrelation) is throttled well below
      // display rate, and results are published to React at the UI rate.
      const limiter = new RateLimiter(AI_RATES.ui);
      const publisher = publisherRef.current ?? new ThrottledPublisher<AudioFeatures>(setAudioFeatures, AI_RATES.ui);
      publisherRef.current = publisher;

      const analyze = () => {
        animRef.current = requestAnimationFrame(analyze);
        if (!limiter.shouldRun(perfNow())) return;
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const val = (timeData[i] - 128) / 128;
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / timeData.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : -60;

        const sampleRate = ctx.sampleRate;
        const binSize = sampleRate / analyser.fftSize;
        const lowBin = Math.floor(300 / binSize);
        const highBin = Math.floor(3000 / binSize);
        let speechEnergy = 0;
        for (let i = lowBin; i < highBin && i < freqData.length; i++) {
          speechEnergy += freqData[i];
        }
        speechEnergy /= (highBin - lowBin);
        const speechDetected = speechEnergy > 40;

        let maxCorr = 0;
        let pitchPeriod = 0;
        const minLag = Math.floor(sampleRate / 500);
        const maxLag = Math.floor(sampleRate / 80);
        for (let lag = minLag; lag < maxLag && lag < timeData.length; lag++) {
          let corr = 0;
          for (let i = 0; i < timeData.length - lag; i++) {
            corr += (timeData[i] - 128) * (timeData[i + lag] - 128);
          }
          if (corr > maxCorr) {
            maxCorr = corr;
            pitchPeriod = lag;
          }
        }
        const pitchEstimate = pitchPeriod > 0 ? Math.round(sampleRate / pitchPeriod) : 0;

        const waveform: number[] = [];
        const step = Math.floor(timeData.length / 64);
        for (let i = 0; i < 64; i++) {
          waveform.push((timeData[i * step] - 128) / 128);
        }

        const audioEvent = classifyAudioEvent(freqData, timeData, sampleRate, analyser.fftSize, speechDetected, Math.max(-60, db));

        publisher.push({
          decibel: Math.max(-60, Math.min(0, db)),
          speechDetected,
          pitchEstimate: speechDetected ? pitchEstimate : 0,
          waveform,
          audioEvent,
        });
      };

      analyze();
    } catch {
      const simLimiter = new RateLimiter(AI_RATES.ui);
      const simulate = () => {
        animRef.current = requestAnimationFrame(simulate);
        if (!simLimiter.shouldRun(perfNow())) return;
        const t = Date.now() / 1000;
        const waveform = Array.from({ length: 64 }, (_, i) =>
          Math.sin(i * 0.3 + t * 2) * 0.3 * (Math.random() * 0.5 + 0.5)
        );
        const db = -30 + Math.sin(t * 0.5) * 15 + Math.random() * 5;
        const speech = Math.sin(t * 0.3) > 0.5;
        // Simulate events cycling
        const events: AudioEventType[] = ['none', 'speech', 'clap', 'scream', 'bang'];
        const eventIdx = Math.floor((t % 15) / 3);
        setAudioFeatures({
          decibel: db,
          speechDetected: speech,
          pitchEstimate: speech ? 150 + Math.random() * 100 : 0,
          waveform,
          audioEvent: events[eventIdx] || 'none',
        });
      };
      simulate();
    }
  }, []);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    publisherRef.current?.dispose();
    publisherRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    analyserRef.current = null;
    setAudioFeatures({ decibel: -60, speechDetected: false, pitchEstimate: 0, waveform: new Array(64).fill(0), audioEvent: 'none' });
  }, []);

  // Safety net: never leave a rAF loop, stream, or context alive on unmount.
  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    publisherRef.current?.dispose();
    streamRef.current?.getTracks().forEach(t => t.stop());
    contextRef.current?.close().catch(() => {});
  }, []);

  return { audioFeatures, startAudio, stopAudio };
}
