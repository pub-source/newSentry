# RTSP / ONVIF / V380 Pro Camera Setup

Browsers cannot play RTSP/RTP/ONVIF streams directly. To use MSDSystem with
IP cameras, NVRs, DVRs, V380 Pro, Reolink, Hikvision, Dahua, TP-Link Tapo,
etc., you must run a small **local gateway** that re-publishes the camera as
a browser-playable HLS, WebRTC, or MJPEG stream. Then paste that URL into
the dashboard's **Connect IP Camera** dialog.

The two recommended gateways are both free, open-source, and run on
Windows / macOS / Linux / Raspberry Pi.

---

## Option A — go2rtc (recommended, lowest latency)

`go2rtc` is a single binary, ~10 MB, and produces sub-second WebRTC streams.

### 1. Install
```bash
# macOS / Linux
curl -L https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64 \
  -o go2rtc && chmod +x go2rtc

# Windows: download go2rtc_win64.zip from the releases page
```

### 2. Create `go2rtc.yaml`
```yaml
streams:
  living_room:    rtsp://admin:password@192.168.1.50:554/stream1
  front_door:    rtsp://admin:password@192.168.1.51:554/h264Preview_01_main
  v380_kitchen:  rtsp://admin:password@192.168.1.60:554/live/ch00_0
  onvif_office:  onvif://admin:password@192.168.1.70
  hik_garage:    rtsp://admin:password@192.168.1.80:554/Streaming/Channels/101
```

### 3. Start
```bash
./go2rtc -config go2rtc.yaml
# Web UI: http://localhost:1984
```

### 4. Paste into MSDSystem
Use any of these URL forms in the **Connect IP Camera** dialog:
- `http://localhost:1984/api/stream.mp4?src=living_room` (low-latency fMP4)
- `http://localhost:1984/api/stream.m3u8?src=living_room` (HLS)
- `http://localhost:1984/api/frame.mjpeg?src=living_room` (MJPEG)

---

## Option B — MediaMTX (formerly rtsp-simple-server)

Better suited for many cameras at once and HLS-only deployments.

### 1. Install
Download from <https://github.com/bluenviron/mediamtx/releases>.

### 2. `mediamtx.yml`
```yaml
paths:
  cam1:
    source: rtsp://admin:password@192.168.1.50:554/stream1
  cam2:
    source: rtsp://admin:password@192.168.1.51:554/h264Preview_01_main
```

### 3. Start
```bash
./mediamtx
```

### 4. URL to paste
- HLS:   `http://localhost:8888/cam1/index.m3u8`
- WebRTC: `http://localhost:8889/cam1/`

---

## Camera-specific notes

| Brand / app    | RTSP URL pattern                                                            |
| -------------- | --------------------------------------------------------------------------- |
| V380 Pro       | `rtsp://admin:PASS@IP:554/live/ch00_0`                                      |
| Hikvision      | `rtsp://USER:PASS@IP:554/Streaming/Channels/101`                            |
| Dahua          | `rtsp://USER:PASS@IP:554/cam/realmonitor?channel=1&subtype=0`               |
| Reolink        | `rtsp://USER:PASS@IP:554/h264Preview_01_main`                               |
| TP-Link Tapo   | `rtsp://USER:PASS@IP:554/stream1`                                           |
| Generic ONVIF  | `onvif://USER:PASS@IP` (let go2rtc auto-discover the profile)               |
| Android (IP Webcam app) | `http://PHONE_IP:8080/video` (MJPEG, paste directly — no gateway needed) |
| iOS (Larix Broadcaster) | publish RTMP to `rtmp://GATEWAY_IP:1935/live/iphone`, then proxy via go2rtc |

---

## Security
- Never expose the gateway port to the public internet without a reverse
  proxy + TLS + auth.
- Use a dedicated VLAN for cameras; most consumer IP cameras have weak
  firmware.
- Rotate the default `admin` password on every camera before adding it.

## Troubleshooting
- **Black preview**: codec mismatch — force the camera to H.264 baseline in
  its web UI; many browsers cannot decode H.265 / HEVC.
- **High latency**: prefer go2rtc's WebRTC endpoint over HLS (HLS adds 3-10 s).
- **CORS errors**: add `api: { origin: "*" }` to `go2rtc.yaml` during local
  development.
- **Auto-reconnect**: both gateways reconnect to the camera automatically;
  MSDSystem in turn reconnects to the gateway via the existing
  `useIpCamera` hook.