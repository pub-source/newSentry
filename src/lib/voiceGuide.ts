/**
 * Talking accessibility ("blind mode").
 *
 * When enabled, the whole app behaves like a screen reader made for this
 * dashboard: buttons, links, sliders and headings are spoken as you move
 * through them with the keyboard or the mouse, and important events can be
 * announced from anywhere with `announce()`.
 */
import { speak, stopSpeaking } from './speech';

let enabled = false;
let lastSpoken = '';
let lastAt = 0;

export function isVoiceGuideEnabled() {
  return enabled;
}

function labelOf(el: Element): string {
  const node = el as HTMLElement;
  const aria = node.getAttribute('aria-label');
  if (aria) return aria;
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) {
    const t = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (t) return t;
  }
  const title = node.getAttribute('title');
  if (title) return title;
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    const labelEl = node.id ? document.querySelector(`label[for="${CSS.escape(node.id)}"]`) : null;
    const base = labelEl?.textContent?.trim() || node.placeholder || node.name || 'input';
    if (node instanceof HTMLInputElement && node.type === 'range') return `${base}, slider, value ${node.value}`;
    if (node instanceof HTMLInputElement && node.type === 'checkbox') return `${base}, ${node.checked ? 'checked' : 'not checked'}`;
    return `${base}, ${node.value ? `contains ${node.value}` : 'empty'}`;
  }
  const img = node.querySelector('img[alt]');
  if (img) return (img as HTMLImageElement).alt;
  const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text.slice(0, 160);
}

function roleOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  if (role) return role;
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'select') return 'dropdown';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  return '';
}

function describe(el: Element): string {
  const label = labelOf(el);
  if (!label) return '';
  const role = roleOf(el);
  const pressed = el.getAttribute('aria-pressed');
  const state = pressed === 'true' ? ', on' : pressed === 'false' ? ', off' : '';
  const disabled = (el as HTMLButtonElement).disabled ? ', unavailable' : '';
  return `${label}${role ? `, ${role}` : ''}${state}${disabled}`;
}

function say(text: string, interrupt = true) {
  const now = Date.now();
  if (!text) return;
  if (text === lastSpoken && now - lastAt < 1200) return;
  lastSpoken = text;
  lastAt = now;
  speak(text, { interrupt });
}

/** Speak an app event (alerts, status changes) when talking mode is on. */
export function announce(text: string, interrupt = false) {
  if (!enabled) return;
  say(text, interrupt);
}

const INTERACTIVE =
  'button, a[href], input, select, textarea, [role="button"], [role="dialog"], h1, h2, h3, [data-speak]';

function onFocusIn(e: FocusEvent) {
  const el = (e.target as Element)?.closest?.(INTERACTIVE);
  if (el) say(describe(el));
}

let hoverTimer: number | null = null;
function onPointerOver(e: Event) {
  const el = (e.target as Element)?.closest?.(INTERACTIVE);
  if (!el) return;
  if (hoverTimer) window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => say(describe(el)), 260);
}

function onKeyDown(e: KeyboardEvent) {
  // Escape silences the current sentence, like a screen reader.
  if (e.key === 'Escape') stopSpeaking();
}

export function setVoiceGuide(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  if (on) {
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.documentElement.classList.add('voice-guide');
    speak(
      'Talking mode is on. I am M S D S, your monitoring assistant. Move with the Tab key or your mouse and I will read everything out loud. Press Escape at any time to stop me talking.',
    );
  } else {
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('pointerover', onPointerOver, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.documentElement.classList.remove('voice-guide');
    speak('Talking mode is off.');
  }
}
