# MSDS Local Service (local-only)

TypeScript Node service that runs **on the Windows machine** beside the CCTV LAN.
It complements (does not replace) `local-server/camera_server.py`.

| Concern | Owner |
| --- | --- |
| RTSP -> MediaMTX -> HLS, Whisper transcripts, talk-back | `local-server/camera_server.py` (Python) |
| FFmpeg discovery/diagnostics, Whisper provider status, camera probing | this service (Node/TS) |
| Cloud sync of alerts/detections | `cloudflare/` Worker API (called by the desktop app) |

## Run

```bash
cd local-service
npm install
npm run dev      # http://127.0.0.1:5055
```

## Endpoints

- `GET  /health`
- `GET  /diagnostics` — ffmpeg + whisper + cameras in one call
- `GET  /ffmpeg/diagnostics`
- `POST /ffmpeg/probe` `{ "rtsp": "rtsp://192.168.x.x:554/live/ch00_1" }`
- `GET  /whisper/status`
- `POST /whisper/transcribe` (provider hook — see whisperService.ts)
- `GET  /cameras`
- `POST /cameras/probe` `{ "ip": "192.168.18.93", "port": 554, "path": "/live/ch00_1" }`

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `MSDS_LOCAL_PORT` | `5055` | Listen port |
| `MSDS_LOCAL_HOST` | `127.0.0.1` | Bind address (keep loopback) |
| `MSDS_FFMPEG_PATH` | – | Full path to `ffmpeg.exe` if not on PATH |
| `MSDS_FFPROBE_PATH` | – | Full path to `ffprobe.exe` |
| `MSDS_WHISPER_PROVIDER` | `python-bridge` | `python-bridge` \| `none` |
| `MSDS_CAMERA_SERVER_URL` | `http://127.0.0.1:5000` | Python bridge base URL |

No camera credentials are stored here; they live in the Python bridge configuration on the local machine.
