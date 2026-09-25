import { useCallback, useEffect, useRef, useState } from 'react';
import { describeAudioStatus, getAudioEvents, type CctvAudioStatus } from '@/lib/multiCamServer';

/** The live transcript is wiped this long after the last words were heard. */
const TRANSCRIPT_CLEAR_MS = 5000;

export interface CctvSpeechDiagnostics {
  polling: boolean;
  backendReachable: boolean;
  audioConnected: boolean;
  threadRunning: boolean;
  hasAudioTrack: boolean | null;
  audioSource: string | null;
  chunksReceived: number;
  whisperState: string | null;
  lastTranscriptionAt: string | null;
  lastTranscript: string;
  ffmpegError: string | null;
  error: string | null;
  /** Short sentence for the operator: why words are (not) appearing. */
  message: string;
  tone: 'ok' | 'wait' | 'error';
}

const IDLE: CctvSpeechDiagnostics = {
  polling: false, backendReachable: false, audioConnected: false, threadRunning: false,
  hasAudioTrack: null, audioSource: null, chunksReceived: 0, whisperState: null, lastTranscriptionAt: null,
  lastTranscript: '', ffmpegError: null, error: null,
  message: 'Connect the camera to start listening.', tone: 'wait',
};

/**
 * Speech coming from the CCTV camera itself.
 *
 * The laptop microphone is never used here — the backend transcribes the
 * camera's RTSP audio with Whisper and we poll those transcripts.
 */
export function useCctvSpeech(server: string, cameraId: string, enabled: boolean) {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [diagnostics, setDiagnostics] = useState<CctvSpeechDiagnostics>(IDLE);
  const sinceRef = useRef<string | undefined>(undefined);
  const lastShownRef = useRef('');
  const clearTimerRef = useRef<number | undefined>(undefined);

  /**
   * The newest Whisper sentence always REPLACES the previous one — CCTV text is
   * never accumulated — and it disappears 5 s after the last words were heard.
   */
  const showTranscript = useCallback((text: string) => {
    setTranscript(text);
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setTranscript(''), TRANSCRIPT_CLEAR_MS);
  }, []);

  useEffect(() => () => { if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current); }, []);

  useEffect(() => {
    if (!enabled) {
      setListening(false);
      setDiagnostics(prev => ({ ...prev, polling: false, message: IDLE.message, tone: 'wait' }));
      return;
    }
    let cancelled = false;
    let inFlight = false;
    setListening(true);
    setDiagnostics(prev => ({ ...prev, polling: true, error: null, message: 'Starting to listen…', tone: 'wait' }));

    const applyStatus = (status: CctvAudioStatus) => {
      const described = describeAudioStatus(status, true);
      setDiagnostics({
        polling: true,
        backendReachable: true,
        audioConnected: status.connected,
        threadRunning: status.thread_running,
        hasAudioTrack: status.has_audio_track ?? null,
        audioSource: status.audio_source ?? null,
        chunksReceived: status.chunks_received ?? 0,
        whisperState: status.whisper_state ?? null,
        lastTranscriptionAt: status.last_transcription_at,
        lastTranscript: status.last_transcript ?? '',
        ffmpegError: status.ffmpeg_error ?? null,
        error: status.error,
        message: described.message,
        tone: described.tone,
      });
    };

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await getAudioEvents(server, cameraId, sinceRef.current);
        if (cancelled) return;
        applyStatus(res.status);
        const events = res?.events ?? [];
        if (events.length) {
          sinceRef.current = events[events.length - 1].timestamp;
          const text = events.map(e => e.transcript).filter(Boolean).join(' ').trim();
          if (text && text !== lastShownRef.current) {
            lastShownRef.current = text;
            console.info(`[CCTV Speech ${cameraId}]`, text);
            showTranscript(text);
          }
          return;
        }
        // No new event this poll, but the backend may already hold words.
        const last = res.status?.last_transcript ?? '';
        if (last && last !== lastShownRef.current) {
          lastShownRef.current = last;
          showTranscript(last);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[CCTV Speech ${cameraId}] polling failed:`, message);
          setDiagnostics(prev => ({
            ...prev,
            polling: true,
            backendReachable: false,
            audioConnected: false,
            error: message,
            message: `${describeAudioStatus(null, false).message} (${message})`,
            tone: 'error',
          }));
        }
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const id = window.setInterval(tick, 1500);
    return () => { cancelled = true; setListening(false); window.clearInterval(id); };
  }, [server, cameraId, enabled, showTranscript]);

  const clear = useCallback(() => setTranscript(''), []);

  return { transcript, listening, clear, diagnostics };
}
