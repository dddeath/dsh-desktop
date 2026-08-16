#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


root = Path(r"E:\deepseek_harness")
state_path = root / ".agent" / "STATE.json"
operation_dir = root / "research" / "phase2-codex-media" / "functional-operation8-desktop-icon-update"

state = json.loads(state_path.read_text(encoding="utf-8"))
state["updated_at"] = datetime.now().astimezone().isoformat(timespec="seconds")
state["status"] = "in_progress"
state["current_phase"] = "phase2"
state["latest_result"] = (
    "The user-selected generated image is now the DSH desktop runtime and package icon; "
    "portable, NSIS, and dist-status builds succeeded, and the rebuilt desktop window is running."
)
state["next_action"] = (
    "User visually confirms the new icon in the DSH title bar/taskbar; then continue the next phase 2 item."
)
state["phase2_desktop_icon_update"] = {
    "phase": "P2-operation8-desktop-icon",
    "operation_dir": str(operation_dir),
    "source": r"E:\deepseek_workspace\pro1\output\imagegen\1786892171127.png",
    "source_sha256": "9a0fdff8892c73c49b5e694d9b737826bc7b06ee5ed051ec624f112c3fb4f454",
    "source_size": "1254x1254",
    "changed_fields": [
        "desktop/assets/icon.png -> transparent RGBA 256x256 runtime icon",
        "desktop/assets/icon.ico -> Windows ICO frames 16,24,32,48,64,128,256",
        "electron-builder portable and NSIS packages rebuilt",
        "dist-status runtime rebuilt and relaunched",
    ],
    "asset_hashes": {
        "icon.png": "408b1d493f8faad7651b784340c11c85a3d703c006efadfec7bee433ce5227db",
        "icon.ico": "c8373cffbc401eb3853414afba3e0baa8dd699301bb5ab53540ea2231f5334ac",
    },
    "build_outputs": [
        r"E:\deepseek_harness\desktop\dist\DeepSeek-Harness-Desktop-0.1.0-portable.exe",
        r"E:\deepseek_harness\desktop\dist\DeepSeek-Harness-Desktop-Setup-0.1.0.exe",
        r"E:\deepseek_harness\desktop\dist-status\DeepSeek-Harness-Desktop-0.1.0-portable.exe",
        r"E:\deepseek_harness\desktop\dist-status\win-unpacked\DeepSeek Harness Desktop.exe",
    ],
    "package_build_exit": 0,
    "runtime_build_exit": 0,
    "embedded_icon_pixel_match_32": True,
    "runtime_window_title": "深海女仆工坊 · DeepSeek Harness",
    "runtime_http_status": 200,
    "machine_gate_passed": True,
    "manual_gate": "desktop-icon-visual",
    "manual_gate_status": "pending",
    "verification": str(operation_dir / "verification.md"),
    "rollback": str(operation_dir / "rollback.ps1"),
}

state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("STATE_UPDATE_OK=true")
