import type { DetectedObject } from '@/types/dashboard';
import type { CctvAudioStatus } from '@/lib/multiCamServer';


export type CameraStatus = 'offline' | 'connecting' | 'online' | 'error';
export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4';
export type StreamQuality = 'auto' | 'high' | 'low';

/** A CCTV camera the user configured. Stored locally (localStorage). */
export interface CameraConfig {
  id: string;
  /** MediaMTX path, e.g. "front" -> http://server:8888/front/index.m3u8 */
  path: string;
  name: string;
  location: string;
  rtspUrl: string;
  /** HLS URL returned by the backend (authoritative). */
  streamUrl?: string;
  enabled: boolean;
  /** AI detection on/off for this camera (independent pipeline). */
  aiEnabled: boolean;
  recording: boolean;
  createdAt: string;
}

export interface MultiCamSettings {
  mediamtxHost: string;   // e.g. http://127.0.0.1:8888
  pythonServer: string;   // e.g. http://127.0.0.1:5000
  fireThreshold: number;      // 0..1
  objectThreshold: number;    // 0..1
  audioThreshold: number;     // 0..1
  maxCameras: number;
  gridLayout: GridLayout;
  streamQuality: StreamQuality;
}

export type DetectionType =
  | 'object'
  | 'human'
  | 'fire'
  | 'smoke'
  | 'face-distress'
  | 'audio-distress'
  | 'saliency';

export interface DetectionEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  location: string;
  type: DetectionType;
  label: string;
  confidence: number;    // 0..1
  timestamp: string;     // ISO
  snapshot?: string;     // data URL
  /** Object URL of the 10-second emergency clip (this session only). */
  clipUrl?: string;
  /** File name of the clip saved on the user's computer. */
  clipFile?: string;
}

/** Live, per-camera pipeline state. Never shared between cameras. */
export interface CameraRuntime {
  cameraId: string;
  status: CameraStatus;
  error: string | null;
  fps: number;
  latencyMs: number;
  saliencyScore: number;
  /** Per-camera multimodal score: visual saliency + objects + CCTV audio distress. */
  attentionScore: number;
  objects: DetectedObject[];
  humanCount: number;
  fire: { detected: boolean; confidence: number; bbox?: [number, number, number, number] };
  smoke: { detected: boolean; confidence: number };
  faceDistress: { detected: boolean; label: string; confidence: number };
  audioDistress: { detected: boolean; keyword: string; confidence: number; transcript: string };
  /** Rolling live transcription of everything heard on this camera. */
  transcript: string;
  /** True while transcripts are being polled from the backend. */
  audioListening: boolean;
  /** Compact per-camera audio/Whisper diagnostics from the local bridge. */
  audio: CctvAudioStatus | null;
  /** Human-readable reason transcription is (not) producing words. */
  audioMessage: string;
  audioTone: 'ok' | 'wait' | 'error';
  /** False when the local bridge could not be reached on the last poll. */
  audioBackendReachable: boolean;
  lastDetectionAt: string | null;
  detections: number;
  alerts: number;

}

export const DEFAULT_SETTINGS: MultiCamSettings = {
  mediamtxHost: 'http://127.0.0.1:8888',
  pythonServer: 'http://127.0.0.1:5000',
  fireThreshold: 0.55,
  objectThreshold: 0.45,
  audioThreshold: 0.6,
  maxCameras: 16,
  gridLayout: '2x2',
  streamQuality: 'auto',
};

export function hlsUrlFor(camera: CameraConfig, settings: MultiCamSettings) {
  // Always prefer the HLS URL the backend reported for this camera.
  if (camera.streamUrl?.trim()) return camera.streamUrl.trim();
  const host = settings.mediamtxHost.trim().replace(/\/+$/, '');
  return `${host}/${camera.path.replace(/^\/+|\/+$/g, '')}/index.m3u8`;
}
