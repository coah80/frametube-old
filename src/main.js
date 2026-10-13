'use strict';

// YouTube's TV interface (youtube.com/tv) in a fullscreen window. Google only serves the TV app to TV devices, so the
// window identifies as Cobalt, YouTube's own TV runtime. Sign-in uses the TV flow (a code at youtube.com/activate);
// the session is kept in Electron's profile.
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const { translate } = require('./steam-keys');

const TV_URL = 'https://www.youtube.com/tv';
const TV_USER_AGENT = 'Mozilla/5.0 (Linux; Android 12) Cobalt/22.2.3-gold (PS4)';
const VALID_EVENT_TYPES = new Set(['keyDown', 'keyUp']);

const DEBUG = process.env.FRAMETUBE_DEBUG === '1';

function debug(message) {
  if (DEBUG) process.stdout.write(`frametube: ${new Date().toISOString()} ${message}\n`);
}

// YouTube's TV app plays without a click first
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const windowed = process.env.FRAMETUBE_WINDOWED === '1';
  const win = new BrowserWindow({
    fullscreen: !windowed,
    frame: windowed,
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // the preload requires ./gamepad-map; the page itself gets no Node access
    },
  });
  win.removeMenu();
  // the TV app links out (help pages, terms): keep the user in the TV app instead of opening windows
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // Steam's controller layout for the app sends keys (WASD, Space...): swap them for the TV app's remote keys
  win.webContents.on('before-input-event', (event, input) => {
    const keyCode = translate(input);
    if (!keyCode) return;
    event.preventDefault();
    debug(`steam key ${input.type} ${JSON.stringify(input.key)} -> ${keyCode}`);
    win.webContents.sendInputEvent({ type: input.type, keyCode });
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`renderer gone (${details.reason}), reloading`);
    win.loadURL(TV_URL);
  });
  win.loadURL(TV_URL);
  return win;
}

ipcMain.on('remote-keys', (event, events) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || !Array.isArray(events)) return;
  for (const e of events) {
    if (e && VALID_EVENT_TYPES.has(e.type) && typeof e.keyCode === 'string') {
      debug(`key ${e.type} ${e.keyCode}`);
      win.webContents.sendInputEvent({ type: e.type, keyCode: e.keyCode });
    }
  }
});

ipcMain.on('debug', (_event, message) => debug(String(message).slice(0, 500)));

app.whenReady().then(() => {
  session.defaultSession.setUserAgent(TV_USER_AGENT);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
