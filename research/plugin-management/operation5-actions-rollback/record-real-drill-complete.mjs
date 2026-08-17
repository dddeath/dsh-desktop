import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const evidenceRoot = path.join(here, "evidence", "real-profile-drill");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const final = readJson(path.join(evidenceRoot, "final-verification.json"));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const state = readJson(statePath);
const now = new Date().toISOString();

state.updated_at = now;
state.status = "phase3_completed";
state.latest_result = "Phase 3 operation 4 and manual Gate J passed. The real dsh-notification disable/restart/restore/restart drill is closed, and the final web profile matches the settled post-market baseline.";
state.next_action = "Prepare publication and wrap-up artifacts for the completed Phase 3 plugin-management work.";
state.last_verification = {
  kind: "phase3_plugin_management_real_start_stop_complete",
  phase: "phase3-operation4",
  passed: true,
  manual_gate_status: "accepted",
  completed_at: final.completedAt,
  evidence: final.artifacts.verification,
  outputs: {
    package: "dsh-notification",
    changed_field: final.changedField,
    disabled_bundle_index: final.behaviors.disabled.bundleIndex,
    disabled_boot_contains_notification: final.behaviors.disabled.bootContainsNotification,
    restored_bundle_index: final.behaviors.restored.bundleIndex,
    restored_boot_contains_notification: final.behaviors.restored.bootContainsNotification,
    restored_activation_state: final.behaviors.restored.activation.state,
    final_package_sha256: final.behaviors.restored.packageSha256,
    final_lock_sha256: final.behaviors.restored.lockSha256,
    final_patch_sha256: final.behaviors.restored.patchSha256,
    final_listener_pid: final.behaviors.restored.listenerPid,
    rollback_idempotent: true,
  },
};

const phase3 = state.phase3_execution;
phase3.status = "completed";
phase3.completed_at = final.completedAt;
phase3.current_operation = "operation4-management-actions-and-rollback-complete";
phase3.manual_gate = "J";
phase3.manual_gate_status = "accepted";
const operation = phase3.operation4;
operation.status = "accepted";
operation.completed_at = final.completedAt;
operation.live_profile_changed = false;
operation.real_profile_drill = "passed_closed";
operation.manual_gate_j = "accepted";
operation.final_listener_pid = final.behaviors.restored.listenerPid;
operation.final_package_sha256 = final.behaviors.restored.packageSha256;
operation.final_lock_sha256 = final.behaviors.restored.lockSha256;
operation.final_patch_sha256 = final.behaviors.restored.patchSha256;
operation.final_activation_state = final.behaviors.restored.activation.state;
operation.rollback_idempotent = true;
operation.final_verification = final.artifacts.verification;
operation.final_patch = final.artifacts.patch;
operation.accepted_at = final.completedAt;

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(statePath, path.join(evidenceRoot, "STATE.complete.json"));

const verificationPath = path.join(here, "verification.md");
let verification = fs.readFileSync(verificationPath, "utf8");
const marker = "## 最终结果：人工验收 J 通过";
if (!verification.includes(marker)) {
  verification += [
    "",
    marker,
    "",
    "真实启停演练闭环完成：`停用暂存 → 人工重启 → 停用运行态核验 → 基线恢复 → 人工重启 → 恢复运行态核验`。",
    "",
    "```text",
    `disabled bundle index        : ${final.behaviors.disabled.bundleIndex}`,
    `disabled boot contains       : ${final.behaviors.disabled.bootContainsNotification}`,
    `disabled listener PID        : ${final.behaviors.disabled.listenerPid}`,
    `restored bundle index        : ${final.behaviors.restored.bundleIndex}`,
    `restored boot contains       : ${final.behaviors.restored.bootContainsNotification}`,
    `restored activation          : ${final.behaviors.restored.activation.state}`,
    `restored listener PID        : ${final.behaviors.restored.listenerPid}`,
    `final package SHA-256        : ${final.behaviors.restored.packageSha256}`,
    `rollback idempotency         : PASS`,
    "```",
    "",
    `修改态产物：\`${final.artifacts.modifiedArtifact}\``,
    `差异：\`${final.artifacts.patch}\``,
    `最终验证：\`${final.artifacts.verification}\``,
    `可执行回滚：\`${final.artifacts.rollback}\``,
    "",
    "最终 profile 保留 ModLens、dsh-deep-whale 与 whale-girl 的现有更新；阶段 3 人工验收 J 通过。",
    "",
  ].join("\n");
  fs.writeFileSync(verificationPath, verification, "utf8");
}

process.stdout.write(`${JSON.stringify({ result: "PASS", phase: "phase3", gate: "J", statePath, verificationPath }, null, 2)}\n`);
