/**
 * Whisper transcription abstraction (LOCAL ONLY).
 *
 * Providers:
 *  - 'python-bridge' (default): the existing local-server/camera_server.py running
 *    faster-whisper on the CCTV RTSP audio. This is what the dashboard already polls.
 *  - 'none': no provider configured.
 *
 * This service reports honest status. It never fabricates transcripts when the
 * dependency is missing — errors are surfaced verbatim to the UI.
 */

export type WhisperProvider = 'python-bridge' | 'none';

export interface WhisperStatus {
  provider: WhisperProvider;
  available: boolean;
  /** 'ready' | 'package_missing' | 'model_error' | 'idle' | 'unreachable' */
  state: string;
  model: string | null;
  error: string | null;
  /** Exact next step for the operator when unavailable. */
  hint: string | null;
}

const PROVIDER = (process.env.MSDS_WHISPER_PROVIDER as WhisperProvider) || 'python-bridge';
const BRIDGE = (process.env.MSDS_CAMERA_SERVER_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

async function bridgeStatus(): Promise<any | null> {
  try {
    const res = await fetch(`${BRIDGE}/status`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const whisperService = {
  async status(): Promise<WhisperStatus> {
    if (PROVIDER === 'none') {
      return { provider: 'none', available: false, state: 'idle', model: null, error: null, hint: 'Set MSDS_WHISPER_PROVIDER=python-bridge and start local-server/start_server.bat.' };
    }
    const s = await bridgeStatus();
    if (!s) {
      return {
        provider: PROVIDER, available: false, state: 'unreachable', model: null,
        error: `Cannot reach the local camera bridge at ${BRIDGE}`,
        hint: 'Start it from VS Code: cd local-server && .\\start_server.bat',
      };
    }
    return {
      provider: PROVIDER,
      available: Boolean(s.whisper),
      state: s.whisper_state || (s.whisper ? 'ready' : 'idle'),
      model: s.whisper_model ?? null,
      error: s.whisper_error ?? null,
      hint: s.install_command ? `Run: ${s.install_command}` : null,
    };
  },

  /**
   * Transcription is performed by the Python bridge directly from the camera's RTSP
   * audio; the dashboard consumes it via /cameras/{id}/audio-events. This endpoint
   * exists so a different local provider (e.g. whisper.cpp) can be plugged in later.
   */
  async transcribe(_input: { cameraId?: string; wavPath?: string }) {
    return {
      ok: false,
      error: 'not_implemented_here',
      hint: 'CCTV audio is transcribed by local-server/camera_server.py. Poll GET /cameras/{cameraId}/audio-events on the Python bridge.',
    };
  },
};
