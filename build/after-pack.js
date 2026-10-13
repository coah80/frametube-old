'use strict';

// Runs after electron-builder has laid out the app (dist/linux-<arch>-unpacked):
// - Leaves out Electron's setuid sandbox helper. Copied to the Frame it isn't owned by root with mode 4755, and
//   Chromium then aborts at start ("The SUID sandbox helper binary was found, but is not configured correctly").
//   Without it Chromium sandboxes through user namespaces, which SteamOS allows.
// - Puts the launcher (launcher/launcher.c, built by launcher/build.sh) in as `frametube`: it starts the Electron
//   binary (`frametube-electron`) without the libraries Steam injects, which crash Chromium at start.
// - Adds frametube.desktop, which names the launcher as the program to run (FramePort and app menus read it).
const fs = require('node:fs');
const path = require('node:path');

const ARCHES = { 1: 'x86_64', 3: 'aarch64' }; // electron-builder's Arch enum: x64 = 1, arm64 = 3

const DESKTOP = `[Desktop Entry]
Type=Application
Name=FrameTube
Comment=YouTube's TV interface, controller friendly
Exec=frametube
Icon=frametube
Categories=AudioVideo;Video;
`;

exports.default = async function afterPack(context) {
  const out = context.appOutDir;
  const helper = path.join(out, 'chrome-sandbox');
  if (fs.existsSync(helper)) fs.rmSync(helper);

  const arch = ARCHES[context.arch];
  if (!arch) throw new Error(`no launcher for electron-builder arch ${context.arch}`);
  const launcher = path.join(__dirname, '..', 'launcher', `frametube-${arch}`);
  if (!fs.existsSync(launcher)) throw new Error(`${launcher} missing: run launcher/build.sh first`);
  const target = path.join(out, 'frametube');
  fs.copyFileSync(launcher, target);
  fs.chmodSync(target, 0o755);
  fs.writeFileSync(path.join(out, 'frametube.desktop'), DESKTOP);
  fs.copyFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), path.join(out, 'frametube.png'));
};
