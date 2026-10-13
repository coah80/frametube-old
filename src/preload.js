'use strict';

// Polls the controllers every frame and hands the remote-control keys to the main process, which sends them as real
// key events (synthetic DOM events don't reach YouTube's TV app). Hides the mouse pointer while a controller is used.
const { ipcRenderer } = require('electron');
const { createState, step } = require('./gamepad-map');

const DEBUG = process.env.FRAMETUBE_DEBUG === '1';

let state = createState();
let pointerHidden = false;
let lastPads = '';

function debugPads(pads) {
  const seen = pads.filter(Boolean).map((p) => `${p.index}:${p.id}:${p.mapping}:${p.buttons.length}b`).join(' | ');
  if (seen !== lastPads) {
    lastPads = seen;
    ipcRenderer.send('debug', `gamepads: ${seen || 'none'}`);
  }
}

function setPointerHidden(hidden) {
  if (hidden === pointerHidden || !document.documentElement) return;
  pointerHidden = hidden;
  document.documentElement.style.cursor = hidden ? 'none' : '';
}

function poll() {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
  if (DEBUG) debugPads(pads);
  const result = step(state, pads, performance.now());
  state = result.state;
  if (result.events.length) {
    setPointerHidden(true);
    ipcRenderer.send('remote-keys', result.events);
  }
  requestAnimationFrame(poll);
}

window.addEventListener('mousemove', () => setPointerHidden(false), true);
window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(poll));
