'use strict';

// Smoke test hook, loaded before the app with `electron -r ./test/smoke-hook.js .`: once the TV app has had time to
// render, saves a screenshot and the page title to SMOKE_OUT, then quits.
const fs = require('node:fs');
const { app, BrowserWindow } = require('electron');

const out = process.env.SMOKE_OUT || '/tmp/frametube-smoke.png';
const delayMs = Number(process.env.SMOKE_DELAY_MS || 25000);

app.on('browser-window-created', (_event, win) => {
  setTimeout(async () => {
    try {
      const image = await win.webContents.capturePage();
      fs.writeFileSync(out, image.toPNG());
      const ua = await win.webContents.executeJavaScript('navigator.userAgent');
      process.stdout.write(`smoke: title="${win.webContents.getTitle()}" url=${win.webContents.getURL()} ua="${ua}"\n`);
    } catch (error) {
      process.stdout.write(`smoke: capture failed: ${error.message}\n`);
      process.exitCode = 1;
    }
    app.quit();
  }, delayMs);
});

// a window that never appears is a failure too
setTimeout(() => {
  if (!BrowserWindow.getAllWindows().length) {
    process.stdout.write('smoke: no window\n');
    app.exit(1);
  }
}, delayMs + 15000).unref();
