import { useState, useCallback, useEffect } from 'react';
import type { CameraState, QualityMode } from '@/types/dashboard';

/**
 * Module-level camera store. Webcam / attached CCTV streams live outside React
 * so switching pages (dashboard -> household -> monitoring) never stops them.
 * Streams are only released when the user explicitly stops monitoring.
 */
const makeSlots = (): CameraState[] => [1, 2, 3, 4].map(id => ({
  id, deviceId: null, label: `Camera ${id}`, fps: 0, active: false,
  stream: null, objects: [], saliencyScore: 0,
}));

const store = {
  cameras: makeSlots(),
  devices: [] as MediaDeviceInfo[],
  streams: [] as MediaStream[],
  // Slots fed by an external stream (IP/CCTV/test video). These must never be
  // wiped by starting/stopping local webcams.
  externalSlots: new Set<number>(),
  listeners: new Set<() => void>(),
};

const notify = () => store.listeners.forEach(l => l());

const setCameras = (updater: (prev: CameraState[]) => CameraState[]) => {
  store.cameras = updater(store.cameras);
  notify();
};

export function useCamera() {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force(n => n + 1);
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, []);

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      store.devices = videoDevices;
      notify();
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const startCameras = useCallback(async (quality: QualityMode) => {
    const videoDevices = await enumerateDevices();
    const constraints = quality === 'HD'
      ? { width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 640 }, height: { ideal: 480 } };

    const newCameras: CameraState[] = [];
    const streams: MediaStream[] = [];

    // Each camera gets its OWN device. If a slot has no real device, it stays
    // OFFLINE — cams work independently or together depending on what's available.
    for (let i = 0; i < 4; i++) {
      if (store.externalSlots.has(i + 1)) {
        newCameras.push(null as unknown as CameraState); // placeholder, kept below
        continue;
      }
      const device = videoDevices[i];
      let stream: MediaStream | null = null;

      if (device) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: device.deviceId }, ...constraints },
            audio: false,
          });
        } catch {
          stream = null;
        }
      }

      if (stream) streams.push(stream);

      newCameras.push({
        id: i + 1,
        deviceId: device?.deviceId || null,
        label: device?.label || `Camera ${i + 1}`,
        fps: 0,
        active: !!stream,
        stream,
        objects: [],
        saliencyScore: 0,
      });
    }

    store.streams = streams;
    setCameras(prev => newCameras.map((c, i) => (c ? c : prev[i])));
    return newCameras.filter(Boolean);
  }, [enumerateDevices]);

  const stopCameras = useCallback(() => {
    const stopped = new Set<string>();
    store.streams.forEach(stream => {
      stream.getTracks().forEach(track => {
        if (!stopped.has(track.id)) {
          track.stop();
          stopped.add(track.id);
        }
      });
    });
    store.streams = [];
    setCameras(prev => prev.map(c => store.externalSlots.has(c.id)
      ? { ...c, fps: 0 }
      : { ...c, active: false, stream: null, fps: 0, objects: [], saliencyScore: 0 }));
  }, []);

  // Start a single, user-chosen webcam on a specific slot. Used when the
  // dashboard's Connect picker lets the user choose among multiple devices.
  const startSpecificCamera = useCallback(async (deviceId: string, slot: number, quality: QualityMode) => {
    const constraints = quality === 'HD'
      ? { width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 640 }, height: { ideal: 480 } };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, ...constraints },
        audio: false,
      });
      store.streams.push(stream);
      const devs = await navigator.mediaDevices.enumerateDevices();
      const dev = devs.find(d => d.deviceId === deviceId);
      setCameras(prev => prev.map(c => c.id === slot
        ? { ...c, deviceId, label: dev?.label || `Camera ${slot}`, stream, active: true, fps: 0 }
        : c));
      return true;
    } catch (err) {
      console.warn('[useCamera] startSpecificCamera failed:', err);
      return false;
    }
  }, []);

  const updateCamera = useCallback((id: number, update: Partial<CameraState>) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }, []);

  // Attach an external stream (e.g. an IP camera) to a specific slot.
  const attachStream = useCallback((id: number, stream: MediaStream | null, label?: string) => {
    setCameras(prev => prev.map(c => c.id === id
      ? { ...c, stream, active: !!stream, label: label ?? (stream ? `IP Cam ${id}` : c.label), fps: 0 }
      : c));
    if (stream) store.externalSlots.add(id);
    else store.externalSlots.delete(id);
  }, []);

  return {
    cameras: store.cameras,
    devices: store.devices,
    startCameras,
    stopCameras,
    updateCamera,
    attachStream,
    enumerateDevices,
    startSpecificCamera,
  };
}
