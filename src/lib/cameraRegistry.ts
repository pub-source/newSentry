import {
  CameraConfig,
  DEFAULT_SETTINGS,
  DetectionEvent,
  MultiCamSettings,
} from '@/types/multicam';

const CAMERAS_KEY = 'msd-cameras-v1';
const SETTINGS_KEY = 'msd-multicam-settings-v1';
const EVENTS_KEY = 'msd-detection-events-v1';
const MAX_EVENTS = 500;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
};

const readArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cam';

export const loadCameras = (): CameraConfig[] => readArray<CameraConfig>(CAMERAS_KEY);
export const saveCameras = (cams: CameraConfig[]) => write(CAMERAS_KEY, cams);

export const loadSettings = (): MultiCamSettings => read(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveSettings = (s: MultiCamSettings) => write(SETTINGS_KEY, s);

export const loadEvents = (): DetectionEvent[] => readArray<DetectionEvent>(EVENTS_KEY);
export const saveEvents = (e: DetectionEvent[]) => write(EVENTS_KEY, e.slice(0, MAX_EVENTS));

export function makeCamera(partial: Partial<CameraConfig>): CameraConfig {
  const name = partial.name?.trim() || 'New Camera';
  return {
    id: partial.id || crypto.randomUUID(),
    name,
    path: partial.path?.trim() || slugify(name),
    location: partial.location?.trim() || '',
    rtspUrl: partial.rtspUrl?.trim() || '',
    enabled: partial.enabled ?? true,
    aiEnabled: partial.aiEnabled ?? true,
    recording: partial.recording ?? false,
    createdAt: partial.createdAt || new Date().toISOString(),
  };
}
