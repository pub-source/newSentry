/**
 * MSDS Cloudflare Worker API (CLOUD ONLY).
 *
 * The cloud never talks to a camera. An installed MSDS Electron device is the bridge:
 * it registers, heartbeats, and pushes alerts/detections/transcripts up here.
 *
 * Routes:
 *   GET  /api/health
 *   POST /api/devices/register
 *   POST /api/devices/:deviceId/heartbeat
 *   GET  /api/devices/:deviceId
 *   POST /api/alerts            GET /api/alerts?deviceId=
 *   POST /api/detections        GET /api/detections?deviceId=
 *   GET  /api/devices/:deviceId/ws   (WebSocket -> DeviceSession Durable Object)
 */
import type { Env } from './types';
import { json, notFound, withCors, preflight } from './http';
import { health } from './routes/health';
import { devices } from './routes/devices';
import { alerts } from './routes/alerts';
import { detections } from './routes/detections';

export { DeviceSession } from './durable/DeviceSession';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return preflight();

    const url = new URL(request.url);
    const seg = url.pathname.replace(/^\/+|\/+$/g, '').split('/'); // ["api", ...]

    if (seg[0] !== 'api') return withCors(notFound());

    try {
      // Real-time channel for a device session (Durable Object per device).
      if (seg[1] === 'devices' && seg[3] === 'ws' && seg[2]) {
        const id = env.DEVICE_SESSION.idFromName(seg[2]);
        return env.DEVICE_SESSION.get(id).fetch(request);
      }

      const res =
        (await health(seg, request, env)) ??
        (await devices(seg, request, env)) ??
        (await alerts(seg, request, env)) ??
        (await detections(seg, request, env, ctx)) ??
        notFound();

      return withCors(res);
    } catch (err) {
      return withCors(json({ error: 'internal_error', details: String(err) }, 500));
    }
  },
};
