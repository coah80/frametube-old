#!/bin/sh
# Builds the launcher for aarch64 (the Frame) and x86_64 (PCs) with any clang + lld (CLANG=path/to/clang to choose one;
# the Android NDK's works). Output: launcher/frametube-<arch>, which the after-pack step copies into the app.
set -eu
cd "$(dirname "$0")"
CLANG=${CLANG:-clang}
for arch in aarch64 x86_64; do
    "$CLANG" --target="$arch-linux-gnu" -ffreestanding -nostdlib -nostdlibinc -static -fno-stack-protector \
        -fno-builtin -O2 -Wall -Wextra -Werror -fuse-ld=lld -Wl,--build-id=none -Wl,-z,max-page-size=65536 -s \
        -e _start launcher.c -o "frametube-$arch"
done
