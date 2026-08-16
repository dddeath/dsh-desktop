#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from PIL import Image, ImageChops


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


source, png_path, ico_path, extracted_path = map(Path, sys.argv[1:5])

with Image.open(source) as image:
    assert image.size == (1254, 1254)
    assert image.mode == "RGBA"
    assert image.getchannel("A").getextrema() == (0, 255)

with Image.open(png_path) as image:
    assert image.size == (256, 256)
    assert image.mode == "RGBA"
    assert image.getchannel("A").getextrema() == (0, 255)

with Image.open(ico_path) as image:
    stored_sizes = sorted(image.ico.sizes())
    assert stored_sizes == [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    expected_32 = image.ico.getimage((32, 32)).convert("RGBA")

with Image.open(extracted_path) as image:
    actual_32 = image.convert("RGBA")
    assert actual_32.size == (32, 32)

pixel_match = ImageChops.difference(expected_32, actual_32).getbbox() is None
assert pixel_match

print("SOURCE_SIZE=1254x1254")
print("SOURCE_ALPHA=0..255")
print("PNG_SIZE=256x256")
print("PNG_MODE=RGBA")
print(f"PNG_SHA256={sha256(png_path)}")
print("ICO_SIZES=" + ",".join(f"{width}x{height}" for width, height in stored_sizes))
print(f"ICO_SHA256={sha256(ico_path)}")
print("EXE_ICON_SIZE=32x32")
print(f"EXE_ICON_PIXEL_MATCH={str(pixel_match).lower()}")
print("ICON_METADATA_OK=true")
