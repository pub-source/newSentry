import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAccessibility } from "./hooks/useAccessibility";

import { installModelCache, prefetchModels, forceMemoryStrategy, whenCacheReady } from "./lib/modelCache";

// Install the ML model cache as early as possible so the very first
// COCO-SSD / face-api fetches can be intercepted and persisted.
(async () => {
  // Request persistent storage permission so the browser keeps our
  // cached model assets and cookies across sessions on every device.
  // If the user (or browser policy) denies it, gracefully fall back to
  // in-memory caching so the app stays usable.
  let persistGranted: boolean | undefined;
  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted?.();
      if (!already) {
        persistGranted = await navigator.storage.persist();
      } else {
        persistGranted = true;
      }
    }
  } catch {
    persistGranted = false;
  }
  if (persistGranted === false) {
    forceMemoryStrategy();
  }
  await installModelCache();
  // Guarantee the strategy decision is finalized before any warm-up.
  await whenCacheReady();
  // Auto warm-up: prefetch ML models in the background once the app opens
  // so the first Start runs with everything already cached.
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => { void prefetchModels(); }, { timeout: 4000 });
  } else {
    setTimeout(() => { void prefetchModels(); }, 1500);
  }
})();

initAccessibility();
createRoot(document.getElementById("root")!).render(<App />);

