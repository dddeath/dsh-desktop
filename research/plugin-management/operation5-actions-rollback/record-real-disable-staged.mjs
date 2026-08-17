import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const evidenceRoot = path.join(here, "evidence", "real-profile-drill");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const disable = readJson(path.join(evidenceRoot, "disable-staged-attempt-2.json"));
const staged = readJson(path.join(evidenceRoot, "staged-verification-attempt-2.json"));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const state = readJson(statePath);
const now = new Date().toISOString();

state.updated_at = now;
state.status = "awaiting_user_validation";
state.latest_result = "Phase 3 operation 4 real drill attempt 2 is stably staged: dsh-notification is removed from the settled profile while the new dsh-deep-whale, whale-girl, and ModLens changes are preserved; the old runtime remains active until manual restart.";
state.next_action = "User manually restarts Harness and confirms desktop health plus dsh-notification installed-disabled state; then Codex verifies the stopped runtime and stages restore from the attempt-2 backup.";
state.last_verification = {
  kind: "phase3_plugin_management_real_disable_staged_attempt_2",
  phase: "phase3-operation4",
  passed: true,
  manual_gate_status: "awaiting_real_disable_restart",
  completed_at: now,
  evidence: path.join(evidenceRoot, "staged-verification-attempt-2.json"),
  outputs: {
    package: disable.packageName,
    original_bundle_index: disable.originalIndex,
    staged_bundle_index: disable.disabled.afterIndex,
    before_package_sha256: disable.beforeHashes["package.json"].sha256,
    disabled_package_sha256: disable.disabled.afterSha256,
    backup_manifest_sha256: disable.backup.manifestSha256,
    lock_unchanged: disable.beforeHashes["pnpm-lock.yaml"].sha256 === disable.afterHashes["pnpm-lock.yaml"].sha256,
    patch_unchanged: disable.beforeHashes["cordis.patch.yml"].sha256 === disable.afterHashes["cordis.patch.yml"].sha256,
    snapshot_disabled: staged.outputs.snapshotNotificationInBundle === false,
    active_runtime_still_old_graph: staged.outputs.activeBootStillContainsNotification,
    listener_pid_before_restart: staged.outputs.listenerPid,
    restart_automatic: false,
    market_inactive: staged.outputs.marketActive === false,
    market_error: staged.outputs.marketError,
  },
};

const operation = state.phase3_execution.operation4;
operation.status = "real_disable_staged_attempt_2";
operation.live_profile_changed = true;
operation.real_profile_drill = "disable_staged_attempt_2_awaiting_restart";
operation.manual_gate_j = "awaiting_disable_restart_validation";
operation.attempt1 = {
  result: "overwritten_before_restart",
  user_restarted: false,
  conflict_evidence: path.join(evidenceRoot, "conflict-observed.json"),
};
operation.real_disable_staged_at = now;
operation.real_disable_package = disable.packageName;
operation.real_disable_original_index = disable.originalIndex;
operation.real_disable_baseline_sha256 = disable.beforeHashes["package.json"].sha256;
operation.real_disable_package_sha256 = disable.disabled.afterSha256;
operation.real_disable_backup = disable.backup.path;
operation.real_disable_backup_manifest_sha256 = disable.backup.manifestSha256;
operation.real_disable_listener_pid_before_restart = staged.outputs.listenerPid;
operation.preserved_profile_updates = {
  modlens: disable.preservedProfileFacts.modlens,
  deep_whale: disable.preservedProfileFacts.deepWhale,
  whale_girl: disable.preservedProfileFacts.whaleGirl,
};
operation.restore_script = path.join(here, "restore-real-drill.mjs");

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(statePath, path.join(evidenceRoot, "STATE.disable-staged-attempt-2.json"));

const verificationPath = path.join(here, "verification.md");
let verification = fs.readFileSync(verificationPath, "utf8");
const marker = "## 真实启停演练：稳定停用检查点（尝试 2）";
if (!verification.includes(marker)) {
  verification += [
    "",
    marker,
    "",
    "第一次暂存后，已在运行的 dshmarket 任务完成 profile 重写；期间没有执行人工重启，因此第一次停用未进入运行态。冲突证据已保留，未用旧备份覆盖新安装内容。",
    "",
    "第二次操作以插件市场完成后的配置为新基线，仅从 bundle 移除 `dsh-notification`：",
    "",
    "```text",
    "market active                 : false",
    `original bundle index         : ${disable.originalIndex}`,
    `staged bundle index           : ${disable.disabled.afterIndex}`,
    `baseline package SHA-256      : ${disable.beforeHashes["package.json"].sha256}`,
    `disabled package SHA-256      : ${disable.disabled.afterSha256}`,
    `backup manifest SHA-256       : ${disable.backup.manifestSha256}`,
    "lock unchanged                : true",
    "patch unchanged               : true",
    `snapshot inBundle             : ${staged.outputs.snapshotNotificationInBundle}`,
    `active boot still contains it : ${staged.outputs.activeBootStillContainsNotification}`,
    `listener PID before restart   : ${staged.outputs.listenerPid}`,
    "```",
    "",
    "保留的新配置：`@liustack/modlens ^3.17.3`、`dsh-deep-whale`、`whale-girl`。恢复脚本只会恢复尝试 2 的稳定基线。",
    "",
    "证据：`evidence/real-profile-drill/disable-staged-attempt-2.json`、`staged-verification-attempt-2.json`、`conflict-observed.json`。下一步为人工重启后验证停用运行态。",
    "",
  ].join("\n");
  fs.writeFileSync(verificationPath, verification, "utf8");
}

process.stdout.write(`${JSON.stringify({ result: "PASS", statePath, verificationPath, manualGate: "awaiting_real_disable_restart" }, null, 2)}\n`);
