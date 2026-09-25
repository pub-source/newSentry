"""Camera registry, MediaMTX supervision and the per-camera watchdog."""
from __future__ import annotations

import os
import re
import subprocess
import threading
import time
from typing import Dict, List, Optional

from .binaries import install_hint, no_window_flags, resolve_exe
from .camera import Camera
from .config import MAX_CAMERAS, MEDIAMTX_CONFIG

CAMERAS: Dict[str, Camera] = {}
CAM_LOCK = threading.Lock()
MEDIAMTX: Optional[subprocess.Popen] = None


def mediamtx_running() -> bool:
    return bool(MEDIAMTX and MEDIAMTX.poll() is None)


def start_mediamtx() -> None:
    global MEDIAMTX
    if mediamtx_running():
        return
    exe = resolve_exe("mediamtx", "MEDIAMTX_EXE")
    if not exe:
        print(install_hint("mediamtx", "MEDIAMTX_EXE"), flush=True)
        return
    cmd = [exe]
    if os.path.isfile(MEDIAMTX_CONFIG):
        cmd.append(MEDIAMTX_CONFIG)
    MEDIAMTX = subprocess.Popen(
        cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        cwd=os.path.dirname(exe) or None, creationflags=no_window_flags(),
    )
    time.sleep(1.5)


def stop_mediamtx() -> None:
    if mediamtx_running():
        MEDIAMTX.terminate()  # type: ignore[union-attr]


def sync_cameras(incoming: List[dict]) -> int:
    with CAM_LOCK:
        keep = set()
        for item in incoming[:MAX_CAMERAS]:
            cid = item["id"]
            keep.add(cid)
            path = re.sub(r"[^a-zA-Z0-9_-]", "-", item.get("path") or cid)
            cam = CAMERAS.get(cid)
            if cam is None:
                CAMERAS[cid] = Camera(
                    id=cid, path=path, name=item.get("name", cid),
                    rtsp=item.get("rtsp", ""), enabled=bool(item.get("enabled", True)),
                )
            else:
                changed = cam.rtsp != item.get("rtsp", "") or cam.path != path
                cam.name = item.get("name", cam.name)
                cam.rtsp = item.get("rtsp", cam.rtsp)
                cam.path = path
                cam.enabled = bool(item.get("enabled", True))
                if changed and cam.running():
                    cam.stop()
                    cam.start()
        for cid in list(CAMERAS):
            if cid not in keep:
                CAMERAS[cid].stop()
                del CAMERAS[cid]
        return len(CAMERAS)


def snapshot() -> List[Camera]:
    with CAM_LOCK:
        return list(CAMERAS.values())


def stop_all_cameras() -> None:
    for cam in snapshot():
        cam.stop()


def watchdog() -> None:
    """Restart only the camera that died — never touch the others."""
    while True:
        time.sleep(5)
        for cam in snapshot():
            if not cam.enabled or cam.stop_flag.is_set():
                continue
            if cam.video_proc and cam.video_proc.poll() is not None:
                cam.restarts += 1
                cam.error = f"Stream disconnected: {cam.last_video_error()}. Reconnecting…"
                try:
                    time.sleep(min(5, max(1, cam.restarts)))
                    cam.start_video()
                except Exception as exc:
                    cam.error = str(exc)
            # The audio worker must stay alive for as long as the camera is on.
            if cam.video_proc and not (cam.audio_thread and cam.audio_thread.is_alive()):
                try:
                    cam.start_audio()
                except Exception as exc:
                    cam.audio_error = str(exc)

