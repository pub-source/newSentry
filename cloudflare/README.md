# MSDS Cloudflare Worker API (cloud only)

The cloud layer never connects to a camera. An installed **MSDS Electron device** on the
LAN is the only bridge: it registers, heartbeats, and pushes alerts/detections/transcripts.

```
Electron device (LAN) --HTTPS/WSS--> Worker API --> repository (memory | Supabase | D1 later)
                                          |
                                     DeviceSession DO --WSS--> cloud dashboard
```

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | backend + auth config |
| POST | `/api/devices/register` | `{ deviceId, name, version, platform }` |
| POST | `/api/devices/:id/heartbeat` | `{ status }` — also broadcast over WS |
| GET | `/api/devices/:id` | device record |
| POST/GET | `/api/alerts` | alert push / list (`?deviceId=&limit=`) |
| POST/GET | `/api/detections` | detection push / list |
| POST/GET | `/api/transcripts` | CCTV Whisper transcript push / list |
| GET | `/api/devices/:id/ws` | WebSocket -> `DeviceSession` Durable Object |

Device writes require header `X-MSDS-Device-Token` once `MSDS_DEVICE_TOKEN` is set.

## Run

```bash
cd cloudflare
npm install
cp .dev.vars.example .dev.vars   # fill locally, never commit
npm run dev
npm run deploy
```

## Data backend

`src/repository.ts` exposes `MsdsRepository`. Selector `DATA_BACKEND`:
`memory` (default, dev), `supabase` (PostgREST; tables `msds_devices`, `msds_alerts`,
`msds_detections`). A `D1Repository` can be added against the same interface —
existing Supabase functionality in the web app is untouched.
