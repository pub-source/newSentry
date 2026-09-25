export type SaliencyMode = 'sobel' | 'laplacian' | 'motion';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type QualityMode = 'HD' | 'SD';

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, width, height
}

export type AudioEventType = 'speech' | 'clap' | 'scream' | 'bang' | 'none';

export interface AudioFeatures {
  decibel: number;
  speechDetected: boolean;
  pitchEstimate: number;
  waveform: number[];
  audioEvent: AudioEventType;
}

export interface Alert {
  id: string;
  timestamp: Date;
  message: string;
  severity: AlertSeverity;
  cameraId: number;
  snapshotId?: string;
}

export interface CameraState {
  id: number;
  deviceId: string | null;
  label: string;
  fps: number;
  active: boolean;
  stream: MediaStream | null;
  objects: DetectedObject[];
  saliencyScore: number;
}

export interface DashboardState {
  running: boolean;
  cameras: CameraState[];
  audioFeatures: AudioFeatures;
  attentionScore: number;
  alerts: Alert[];
  saliencyMode: SaliencyMode;
  threshold: number;
  showBoundingBoxes: boolean;
  showHeatmap: boolean;
  showAlerts: boolean;
  quality: QualityMode;
  mirror: boolean;
  heatmapOpacity: number;
  simulationMode: boolean;
  priorityObjects: string[];
}

// All 80 COCO-SSD classes
export const DETECTABLE_OBJECTS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
  'backpack', 'umbrella', 'handbag', 'tie', 'suitcase',
  'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
  'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet',
  'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
] as const;

// Indoor-only subset — the object picker is narrowed to things that actually
// appear inside a home (no vehicles, animals, sports or outdoor street items).
export const INDOOR_OBJECTS = [
  'person',
  'chair', 'couch', 'bed', 'dining table', 'potted plant', 'toilet', 'sink',
  'tv', 'laptop', 'cell phone', 'remote', 'keyboard', 'mouse',
  'bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
  'microwave', 'oven', 'toaster', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
  'backpack', 'handbag', 'umbrella', 'suitcase',
] as const;

export const DEFAULT_PRIORITY_OBJECTS = [
  'person',
  'chair',
  'book',
  'potted plant',
  'bottle', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'wine glass',
  // Screens are always tracked so fire-inside-TV/phone is flagged as false alarm
  'tv', 'cell phone', 'laptop',
];
