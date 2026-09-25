import { useCallback, useEffect, useState } from 'react';
import Hls from 'hls.js';

export type IpCamKind = 'hls' | 'mjpeg' | 'image';

export interface IpCamConfig {
  url: string;
  kind: IpCamKind;
}

/**
 * Module-level (singleton) CCTV session.
 *
 * The hidden <video>, the hls.js instance and the captured MediaStream live
 * OUTSIDE React so navigating between /dashboard, /monitoring and /household
 * never tears the stream down. Every mounted component subscribes to the same
 * session and gets the live stream back instantly on return.
 */
interface IpCamState {
  stream: MediaStream | null;
  error: string | null;
  connected: boolean;
  audioEnabled: boolean;
}

const session = {
  state: { stream: null, error: null, connected: false, audioEnabled: false } as IpCamState,
  video: null as HTMLVideoElement | null,
  hls: null as Hls | null,
  canvas: null as HTMLCanvasElement | null,
  raf: 0 as number,
  listeners: new Set<() => void>(),
};

const setState = (patch: Partial<IpCamState>) => {
  session.state = { ...session.state, ...patch };
  session.listeners.forEach(l => l());
};

function disconnectSession() {
  if (session.hls) { session.hls.destroy(); session.hls = null; }
  if (session.video) {
    session.video.pause();
    session.video.src = '';
    session.video.srcObject = null;
    session.video.remove();
    session.video = null;
  }
  if (session.raf) { cancelAnimationFrame(session.raf); clearTimeout(session.raf); session.raf = 0; }
  session.canvas = null;
  session.state.stream?.getTracks().forEach(t => t.stop());
  setState({ stream: null, connected: false, audioEnabled: false, error: null });
}

async function connectSession(cfg: IpCamConfig) {
  disconnectSession();
  setState({ error: null });

  // Hidden (but attached) video — detached elements get throttled/never paint
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.crossOrigin = 'anonymous';
  video.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none';
  document.body.appendChild(video);
  session.video = video;

  const canvas = document.createElement('canvas');
  session.canvas = canvas;

  try {
    if (cfg.kind === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2 });
        session.hls = hls;
        hls.loadSource(cfg.url);
        hls.attachMedia(video);
        await new Promise<void>((res, rej) => {
          hls.on(Hls.Events.MANIFEST_PARSED, () => res());
          hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) rej(new Error(data.details || 'HLS error')); });
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = cfg.url;
      } else {
        throw new Error('HLS not supported in this browser');
      }
      await video.play();

      // Wait for real video dimensions before capturing, otherwise the
      // resulting track is a black 0x0 / not-yet-decoded surface.
      await new Promise<void>((res) => {
        if (video.videoWidth > 0 && video.readyState >= 2) return res();
        const done = () => { video.removeEventListener('loadeddata', done); video.removeEventListener('resize', done); res(); };
        video.addEventListener('loadeddata', done);
        video.addEventListener('resize', done);
        setTimeout(done, 8000);
      });

      if (!video.videoWidth) throw new Error('Stream produced no video frames (codec may be H.265 — force H.264 on the camera)');

      // Pump frames through a canvas: this works for MSE/hls.js in every
      // browser, whereas video.captureStream() often yields a black track.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      const draw = () => {
        if (!session.canvas || !session.video) return;
        const v = session.video;
        if (v.readyState >= 2 && v.videoWidth) {
          if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
          }
          try { ctx.drawImage(v, 0, 0, canvas.width, canvas.height); } catch { /* tainted */ }
        }
        session.raf = requestAnimationFrame(draw);
      };
      draw();
      const ms = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
      setState({ stream: ms });
    } else if (cfg.kind === 'mjpeg' || cfg.kind === 'image') {
      // For MJPEG we draw into a canvas at ~10fps and captureStream from it
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      let img: HTMLImageElement | null = null;
      const loop = () => {
        if (!session.canvas) return;
        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
        }
        // Cache-bust for MJPEG snapshot URLs
        const sep = cfg.url.includes('?') ? '&' : '?';
        img.src = cfg.kind === 'mjpeg' ? cfg.url : `${cfg.url}${sep}t=${Date.now()}`;
        img.onload = () => {
          try {
            canvas.width = img!.naturalWidth || 640;
            canvas.height = img!.naturalHeight || 480;
            ctx.drawImage(img!, 0, 0, canvas.width, canvas.height);
          } catch { /* ignore */ }
          session.raf = window.setTimeout(loop, 100) as unknown as number;
        };
        img.onerror = () => {
          session.raf = window.setTimeout(loop, 500) as unknown as number;
        };
      };
      loop();
      const ms: MediaStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(15);
      setState({ stream: ms });
    }
    setState({ connected: true });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[IpCamera] connect failed:', msg);
    disconnectSession();
    setState({ error: msg });
    return false;
  }
}

/**
 * Connects an IP camera (HLS .m3u8 or MJPEG/snapshot URL) to a video element
 * and returns a MediaStream that the dashboard can consume just like a webcam.
 * The session is global: it keeps streaming while the user browses other pages.
 */
export function useIpCamera() {
  const [state, setLocal] = useState<IpCamState>(session.state);

  useEffect(() => {
    const listener = () => setLocal(session.state);
    session.listeners.add(listener);
    listener();
    return () => { session.listeners.delete(listener); };
  }, []);

  /** Unmute/mute the hidden CCTV video element so the operator can hear the camera. */
  const setAudioEnabled = useCallback((on: boolean) => {
    const v = session.video;
    if (v) {
      v.muted = !on;
      v.volume = on ? 1 : 0;
      if (on) v.play().catch(() => {});
    }
    setState({ audioEnabled: on });
  }, []);

  const connect = useCallback((cfg: IpCamConfig) => connectSession(cfg), []);
  const disconnect = useCallback(() => disconnectSession(), []);

  return {
    connect,
    disconnect,
    stream: state.stream,
    connected: state.connected,
    error: state.error,
    audioEnabled: state.audioEnabled,
    setAudioEnabled,
  };
}
