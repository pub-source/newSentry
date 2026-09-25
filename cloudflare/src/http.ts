/** Small HTTP helpers for the Worker (cloud only). */
import type { Env } from './types';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MSDS-Device-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const notFound = () => json({ error: 'not_found' }, 404);
export const badRequest = (msg: string) => json({ error: 'bad_request', details: msg }, 400);
export const unauthorized = () => json({ error: 'unauthorized' }, 401);

export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });

/** Device writes require the shared device token. Reads stay open for the dashboard scaffold. */
export function assertDevice(request: Request, env: Env): Response | null {
  if (!env.MSDS_DEVICE_TOKEN) return null; // not configured yet in dev
  const token = request.headers.get('X-MSDS-Device-Token');
  return token === env.MSDS_DEVICE_TOKEN ? null : unauthorized();
}

export async function body<T = any>(request: Request): Promise<T> {
  try { return (await request.json()) as T; } catch { return {} as T; }
}
