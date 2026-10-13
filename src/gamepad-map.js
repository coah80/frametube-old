'use strict';

// Turns gamepad snapshots into the remote-control keys YouTube's TV app understands. Pure: the caller polls
// navigator.getGamepads() and sends the returned events, so this runs (and is tested) without a browser.

// Standard gamepad layout (https://w3c.github.io/gamepad/#remapping): Steam Input presents every controller,
// the Frame's included, as one of these.
const BUTTON_KEYS = {
  0: 'Enter', // A: select
  1: 'Escape', // B: back
  2: 'MediaPlayPause', // X
  4: 'MediaTrackPrevious', // LB: previous video
  5: 'MediaTrackNext', // RB: next video
  6: 'MediaRewind', // LT
  7: 'MediaFastForward', // RT
};

const DPAD = { 12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right' };
const STICK_THRESHOLD = 0.5;
const REPEAT_DELAY_MS = 400; // held direction: first repeat after this, then every REPEAT_RATE_MS
const REPEAT_RATE_MS = 110;

function createState() {
  return { pads: new Map() };
}

function directionsOf(pad) {
  const pressed = (i) => Boolean(pad.buttons[i] && pad.buttons[i].pressed);
  const [x = 0, y = 0] = pad.axes || [];
  return {
    Up: pressed(12) || y < -STICK_THRESHOLD,
    Down: pressed(13) || y > STICK_THRESHOLD,
    Left: pressed(14) || x < -STICK_THRESHOLD,
    Right: pressed(15) || x > STICK_THRESHOLD,
  };
}

function buttonsOf(pad) {
  const out = {};
  for (const index of Object.keys(BUTTON_KEYS)) {
    const b = pad.buttons[index];
    out[index] = Boolean(b && b.pressed);
  }
  return out;
}

// One poll: returns { state, events } where events are [{ type: 'keyDown' | 'keyUp', keyCode }].
function step(state, pads, now) {
  const events = [];
  const next = new Map();
  for (const pad of pads) {
    if (!pad) continue;
    const prev = state.pads.get(pad.index) || { buttons: {}, dirs: {}, heldSince: {}, lastRepeat: {} };
    const buttons = buttonsOf(pad);
    const dirs = directionsOf(pad);
    const heldSince = { ...prev.heldSince };
    const lastRepeat = { ...prev.lastRepeat };

    for (const [index, key] of Object.entries(BUTTON_KEYS)) {
      if (buttons[index] && !prev.buttons[index]) events.push({ type: 'keyDown', keyCode: key });
      if (!buttons[index] && prev.buttons[index]) events.push({ type: 'keyUp', keyCode: key });
    }
    for (const key of Object.values(DPAD)) {
      if (dirs[key] && !prev.dirs[key]) {
        events.push({ type: 'keyDown', keyCode: key });
        heldSince[key] = now;
        lastRepeat[key] = now;
      } else if (dirs[key]) {
        const due = now - heldSince[key] >= REPEAT_DELAY_MS && now - lastRepeat[key] >= REPEAT_RATE_MS;
        if (due) {
          events.push({ type: 'keyDown', keyCode: key });
          lastRepeat[key] = now;
        }
      } else if (prev.dirs[key]) {
        events.push({ type: 'keyUp', keyCode: key });
        delete heldSince[key];
        delete lastRepeat[key];
      }
    }
    next.set(pad.index, { buttons, dirs, heldSince, lastRepeat });
  }
  // a pad that went away releases whatever it held
  for (const [index, prev] of state.pads) {
    if (next.has(index)) continue;
    for (const [b, key] of Object.entries(BUTTON_KEYS)) if (prev.buttons[b]) events.push({ type: 'keyUp', keyCode: key });
    for (const key of Object.values(DPAD)) if (prev.dirs[key]) events.push({ type: 'keyUp', keyCode: key });
  }
  return { state: { pads: next }, events };
}

module.exports = { BUTTON_KEYS, DPAD, REPEAT_DELAY_MS, REPEAT_RATE_MS, createState, step };
