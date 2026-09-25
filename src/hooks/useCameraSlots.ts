import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type CameraConfig, type MultiCamSettings } from '@/types/multicam';

export type SlotCount = 1 | 2 | 3 | 4;

/** One camera slot: the user only ever types the camera's local-server IP. */
export interface CameraSlot {
  index: number;          // 1-based -> cam1, cam2, cam4...
  name: string;
  ip: string;             // e.g. 192.168.18.93
  /** Optional RTSP credentials (kept in local storage only, never in source). */
  username: string;
  password: string;
  /** RTSP port + stream path — configurable, defaults 554 and /stream1. */
  port: number;
  streamPath: string;
  aiEnabled: boolean;
  /** HLS URL reported by the backend after Connect. */
  streamUrl?: string;
  /** True once the backend confirmed ffmpeg + HLS for this slot. */
  connected?: boolean;
}

interface SlotState {
  count: SlotCount;
  slots: CameraSlot[];
}

/** Defaults — structured so they can be made configurable per camera later. */
export const DEFAULT_RTSP_PORT = 554;
export const DEFAULT_STREAM_PATH = '/stream1';
/** Ports tried automatically when the slot is left on "Auto" (port = 0). */
export const AUTO_RTSP_PORTS = [554, 8554, 88, 10554, 8080];

const KEY = 'msd-camera-slots-v1';
const EVT = 'msd-camera-slots-changed';

export const makeSlot = (index: number): CameraSlot => ({
  index,
  name: `Camera ${index}`,
  ip: '',
  username: '',
  password: '',
  port: 0, // 0 = Auto: the app finds a port the camera answers on
  streamPath: DEFAULT_STREAM_PATH,
  aiEnabled: true,
  streamUrl: '',
  connected: false,
});

const normalize = (state: Partial<SlotState>): SlotState => {
  const count = ([1, 2, 3, 4] as SlotCount[]).includes(state.count as SlotCount)
    ? (state.count as SlotCount)
    : 1;
  const existing = Array.isArray(state.slots) ? state.slots : [];
  const slots = Array.from({ length: 4 }, (_, i) => ({
    ...makeSlot(i + 1),
    ...(existing.find(s => s?.index === i + 1) ?? {}),
    index: i + 1,
  }));
  return { count, slots };
};

const load = (): SlotState => {
  try {
    const raw = localStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : {});
  } catch {
    return normalize({});
  }
};

const save = (s: SlotState) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
};

const HOST_KEY = 'msd-slot-server-host';
const cleanHost = (v: string) =>
  v.trim().replace(/^https?:\/\//, '').replace(/[:/].*$/, '');

export const loadServerHost = () => localStorage.getItem(HOST_KEY) || '127.0.0.1';
export const saveServerHost = (v: string) => localStorage.setItem(HOST_KEY, cleanHost(v) || '127.0.0.1');
export const serverUrlFor = (host: string) => `http://${cleanHost(host) || '127.0.0.1'}:5000`;
export const hlsHostFor = (host: string) => `http://${cleanHost(host) || '127.0.0.1'}:8888`;

/** Each slot publishes its own MediaMTX section: cam1, cam2, cam4. */
export const slotPath = (slot: CameraSlot) => `cam${slot.index}`;

/** RTSP derived from the camera fields: rtsp://user:pass@ip:port/path */
export const slotRtsp = (slot: CameraSlot) => {
  const host = cleanHost(slot.ip);
  if (!host) return '';
  const user = (slot.username || '').trim();
  const pass = slot.password || '';
  const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const port = Number(slot.port) > 0 ? Number(slot.port) : DEFAULT_RTSP_PORT;
  const raw = (slot.streamPath || DEFAULT_STREAM_PATH).trim();
  const path = raw ? (raw.startsWith('/') ? raw : `/${raw}`) : DEFAULT_STREAM_PATH;
  return `rtsp://${auth}${host}:${port}${path}`;
};

/** Same RTSP URL but forced onto a specific port — used by auto port detection. */
export const slotRtspWithPort = (slot: CameraSlot, port: number) =>
  slotRtsp({ ...slot, port });

/** Same URL with the password masked — safe for display. */
export const slotRtspMasked = (slot: CameraSlot) =>
  slot.password ? slotRtsp(slot).replace(`:${encodeURIComponent(slot.password)}@`, ':••••••@') : slotRtsp(slot);

/** Independent pipeline settings for one slot (its own section + audio events). */
export const slotSettings = (slot: CameraSlot, base: MultiCamSettings = DEFAULT_SETTINGS): MultiCamSettings => {
  const host = loadServerHost();
  return { ...base, mediamtxHost: hlsHostFor(host), pythonServer: serverUrlFor(host) };
};

export const slotCamera = (slot: CameraSlot): CameraConfig => ({
  id: `slot-${slot.index}`,
  path: slotPath(slot),
  name: slot.name || `Camera ${slot.index}`,
  location: slot.ip ? `Camera IP ${slot.ip}` : '',
  rtspUrl: slotRtsp(slot),
  streamUrl: slot.streamUrl || '',
  enabled: !!slot.ip.trim() && !!slot.connected,
  aiEnabled: slot.aiEnabled,
  recording: false,
  createdAt: new Date(0).toISOString(),
});

export function useCameraSlots() {
  const [state, setState] = useState<SlotState>(load);

  useEffect(() => {
    const sync = () => setState(load());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const commit = useCallback((next: SlotState) => {
    save(next);
    setState(next);
    window.dispatchEvent(new Event(EVT));
  }, []);

  const setCount = useCallback((count: SlotCount) => {
    commit({ ...load(), count });
  }, [commit]);

  const updateSlot = useCallback((index: number, patch: Partial<CameraSlot>) => {
    const cur = load();
    commit({ ...cur, slots: cur.slots.map(s => (s.index === index ? { ...s, ...patch } : s)) });
  }, [commit]);

  const activeSlots = state.slots.slice(0, state.count);

  return { count: state.count, slots: state.slots, activeSlots, setCount, updateSlot };
}
