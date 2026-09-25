/** Device registration + heartbeat (cloud only). */
import { assertDevice, badRequest, body, json, notFound } from '../http';
import { getRepository } from '../repository';
import type { Env } from '../types';

export async function devices(seg: string[], request: Request, env: Env): Promise<Response | null> {
  if (seg[1] !== 'devices') return null;
  const repo = getRepository(env);

  // POST /api/devices/register
  if (seg[2] === 'register' && request.method === 'POST') {
    const auth = assertDevice(request, env); if (auth) return auth;
    const b = await body<{ deviceId?: string; name?: string; version?: string; platform?: string }>(request);
    if (!b.deviceId) return badRequest('deviceId is required');
    const rec = await repo.upsertDevice({
      deviceId: b.deviceId, name: b.name || b.deviceId, version: b.version,
      platform: b.platform, lastSeenAt: new Date().toISOString(), online: true,
    });
    return json({ device: rec }, 201);
  }

  // POST /api/devices/:id/heartbeat
  if (seg[2] && seg[3] === 'heartbeat' && request.method === 'POST') {
    const auth = assertDevice(request, env); if (auth) return auth;
    const b = await body<{ status?: Record<string, unknown> }>(request);
    const rec = await repo.touchDevice(seg[2], b.status);
    if (!rec) return notFound();
    // Fan the status out to any dashboard sockets attached to this device.
    const stub = env.DEVICE_SESSION.get(env.DEVICE_SESSION.idFromName(seg[2]));
    await stub.fetch('https://do/broadcast', { method: 'POST', body: JSON.stringify({ type: 'status', payload: rec }) });
    return json({ device: rec });
  }

  // GET /api/devices/:id
  if (seg[2] && !seg[3] && request.method === 'GET') {
    const rec = await repo.getDevice(seg[2]);
    return rec ? json({ device: rec }) : notFound();
  }

  return null;
}
