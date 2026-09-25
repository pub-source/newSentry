import { useCallback, useRef, useState } from 'react';

/**
 * Push-to-talk: capture the laptop microphone and send it to the CCTV
 * speaker through the local camera server (ONVIF / RTSP back-channel).
 */
export function useCctvTalk(server: string, cameraId: string) {
  const [talking, setTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTalk = useCallback(() => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    setTalking(false);
    try { rec?.state !== 'inactive' && rec?.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startTalk = useCallback(async () => {
    if (recorderRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (!blob.size) return;
        try {
          const form = new FormData();
          form.append('audio', blob, 'talk.webm');
          const res = await fetch(`${server.replace(/\/+$/, '')}/cameras/${cameraId}/talk`, {
            method: 'POST',
            body: form,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data?.success === false) setError(data.error || 'Camera refused the audio');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not reach the camera server');
        }
      };
      rec.start();
      setTalking(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone unavailable');
      setTalking(false);
    }
  }, [server, cameraId]);

  return { talking, error, startTalk, stopTalk };
}
