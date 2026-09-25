"""MSDS local camera bridge — entry point.

The implementation now lives in the `msds/` package:

    msds/config.py          ports, limits, distress keywords
    msds/binaries.py        ffmpeg / ffprobe / mediamtx discovery (cached)
    msds/whisper_engine.py  shared faster-whisper model
    msds/camera.py          one independent pipeline per camera
    msds/manager.py         registry, MediaMTX supervision, watchdog
    msds/api.py             FastAPI routes (unchanged contract)

Run:  python camera_server.py     (or start_server.bat on Windows)
"""
from __future__ import annotations

import signal
import sys
import threading

import uvicorn

from msds.api import app
from msds.binaries import binary_report, install_hint
from msds.config import API_PORT, HLS_PORT, WHISPER_MODEL
from msds.manager import start_mediamtx, stop_all_cameras, stop_mediamtx, watchdog
from msds.whisper_engine import WHISPER


def shutdown(*_args):
    stop_all_cameras()
    stop_mediamtx()
    raise SystemExit(0)


def main() -> None:
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    for name, env_var, path in binary_report():
        print(f"{name:9s}: {path or 'NOT FOUND -> ' + install_hint(name, env_var)}", flush=True)

    threading.Thread(target=watchdog, daemon=True).start()
    start_mediamtx()

    print(f"MSDSystem multi-camera bridge on http://0.0.0.0:{API_PORT} (HLS :{HLS_PORT})")
    print(f"python   : {sys.executable}")
    if WHISPER.available:
        print(f"whisper  : faster-whisper installed (model '{WHISPER_MODEL}', loading in background)")

        def _preload():
            try:
                WHISPER.load()
                print(f"whisper  : model '{WHISPER_MODEL}' ready", flush=True)
            except Exception as exc:
                print(f"whisper  : model failed to load -> {exc}", flush=True)

        threading.Thread(target=_preload, daemon=True).start()
    else:
        print("whisper  : NOT AVAILABLE - CCTV wake-word transcription is disabled")
        print(f"           {WHISPER.error}")
        print("           Video/CCTV streaming keeps working without it.")


    uvicorn.run(app, host="0.0.0.0", port=API_PORT, log_level="warning")


if __name__ == "__main__":
    main()
