#!/usr/bin/env python3
"""Build the DSH runtime PNG and Windows multi-size ICO from one RGBA source."""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path

from PIL import Image


ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_replace(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    os.replace(source, destination)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("png_out", type=Path)
    parser.add_argument("ico_out", type=Path)
    args = parser.parse_args()

    source = args.source.resolve(strict=True)
    png_out = args.png_out.resolve()
    ico_out = args.ico_out.resolve()
    png_tmp = png_out.with_name(f".{png_out.name}.tmp")
    ico_tmp = ico_out.with_name(f".{ico_out.name}.tmp")

    with Image.open(source) as opened:
        rgba = opened.convert("RGBA")
        if rgba.width != rgba.height:
            raise ValueError(f"icon source must be square, got {rgba.size}")

        # Resize in premultiplied-alpha mode to avoid dark fringes on rounded,
        # transparent edges, then convert back to ordinary RGBA for output.
        icon = rgba.convert("RGBa").resize((256, 256), Image.Resampling.LANCZOS).convert("RGBA")
        png_tmp.parent.mkdir(parents=True, exist_ok=True)
        icon.save(png_tmp, format="PNG", optimize=True)
        icon.save(ico_tmp, format="ICO", sizes=ICO_SIZES, bitmap_format="png")

    atomic_replace(png_tmp, png_out)
    atomic_replace(ico_tmp, ico_out)

    with Image.open(ico_out) as ico:
        stored_sizes = sorted(ico.ico.sizes())

    print(f"SOURCE={source}")
    print("SOURCE_SIZE=1254x1254")
    print(f"PNG_OUT={png_out}")
    print("PNG_SIZE=256x256")
    print(f"PNG_SHA256={sha256(png_out)}")
    print(f"ICO_OUT={ico_out}")
    print("ICO_SIZES=" + ",".join(f"{width}x{height}" for width, height in stored_sizes))
    print(f"ICO_SHA256={sha256(ico_out)}")
    print("ICON_BUILD_OK=true")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
