import type { CameraConfig } from '@/types/multicam';

export interface BackendCameraStatus {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  ffmpeg: boolean;
  hls_ready: boolean;
  stream: string;
  stream_local: string;
  restarts: number;
  error: string | null;
  audio?: CctvAudioStatus;
}

export interface BackendStatus {
  mediamtx: boolean;
  hls_port: number;
  lan_ip: string;
  whisper: boolean;
  /** "package_missing" | "model_error" | "ready" | "idle" */
  whisper_state?: string;
  whisper_model?: string;
  whisper_error?: string | null;
  /** Interpreter running camera_server.py (for install hints). */
  python_exe?: string;
  /** Copy-pasteable command that installs deps into that interpreter. */
  install_command?: string;
  cameras: BackendCameraStatus[];
  /** Resolved binary paths reported by the local bridge (null = missing). */
  ffmpeg_path?: string | null;
  ffprobe_path?: string | null;
  error: string | null;
}


export interface AudioEvent {
  camera_id: string;
  timestamp: string;
  transcript: string;
  keyword: string;
  confidence: number;
}

export interface CctvAudioStatus {
  thread_running: boolean;
  connected: boolean;
  capturing?: boolean;
  chunks_received: number;
  bytes_received: number;
  seconds_captured?: number;
  last_chunk_at: string | null;
  last_transcription_at: string | null;
  last_transcript: string;
  /** null = not probed yet, false = the RTSP stream carries no audio track. */
  has_audio_track?: boolean | null;
  audio_codec?: string | null;
  audio_probe_error?: string | null;
  audio_restarts?: number;
  /** Which route the sound is coming from: mediamtx | camera-tcp | camera-udp. */
  audio_source?: string | null;
  audio_sources_tried?: string[];
  chunk_seconds?: number;

  whisper_available?: boolean;
  whisper_state?: string;
  whisper_model?: string;
  whisper_error?: string | null;
  error: string | null;
  ffmpeg_error: string | null;
  available_camera_ids?: string[];
}

/** One short, human-readable line describing why transcription is (not) working. */
export function describeAudioStatus(
  status: CctvAudioStatus | null,
  reachable: boolean,
): { message: string; tone: 'ok' | 'wait' | 'error' } {
  if (!reachable || !status) {
    return {
      message: 'Cannot reach the local camera service — transcription is paused.',
      tone: 'error',
    };
  }
  if (status.has_audio_track === false) {
    return {
      message: 'This camera does not send sound over its network stream, so there is nothing to transcribe.',
      tone: 'error',
    };
  }
  if (status.whisper_available === false) {
    return { message: status.whisper_error || 'Speech recognition is not installed.', tone: 'error' };
  }
  if (status.whisper_state === 'model_error') {
    return { message: status.whisper_error || 'Speech recognition model failed to load.', tone: 'error' };
  }
  if (status.whisper_state === 'loading') {
    return { message: 'Preparing speech recognition…', tone: 'wait' };
  }
  if (!status.thread_running) {
    return { message: status.error || 'Listening has not started yet.', tone: 'error' };
  }
  if (!status.connected) {
    return {
      message: status.error
        || (status.chunks_received > 0
          ? 'Sound from the camera stopped — reconnecting…'
          : 'Waiting for sound from the camera…'),
      tone: 'wait',
    };
  }
  if (!status.last_transcript) {
    return { message: 'Listening… no speech heard yet.', tone: 'wait' };
  }
  return { message: 'Listening.', tone: 'ok' };
}



const base = (url: string) => url.trim().replace(/\/+$/, '');

async function req<T>(url: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getMultiStatus = (server: string) =>
  req<BackendStatus>(`${base(server)}/status`, undefined, 6000);

/** Push the locally-stored camera list to the Python backend. */
export const syncCameras = (server: string, cameras: CameraConfig[]) =>
  req<{ success: boolean }>(
    `${base(server)}/cameras/sync`,
    json({
      cameras: cameras.map(c => ({
        id: c.id, path: c.path, name: c.name, rtsp: c.rtspUrl, enabled: c.enabled,
      })),
    }),
    15000,
  );

export const startCamera = (server: string, id: string) =>
  req<{ success: boolean; error?: string; stream?: string }>(
    `${base(server)}/cameras/${id}/start`, { method: 'POST' }, 30000);

export const stopCamera = (server: string, id: string) =>
  req<{ success: boolean }>(`${base(server)}/cameras/${id}/stop`, { method: 'POST' }, 15000);

export const startAll = (server: string) =>
  req<{ success: boolean }>(`${base(server)}/start-all`, { method: 'POST' }, 60000);

export const stopAll = (server: string) =>
  req<{ success: boolean }>(`${base(server)}/stop-all`, { method: 'POST' }, 30000);

export const testCamera = (server: string, rtsp: string) =>
  req<{ success: boolean; error?: string; info?: string }>(
    `${base(server)}/test-connection`, json({ rtsp }), 25000);

/** Audio distress events produced by ffmpeg -> Whisper on the backend. */
export const getAudioEvents = (server: string, id: string, since?: string) =>
  req<{ events: AudioEvent[]; status: CctvAudioStatus }>(
    `${base(server)}/cameras/${id}/audio-events${since ? `?since=${encodeURIComponent(since)}` : ''}`,
    undefined,
    20000,
  );

export interface AudioTestReport {
  success: boolean;
  error?: string | null;
  transcript?: string;
  /** Which route produced usable sound: mediamtx | camera-tcp | camera-udp. */
  source?: string | null;
  attempts?: { source: string; url: string; transport: string; returncode: number | null; bytes: number; seconds: number; ffmpeg_error: string | null }[];
  probe?: { ok: boolean; error: string | null; has_audio_track: boolean | null; audio_codec: string | null; streams: unknown[] };
  capture?: { returncode: number; bytes: number; seconds: number; ffmpeg_error: string | null };
  whisper?: { available: boolean; state: string; error: string | null };
  available_camera_ids?: string[];
}

/** One-shot diagnostic of a camera's RTSP audio path (probe + capture + Whisper). */
export const testCameraAudio = (server: string, id: string) =>
  req<AudioTestReport>(`${base(server)}/cameras/${id}/audio-test`, { method: 'POST' }, 60000);


export function backendHint(server: string) {
  const httpsPage = typeof location !== 'undefined' && location.protocol === 'https:';
  if (httpsPage && /^http:\/\//i.test(server.trim())) {
    return 'This page is served over HTTPS, so the browser blocks plain-HTTP local servers. Open the dashboard over http:// on the same PC, or use the native app build.';
  }
  return '';
}
