/**
 * MSDS Electron main process — LOCAL ONLY.
 *
 * Responsibilities:
 *  - Create the desktop window and load the existing React build (dist/index.html)
 *    in production, or the Vite dev server in development.
 *  - Own the local machine privileges (FFmpeg, RTSP, Whisper) that a browser cannot have.
 *
 * Security: contextIsolation ON, nodeIntegration OFF. The renderer talks to the
 * main process only through the typed bridge exposed in preload.cjs.
 *
 * NOTE: written in CommonJS (.cjs) because package.json sets "type": "module".
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { startLocalServer, stopLocalServer, getBootstrapStatus } = require('./localServer.cjs');

const isDev = !app.isPackaged || process.env.MSDS_ELECTRON_DEV === '1';
const DEV_URL = process.env.MSDS_DEV_URL || 'http://localhost:8080';

/** Local service (Node) base URL — never a public/cloud URL. */
const LOCAL_SERVICE_URL = process.env.MSDS_LOCAL_SERVICE_URL || 'http://127.0.0.1:5055';
/** Python camera bridge (existing local-server/camera_server.py). */
const LOCAL_CAMERA_SERVER_URL = process.env.MSDS_CAMERA_SERVER_URL || 'http://127.0.0.1:5000';

let mainWindow = null;
/** Last result of the local-server startup attempt, surfaced to the renderer. */
let localServerStatus = { managed: false, running: false, error: null };


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b1020',
    title: 'MSDS System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    // Requires vite build with base: './' (see vite.config.ts, ELECTRON=1).
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Open external links in the OS browser, never inside the shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// --- IPC bridge (renderer -> main). Read-only environment info only. ---
ipcMain.handle('msds:env', () => ({
  isElectron: true,
  isDev,
  platform: process.platform,
  appVersion: app.getVersion(),
  localServiceUrl: LOCAL_SERVICE_URL,
  cameraServerUrl: LOCAL_CAMERA_SERVER_URL,
  localServer: { ...localServerStatus, bootstrap: getBootstrapStatus() },
}));

ipcMain.handle('msds:localServerStatus', () => ({
  ...localServerStatus,
  bootstrap: getBootstrapStatus(),
}));

ipcMain.handle('msds:openExternal', (_evt, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
});

app.whenReady().then(() => {
  // Open the window immediately — the local bridge boots in parallel so a slow
  // or failing Python start never blocks the UI.
  createWindow();
  startLocalServer()
    .then((status) => {
      localServerStatus = status;
      if (status.error) console.error('[msds] local server not ready:', status.error);
    })
    .catch((exc) => {
      localServerStatus = { managed: true, running: false, error: String(exc) };
      console.error('[msds] local server startup crashed:', exc);
    });
});

// Terminate the Python bridge (and its MediaMTX/ffmpeg children) on shutdown.
app.on('before-quit', stopLocalServer);
app.on('will-quit', stopLocalServer);
process.on('exit', stopLocalServer);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopLocalServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

