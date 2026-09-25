"""External binary discovery (ffmpeg / ffprobe / mediamtx).

Resolution order: env var -> local-server/bin -> next to local-server -> PATH.
Results are cached, so the hot paths (status polls, audio chunks) never hit the
filesystem repeatedly.
"""
from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from .config import BASE_DIR, BIN_DIR, IS_WINDOWS


class MissingExecutable(RuntimeError):
    """Raised when an external binary cannot be found."""


_CACHE: Dict[str, Optional[str]] = {}


def resolve_exe(name: str, env_var: str, refresh: bool = False) -> Optional[str]:
    if not refresh and name in _CACHE:
        return _CACHE[name]

    candidates: List[str] = []
    override = os.environ.get(env_var)
    if override:
        candidates.append(override)
        candidates.append(os.path.join(override, name + (".exe" if IS_WINDOWS else "")))

    local_names = [name + ".exe", name] if IS_WINDOWS else [name]
    for n in local_names:
        candidates.append(os.path.join(BIN_DIR, n))
        candidates.append(os.path.join(BASE_DIR, n))

    found: Optional[str] = None
    for cand in candidates:
        if cand and os.path.isfile(cand):
            found = os.path.abspath(cand)
            break
    if not found:
        found = (shutil.which(override) if override else None) or shutil.which(name)

    _CACHE[name] = found
    return found


def install_hint(name: str, env_var: str) -> str:
    getter = "python fetch_binaries.py" if not IS_WINDOWS else "get_binaries.bat"
    if name == "mediamtx":
        how = (f"run {getter} in local-server/ to download it into local-server/bin, "
               "or grab it from https://github.com/bluenviron/mediamtx/releases")
    elif IS_WINDOWS:
        how = (f"run {getter} in local-server\\ to download it into local-server\\bin, "
               "or install it with  winget install Gyan.FFmpeg")
    else:
        how = f"run {getter}, or install it with  sudo apt install ffmpeg  /  brew install ffmpeg"
    return (f"'{name}' was not found. {how}. "
            f"Alternatively set the {env_var} environment variable to its full path.")


def need_exe(name: str, env_var: str) -> str:
    path = resolve_exe(name, env_var)
    if not path:
        raise MissingExecutable(install_hint(name, env_var))
    return path


def binary_report() -> List[Tuple[str, str, Optional[str]]]:
    return [(n, v, resolve_exe(n, v, refresh=True)) for n, v in (
        ("ffmpeg", "FFMPEG_EXE"), ("ffprobe", "FFPROBE_EXE"), ("mediamtx", "MEDIAMTX_EXE"),
    )]


def no_window_flags() -> int:
    return subprocess.CREATE_NO_WINDOW if IS_WINDOWS else 0  # type: ignore[attr-defined]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def pip_install_command() -> str:
    req = os.path.join(BASE_DIR, "requirements.txt")
    if os.path.isfile(req):
        return f'"{sys.executable}" -m pip install -r "{req}"'
    return f'"{sys.executable}" -m pip install faster-whisper'
