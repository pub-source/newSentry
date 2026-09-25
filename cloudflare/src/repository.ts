/**
 * Data access behind an interface so today's Supabase/Postgres can be swapped for
 * Cloudflare D1 later without touching the routes. (cloud only)
 */
import type { AlertRecord, DetectionRecord, DeviceRecord, Env } from './types';

export interface MsdsRepository {
  upsertDevice(d: DeviceRecord): Promise<DeviceRecord>;
  getDevice(deviceId: string): Promise<DeviceRecord | null>;
  touchDevice(deviceId: string, status?: Record<string, unknown>): Promise<DeviceRecord | null>;
  insertAlert(a: AlertRecord): Promise<AlertRecord>;
  listAlerts(deviceId?: string, limit?: number): Promise<AlertRecord[]>;
  insertDetection(d: DetectionRecord): Promise<DetectionRecord>;
  listDetections(deviceId?: string, limit?: number): Promise<DetectionRecord[]>;
}

/** Dev/default backend. Data lives only for the lifetime of the isolate. */
class MemoryRepository implements MsdsRepository {
  private devices = new Map<string, DeviceRecord>();
  private alerts: AlertRecord[] = [];
  private detections: DetectionRecord[] = [];

  async upsertDevice(d: DeviceRecord) { this.devices.set(d.deviceId, { ...this.devices.get(d.deviceId), ...d }); return this.devices.get(d.deviceId)!; }
  async getDevice(id: string) { return this.devices.get(id) ?? null; }
  async touchDevice(id: string, status?: Record<string, unknown>) {
    const existing = this.devices.get(id);
    if (!existing) return null;
    const next = { ...existing, lastSeenAt: new Date().toISOString(), online: true, status: status ?? existing.status };
    this.devices.set(id, next);
    return next;
  }
  async insertAlert(a: AlertRecord) { this.alerts.unshift(a); this.alerts = this.alerts.slice(0, 500); return a; }
  async listAlerts(deviceId?: string, limit = 100) { return this.alerts.filter(a => !deviceId || a.deviceId === deviceId).slice(0, limit); }
  async insertDetection(d: DetectionRecord) { this.detections.unshift(d); this.detections = this.detections.slice(0, 500); return d; }
  async listDetections(deviceId?: string, limit = 100) { return this.detections.filter(d => !deviceId || d.deviceId === deviceId).slice(0, limit); }
}

/**
 * Supabase/Postgres backend via PostgREST.
 * Expected tables (create them when you wire this up):
 *   msds_devices(device_id pk, name, version, platform, last_seen_at, online, status jsonb)
 *   msds_alerts(id pk, device_id, camera_id, type, label, confidence, created_at, meta jsonb)
 *   msds_detections(id pk, device_id, camera_id, kind, payload jsonb, created_at)
 */
class SupabaseRepository implements MsdsRepository {
  constructor(private url: string, private key: string) {}

  private async rest(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.url.replace(/\/+$/, '')}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : await res.json();
  }

  async upsertDevice(d: DeviceRecord) {
    await this.rest('msds_devices', { method: 'POST', body: JSON.stringify([{
      device_id: d.deviceId, name: d.name, version: d.version, platform: d.platform,
      last_seen_at: d.lastSeenAt, online: d.online, status: d.status ?? {},
    }]) });
    return d;
  }
  async getDevice(id: string) {
    const rows: any[] = await this.rest(`msds_devices?device_id=eq.${encodeURIComponent(id)}&limit=1`);
    const r = rows?.[0];
    return r ? { deviceId: r.device_id, name: r.name, version: r.version, platform: r.platform, lastSeenAt: r.last_seen_at, online: r.online, status: r.status } : null;
  }
  async touchDevice(id: string, status?: Record<string, unknown>) {
    await this.rest(`msds_devices?device_id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_seen_at: new Date().toISOString(), online: true, ...(status ? { status } : {}) }),
    });
    return this.getDevice(id);
  }
  async insertAlert(a: AlertRecord) {
    await this.rest('msds_alerts', { method: 'POST', body: JSON.stringify([{
      id: a.id, device_id: a.deviceId, camera_id: a.cameraId, type: a.type,
      label: a.label, confidence: a.confidence, created_at: a.createdAt, meta: a.meta ?? {},
    }]) });
    return a;
  }
  async listAlerts(deviceId?: string, limit = 100) {
    const filter = deviceId ? `device_id=eq.${encodeURIComponent(deviceId)}&` : '';
    const rows: any[] = await this.rest(`msds_alerts?${filter}order=created_at.desc&limit=${limit}`);
    return rows.map(r => ({ id: r.id, deviceId: r.device_id, cameraId: r.camera_id, type: r.type, label: r.label, confidence: r.confidence, createdAt: r.created_at, meta: r.meta }));
  }
  async insertDetection(d: DetectionRecord) {
    await this.rest('msds_detections', { method: 'POST', body: JSON.stringify([{
      id: d.id, device_id: d.deviceId, camera_id: d.cameraId, kind: d.kind, payload: d.payload, created_at: d.createdAt,
    }]) });
    return d;
  }
  async listDetections(deviceId?: string, limit = 100) {
    const filter = deviceId ? `device_id=eq.${encodeURIComponent(deviceId)}&` : '';
    const rows: any[] = await this.rest(`msds_detections?${filter}order=created_at.desc&limit=${limit}`);
    return rows.map(r => ({ id: r.id, deviceId: r.device_id, cameraId: r.camera_id, kind: r.kind, payload: r.payload, createdAt: r.created_at }));
  }
}

const memory = new MemoryRepository();

export function getRepository(env: Env): MsdsRepository {
  if ((env.DATA_BACKEND ?? 'memory') === 'supabase' && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    return new SupabaseRepository(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  }
  // TODO(d1): add a D1Repository using env.DB with the same interface.
  return memory;
}
