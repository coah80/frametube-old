'use strict';

// Steam on the Frame gives a non-Steam app its "Keyboard (WASD) and Mouse" controller layout
// (controller_base/templates/wasd.vdf): the controllers arrive as key presses, not as a gamepad. This maps those keys
// to the remote-control keys YouTube's TV app reads (event.key ArrowUp/Down/Left/Right, Enter, Escape).
//
//   left stick  W A S D        -> arrows       A button  Space -> Enter (select)
//   d-pad       1 2 3 4        -> arrows       B button  E     -> Escape (back)
//   (1 up, 2 right, 3 down, 4 left)            X button  R     -> play/pause
// Escape (the controller's view button) already means back and is left alone.

const STEAM_KEYS = {
  w: 'Up',
  a: 'Left',
  s: 'Down',
  d: 'Right',
  1: 'Up',
  2: 'Right',
  3: 'Down',
  4: 'Left',
  ' ': 'Enter',
  e: 'Escape',
  r: 'MediaPlayPause',
};

// Electron's before-input-event input -> the Electron key code to send instead, or null to leave the key alone.
// Keys with Ctrl/Alt/Meta held are never translated (shortcuts), Shift is (the left stick's click holds it).
function translate(input) {
  if (!input || (input.type !== 'keyDown' && input.type !== 'keyUp')) return null;
  if (input.control || input.alt || input.meta) return null;
  const key = typeof input.key === 'string' ? input.key.toLowerCase() : '';
  return Object.prototype.hasOwnProperty.call(STEAM_KEYS, key) ? STEAM_KEYS[key] : null;
}

module.exports = { STEAM_KEYS, translate };
