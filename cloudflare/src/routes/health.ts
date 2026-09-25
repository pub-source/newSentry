import { json } from '../http';
import type { Env } from '../types';

export async function health(seg: string[], _req: Request, env: Env): Promise<Response | null> {
  if (seg[1] !== 'health') return null;
  return json({
    ok: true,
    service: 'msds-cloud',
    backend: env.DATA_BACKEND ?? 'memory',
    deviceAuth: Boolean(env.MSDS_DEVICE_TOKEN),
    time: new Date().toISOString(),
  });
}
