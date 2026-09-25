/**
 * Shared voice output for the whole app.
 *
 * Uses a smooth, natural-sounding female English voice when one is available
 * so the tutorial narration and the talking-accessibility mode sound the same.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

/** Preference order — the smoothest female voices across browsers/platforms. */
const FEMALE_HINTS = [
  'google uk english female',
  'google us english',
  'samantha',
  'karen',
  'moira',
  'serena',
  'tessa',
  'microsoft aria',
  'microsoft jenny',
  'microsoft zira',
  'fiona',
  'victoria',
  'female',
];

export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const english = voices.filter(v => /^en(-|_)?/i.test(v.lang));
  const pool = english.length ? english : voices;
  for (const hint of FEMALE_HINTS) {
    const match = pool.find(v => v.name.toLowerCase().includes(hint));
    if (match) { cachedVoice = match; return match; }
  }
  cachedVoice = pool[0] ?? null;
  return cachedVoice;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };
  pickVoice();
}

export interface SpeakOptions {
  /** Cancel anything currently being spoken first. Default true. */
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
}

/** Speak a sentence with the app's standard soft female voice. */
export function speak(text: string, opts: SpeakOptions = {}) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (opts.interrupt !== false) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    // Slightly slower + warmer than the default for seniors and low-vision users.
    u.rate = opts.rate ?? 0.94;
    u.pitch = opts.pitch ?? 1.15;
    u.volume = opts.volume ?? 1;
    const voice = pickVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    window.speechSynthesis.speak(u);
  } catch { /* speech is best-effort */ }
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}
