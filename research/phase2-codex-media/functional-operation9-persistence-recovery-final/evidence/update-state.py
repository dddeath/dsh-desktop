#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


root = Path(r"E:\deepseek_harness")
state_path = root / ".agent" / "STATE.json"
operation = root / "research" / "phase2-codex-media" / "functional-operation9-persistence-recovery-final"
state = json.loads(state_path.read_text(encoding="utf-8"))
now = datetime.now().astimezone().isoformat(timespec="seconds")

state["updated_at"] = now
state["status"] = "in_progress"
state["current_phase"] = "phase2"
state["latest_result"] = (
    "Phase 2 persistence checks passed after desktop restart: dsh-codex-tools 1.0.1, OAuth metadata, "
    "image_gen/image_vision source registrations, generated output, desktop process, and HTTP 200 persist."
)
state["next_action"] = (
    "Manual gate F: user chooses retain-current (recommended) or execute uninstall then exact restore."
)
state["blockers"] = ["manual_gate_f_persistence_recovery_decision_pending"]

icon = state.get("phase2_desktop_icon_update", {})
icon["manual_gate_status"] = "accepted"
icon["accepted_at"] = now
state["phase2_desktop_icon_update"] = icon

for key in (
    "phase2_image_workspace_output_fix",
    "phase2_image_backend_recovery",
    "phase2_internal_image_publication_fix",
):
    if isinstance(state.get(key), dict) and state[key].get("manual_gate_status") == "pending":
        state[key]["manual_gate_status"] = "accepted_by_followup_use"
        state[key]["acceptance_evidence"] = (
            r"User selected E:\deepseek_workspace\pro1\output\imagegen\1786892171127.png as the desktop icon."
        )

if isinstance(state.get("phase2_internal_image_gen_fix"), dict):
    state["phase2_internal_image_gen_fix"]["manual_gate_status"] = "superseded_by_operation7"

state["phase2_operation6_final"] = {
    "phase": "P2-operation6-persistence-recovery",
    "operation_dir": str(operation),
    "plugin": "dsh-codex-tools",
    "version": "1.0.1",
    "persistence_checks": {
        "profile_manifest_match": True,
        "plugin_snapshot_files": 11,
        "tool_sources": ["image_gen", "image_vision", "web_search"],
        "profile_api_key_reference_count": 0,
        "codex_auth_fields_present": True,
        "auth_values_recorded": False,
        "generated_output_persisted": True,
        "desktop_process_running": True,
        "http_status": 200,
    },
    "snapshot_zip": str(operation / "artifacts" / "current-profile-plugin-snapshot.zip"),
    "snapshot_sha256": "b32dc06d8d64aebe6bcf02e7899215b51c5e4112034f289a1051c79fb15583d7",
    "uninstall": str(operation / "uninstall-current.ps1"),
    "restore": str(operation / "restore-current.ps1"),
    "recommended_decision": "retain-current",
    "machine_gate_passed": True,
    "manual_gate": "F",
    "manual_gate_status": "pending",
    "decision_options": ["retain-current", "execute-uninstall-and-restore"],
    "verification": str(operation / "verification.md"),
}

state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("STATE_UPDATE_OK=true")
