// Adaptive client-side caching for ML model assets.
// Picks between in-memory cache (small/low-storage devices) and persistent
// Cache Storage (most desktops) based on navigator.deviceMemory and
// StorageManager.estimate(). Tracks hit/miss stats and last-download
// timestamps so the UI can show what's cached.

const CACHE_NAME = 'msd-model-cache-v1';
const STATS_KEY = 'msd-model-cache-stats-v1';

const CACHED_HOSTS = [
  'storage.googleapis.com',
  'tfhub.dev',
  'cdn.jsdelivr.net',
  'unpkg.com',
];
const CACHED_HINTS = ['model.json', '.bin', 'manifest.json', '-shard', 'weights'];

// Known warm-up endpoints so we can prefetch on demand.
export const PREFETCH_URLS: { label: string; url: string }[] = [
  {
    label: 'COCO-SSD model.json',
    url: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json',
  },
  {
    label: 'face-api tiny detector',
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model-weights_manifest.json',
  },
  {
    label: 'face-api expression net',
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_expression_model-weights_manifest.json',
  },
];

export type CacheStrategy = 'persistent' | 'memory';

export interface CacheStats {
  strategy: CacheStrategy;
  hits: number;
  misses: number;
  bytesFetched: number;
  lastDownloads: Record<string, number>; // url -> epoch ms
}

const memoryCache = new Map<string, Response>();
let strategy: CacheStrategy = 'persistent';
let strategyForced = false;
let installed = false;
let installPromise: Promise<void> | null = null;
let resolveReady: () => void;
const readyPromise: Promise<void> = new Promise((res) => { resolveReady = res; });

export function whenCacheReady(): Promise<void> {
  return readyPromise;
}

const stats: CacheStats = loadStats();
const listeners = new Set<(s: CacheStats) => void>();

function loadStats(): CacheStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { ...JSON.parse(raw), strategy: 'persistent' };
  } catch {}
  return { strategy: 'persistent', hits: 0, misses: 0, bytesFetched: 0, lastDownloads: {} };
}

function persistStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
  listeners.forEach(l => l({ ...stats, lastDownloads: { ...stats.lastDownloads } }));
}

export function subscribeCacheStats(fn: (s: CacheStats) => void): () => void {
  listeners.add(fn);
  fn({ ...stats, lastDownloads: { ...stats.lastDownloads } });
  return () => listeners.delete(fn);
}

export function getCacheStats(): CacheStats {
  return { ...stats, lastDownloads: { ...stats.lastDownloads } };
}

export function forceMemoryStrategy(): void {
  strategy = 'memory';
  stats.strategy = 'memory';
  strategyForced = true;
  persistStats();
  console.log('[ModelCache] Forced memory-only strategy (persistent storage denied)');
}

function shouldCache(url: string): boolean {
  try {
    const u = new URL(url);
    if (!CACHED_HOSTS.some(h => u.hostname.endsWith(h))) return false;
    return CACHED_HINTS.some(h => u.pathname.includes(h));
  } catch { return false; }
}

async function pickStrategy(): Promise<CacheStrategy> {
  // Heuristic: low device memory (<2 GB) OR very limited storage quota → memory.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = nav.deviceMemory ?? 4;
  if (deviceMemory < 2) return 'memory';
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const free = (est.quota ?? 0) - (est.usage ?? 0);
      // Need at least ~80 MB free for the model bundles.
      if (free && free < 80 * 1024 * 1024) return 'memory';
    }
  } catch {}
  if (typeof window === 'undefined' || !('caches' in window)) return 'memory';
  return 'persistent';
}

async function cacheGet(url: string): Promise<Response | undefined> {
  // L1: in-memory (works on every device, including private mode / no Cache API)
  const mem = memoryCache.get(url);
  if (mem) return mem.clone();
  // L2: persistent Cache Storage when available
  if (strategy === 'persistent' && typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) {
        // Promote to memory for next call
        memoryCache.set(url, hit.clone());
        return hit;
      }
    } catch (e) {
      console.warn('[ModelCache] L2 read failed, degrading to memory-only', e);
      strategy = 'memory';
      stats.strategy = 'memory';
    }
  }
  return undefined;
}

async function cachePut(url: string, response: Response): Promise<void> {
  // Always populate memory so we never lose the asset for this session
  memoryCache.set(url, response.clone());
  if (strategy !== 'persistent' || typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, response.clone());
  } catch (e) {
    console.warn('[ModelCache] L2 write failed, staying memory-only', e);
    strategy = 'memory';
    stats.strategy = 'memory';
  }
}

export async function installModelCache(): Promise<void> {
  if (installPromise) return installPromise;
  if (typeof window === 'undefined' || !window.fetch) {
    resolveReady();
    return;
  }
  installed = true;
  installPromise = (async () => {

    try {
    if (!strategyForced) {
      strategy = await pickStrategy();
    }
    } catch {
    strategy = 'memory';
    }
    stats.strategy = strategy;
    persistStats();
    console.log(`[ModelCache] Strategy: ${strategy}`);

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input :
      input instanceof URL ? input.toString() :
      input.url;

    if (!shouldCache(url) || (init?.method && init.method.toUpperCase() !== 'GET')) {
      return originalFetch(input, init);
    }

    try {
      const hit = await cacheGet(url);
      if (hit) {
        stats.hits++;
        persistStats();
        return hit;
      }
      stats.misses++;
      const response = await originalFetch(input, init);
      if (response.ok) {
        await cachePut(url, response);
        const len = response.headers.get('content-length');
        if (len) stats.bytesFetched += parseInt(len, 10);
        stats.lastDownloads[url] = Date.now();
      }
      persistStats();
      return response;
    } catch (err) {
      console.warn('[ModelCache] interceptor error, falling back', err);
      return originalFetch(input, init);
    }
    };
    resolveReady();
  })();
  return installPromise;
}

export async function prefetchModels(
  onProgress?: (done: number, total: number, label: string) => void
): Promise<void> {
  // Make sure the cache strategy (persistent vs memory) has been decided
  // and the fetch interceptor is installed before we warm anything up,
  // so the very first Start always uses the correct caching path.
  await readyPromise;
  const total = PREFETCH_URLS.length;
  let done = 0;
  for (const { url, label } of PREFETCH_URLS) {
    try {
      onProgress?.(done, total, label);
      // Touch through the patched fetch so caching + stats kick in.
      await fetch(url, { method: 'GET', cache: 'reload' }).catch(() => {});
    } finally {
      done++;
      onProgress?.(done, total, label);
    }
  }
}

export async function clearModelCache(): Promise<void> {
  memoryCache.clear();
  if ('caches' in window) await caches.delete(CACHE_NAME);
  stats.hits = 0;
  stats.misses = 0;
  stats.bytesFetched = 0;
  stats.lastDownloads = {};
  persistStats();
}

export async function getModelCacheSize(): Promise<{ entries: number; bytes: number }> {
  if (strategy === 'memory') {
    let bytes = 0;
    for (const r of memoryCache.values()) {
      try { bytes += (await r.clone().arrayBuffer()).byteLength; } catch {}
    }
    return { entries: memoryCache.size, bytes };
  }
  if (!('caches' in window)) return { entries: 0, bytes: 0 };
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let bytes = 0;
  for (const req of keys) {
    const res = await cache.match(req);
    if (!res) continue;
    const len = res.headers.get('content-length');
    if (len) bytes += parseInt(len, 10);
    else {
      try { bytes += (await res.clone().arrayBuffer()).byteLength; } catch {}
    }
  }
  return { entries: keys.length, bytes };
}
