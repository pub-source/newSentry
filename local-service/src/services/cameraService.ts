/**
 * Camera abstraction (LOCAL ONLY).
 *
 * Wraps the existing Python RTSP -> MediaMTX -> HLS bridge so the Electron shell and
 * any future local UI share one interface. Camera credentials stay on this machine:
 * they are never sent to the renderer bundle or to Cloudflare.
 */
import { ffmpegService } from './ffmpegService.js';

const BRIDGE = (process.env.MSDS_CAMERA_SERVER_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

export interface CameraSummary {
  id: string;
  name: string;
  online: boolean;
  hlsReady: boolean;
  /** HLS URL served by MediaMTX on the LAN (never exposed publicly). */
  stream: string | null;
  error: string | null;
}

export const cameraService = {
  async status(): Promise<{ bridge: string; reachable: boolean; cameras: CameraSummary[]; error: string | null }> {
    try {
      const res = await fetch(`${BRIDGE}/status`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const s: any = await res.json();
      return {
        bridge: BRIDGE,
        reachable: true,
        cameras: (s.cameras || []).map((c: any): CameraSummary => ({
          id: c.id, name: c.name, online: Boolean(c.ffmpeg),
          hlsReady: Boolean(c.hls_ready), stream: c.stream ?? null, error: c.error ?? null,
        })),
        error: s.error ?? null,
      };
    } catch (err) {
      return {
        bridge: BRIDGE, reachable: false, cameras: [],
        error: `${err instanceof Error ? err.message : String(err)} — start local-server/start_server.bat`,
      };
    }
  },

  /** Build the standard RTSP URL for an IP camera and ffprobe it. */
  async probe({ ip, port = 554, path = '/live/ch00_1' }: { ip: string; port?: number; path?: string }) {
    const rtsp = `rtsp://${ip}:${port}${path.startsWith('/') ? path : `/${path}`}`;
    const result = await ffmpegService.probe(rtsp);
    // Return the URL without credentials; auth is configured on the local bridge only.
    return { rtsp, ...result };
  },
};
