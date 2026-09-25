/**
 * Emergency clip recorder.
 *
 * When an emergency is detected the camera view records a short video clip
 * (default 10 seconds) straight from the live feed and stores it on the
 * user's own computer — either into a folder they picked (File System Access
 * API) or through the browser's normal download folder as a fallback.
 */

const FOLDER_LABEL_KEY = 'msds-clip-folder-label';
const CLIP_SECONDS_KEY = 'msds-clip-seconds';

type DirHandle = {
  name: string;
  requestPermission?: (opts: { mode: 'readwrite' }) => Promise<PermissionState>;
  queryPermission?: (opts: { mode: 'readwrite' }) => Promise<PermissionState>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<{
    createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
};

let folder: DirHandle | null = null;

export const clipFolderSupported = () =>
  typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>).showDirectoryPicker === 'function';

export const getClipFolderLabel = () => {
  try { return localStorage.getItem(FOLDER_LABEL_KEY) || ''; } catch { return ''; }
};

export const getClipSeconds = () => {
  const raw = Number(localStorage.getItem(CLIP_SECONDS_KEY));
  return Number.isFinite(raw) && raw >= 3 && raw <= 60 ? raw : 10;
};

export const setClipSeconds = (value: number) => {
  try { localStorage.setItem(CLIP_SECONDS_KEY, String(value)); } catch { /* quota */ }
};

/** Ask the user where emergency clips should be saved. */
export async function pickClipFolder(): Promise<string> {
  const picker = (window as unknown as { showDirectoryPicker?: (o?: unknown) => Promise<DirHandle> }).showDirectoryPicker;
  if (!picker) throw new Error('This browser cannot choose a folder. Clips go to your Downloads folder instead.');
  const handle = await picker({ id: 'msds-clips', mode: 'readwrite' });
  await handle.requestPermission?.({ mode: 'readwrite' });
  folder = handle;
  try { localStorage.setItem(FOLDER_LABEL_KEY, handle.name); } catch { /* quota */ }
  return handle.name;
}

export function forgetClipFolder() {
  folder = null;
  try { localStorage.removeItem(FOLDER_LABEL_KEY); } catch { /* quota */ }
}

function pickMimeType() {
  const options = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return options.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
}

/** Record `seconds` of the given live <video> element. */
export function recordClip(video: HTMLVideoElement, seconds = getClipSeconds()): Promise<Blob | null> {
  return new Promise(resolve => {
    try {
      const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
      const stream = capture ? capture.call(video) : null;
      if (!stream || stream.getTracks().length === 0) return resolve(null);
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const parts: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
      rec.onstop = () => resolve(parts.length ? new Blob(parts, { type: rec.mimeType || 'video/webm' }) : null);
      rec.onerror = () => resolve(null);
      rec.start();
      window.setTimeout(() => { try { rec.stop(); } catch { resolve(null); } }, seconds * 1000);
    } catch {
      resolve(null);
    }
  });
}

/** Save a clip to the chosen folder, or fall back to a normal download. */
export async function saveClip(blob: Blob, filename: string): Promise<string> {
  if (folder) {
    try {
      const file = await folder.getFileHandle(filename, { create: true });
      const writable = await file.createWritable();
      await writable.write(blob);
      await writable.close();
      return folder.name;
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'Downloads';
}

export const clipFileName = (cameraName: string, type: string) =>
  `${cameraName.replace(/[^\w-]+/g, '_')}-${type}-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
