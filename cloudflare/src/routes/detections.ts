/** Detections + CCTV Whisper transcripts pushed by an MSDS device (cloud only). */
import { assertDevice, badRequest, body, json } from '../http';
import { getRepository } from '../repository';
import type { DetectionRecord, Env } from '../types';

export async function detections(seg: string[], request: Request, env: Env, ctx?: ExecutionContext): Promise<Response | null> {
  if (seg[1] !== 'detections' && seg[1] !== 'transcripts') return null;
  const repo = getRepository(env);
  const kind: DetectionRecord['kind'] = seg[1] === 'transcripts' ? 'transcript' : 'detection';

  if (request.method === 'POST') {
    const auth = assertDevice(request, env); if (auth) return auth;
    const b = await body<any>(request);
    if (!b.deviceId) return badRequest('deviceId is required');
    const rec: DetectionRecord = {
      id: b.id || crypto.randomUUID(),
      deviceId: b.deviceId,
      cameraId: b.cameraId || 'unknown',
      kind,
      payload: b.payload ?? b,
      createdAt: b.createdAt || new Date().toISOString(),
    };
    const write = repo.insertDetection(rec);
    if (ctx) ctx.waitUntil(write); else await write;

    const stub = env.DEVICE_SESSION.get(env.DEVICE_SESSION.idFromName(rec.deviceId));
    await stub.fetch('https://do/broadcast', { method: 'POST', body: JSON.stringify({ type: kind, payload: rec }) });
    return json({ record: rec }, 201);
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const all = await repo.listDetections(url.searchParams.get('deviceId') ?? undefined, Number(url.searchParams.get('limit') || 100));
    return json({ records: all.filter(r => r.kind === kind) });
  }

  return null;
}
