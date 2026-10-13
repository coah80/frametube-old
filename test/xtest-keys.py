"""Presses keys on an X display through XTest, like Steam's keyboard controller layout does: real X key events.
Usage: DISPLAY=:99 python xtest-keys.py <delay seconds> <key> [<key> ...]   (X keysym names: space, s, e, w, 2 ...)"""
import sys
import time

from Xlib import X, XK, display
from Xlib.ext import xtest

d = display.Display()
time.sleep(float(sys.argv[1]))
for name in sys.argv[2:]:
    code = d.keysym_to_keycode(XK.string_to_keysym(name))
    xtest.fake_input(d, X.KeyPress, code)
    d.sync()
    time.sleep(0.08)
    xtest.fake_input(d, X.KeyRelease, code)
    d.sync()
    print(f"xtest: pressed {name} (keycode {code})", flush=True)
    time.sleep(1.5)
