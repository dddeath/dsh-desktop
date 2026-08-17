import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const baseline = readJson(path.join(here, "baseline.json"));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const planPath = path.join(repoRoot, ".agent", "PLAN.json");
const state = readJson(statePath);
const plan = readJson(planPath);
const now = new Date().toISOString();

const phase3 = plan.phases.find((phase) => phase.id === "P3");
const phase4 = plan.phases.find((phase) => phase.id === "P4");
phase3.status = "completed";
phase3.completed_at = now;
phase3.completion_evidence = "research/plugin-management/operation5-actions-rollback/evidence/real-profile-drill/final-verification.json";
phase4.status = "in_progress";
phase4.rollback_point = baseline.rollbackPoint;
phase4.started_at = now;
phase4.release_version = baseline.releaseVersion;
phase4.release_tag = baseline.releaseTag;
phase4.actions = [
  "固定桌面版本、Git 提交与发布标签",
  "构建 Windows x64 便携版和 NSIS 安装版",
  "记录产物 SHA-256、PE 结构、构建日志和运行健康状态",
  "生成 README、CHANGELOG、发布说明和可执行回滚",
];

state.updated_at = now;
state.status = "release_in_progress";
state.current_phase = "P4";
state.latest_result = "Phase 3 and the follow-up control-center UI were accepted by progression; release v0.2.0 preparation has started from the fixed rollback commit.";
state.next_action = "Build and verify the v0.2.0 Windows portable and installer artifacts, then publish the branch and immutable tag.";
state.post_phase3_control_center_ui.status = "accepted";
state.post_phase3_control_center_ui.manual_gate_status = "accepted_by_progression_to_release";
state.post_phase3_control_center_ui.accepted_at = now;
state.release = {
  status: "in_progress",
  version: baseline.releaseVersion,
  tag: baseline.releaseTag,
  started_at: now,
  rollback_point: baseline.rollbackPoint,
  branch: baseline.branch,
  output_dir: path.join(repoRoot, "desktop", "dist"),
  record_dir: here,
};

fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(planPath, path.join(here, "PLAN.release-start.json"));
fs.copyFileSync(statePath, path.join(here, "STATE.release-start.json"));
process.stdout.write(`${JSON.stringify({ result: "PASS", phase: "P4", version: baseline.releaseVersion, rollbackPoint: baseline.rollbackPoint }, null, 2)}\n`);
