/**
 * MSDS Local Service (LOCAL ONLY — runs on the Windows machine).
 *
 * Why local: CCTV/RTSP cameras live on a private LAN (192.168.x.x). Cloudflare must
 * never reach them directly. This process is the bridge: it talks to FFmpeg, Whisper
 * and the cameras locally, and only pushes summaries (alerts/detections/transcripts)
 * to the cloud.
 *
 * Zero runtime dependencies: plain node:http. Run with `npm run local:dev`.
 */
import http from 'node:http';
import { URL } from 'node:url';
import { ffmpegService } from './services/ffmpegService.js';
import { whisperService } from './services/whisperService.js';
import { cameraService } from './services/cameraService.js';

const PORT = Number(process.env.MSDS_LOCAL_PORT || 5055);
const HOST = process.env.MSDS_LOCAL_HOST || '127.0.0.1'; // loopback by default

const CORS = {
  'Access-Control-Allow-Origin': process.env.MSDS_LOCAL_CORS || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

function send(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(payload);
}

async function readJson(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    // --- Health / diagnostics -------------------------------------------------
    if (path === '/health') {
      return send(res, 200, { ok: true, service: 'msds-local', port: PORT, uptime: process.uptime() });
    }

    if (path === '/diagnostics') {
      return send(res, 200, {
        ffmpeg: await ffmpegService.diagnose(),
        whisper: await whisperService.status(),
        cameras: await cameraService.status(),
      });
    }

    // --- FFmpeg ---------------------------------------------------------------
    if (path === '/ffmpeg/diagnostics') return send(res, 200, await ffmpegService.diagnose());

    if (path === '/ffmpeg/probe' && req.method === 'POST') {
      const { rtsp } = await readJson(req);
      if (!rtsp) return send(res, 400, { error: 'rtsp is required' });
      return send(res, 200, await ffmpegService.probe(String(rtsp)));
    }

    // --- Whisper --------------------------------------------------------------
    if (path === '/whisper/status') return send(res, 200, await whisperService.status());

    if (path === '/whisper/transcribe' && req.method === 'POST') {
      const { cameraId, wavPath } = await readJson(req);
      return send(res, 200, await whisperService.transcribe({ cameraId, wavPath }));
    }

    // --- Cameras (delegates to the Python RTSP/HLS bridge) ---------------------
    if (path === '/cameras') return send(res, 200, await cameraService.status());

    if (path === '/cameras/probe' && req.method === 'POST') {
      const { ip, port, path: rtspPath } = await readJson(req);
      if (!ip) return send(res, 400, { error: 'ip is required' });
      return send(res, 200, await cameraService.probe({ ip, port, path: rtspPath }));
    }

    return send(res, 404, { error: 'not_found', path });
  } catch (err) {
    return send(res, 500, { error: 'internal_error', details: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[msds-local] listening on http://${HOST}:${PORT}`);
});
