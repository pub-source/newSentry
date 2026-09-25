"""Shared, lazily-loaded Whisper engine (one model for all cameras)."""
from __future__ import annotations

import sys
import threading
from typing import Optional

import re

from .binaries import pip_install_command
from .config import WHISPER_MODEL

# Languages the household actually speaks. Anything else detected with very low
# confidence is treated as noise rather than speech.
ALLOWED_LANGUAGES = {"en", "tl", "fil"}

# Phrases Whisper famously invents when it hears silence, hum or static.
HALLUCINATION_PATTERNS = [
    r"^there'?s? (is )?something (in|over) there\.?$",
    r"^thank(s| you)( for watching| very much)?[.!]?$",
    r"^thanks for watching[.!]?$",
    r"^please subscribe.*$",
    r"^subtitles? by.*$",
    r"^amara\.org.*$",
    r"^sub(title)?s? (by|provided).*$",
    r"^you[.!]?$",
    r"^bye[.!]?$",
    r"^\.*$",
    r"^(mm+|hm+|uh+|ah+|oh+)[.!]?$",
    r"^\[.*\]$",
    r"^\(.*\)$",
    r"^♪+.*♪*$",
    r"^salamat sa panonood.*$",
    r"^mag-?subscribe.*$",
]
_HALLUCINATION_RE = [re.compile(p, re.IGNORECASE) for p in HALLUCINATION_PATTERNS]

# Short distress words must never be filtered out as "too short / noise".
KEEP_ALWAYS = {
    "help", "fire", "stop", "police", "tulong", "saklolo", "sunog", "aray",
    "pulis", "ambulansya", "masakit", "huwag", "wag",
}


def _normalise_repetition(text: str) -> str:
    """Collapse Whisper loops while preserving ordinary repeated speech.

    Noisy CCTV chunks can make Whisper emit the same word or sentence dozens
    of times. Keeping at most two adjacent copies still represents emphasis
    ("help, help") without filling the live panel with model hallucinations.
    """
    words = text.split()
    if not words:
        return ""

    collapsed: list[str] = []
    previous_key = ""
    repeat_count = 0
    for word in words:
        key = re.sub(r"[^\w']", "", word, flags=re.UNICODE).lower()
        if key and key == previous_key:
            repeat_count += 1
            if repeat_count > 2:
                continue
        else:
            previous_key = key
            repeat_count = 1
        collapsed.append(word)

    cleaned = " ".join(collapsed).strip()
    # Also collapse adjacent repeated multi-word sentences/phrases.
    parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+", cleaned) if part.strip()]
    unique_parts: list[str] = []
    previous_part = ""
    part_repeats = 0
    for part in parts:
        key = re.sub(r"[^\w']", " ", part, flags=re.UNICODE).lower()
        key = " ".join(key.split())
        if key and key == previous_part:
            part_repeats += 1
            if part_repeats > 2:
                continue
        else:
            previous_part = key
            part_repeats = 1
        unique_parts.append(part)
    return " ".join(unique_parts).strip()


def is_hallucination(text: str) -> bool:
    stripped = text.strip()
    if stripped.lower().strip(" .!?,").replace("!", "") in KEEP_ALWAYS:
        return False
    if len(stripped) < 2:
        return True
    return any(rx.match(stripped) for rx in _HALLUCINATION_RE)


class WhisperEngine:
    """`state` distinguishes:
      - "package_missing"  -> faster-whisper is not installed in THIS interpreter
      - "model_error"      -> package present but model download/load failed
      - "loading"          -> model is being fetched/loaded right now
      - "ready" / "idle"   -> usable
    """

    def __init__(self) -> None:
        self.model = None
        self.model_name = WHISPER_MODEL
        self.available = False
        self.state = "idle"
        self.error: Optional[str] = None
        self.lock = threading.Lock()
        try:
            from faster_whisper import WhisperModel  # noqa: F401
            self.available = True
        except Exception as exc:
            self.available = False
            self.state = "package_missing"
            self.error = (
                f"faster-whisper is not installed in this Python ({sys.executable}): {exc}. "
                f"Install it into the SAME interpreter with:  {pip_install_command()}"
            )

    def load(self):
        if self.model is not None:
            return self.model
        if not self.available:
            raise RuntimeError(self.error or "faster-whisper is not installed")
        with self.lock:
            if self.model is None:
                from faster_whisper import WhisperModel
                self.state = "loading"
                try:
                    # CPU-only, int8: works on every laptop, no GPU required.
                    self.model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
                    self.error = None
                    self.state = "ready"
                except Exception as exc:
                    self.state = "model_error"
                    self.error = (
                        f"Whisper model '{WHISPER_MODEL}' could not be loaded/downloaded: {exc}. "
                        "The first run needs internet access to fetch the model; "
                        "set MSD_WHISPER_MODEL=tiny for a smaller download."
                    )
                    raise RuntimeError(self.error) from exc
        return self.model

    def transcribe(self, wav_path: str) -> str:
        """Multilingual (English + Tagalog) transcription with hallucination guards.

        Filters are tuned for real CCTV microphones: quiet, reverberant and noisy.
        They must reject silence-driven phantom sentences without discarding
        genuine (often short) speech such as "tulong" or "help".
        """
        if not self.available:
            raise RuntimeError(self.error or "faster-whisper is not installed")
        model = self.load()
        with self.lock:
            segments, info = model.transcribe(
                wav_path,
                language=None,              # auto-detect (Tagalog, English, ...)
                task="transcribe",          # never translate — keep "tulong" as "tulong"
                vad_filter=True,
                vad_parameters={
                    "min_silence_duration_ms": 300,
                    "threshold": 0.35,       # permissive: CCTV mics are quiet
                    "min_speech_duration_ms": 200,
                    "speech_pad_ms": 250,
                },
                condition_on_previous_text=False,  # stops repeat/echo hallucinations
                no_speech_threshold=0.7,
                log_prob_threshold=-1.2,
                temperature=[0.0, 0.2, 0.4],
                beam_size=5,
                initial_prompt="Tagalog at English na usapan sa bahay. Help, tulong, saklolo, sunog.",
            )
            lang = getattr(info, "language", "") or ""
            lang_prob = getattr(info, "language_probability", 1.0) or 0.0
            # Only reject when the detector is *really* unsure about a language
            # nobody in the household speaks — that is where phantoms come from.
            if lang not in ALLOWED_LANGUAGES and lang_prob < 0.35:
                return ""

            kept = []
            for seg in segments:
                text = (seg.text or "").strip()
                if not text:
                    continue
                if getattr(seg, "no_speech_prob", 0.0) > 0.85:
                    continue
                if getattr(seg, "avg_logprob", 0.0) < -1.4:
                    continue
                if is_hallucination(text):
                    continue
                kept.append(text)
            return _normalise_repetition(" ".join(kept).strip())


WHISPER = WhisperEngine()
