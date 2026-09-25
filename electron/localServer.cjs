const { app } = require('electron');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const http = require('http');

const IS_WINDOWS = process.platform === 'win32';
const STATUS_URL = process.env.MSDS_CAMERA_SERVER_URL || 'http://127.0.0.1:5000';

let child = null;
let mediamtxProcess = null;
let ffmpegProcess = null;
let stopping = false;

let bootstrap = { phase: 'idle', message: '', firstRun: false };

const log = (...args) => console.log('[msds:local-server]', ...args);
const logErr = (...args) => console.error('[msds:local-server]', ...args);

const setPhase = (phase, message) => {
  bootstrap = { ...bootstrap, phase, message };
  log(`[${phase}] ${message}`);
};

function localServerDir() {
  const candidates = [
    process.env.MSDS_LOCAL_SERVER_DIR,
    app.isPackaged ? path.join(process.resourcesPath, 'local-server') : null,
    path.join(__dirname, '..', 'local-server'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'camera_server.py'))) return dir;
  }

  return null;
}

function resolvePython(dir) {
  const candidates = [];

  if (process.env.MSDS_PYTHON_EXE) {
    candidates.push(process.env.MSDS_PYTHON_EXE);
  }

  candidates.push(
    IS_WINDOWS
      ? path.join(dir, '.venv', 'Scripts', 'python.exe')
      : path.join(dir, '.venv', 'bin', 'python')
  );

  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) {
      return { exe: cand, args: [] };
    }
  }

  const probes = IS_WINDOWS
    ? [
        { exe: 'py', args: ['-3'] },
        { exe: 'python', args: [] },
      ]
    : [
        { exe: 'python3', args: [] },
        { exe: 'python', args: [] },
      ];

  for (const probe of probes) {
    try {
      const res = spawnSync(
        probe.exe,
        [...probe.args, '--version'],
        {
          stdio: 'ignore',
          windowsHide: true,
        }
      );

      if (res.status === 0) return probe;
    } catch {}
  }

  return null;
}

const venvPython = (dir) =>
  IS_WINDOWS
    ? path.join(dir, '.venv', 'Scripts', 'python.exe')
    : path.join(dir, '.venv', 'bin', 'python');

function systemPython() {
  const probes = IS_WINDOWS
    ? [
        { exe: 'py', args: ['-3'] },
        { exe: 'python', args: [] },
      ]
    : [
        { exe: 'python3', args: [] },
        { exe: 'python', args: [] },
      ];

  for (const probe of probes) {
    try {
      const res = spawnSync(
        probe.exe,
        [...probe.args, '--version'],
        {
          stdio: 'ignore',
          windowsHide: true,
        }
      );

      if (res.status === 0) return probe;
    } catch {}
  }

  return null;
}

function run(exe, args, opts, timeoutMs = 15 * 60 * 1000) {
  const res = spawnSync(exe, args, {
    stdio: 'inherit',
    windowsHide: true,
    timeout: timeoutMs,
    ...opts,
  });

  return res.status === 0;
}

const sha1 = (s) =>
  crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

function bootstrapEnvironment(dir) {
  if (process.env.MSDS_SKIP_BOOTSTRAP === '1') {
    bootstrap = {
      phase: 'skipped',
      message: 'MSDS_SKIP_BOOTSTRAP=1',
      firstRun: false,
    };

    return { ok: true, error: null };
  }

  const reqFile = path.join(dir, 'requirements.txt');
  const hasReq = fs.existsSync(reqFile);
  const marker = path.join(dir, '.venv', '.msds-deps');
  const wanted = hasReq
    ? sha1(fs.readFileSync(reqFile, 'utf8'))
    : 'none';

  let py = venvPython(dir);
  const hadVenv = fs.existsSync(py);

  bootstrap.firstRun = !hadVenv;

  if (!hadVenv && !process.env.MSDS_PYTHON_EXE) {
    const sys = systemPython();

    if (!sys) {
      const error =
        'Python 3.10+ was not found. Install Python and restart the app.';

      bootstrap = {
        phase: 'error',
        message: error,
        firstRun: true,
      };

      return { ok: false, error };
    }

    setPhase(
      'venv',
      'Creating the Python environment...'
    );

    if (
      !run(
        sys.exe,
        [...sys.args, '-m', 'venv', '.venv'],
        { cwd: dir },
        5 * 60 * 1000
      )
    ) {
      logErr('venv creation failed - using system Python.');
    }
  }

  const useVenv = fs.existsSync(venvPython(dir));
  py = useVenv ? venvPython(dir) : null;

  const sys = py ? null : systemPython();

  if (!py && !sys) {
    const error = 'No usable Python interpreter found.';

    bootstrap = {
      phase: 'error',
      message: error,
      firstRun: bootstrap.firstRun,
    };

    return { ok: false, error };
  }

  const pyExe = py ?? sys.exe;
  const pyArgs = py ? [] : sys.args;

  let installed = false;

  try {
    installed =
      fs.readFileSync(marker, 'utf8').trim() === wanted;
  } catch {
    installed = false;
  }

  if (!installed && hasReq) {
    setPhase(
      'deps',
      'Installing camera and Whisper dependencies...'
    );

    run(
      pyExe,
      [...pyArgs, '-m', 'pip', 'install', '--upgrade', 'pip'],
      { cwd: dir },
      5 * 60 * 1000
    );

    const ok = run(
      pyExe,
      [...pyArgs, '-m', 'pip', 'install', '-r', 'requirements.txt'],
      { cwd: dir }
    );

    if (ok) {
      try {
        fs.mkdirSync(path.dirname(marker), {
          recursive: true,
        });

        fs.writeFileSync(marker, wanted);
      } catch {}
    } else {
      logErr('pip install failed.');
    }
  }

  const ext = IS_WINDOWS ? '.exe' : '';

  const needBinaries = [
    'ffmpeg',
    'ffprobe',
    'mediamtx',
  ].some(
    (n) =>
      !fs.existsSync(
        path.join(dir, 'bin', n + ext)
      )
  );

  if (
    needBinaries &&
    fs.existsSync(path.join(dir, 'fetch_binaries.py'))
  ) {
    setPhase(
      'binaries',
      'Downloading FFmpeg and MediaMTX...'
    );

    run(
      pyExe,
      [...pyArgs, 'fetch_binaries.py'],
      { cwd: dir },
      10 * 60 * 1000
    );
  }

  setPhase(
    'starting',
    'Starting MediaMTX and Python (Python owns camera FFmpeg)...'
  );

  return { ok: true, error: null };
}

const getBootstrapStatus = () => ({
  ...bootstrap,
});

function childEnv(dir) {
  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    PYTHONIOENCODING: 'utf-8',
  };

  const bin = path.join(dir, 'bin');
  const ext = IS_WINDOWS ? '.exe' : '';

  for (const [name, key] of [
    ['ffmpeg', 'FFMPEG_EXE'],
    ['ffprobe', 'FFPROBE_EXE'],
    ['mediamtx', 'MEDIAMTX_EXE'],
  ]) {
    const p = path.join(bin, name + ext);

    if (fs.existsSync(p)) {
      env[key] = p;
    }
  }

  return env;
}

function probeStatus(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(
      `${STATUS_URL}/status`,
      { timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve(
          res.statusCode !== undefined &&
          res.statusCode < 500
        );
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => resolve(false));
  });
}

async function waitForReady(
  totalMs = 30000,
  intervalMs = 1000
) {
  const deadline = Date.now() + totalMs;

  while (Date.now() < deadline) {
    if (await probeStatus()) return true;

    if (
      child &&
      child.exitCode !== null
    ) {
      return false;
    }

    await new Promise((r) =>
      setTimeout(r, intervalMs)
    );
  }

  return false;
}

function shouldManage() {
  if (process.env.MSDS_MANAGE_LOCAL_SERVER === '0') {
    return false;
  }

  if (process.env.MSDS_MANAGE_LOCAL_SERVER === '1') {
    return true;
  }

  return app.isPackaged;
}

function startMediaMTX(dir) {
  const exe = path.join(
    dir,
    'bin',
    IS_WINDOWS ? 'mediamtx.exe' : 'mediamtx'
  );

  const config = path.join(
    dir,
    'mediamtx.yml'
  );

  if (!fs.existsSync(exe)) {
    throw new Error(`MediaMTX not found: ${exe}`);
  }

  if (!fs.existsSync(config)) {
    throw new Error(`MediaMTX config not found: ${config}`);
  }

  log('starting MediaMTX:', exe);

  mediamtxProcess = spawn(
    exe,
    [config],
    {
      cwd: dir,
      env: childEnv(dir),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    }
  );

  mediamtxProcess.stdout.on(
    'data',
    (b) =>
      process.stdout.write(
        `[mediamtx] ${b}`
      )
  );

  mediamtxProcess.stderr.on(
    'data',
    (b) =>
      process.stderr.write(
        `[mediamtx] ${b}`
      )
  );

  mediamtxProcess.on(
    'exit',
    (code, signal) => {
      if (!stopping) {
        logErr(
          `MediaMTX exited code=${code} signal=${signal}`
        );
      }

      mediamtxProcess = null;
    }
  );
}

function startCameraFFmpeg(dir) {
  const exe = path.join(
    dir,
    'bin',
    IS_WINDOWS ? 'ffmpeg.exe' : 'ffmpeg'
  );

  if (!fs.existsSync(exe)) {
    throw new Error(`FFmpeg not found: ${exe}`);
  }

  const source =
    process.env.MSDS_CAM1_RTSP ||
    'rtsp://192.168.18.98:554/stream1';

  log('starting CAM1 FFmpeg:', source);

  ffmpegProcess = spawn(
    exe,
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'warning',
      '-rtsp_transport',
      'tcp',
      '-i',
      source,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-f',
      'rtsp',
      'rtsp://127.0.0.1:8554/cam1',
    ],
    {
      cwd: dir,
      env: childEnv(dir),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    }
  );

  ffmpegProcess.stdout.on(
    'data',
    (b) =>
      process.stdout.write(
        `[ffmpeg-cam1] ${b}`
      )
  );

  ffmpegProcess.stderr.on(
    'data',
    (b) =>
      process.stderr.write(
        `[ffmpeg-cam1] ${b}`
      )
  );

  ffmpegProcess.on(
    'exit',
    (code, signal) => {
      if (!stopping) {
        logErr(
          `CAM1 FFmpeg exited code=${code} signal=${signal}`
        );
      }

      ffmpegProcess = null;
    }
  );
}

async function startLocalServer() {
  if (!shouldManage()) {
    log(
      'not managed (development). Set MSDS_MANAGE_LOCAL_SERVER=1 to enable.'
    );

    return {
      managed: false,
      running: await probeStatus(),
      error: null,
    };
  }

  const dir = localServerDir();

  if (!dir) {
    const error =
      'local-server/camera_server.py not found.';

    logErr(error);

    return {
      managed: true,
      running: false,
      error,
    };
  }

  if (await probeStatus()) {
    log(
      'Python camera server already running - reusing it.'
    );

    return {
      managed: false,
      running: true,
      error: null,
    };
  }

  const boot = bootstrapEnvironment(dir);

  if (!boot.ok) {
    logErr(boot.error);

    return {
      managed: true,
      running: false,
      error: boot.error,
      dir,
      bootstrap: getBootstrapStatus(),
    };
  }

  try {
    // 1. MediaMTX
    startMediaMTX(dir);

    // Give MediaMTX time to open 8554/8888.
    await new Promise((r) =>
      setTimeout(r, 1500)
    );

    // 2. Camera FFmpeg
    startCameraFFmpeg(dir);

  } catch (exc) {
    logErr(
      'MediaMTX/FFmpeg startup failed:',
      exc.message
    );

    stopBackgroundProcesses();

    return {
      managed: true,
      running: false,
      error: exc.message,
      dir,
    };
  }

  const python = resolvePython(dir);

  if (!python) {
    const error =
      'No Python interpreter found.';

    logErr(error);
    stopBackgroundProcesses();

    return {
      managed: true,
      running: false,
      error,
      dir,
    };
  }

  log('Python:', python.exe);

  try {
    child = spawn(
      python.exe,
      [
        ...python.args,
        'camera_server.py',
      ],
      {
        cwd: dir,
        env: childEnv(dir),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      }
    );
  } catch (exc) {
    const error =
      `Failed to spawn Python: ${exc.message}`;

    logErr(error);
    stopBackgroundProcesses();

    return {
      managed: true,
      running: false,
      error,
      dir,
    };
  }

  child.stdout.on(
    'data',
    (b) =>
      process.stdout.write(
        `[python] ${b}`
      )
  );

  child.stderr.on(
    'data',
    (b) =>
      process.stderr.write(
        `[python] ${b}`
      )
  );

  child.on(
    'exit',
    (code, signal) => {
      if (!stopping) {
        logErr(
          `Python exited code=${code} signal=${signal}`
        );
      }

      child = null;
    }
  );

  const ready = await waitForReady();

  if (ready) {
    setPhase(
      'ready',
      `ready at ${STATUS_URL}`
    );

    return {
      managed: true,
      running: true,
      error: null,
      pythonPath: python.exe,
      dir,
      bootstrap: getBootstrapStatus(),
    };
  }

  const error =
    'Local camera server did not answer /status within 30 seconds.';

  logErr(error);

  bootstrap = {
    ...bootstrap,
    phase: 'error',
    message: error,
  };

  return {
    managed: true,
    running: false,
    error,
    pythonPath: python.exe,
    dir,
    bootstrap: getBootstrapStatus(),
  };
}

function stopBackgroundProcesses() {
  const processes = [
    ffmpegProcess,
    mediamtxProcess,
  ];

  for (const proc of processes) {
    if (
      proc &&
      proc.pid &&
      proc.exitCode === null
    ) {
      try {
        if (IS_WINDOWS) {
          spawnSync(
            'taskkill',
            [
              '/PID',
              String(proc.pid),
              '/T',
              '/F',
            ],
            {
              stdio: 'ignore',
              windowsHide: true,
            }
          );
        } else {
          proc.kill('SIGTERM');
        }
      } catch {}
    }
  }

  ffmpegProcess = null;
  mediamtxProcess = null;
}

function stopLocalServer() {
  if (stopping) return;

  stopping = true;

  log('stopping MSDS background services...');

  if (
    child &&
    child.pid &&
    child.exitCode === null
  ) {
    try {
      if (IS_WINDOWS) {
        spawnSync(
          'taskkill',
          [
            '/PID',
            String(child.pid),
            '/T',
            '/F',
          ],
          {
            stdio: 'ignore',
            windowsHide: true,
          }
        );
      } else {
        child.kill('SIGTERM');
      }
    } catch {}
  }

  child = null;

  stopBackgroundProcesses();
}

module.exports = {
  startLocalServer,
  stopLocalServer,
  probeStatus,
  shouldManage,
  getBootstrapStatus,
};

