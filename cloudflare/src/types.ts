/** Shared Worker types (cloud only). */

export interface Env {
  /** Durable Object namespace for per-device realtime sessions. */
  DEVICE_SESSION: DurableObjectNamespace;

  // --- Secrets / vars: set via `wrangler secret put`, never committed. ---
  /** Shared token an MSDS device presents on every write request. */
  MSDS_DEVICE_TOKEN?: string;
  /** Supabase/Postgres REST endpoint used by the repository implementation. */
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  /** Repository backend selector: "supabase" | "memory" (| "d1" later). */
  DATA_BACKEND?: string;

  /** Optional D1 binding for a future migration away from Supabase. */
  DB?: D1Database;
}

export interface DeviceRecord {
  deviceId: string;
  name: string;
  version?: string;
  platform?: string;
  lastSeenAt: string;
  online: boolean;
  /** Free-form status published by the desktop app (camera counts, ffmpeg/whisper state). */
  status?: Record<string, unknown>;
}

export interface AlertRecord {
  id: string;
  deviceId: string;
  cameraId: string;
  type: string;          // fire | smoke | human | face-distress | audio-distress | object
  label: string;
  confidence: number;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface DetectionRecord {
  id: string;
  deviceId: string;
  cameraId: string;
  kind: 'detection' | 'transcript';
  payload: Record<string, unknown>;
  createdAt: string;
}
