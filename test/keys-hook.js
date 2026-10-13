'use strict';

// Key test hook, loaded with `electron -r ./test/keys-hook.js .`: once the TV app is up, sends KEYS (comma separated
// Electron key codes) the way the gamepad bridge does (webContents.sendInputEvent), logs what the page receives
// (key, keyCode, isTrusted) and saves a screenshot before and after to KEYS_OUT_<n>.png, then quits.
const fs = require('node:fs');
const { app } = require('electron');

// KEYS=none: send nothing, only log what arrives (keys come from outside, e.g. xdotool) for KEYS_WATCH_MS
const keys = process.env.KEYS === 'none' ? [] : (process.env.KEYS || 'Down,Down,Right,Enter').split(',');
const watchMs = Number(process.env.KEYS_WATCH_MS || 0);
const out = process.env.KEYS_OUT || '/tmp/frametube-keys';
const delayMs = Number(process.env.KEYS_DELAY_MS || 25000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.on('browser-window-created', (_event, win) => {
  win.webContents.on('console-message', (event) => {
    const message = event.message || '';
    if (message.startsWith('keytest:')) process.stdout.write(`${message}\n`);
  });
  setTimeout(async () => {
    try {
      await win.webContents.executeJavaScript(`
        for (const type of ['keydown', 'keyup']) {
          window.addEventListener(type, (e) => console.log('keytest: page ' + e.type + ' key=' + e.key + ' code=' +
            e.code + ' keyCode=' + e.keyCode + ' trusted=' + e.isTrusted), true);
        }`);
      fs.writeFileSync(`${out}_0.png`, (await win.webContents.capturePage()).toPNG());
      let n = 0;
      for (const key of keys) {
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: key });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
        n += 1;
        await sleep(1500);
        fs.writeFileSync(`${out}_${n}.png`, (await win.webContents.capturePage()).toPNG());
      }
      if (watchMs) {
        process.stdout.write('keytest: watching\n');
        await sleep(watchMs);
        fs.writeFileSync(`${out}_end.png`, (await win.webContents.capturePage()).toPNG());
      }
    } catch (error) {
      process.stdout.write(`keytest: failed: ${error.message}\n`);
      process.exitCode = 1;
    }
    app.quit();
  }, delayMs);
});
