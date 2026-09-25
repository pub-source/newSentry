"""One fully independent pipeline per camera (video + audio + Whisper)."""
from __future__ import annotations

import glob
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
from dataclasses import dataclass, field
from typing import List, Optional

from .binaries import (MissingExecutable, install_hint, need_exe, no_window_flags,
                       now_iso, resolve_exe)
from .config import AUDIO_CHUNK_SECONDS, HLS_PORT, HLS_PROBE_TTL, RTSP_PORT, match_distress
from .whisper_engine import WHISPER

NO_AUDIO_MESSAGE = (
    "This camera's RTSP stream does not expose a usable audio track, so there is "
    "nothing to transcribe. Enable the microphone in the camera's own settings "
    "(or use an RTSP sub-stream that carries audio)."
)


def probe_streams(rtsp: str, transport: str = "tcp", timeout: int = 20) -> dict:
    """ffprobe an RTSP URL and return {ok, streams, error}."""
    ffprobe = resolve_exe("ffprobe", "FFPROBE_EXE")
    if not ffprobe:
        return {"ok": False, "streams": [], "error": install_hint("ffprobe", "FFPROBE_EXE")}
    cmd = [
        ffprobe, "-v", "error", "-rtsp_transport", transport,
        "-show_entries", "stream=index,codec_type,codec_name,sample_rate,channels",
        "-of", "json", rtsp,
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                             creationflags=no_window_flags())
    except subprocess.TimeoutExpired:
        return {"ok": False, "streams": [], "error": "ffprobe timed out reaching the camera"}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"ok": False, "streams": [], "error": f"could not run ffprobe: {exc}"}
    if out.returncode != 0:
        return {"ok": False, "streams": [],
                "error": (out.stderr or "").strip()[:400] or "ffprobe failed"}
    try:
        streams = json.loads(out.stdout or "{}").get("streams", [])
    except json.JSONDecodeError:
        streams = []
    return {"ok": True, "streams": streams, "error": None}



@dataclass
class Camera:
    id: str
    path: str
    name: str
    rtsp: str
    enabled: bool = True

    video_proc: Optional[subprocess.Popen] = None
    audio_proc: Optional[subprocess.Popen] = None
    audio_thread: Optional[threading.Thread] = None
    stop_flag: threading.Event = field(default_factory=threading.Event)
    restarts: int = 0
    error: Optional[str] = None
    events: List[dict] = field(default_factory=list)
    lock: threading.Lock = field(default_factory=threading.Lock)
    stderr_lines: List[str] = field(default_factory=list)
    started_at: float = 0.0
    audio_connected: bool = False
    audio_chunks: int = 0
    audio_bytes: int = 0
    audio_error: Optional[str] = None
    audio_ffmpeg_error: Optional[str] = None
    last_audio_chunk_at: Optional[str] = None
    last_transcription_at: Optional[str] = None
    last_transcript: str = ""
    # audio track discovery
    has_audio_track: Optional[bool] = None   # None = not probed yet
    audio_codec: Optional[str] = None
    audio_probe_error: Optional[str] = None
    audio_probed_at: Optional[str] = None
    audio_restarts: int = 0
    audio_source: Optional[str] = None          # which URL/transport is working
    audio_sources_tried: List[str] = field(default_factory=list)

    _hls_ok: bool = False
    _hls_checked: float = 0.0

    # ---- video: RTSP -> MediaMTX (copy, low CPU) --------------------------- #
    def _capture_video_errors(self, proc: subprocess.Popen):
        if not proc.stderr:
            return
        try:
            for raw in iter(proc.stderr.readline, b""):
                line = raw.decode("utf-8", errors="replace").strip()
                if line:
                    print(f"[FFmpeg {self.id}] {line}", flush=True)
                    with self.lock:
                        self.stderr_lines = (self.stderr_lines + [line])[-50:]
        except Exception:
            pass

    def last_video_error(self) -> str:
        with self.lock:
            return self.stderr_lines[-1] if self.stderr_lines else "RTSP stream ended"

    def start_video(self):
        if self.video_proc and self.video_proc.poll() is None:
            return

        ffmpeg = need_exe("ffmpeg", "FFMPEG_EXE")
        cmd = [
            ffmpeg,
            "-nostdin", "-hide_banner", "-loglevel", "warning",
            "-fflags", "+genpts+discardcorrupt",
            "-rtsp_transport", "tcp",
            "-i", self.rtsp,
            "-map", "0:v:0", "-map", "0:a:0?",
            "-c:v", "copy",
            "-c:a", "aac", "-ar", "16000", "-ac", "1",
            "-f", "rtsp",
            f"rtsp://127.0.0.1:{RTSP_PORT}/{self.path}",
        ]

        with self.lock:
            self.stderr_lines = []
        self.error = None
        self.started_at = time.time()

        self.video_proc = subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            creationflags=no_window_flags(),
        )
        threading.Thread(target=self._capture_video_errors,
                         args=(self.video_proc,), daemon=True).start()

    # ---- audio ------------------------------------------------------------- #
    def _audio_candidates(self) -> List[dict]:
        """Every way we know of to reach this camera's microphone.

        The republished MediaMTX stream comes first: the video pipeline already
        holds one RTSP session to the camera and many cheap cameras refuse a
        second one, which is the most common reason audio never arrives.
        """
        candidates: List[dict] = []
        if self.running():
            candidates.append({
                "label": "mediamtx",
                "url": f"rtsp://127.0.0.1:{RTSP_PORT}/{self.path}",
                "transport": "tcp",
            })
        if self.rtsp:
            candidates.append({"label": "camera-tcp", "url": self.rtsp, "transport": "tcp"})
            candidates.append({"label": "camera-udp", "url": self.rtsp, "transport": "udp"})
        return candidates

    def probe_audio(self) -> dict:
        """Detect whether this camera really exposes an audio track anywhere.

        Only a probe that succeeded and found no audio proves the camera is
        mute â€” a failed probe leaves `has_audio_track` unknown so capture is
        still attempted.
        """
        self.audio_probed_at = now_iso()
        candidates = self._audio_candidates()
        if not candidates:
            self.audio_probe_error = "no RTSP URL configured for this camera"
            self.has_audio_track = None
            return {"ok": False, "streams": [], "error": self.audio_probe_error}

        last_error = None
        probed_ok = False
        last_result = {"ok": False, "streams": [], "error": "not probed"}
        for cand in candidates:
            result = probe_streams(cand["url"], cand["transport"])
            last_result = result
            if not result["ok"]:
                last_error = f"{cand['label']}: {result['error']}"
                continue
            probed_ok = True
            audio = [s for s in result["streams"] if s.get("codec_type") == "audio"]
            if audio:
                self.audio_probe_error = None
                self.has_audio_track = True
                self.audio_codec = audio[0].get("codec_name")
                return result
        if probed_ok:
            # At least one probe worked and none of them saw audio.
            self.audio_probe_error = None
            self.has_audio_track = False
            self.audio_codec = None
        else:
            self.audio_probe_error = last_error
            self.has_audio_track = None
        return last_result

    def _segmenter_cmd(self, ffmpeg: str, cand: dict, pattern: str) -> List[str]:
        return [
            ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "warning",
            "-rtsp_transport", cand["transport"],
            "-use_wallclock_as_timestamps", "1",
            "-fflags", "+genpts+discardcorrupt",
            "-i", cand["url"],
            "-vn", "-sn", "-dn",
            # `a:0` picks the first audio stream whatever its index is.
            "-map", "0:a:0",
            "-af", "aresample=async=1",
            "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000",
            "-f", "segment", "-segment_time", str(AUDIO_CHUNK_SECONDS),
            "-reset_timestamps", "1",
            "-y", pattern,
        ]


    def _drain_audio_stderr(self, proc: subprocess.Popen):
        if not proc.stderr:
            return
        try:
            for raw in iter(proc.stderr.readline, b""):
                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                print(f"[FFmpeg audio {self.id}] {line}", flush=True)
                self.audio_ffmpeg_error = line[-500:]
        except Exception:
            pass

    def _handle_chunk(self, wav: str):
        size = os.path.getsize(wav)
        # 16 kHz mono s16 == 32 000 bytes/s; require ~0.5 s of real PCM.
        if size < 16000:
            return
        self.audio_connected = True
        self.audio_chunks += 1
        self.audio_bytes += size
        self.last_audio_chunk_at = now_iso()

        if not WHISPER.available:
            self.audio_error = WHISPER.error or "Whisper is unavailable"
            return
        try:
            transcript = WHISPER.transcribe(wav)
            self.audio_error = None
        except Exception as exc:
            self.audio_error = f"Whisper transcription failed: {exc}"
            self.error = self.audio_error
            return
        if not transcript:
            return

        # Overlapping RTSP chunks can return the same final phrase more than
        # once. Do not publish a duplicate event to the live UI.
        transcript_key = " ".join(transcript.lower().split()).strip(" .,!?")
        previous_key = " ".join(self.last_transcript.lower().split()).strip(" .,!?")
        if transcript_key and transcript_key == previous_key:
            return

        keyword, confidence = match_distress(transcript)
        timestamp = now_iso()
        self.last_transcription_at = timestamp
        self.last_transcript = transcript
        with self.lock:
            self.events.append({
                "camera_id": self.id,
                "timestamp": timestamp,
                "transcript": transcript,
                "keyword": keyword,
                "confidence": confidence,
            })
            self.events = self.events[-200:]
        print(f"[Audio {self.id}] transcript: {transcript}", flush=True)

    def _audio_loop(self):
        """Continuous RTSP audio capture.

        A long-lived ffmpeg segmenter writes WAV segments that are transcribed
        as soon as they close. If a source never produces a chunk we rotate to
        the next candidate (MediaMTX republish -> camera TCP -> camera UDP) so a
        camera that only allows one RTSP session still gets transcribed.
        """
        tmpdir = tempfile.mkdtemp(prefix=f"msd-audio-{self.path}-")
        pattern = os.path.join(tmpdir, "chunk-%05d.wav")
        last_probe = 0.0
        cand_index = 0

        # Load Whisper once up-front so the failure is visible immediately
        # instead of only after the first chunk.
        if WHISPER.available:
            try:
                WHISPER.load()
            except Exception as exc:
                self.audio_error = str(exc)
        else:
            self.audio_error = WHISPER.error or "Whisper is unavailable"

        try:
            while not self.stop_flag.is_set():
                # 1. Is there an audio track at all?
                if self.has_audio_track is not True and time.time() - last_probe > 45:
                    last_probe = time.time()
                    self.probe_audio()
                if self.has_audio_track is False:
                    self.audio_connected = False
                    self.audio_error = NO_AUDIO_MESSAGE
                    self.stop_flag.wait(30)
                    continue
                if self.has_audio_track is None and self.audio_probe_error:
                    # Probe failed; still try to capture â€” some cameras refuse ffprobe.
                    self.audio_error = (f"Could not inspect the camera's audio track "
                                        f"({self.audio_probe_error}); trying anyway.")

                # 2. Pick the next audio source to try.
                candidates = self._audio_candidates()
                if not candidates:
                    self.audio_connected = False
                    self.audio_error = "No RTSP URL is configured for this camera."
                    self.stop_flag.wait(10)
                    continue
                cand = candidates[cand_index % len(candidates)]

                try:
                    ffmpeg = need_exe("ffmpeg", "FFMPEG_EXE")
                except MissingExecutable as exc:
                    self.audio_connected = False
                    self.audio_error = str(exc)
                    self.error = self.audio_error
                    self.stop_flag.wait(10)
                    continue

                for stale in glob.glob(os.path.join(tmpdir, "chunk-*.wav")):
                    try:
                        os.remove(stale)
                    except OSError:
                        pass

                try:
                    self.audio_proc = subprocess.Popen(
                        self._segmenter_cmd(ffmpeg, cand, pattern),
                        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                        creationflags=no_window_flags(),
                    )
                except (OSError, subprocess.SubprocessError) as exc:
                    self.audio_connected = False
                    self.audio_error = (f"Could not start FFmpeg audio capture: {exc}. "
                                        f"{install_hint('ffmpeg', 'FFMPEG_EXE')}")
                    self.error = self.audio_error
                    self.stop_flag.wait(10)
                    continue

                self.audio_ffmpeg_error = None
                self.audio_source = cand["label"]
                if cand["label"] not in self.audio_sources_tried:
                    self.audio_sources_tried.append(cand["label"])
                print(f"[Audio {self.id}] capturing from {cand['label']} ({cand['url']})",
                      flush=True)
                chunks_before = self.audio_chunks
                threading.Thread(target=self._drain_audio_stderr,
                                 args=(self.audio_proc,), daemon=True).start()

                # 3. Consume closed segments while ffmpeg keeps running.
                while not self.stop_flag.is_set() and self.audio_proc.poll() is None:
                    files = sorted(glob.glob(os.path.join(tmpdir, "chunk-*.wav")))
                    # the newest file is still being written to
                    for wav in files[:-1]:
                        if self.stop_flag.is_set():
                            break
                        try:
                            self._handle_chunk(wav)
                        except Exception as exc:  # keep this camera alive
                            self.audio_error = f"Audio chunk failed: {exc}"
                        finally:
                            try:
                                os.remove(wav)
                            except OSError:
                                pass
                    self.stop_flag.wait(0.5)

                if self.stop_flag.is_set():
                    break

                code = self.audio_proc.poll()
                produced = self.audio_chunks > chunks_before
                self.audio_connected = False
                self.audio_restarts += 1
                detail = self.audio_ffmpeg_error or "no details"
                if not produced:
                    # This source never delivered sound â€” try the next one.
                    cand_index += 1
                    nxt = candidates[cand_index % len(candidates)]["label"]
                    self.audio_error = (
                        f"No audio from {cand['label']} (exit {code}): {detail}. "
                        f"Trying {nxt}â€¦"
                    )
                elif code not in (0, None):
                    self.audio_error = (f"FFmpeg audio capture stopped (exit {code}): {detail}. "
                                        "Reconnectingâ€¦")
                else:
                    self.audio_error = "Camera audio stream ended; reconnectingâ€¦"
                # force a re-probe on the next round
                self.has_audio_track = None

                last_probe = 0.0
                self.stop_flag.wait(3)
        finally:
            self.audio_connected = False
            if self.audio_proc and self.audio_proc.poll() is None:
                try:
                    self.audio_proc.terminate()
                    self.audio_proc.wait(timeout=5)
                except Exception:
                    self.audio_proc.kill()
            shutil.rmtree(tmpdir, ignore_errors=True)

    def audio_test(self) -> dict:
        """One-shot diagnostic: probe the streams, then try to grab a short WAV
        from every audio source in turn and transcribe the first good one."""
        report: dict = {
            "camera_id": self.id,
            "rtsp": self.rtsp,
            "rtsp_configured": bool(self.rtsp),
            "probe": None,
            "attempts": [],
            "capture": None,
            "source": None,
            "whisper": {
                "available": WHISPER.available,
                "state": WHISPER.state,
                "error": WHISPER.error,
            },
            "transcript": "",
            "success": False,
            "error": None,
        }
        if not self.rtsp:
            report["error"] = "no RTSP URL configured for this camera"
            return report

        probe = self.probe_audio()
        report["probe"] = {
            "ok": probe["ok"],
            "error": probe["error"],
            "has_audio_track": self.has_audio_track,
            "audio_codec": self.audio_codec,
            "streams": probe["streams"],
        }
        if self.has_audio_track is False:
            report["error"] = NO_AUDIO_MESSAGE
            return report

        try:
            ffmpeg = need_exe("ffmpeg", "FFMPEG_EXE")
        except MissingExecutable as exc:
            report["error"] = str(exc)
            return report

        tmpdir = tempfile.mkdtemp(prefix=f"msd-audiotest-{self.path}-")
        good_wav = None
        try:
            for cand in self._audio_candidates():
                wav = os.path.join(tmpdir, f"test-{cand['label']}.wav")
                attempt = {"source": cand["label"], "url": cand["url"],
                           "transport": cand["transport"], "returncode": None,
                           "bytes": 0, "seconds": 0.0, "ffmpeg_error": None}
                try:
                    out = subprocess.run(
                        [ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "error",
                         "-rtsp_transport", cand["transport"],
                         "-i", cand["url"], "-vn", "-map", "0:a:0",
                         "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000",
                         "-t", "5", "-f", "wav", "-y", wav],
                        capture_output=True, text=True, timeout=40,
                        creationflags=no_window_flags(),
                    )
                    size = os.path.getsize(wav) if os.path.exists(wav) else 0
                    attempt.update({
                        "returncode": out.returncode,
                        "bytes": size,
                        "seconds": round(max(0, size - 44) / 32000, 2),
                        "ffmpeg_error": (out.stderr or "").strip()[-500:] or None,
                    })
                    report["attempts"].append(attempt)
                    if out.returncode == 0 and size >= 16000:
                        good_wav = wav
                        report["capture"] = attempt
                        report["source"] = cand["label"]
                        break
                except subprocess.TimeoutExpired:
                    attempt["ffmpeg_error"] = "timed out capturing audio"
                    report["attempts"].append(attempt)
                except Exception as exc:
                    attempt["ffmpeg_error"] = str(exc)
                    report["attempts"].append(attempt)

            if not good_wav:
                worst = next((a["ffmpeg_error"] for a in reversed(report["attempts"])
                              if a.get("ffmpeg_error")), None)
                report["error"] = worst or "no usable audio captured from any source"
                return report
            if not WHISPER.available:
                report["error"] = WHISPER.error or "Whisper is unavailable"
                return report
            report["transcript"] = WHISPER.transcribe(good_wav)
            report["whisper"]["state"] = WHISPER.state
            report["success"] = True
        except Exception as exc:
            report["error"] = str(exc)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
        return report


    # ---- lifecycle --------------------------------------------------------- #
    def start(self):
        self.stop_flag.clear()
        self.error = None
        self.start_video()
        self.start_audio()

    def start_audio(self):
        """Audio capture runs whenever the camera is enabled â€” even if Whisper
        is broken â€” so the diagnostics can tell capture apart from transcription."""
        if self.stop_flag.is_set():
            return
        if self.audio_thread and self.audio_thread.is_alive():
            return
        self.audio_thread = threading.Thread(target=self._audio_loop, daemon=True)
        self.audio_thread.start()

    def stop(self):
        self.stop_flag.set()
        for proc in (self.video_proc, self.audio_proc):
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=5)
                except Exception:
                    proc.kill()
        self.video_proc = None
        self.audio_proc = None
        self.audio_connected = False
        self._hls_ok = False
        self._hls_checked = 0.0

    def running(self) -> bool:
        return bool(self.video_proc and self.video_proc.poll() is None)

    def hls_ready(self, force: bool = False) -> bool:
        if not self.running():
            self._hls_ok = False
            return False
        now = time.time()
        if not force and self._hls_ok and now - self._hls_checked < HLS_PROBE_TTL:
            return True
        try:
            with urllib.request.urlopen(
                f"http://127.0.0.1:{HLS_PORT}/{self.path}/index.m3u8", timeout=1.5
            ) as response:
                self._hls_ok = response.status == 200 and b"#EXTM3U" in response.read(128)
        except Exception:
            self._hls_ok = False
        self._hls_checked = now
        return self._hls_ok

    def status(self, host: str) -> dict:
        return {
            "id": self.id,
            "path": self.path,
            "name": self.name,
            "enabled": self.enabled,
            "ffmpeg": self.running(),
            "hls_ready": self.hls_ready(),
            "stream": f"http://{host}:{HLS_PORT}/{self.path}/index.m3u8",
            "stream_local": f"http://127.0.0.1:{HLS_PORT}/{self.path}/index.m3u8",
            "restarts": self.restarts,
            "error": self.error,
            "audio": self.audio_status(),
        }

    def audio_status(self) -> dict:
        thread_running = bool(self.audio_thread and self.audio_thread.is_alive())
        error = self.audio_error
        if self.has_audio_track is False:
            error = NO_AUDIO_MESSAGE
        elif not thread_running and not error:
            error = "Audio worker is not running; start the camera to begin listening."
        return {
            "thread_running": thread_running,
            "connected": self.audio_connected,
            "capturing": bool(self.audio_proc and self.audio_proc.poll() is None),
            "chunks_received": self.audio_chunks,
            "bytes_received": self.audio_bytes,
            "seconds_captured": round(max(0, self.audio_bytes) / 32000, 1),
            "last_chunk_at": self.last_audio_chunk_at,
            "last_transcription_at": self.last_transcription_at,
            "last_transcript": self.last_transcript,
            "has_audio_track": self.has_audio_track,
            "audio_codec": self.audio_codec,
            "audio_probe_error": self.audio_probe_error,
            "audio_probed_at": self.audio_probed_at,
            "audio_restarts": self.audio_restarts,
            "audio_source": self.audio_source,
            "audio_sources_tried": list(self.audio_sources_tried),
            "chunk_seconds": AUDIO_CHUNK_SECONDS,
            "whisper_available": WHISPER.available,
            "whisper_state": WHISPER.state,
            "whisper_model": WHISPER.model_name,
            "whisper_error": WHISPER.error,
            "error": error or WHISPER.error,
            "ffmpeg_error": self.audio_ffmpeg_error,
        }

