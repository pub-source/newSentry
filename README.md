# MSDS System — Multimodal Saliency Detection

Desktop + cloud architecture. The React dashboard, CCTV/RTSP pipeline, Whisper wake-word
listening, multi-camera support, saliency and alerts are all unchanged — the Electron and
Cloudflare layers are additive.

## Architecture

```text
┌───────────────────────── LOCAL (Windows PC on the CCTV LAN) ─────────────────────────┐
│  Electron shell (electron/main.cjs + preload.cjs, contextIsolation ON)               │
│      └── renderer = existing Vite/React app (dist/)                                  │
│  local-service/  (Node + TS)  FFmpeg discovery, Whisper status, camera probe  :5055  │
│  local-server/   (Python)     RTSP -> FFmpeg -> MediaMTX -> HLS + Whisper     :5000  │
│  CCTV cameras    rtsp://192.168.x.x:554/live/ch00_1                                  │
└───────────────────────────────────┬──────────────────────────────────────────────────┘
                                    │ HTTPS / WSS (device pushes only)
┌───────────────────────────────────▼──────────── CLOUD ───────────────────────────────┐
│  cloudflare/  Workers API: devices, heartbeat, alerts, detections, transcripts,      │
│               health + DeviceSession Durable Object (realtime fan-out)               │
│               data behind MsdsRepository: memory | Supabase | D1 (later)             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Cloudflare never reaches a private camera IP. The local device is the only bridge, and
camera credentials never leave the machine (not in the renderer bundle, not in the cloud).

## VS Code setup

```bash
git clone <repo> && cd <repo>
npm install                       # web + electron tooling
npm --prefix local-service install
npm --prefix cloudflare install
```

Local dependencies to install yourself:
- **Node 20+**
- **FFmpeg** — `winget install Gyan.FFmpeg` (or set `MSDS_FFMPEG_PATH`)
- **MediaMTX** — `mediamtx.exe` next to `local-server/`
- **Python 3.10+** with `local-server/setup_windows.bat` (installs faster-whisper)

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Web dashboard at http://localhost:8080 |
| `npm run build` | Production web build |
| `npm run local:dev` | Local Node service (FFmpeg/Whisper diagnostics) on :5055 |
| `local-server\start_server.bat` | Python RTSP/HLS + Whisper bridge on :5000 |
| `npm run electron:start` | Open the Electron shell (dev server must be running) |
| `npm run electron:dev` | Vite + Electron together (needs `concurrently` + `wait-on`) |
| `npm run electron:build` | Windows NSIS installer -> `release/MSDS-System-Setup.exe` |
| `npm run cf:dev` / `npm run cf:deploy` | Cloudflare Worker dev / deploy |

## Environment variables

Web (`.env`, already present): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

Local: `MSDS_LOCAL_PORT`, `MSDS_FFMPEG_PATH`, `MSDS_FFPROBE_PATH`, `MSDS_WHISPER_PROVIDER`, `MSDS_CAMERA_SERVER_URL`.

Cloud (`cloudflare/.dev.vars`, never committed): `MSDS_DEVICE_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DATA_BACKEND`.

## Must run locally in VS Code

Electron and packaging cannot run inside the web preview. Install the native tooling once:

```bash
npm i -D electron electron-builder concurrently wait-on
npm run electron:build
```

No installer is produced or published by this repository yet — the workflow in
`.github/workflows/electron-windows.yml` builds it on demand.
