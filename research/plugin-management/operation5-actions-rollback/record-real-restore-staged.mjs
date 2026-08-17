import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const evidenceRoot = path.join(here, "evidence", "real-profile-drill");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const disableRuntime = readJson(path.join(evidenceRoot, "disable-runtime-verification.json"));
const restore = readJson(path.join(evidenceRoot, "restore-staged.json"));
const staged = readJson(path.join(evidenceRoot, "restore-staged-verification.json"));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const state = readJson(statePath);
const now = new Date().toISOString();

state.updated_at = now;
state.status = "awaiting_user_validation";
state.latest_result = "The real disabled runtime passed after restart: dsh-notification was absent from the new boot graph. The settled attempt-2 backup is now restored on disk and awaits the second manual restart.";
state.next_action = "User manually restarts Harness a second time and confirms dsh-notification is running again; then Codex records the final restored runtime and closes Phase 3 operation 4.";
state.last_verification = {
  kind: "phase3_plugin_management_real_restore_staged",
  phase: "phase3-operation4",
  passed: true,
  manual_gate_status: "awaiting_real_restore_restart",
  completed_at: now,
  evidence: path.join(evidenceRoot, "restore-staged-verification.json"),
  outputs: {
    package: restore.packageName,
    restored_bundle_index: restore.originalIndex,
    restored_package_sha256: staged.outputs.packageSha256,
    restored_lock_sha256: staged.outputs.lockSha256,
    restored_patch_sha256: staged.outputs.patchSha256,
    snapshot_in_bundle: staged.outputs.snapshotInBundle,
    active_runtime_still_disabled_graph: staged.outputs.bootContainsNotification === false,
    listener_pid_before_second_restart: staged.outputs.listenerPid,
    market_inactive: staged.outputs.marketActive === false,
    preserved_modlens: staged.outputs.modlens,
    preserved_deep_whale: staged.outputs.deepWhale,
    preserved_whale_girl: staged.outputs.whaleGirl,
  },
};

const operation = state.phase3_execution.operation4;
operation.status = "real_restore_staged";
operation.live_profile_changed = false;
operation.real_profile_drill = "restore_staged_awaiting_second_restart";
operation.manual_gate_j = "awaiting_restore_restart_validation";
operation.disabled_runtime = {
  result: disableRuntime.result,
  verified_at: disableRuntime.verifiedAt,
  package_sha256: disableRuntime.outputs.packageSha256,
  bundle_index: disableRuntime.outputs.bundleIndex,
  boot_contains_notification: disableRuntime.outputs.bootContainsNotification,
  listener_pid: disableRuntime.outputs.listenerPid,
  acceptance_image: disableRuntime.inputs.acceptanceImage,
  acceptance_image_sha256: disableRuntime.inputs.acceptanceImageSha256,
};
operation.restore_staged_at = restore.stagedAt;
operation.restore_package_sha256 = staged.outputs.packageSha256;
operation.restore_lock_sha256 = staged.outputs.lockSha256;
operation.restore_patch_sha256 = staged.outputs.patchSha256;
operation.restore_bundle_index = staged.outputs.bundleIndex;
operation.restore_listener_pid_before_restart = staged.outputs.listenerPid;
operation.restore_evidence = path.join(evidenceRoot, "restore-staged.json");

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(statePath, path.join(evidenceRoot, "STATE.restore-staged.json"));

const verificationPath = path.join(here, "verification.md");
let verification = fs.readFileSync(verificationPath, "utf8");
const marker = "## 真实启停演练：停用运行态通过，恢复已暂存";
if (!verification.includes(marker)) {
  verification += [
    "",
    marker,
    "",
    "人工重启后的停用运行态已通过截图与服务端运行清单双重核验：",
    "",
    "```text",
    `acceptance image SHA-256     : ${disableRuntime.inputs.acceptanceImageSha256}`,
    `disabled package SHA-256     : ${disableRuntime.outputs.packageSha256}`,
    `new listener PID             : ${disableRuntime.outputs.listenerPid}`,
    `listener PID changed         : ${disableRuntime.outputs.listenerPidChangedFromBaseline}`,
    `boot contains notification   : ${disableRuntime.outputs.bootContainsNotification}`,
    `snapshot inBundle            : ${disableRuntime.outputs.snapshotInBundle}`,
    "```",
    "",
    "随后执行 `restore-real-drill.mjs`，逐文件恢复尝试 2 的稳定备份：",
    "",
    "```text",
    `restored bundle index        : ${staged.outputs.bundleIndex}`,
    `restored package SHA-256     : ${staged.outputs.packageSha256}`,
    `restored lock SHA-256        : ${staged.outputs.lockSha256}`,
    `restored patch SHA-256       : ${staged.outputs.patchSha256}`,
    `snapshot inBundle            : ${staged.outputs.snapshotInBundle}`,
    `current boot still disabled  : ${staged.outputs.bootContainsNotification === false}`,
    `market active                : ${staged.outputs.marketActive}`,
    "```",
    "",
    "ModLens、dsh-deep-whale 与 whale-girl 的插件市场更新均保持不变。下一步为第二次人工重启，验证通知插件恢复运行。",
    "",
  ].join("\n");
  fs.writeFileSync(verificationPath, verification, "utf8");
}

process.stdout.write(`${JSON.stringify({ result: "PASS", statePath, verificationPath, manualGate: "awaiting_real_restore_restart" }, null, 2)}\n`);
