/**
 * FFmpeg discovery + diagnostics (LOCAL ONLY, Windows-friendly).
 *
 * Resolution order:
 *   1. MSDS_FFMPEG_PATH / FFMPEG_EXE env var
 *   2. ffmpeg(.exe) next to the repo's local-server folder
 *   3. system PATH
 * No binary is bundled — the user installs FFmpeg (winget install Gyan.FFmpeg).
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface FfmpegDiagnostics {
  found: boolean;
  ffmpegPath: string | null;
  ffprobePath: string | null;
  version: string | null;
  source: 'env' | 'local-server' | 'path' | null;
  hint: string | null;
}

const isWin = os.platform() === 'win32';
const exe = (n: string) => (isWin ? `${n}.exe` : n);

function run(cmd: string, args: string[], timeout = 15000): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout || ''}${stderr || ''}`.trim() });
    });
  });
}

async function resolveBinary(name: 'ffmpeg' | 'ffprobe'): Promise<{ p: string | null; source: FfmpegDiagnostics['source'] }> {
  const envVar = name === 'ffmpeg'
    ? (process.env.MSDS_FFMPEG_PATH || process.env.FFMPEG_EXE)
    : (process.env.MSDS_FFPROBE_PATH || process.env.FFPROBE_EXE);
  if (envVar && existsSync(envVar)) return { p: envVar, source: 'env' };

  const local = path.resolve(process.cwd(), '..', 'local-server', exe(name));
  if (existsSync(local)) return { p: local, source: 'local-server' };

  const probe = await run(exe(name), ['-version']);
  if (probe.ok) return { p: exe(name), source: 'path' };

  return { p: null, source: null };
}

export const ffmpegService = {
  async diagnose(): Promise<FfmpegDiagnostics> {
    const ff = await resolveBinary('ffmpeg');
    const fp = await resolveBinary('ffprobe');
    const version = ff.p ? (await run(ff.p, ['-version'])).out.split('\n')[0] || null : null;
    return {
      found: Boolean(ff.p),
      ffmpegPath: ff.p,
      ffprobePath: fp.p,
      version,
      source: ff.source,
      hint: ff.p
        ? null
        : 'FFmpeg not found. Install it (Windows: `winget install Gyan.FFmpeg`) or set MSDS_FFMPEG_PATH to the full ffmpeg.exe path.',
    };
  },

  /** ffprobe an RTSP URL to confirm video/audio tracks exist. */
  async probe(rtsp: string) {
    const fp = await resolveBinary('ffprobe');
    if (!fp.p) return { ok: false, error: 'ffprobe_missing', hint: 'Install FFmpeg or set MSDS_FFPROBE_PATH.' };
    const r = await run(fp.p, [
      '-v', 'error', '-rtsp_transport', 'tcp',
      '-show_entries', 'stream=index,codec_type,codec_name',
      '-of', 'json', rtsp,
    ], 25000);
    return { ok: r.ok, output: r.out };
  },
};
