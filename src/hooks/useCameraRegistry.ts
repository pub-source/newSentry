import { useCallback, useEffect, useState } from 'react';
import {
  loadCameras, saveCameras, loadSettings, saveSettings, loadEvents, saveEvents, makeCamera,
} from '@/lib/cameraRegistry';
import type { CameraConfig, DetectionEvent, MultiCamSettings } from '@/types/multicam';

const CAMERAS_EVT = 'msd-cameras-changed';
const EVENTS_EVT = 'msd-events-changed';

/** Shared, localStorage-backed camera registry. Safe to use from many pages. */
export function useCameraRegistry() {
  const [cameras, setCameras] = useState<CameraConfig[]>(loadCameras);
  const [settings, setSettings] = useState<MultiCamSettings>(loadSettings);
  const [events, setEvents] = useState<DetectionEvent[]>(loadEvents);

  useEffect(() => {
    const sync = () => { setCameras(loadCameras()); setSettings(loadSettings()); };
    const syncEvents = () => setEvents(loadEvents());
    window.addEventListener(CAMERAS_EVT, sync);
    window.addEventListener(EVENTS_EVT, syncEvents);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CAMERAS_EVT, sync);
      window.removeEventListener(EVENTS_EVT, syncEvents);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const commit = useCallback((next: CameraConfig[]) => {
    saveCameras(next);
    setCameras(next);
    window.dispatchEvent(new Event(CAMERAS_EVT));
  }, []);

  const addCamera = useCallback((partial: Partial<CameraConfig>) => {
    const current = loadCameras();
    const cam = makeCamera(partial);
    // keep MediaMTX paths unique
    let path = cam.path, n = 2;
    while (current.some(c => c.path === path)) path = `${cam.path}-${n++}`;
    const next = [...current, { ...cam, path }];
    commit(next);
    return cam.id;
  }, [commit]);

  const updateCamera = useCallback((id: string, patch: Partial<CameraConfig>) => {
    commit(loadCameras().map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, [commit]);

  const deleteCamera = useCallback((id: string) => {
    commit(loadCameras().filter(c => c.id !== id));
  }, [commit]);

  const updateSettings = useCallback((patch: Partial<MultiCamSettings>) => {
    const next = { ...loadSettings(), ...patch };
    saveSettings(next);
    setSettings(next);
    window.dispatchEvent(new Event(CAMERAS_EVT));
  }, []);

  const addEvent = useCallback((evt: DetectionEvent) => {
    const next = [evt, ...loadEvents()];
    saveEvents(next);
    setEvents(next.slice(0, 500));
    window.dispatchEvent(new Event(EVENTS_EVT));
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<DetectionEvent>) => {
    const next = loadEvents().map(e => (e.id === id ? { ...e, ...patch } : e));
    saveEvents(next);
    setEvents(next.slice(0, 500));
    window.dispatchEvent(new Event(EVENTS_EVT));
  }, []);

  const clearEvents = useCallback(() => {
    saveEvents([]);
    setEvents([]);
    window.dispatchEvent(new Event(EVENTS_EVT));
  }, []);

  return {
    cameras, settings, events,
    addCamera, updateCamera, deleteCamera, updateSettings, addEvent, updateEvent, clearEvents,
  };
}
