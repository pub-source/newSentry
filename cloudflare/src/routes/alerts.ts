/** Alerts pushed by an MSDS device (cloud only). */
import { assertDevice, badRequest, body, json } from '../http';
import { getRepository } from '../repository';
import type { AlertRecord, Env } from '../types';

export async function alerts(seg: string[], request: Request, env: Env): Promise<Response | null> {
  if (seg[1] !== 'alerts') return null;
  const repo = getRepository(env);

  if (request.method === 'POST') {
    const auth = assertDevice(request, env); if (auth) return auth;
    const b = await body<Partial<AlertRecord>>(request);
    if (!b.deviceId || !b.type) return badRequest('deviceId and type are required');
    const rec: AlertRecord = {
      id: b.id || crypto.randomUUID(),
      deviceId: b.deviceId,
      cameraId: b.cameraId || 'unknown',
      type: b.type,
      label: b.label || b.type,
      confidence: typeof b.confidence === 'number' ? b.confidence : 0,
      createdAt: b.createdAt || new Date().toISOString(),
      meta: b.meta ?? {},
    };
    await repo.insertAlert(rec);
    const stub = env.DEVICE_SESSION.get(env.DEVICE_SESSION.idFromName(rec.deviceId));
    await stub.fetch('https://do/broadcast', { method: 'POST', body: JSON.stringify({ type: 'alert', payload: rec }) });
    return json({ alert: rec }, 201);
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    return json({ alerts: await repo.listAlerts(url.searchParams.get('deviceId') ?? undefined, Number(url.searchParams.get('limit') || 100)) });
  }

  return null;
}
