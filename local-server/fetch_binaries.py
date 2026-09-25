"""Download ffmpeg, ffprobe and mediamtx into local-server/bin.

The binaries are NOT committed to the repository (they are ~100 MB and have
their own licenses). Run this once per machine:

    python fetch_binaries.py          # Windows / macOS / Linux
    get_binaries.bat                  # Windows convenience wrapper

Everything else (camera_server.py, the Electron build) picks the binaries up
automatically from local-server/bin.
"""
from __future__ import annotations

import io
import os
import platform
import shutil
import stat
import sys
import tarfile
import tempfile
import urllib.request
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(BASE_DIR, "bin")

FFMPEG_URLS = {
    "windows": "https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip",
    "linux": "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz",
    "darwin-ffmpeg": "https://evermeet.cx/ffmpeg/getrelease/zip",
    "darwin-ffprobe": "https://evermeet.cx/ffprobe/getrelease/zip",
}

MEDIAMTX_BASE = "https://github.com/bluenviron/mediamtx/releases/latest/download"
MEDIAMTX_ASSETS = {
    ("windows", "amd64"): "mediamtx_v1.15.1_windows_amd64.zip",
    ("linux", "amd64"): "mediamtx_v1.15.1_linux_amd64.tar.gz",
    ("linux", "arm64"): "mediamtx_v1.15.1_linux_arm64v8.tar.gz",
    ("darwin", "amd64"): "mediamtx_v1.15.1_darwin_amd64.tar.gz",
    ("darwin", "arm64"): "mediamtx_v1.15.1_darwin_arm64.tar.gz",
}


def arch() -> str:
    m = platform.machine().lower()
    return "arm64" if m in ("arm64", "aarch64") else "amd64"


def osname() -> str:
    p = sys.platform
    return "windows" if p.startswith("win") else ("darwin" if p == "darwin" else "linux")


def download(url: str) -> bytes:
    print(f"  downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "msds-setup"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def place(name: str, data: bytes) -> None:
    target = os.path.join(BIN_DIR, name)
    with open(target, "wb") as fh:
        fh.write(data)
    os.chmod(target, os.stat(target).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    print(f"  -> {target}")


def wanted(member_name: str, names: list[str]) -> str | None:
    base = os.path.basename(member_name)
    for n in names:
        if base == n or base == n + ".exe":
            return base
    return None


def extract_zip(data: bytes, names: list[str]) -> None:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for member in z.namelist():
            out = wanted(member, names)
            if out:
                place(out, z.read(member))


def extract_tar(data: bytes, names: list[str], mode: str) -> None:
    with tarfile.open(fileobj=io.BytesIO(data), mode=mode) as t:
        for member in t.getmembers():
            if not member.isfile():
                continue
            out = wanted(member.name, names)
            if out:
                fh = t.extractfile(member)
                if fh:
                    place(out, fh.read())


def have(name: str) -> bool:
    exe = name + (".exe" if osname() == "windows" else "")
    return os.path.isfile(os.path.join(BIN_DIR, exe))


def fetch_ffmpeg() -> None:
    if have("ffmpeg") and have("ffprobe"):
        print("ffmpeg/ffprobe already present in bin/ — skipping")
        return
    system = osname()
    print("Fetching FFmpeg + FFprobe…")
    if system == "windows":
        extract_zip(download(FFMPEG_URLS["windows"]), ["ffmpeg", "ffprobe"])
    elif system == "darwin":
        extract_zip(download(FFMPEG_URLS["darwin-ffmpeg"]), ["ffmpeg"])
        extract_zip(download(FFMPEG_URLS["darwin-ffprobe"]), ["ffprobe"])
    else:
        extract_tar(download(FFMPEG_URLS["linux"]), ["ffmpeg", "ffprobe"], "r:xz")


def fetch_mediamtx() -> None:
    if have("mediamtx"):
        print("mediamtx already present in bin/ — skipping")
        return
    asset = MEDIAMTX_ASSETS.get((osname(), arch()))
    if not asset:
        print(f"No MediaMTX build for {osname()}/{arch()} — download it manually into bin/")
        return
    print("Fetching MediaMTX…")
    data = download(f"{MEDIAMTX_BASE}/{asset}")
    if asset.endswith(".zip"):
        extract_zip(data, ["mediamtx"])
    else:
        extract_tar(data, ["mediamtx"], "r:gz")


def main() -> int:
    os.makedirs(BIN_DIR, exist_ok=True)
    try:
        fetch_ffmpeg()
        fetch_mediamtx()
    except Exception as exc:
        print(f"\nDownload failed: {exc}")
        print("Download the binaries manually and drop them into local-server/bin:")
        print("  FFmpeg   https://www.gyan.dev/ffmpeg/builds/")
        print("  MediaMTX https://github.com/bluenviron/mediamtx/releases")
        return 1
    print("\nBinaries in", BIN_DIR)
    for f in sorted(os.listdir(BIN_DIR)):
        if f != ".gitkeep":
            print("  ", f)
    print("\nDone. Start the bridge with:  python camera_server.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
