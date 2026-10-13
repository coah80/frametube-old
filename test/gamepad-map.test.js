'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, step, REPEAT_DELAY_MS, REPEAT_RATE_MS } = require('../src/gamepad-map');

function pad({ pressed = [], axes = [0, 0], index = 0 } = {}) {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) }));
  return { index, buttons, axes };
}

function run(frames) {
  let state = createState();
  const out = [];
  for (const [pads, now] of frames) {
    const r = step(state, pads, now);
    state = r.state;
    out.push(r.events);
  }
  return out;
}

test('A is Enter and B is Escape, one key down and one key up per press', () => {
  const ev = run([[[pad({ pressed: [0] })], 0], [[pad({ pressed: [0] })], 16], [[pad()], 32], [[pad({ pressed: [1] })], 48]]);
  assert.deepEqual(ev[0], [{ type: 'keyDown', keyCode: 'Enter' }]);
  assert.deepEqual(ev[1], []);
  assert.deepEqual(ev[2], [{ type: 'keyUp', keyCode: 'Enter' }]);
  assert.deepEqual(ev[3], [{ type: 'keyDown', keyCode: 'Escape' }]);
});

test('d-pad and left stick both give arrow keys', () => {
  const ev = run([[[pad({ pressed: [15] })], 0], [[pad({ axes: [0, -0.9] })], 16]]);
  assert.deepEqual(ev[0], [{ type: 'keyDown', keyCode: 'Right' }]);
  assert.deepEqual(ev[1], [{ type: 'keyDown', keyCode: 'Up' }, { type: 'keyUp', keyCode: 'Right' }]);
});

test('a held direction repeats after the delay, then at the repeat rate', () => {
  const t1 = REPEAT_DELAY_MS;
  const ev = run([
    [[pad({ pressed: [13] })], 0],
    [[pad({ pressed: [13] })], t1 - 1],
    [[pad({ pressed: [13] })], t1],
    [[pad({ pressed: [13] })], t1 + REPEAT_RATE_MS - 1],
    [[pad({ pressed: [13] })], t1 + REPEAT_RATE_MS],
  ]);
  assert.deepEqual(ev.map((e) => e.length), [1, 0, 1, 0, 1]);
});

test('a stick inside the dead zone sends nothing', () => {
  assert.deepEqual(run([[[pad({ axes: [0.3, -0.3] })], 0]])[0], []);
});

test('a controller that disconnects releases its held keys', () => {
  const ev = run([[[pad({ pressed: [0, 12] })], 0], [[], 16]]);
  assert.deepEqual(ev[1], [{ type: 'keyUp', keyCode: 'Enter' }, { type: 'keyUp', keyCode: 'Up' }]);
});

test('empty gamepad slots are skipped', () => {
  assert.deepEqual(run([[[null, pad({ index: 1, pressed: [2] })], 0]])[0], [{ type: 'keyDown', keyCode: 'MediaPlayPause' }]);
});
