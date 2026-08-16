#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


root = Path(r"E:\deepseek_harness")
state_path = root / ".agent" / "STATE.json"
plan_path = root / ".agent" / "PLAN.json"
phase2_commit = "4c7244ed0779804cf81cab5a8c4618f8126550c4"
phase2_evidence = root / "research" / "phase2-codex-media" / "functional-operation9-persistence-recovery-final" / "verification.md"
phase3_plan = root / "research" / "plugin-management" / "phase3-execution-plan.md"
now = datetime.now().astimezone().isoformat(timespec="seconds")

state = json.loads(state_path.read_text(encoding="utf-8"))
operation6 = state["phase2_operation6_final"]
operation6["manual_gate_status"] = "accepted"
operation6["decision"] = "retain-current"
operation6["accepted_at"] = now

state["updated_at"] = now
state["status"] = "in_progress"
state["current_phase"] = "phase3"
state["latest_result"] = (
    "Phase 2 is complete with retain-current accepted at manual gate F; the verified "
    "dsh-codex-tools 1.0.1 implementation and exact recovery snapshot are retained."
)
state["next_action"] = (
    "Phase 3 operation 1: analyze the current plugin inventory, responsibilities, overlap, "
    "load/update risks, and usage recommendations for manual gate G."
)
state["blockers"] = []
state["phase2_completion"] = {
    "status": "completed",
    "decision": "retain-current",
    "completed_at": now,
    "completion_commit": phase2_commit,
    "completion_evidence": str(phase2_evidence),
    "plugin": "dsh-codex-tools@1.0.1",
    "manual_gates": ["A", "B", "C", "D", "E", "F"],
    "recovery_snapshot_sha256": "b32dc06d8d64aebe6bcf02e7899215b51c5e4112034f289a1051c79fb15583d7",
}
state["phase3_execution"] = {
    "status": "in_progress",
    "started_at": now,
    "rollback_point": phase2_commit,
    "execution_plan": str(phase3_plan),
    "current_operation": "operation1-plugin-structure-analysis",
    "manual_gate": "G",
    "manual_gate_status": "pending",
}
state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plan = json.loads(plan_path.read_text(encoding="utf-8"))
for phase in plan["phases"]:
    if phase["id"] == "P2":
        phase["status"] = "completed"
        phase["completed_at"] = now
        phase["completion_commit"] = phase2_commit
        phase["completion_evidence"] = str(phase2_evidence.relative_to(root)).replace("\\", "/")
        phase["retained_decision"] = "dsh-codex-tools@1.0.1"
    elif phase["id"] == "P3":
        phase["status"] = "in_progress"
        phase["started_at"] = now
        phase["rollback_point"] = phase2_commit
        phase["execution_plan"] = str(phase3_plan.relative_to(root)).replace("\\", "/")
plan["current_phase"] = "P3"
plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("PHASE2_GATE_F=accepted")
print("PHASE2_DECISION=retain-current")
print("PHASE2_STATUS=completed")
print("PHASE3_STATUS=in_progress")
print("PHASE3_OPERATION=operation1-plugin-structure-analysis")
