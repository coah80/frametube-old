'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { translate } = require('../src/steam-keys');

const key = (k, extra = {}) => ({ type: 'keyDown', key: k, ...extra });

test('left stick (WASD) and d-pad (1-4) become arrows', () => {
  assert.deepEqual(['w', 'a', 's', 'd'].map((k) => translate(key(k))), ['Up', 'Left', 'Down', 'Right']);
  assert.deepEqual(['1', '2', '3', '4'].map((k) => translate(key(k))), ['Up', 'Right', 'Down', 'Left']);
});

test('A (Space) selects, B (E) goes back, X (R) plays/pauses', () => {
  assert.equal(translate(key(' ')), 'Enter');
  assert.equal(translate(key('e')), 'Escape');
  assert.equal(translate(key('r')), 'MediaPlayPause');
});

test('the stick click holds Shift, which still maps (W arrives as "W")', () => {
  assert.equal(translate(key('W', { shift: true })), 'Up');
});

test('key up is translated too, so held keys are released', () => {
  assert.equal(translate({ type: 'keyUp', key: 'd' }), 'Right');
});

test('keys the TV app understands, shortcuts and other events are left alone', () => {
  assert.equal(translate(key('ArrowUp')), null);
  assert.equal(translate(key('Escape')), null);
  assert.equal(translate(key('Enter')), null);
  assert.equal(translate(key('w', { control: true })), null);
  assert.equal(translate({ type: 'char', key: 'w' }), null);
  assert.equal(translate(null), null);
});
