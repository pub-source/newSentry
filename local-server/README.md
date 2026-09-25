# MSD Local Camera Server

Bridges RTSP CCTVs into browser-playable HLS for the MSDSystem dashboard, and
runs CCTV-audio wake-word transcription with Whisper.

```
CCTV (RTSP) -> ffmpeg -> MediaMTX -> HLS http://<pc-ip>:8888/<cam>/index.m3u8
                     \-> 5s WAV chunks -> faster-whisper -> /cameras/<id>/audio-events
```

## Folder structure

```
local-server/
├── camera_server.py      entry point (thin — just wiring + startup banner)
├── msds/
│   ├── config.py         ports, limits, distress keywords
│   ├── binaries.py       ffmpeg/ffprobe/mediamtx discovery (cached)
│   ├── whisper_engine.py one shared faster-whisper model
│   ├── camera.py         one independent pipeline per camera
│   ├── manager.py        registry, MediaMTX supervision, watchdog
│   └── api.py            FastAPI routes
├── bin/                  ffmpeg.exe / ffprobe.exe / mediamtx.exe (downloaded)
├── mediamtx.yml          MediaMTX config (RTSP :8554, HLS :8888)
├── fetch_binaries.py     downloads the three binaries into bin/
├── get_binaries.bat      Windows wrapper for the above
├── setup_windows.bat     venv + pip install + binaries
├── start_server.bat      runs the server with the venv interpreter
└── requirements.txt
```

Binaries are **not** committed (size + licensing). `bin/` is populated by
`fetch_binaries.py`, and every module resolves them in this order:
`FFMPEG_EXE`/`FFPROBE_EXE`/`MEDIAMTX_EXE` env var → `bin/` → `local-server/` → PATH.

## Install (Windows — recommended)

```bat
setup_windows.bat     :: venv + Python deps + downloads ffmpeg/ffprobe/mediamtx
start_server.bat      :: runs .venv\Scripts\python.exe camera_server.py
```

## macOS / Linux

```bash
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
python fetch_binaries.py
python camera_server.py
```

## Whisper / CCTV wake words

`faster-whisper` downloads its model on first use (`MSD_WHISPER_MODEL`,
default `base`; use `tiny` for a smaller download). Video keeps streaming when
audio is unavailable, and `/status` reports which failure mode you hit:

| `whisper_state`   | meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `package_missing` | faster-whisper is not installed in the running Python.    |
| `model_error`     | package present, but the model failed to download/load.   |
| `ready`           | transcription is running.                                 |

## Environment variables

`MSD_API_PORT` (5000), `MSD_HLS_PORT` (8888), `MSD_RTSP_PORT` (8554),
`MSD_WHISPER_MODEL`, `FFMPEG_EXE`, `FFPROBE_EXE`, `MEDIAMTX_EXE`.

## Electron

`electron-builder.yml` ships `local-server/**` as an extra resource, so the
packaged desktop app carries the Python bridge, `mediamtx.yml` and whatever is
in `bin/` at build time. Run `python fetch_binaries.py` before
`npm run electron:build` if you want the binaries inside the installer.

## Connect from the dashboard

Open the dashboard on the same machine/Wi-Fi, press **Connect**, enter the
server URL (default `http://127.0.0.1:5000`) and start monitoring — the HLS
link is filled in automatically.

- An HTTPS page cannot load a plain-HTTP local stream; use `http://` or the
  desktop app.
- From a phone use `http://<pc-lan-ip>:5000`; `/status` reports the LAN IP.
