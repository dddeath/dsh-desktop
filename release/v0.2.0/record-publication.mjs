import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const planPath = path.join(repoRoot, ".agent", "PLAN.json");
const state = readJson(statePath);
const plan = readJson(planPath);
const now = new Date().toISOString();
const releaseCommit = "e339c1bc0cce00a1a1536a1e36cdf3b32f4db2dd";
const tagObject = "a34e2e2c4aee27cdea3149825ba8856946b273ab";

const publication = {
  schemaVersion: 1,
  publishedAt: now,
  result: "PASS",
  channel: "git-tag-and-local-artifacts",
  remote: "https://github.com/dddeath/dsh-desktop.git",
  branch: "codex/phase1-ui-complete-phase2-ready",
  branchPush: true,
  tag: "v0.2.0",
  tagPush: true,
  tagObject,
  peeledCommit: releaseCommit,
  githubReleaseUploaded: false,
  artifactsRemainLocal: true,
  artifactManifest: path.join(here, "artifact-manifest.json"),
};
fs.writeFileSync(path.join(here, "publication.json"), `${JSON.stringify(publication, null, 2)}\n`, "utf8");

const phase4 = plan.phases.find((phase) => phase.id === "P4");
phase4.status = "completed";
phase4.completed_at = now;
phase4.completion_commit = releaseCommit;
phase4.completion_tag = publication.tag;
phase4.completion_evidence = "release/v0.2.0/publication.json";

state.updated_at = now;
state.status = "completed";
state.current_phase = "P4";
state.latest_result = "Release and wrap-up completed: v0.2.0 source commit and annotated tag are on origin, Windows artifacts and SHA-256 records are verified locally, and rollback passed in isolation.";
state.next_action = "Optional follow-up only: provide an Authenticode certificate and upload the two local executables to a GitHub Release if public binary distribution is desired.";
state.release = {
  ...state.release,
  status: "completed",
  completed_at: now,
  channel: publication.channel,
  commit: releaseCommit,
  tag: publication.tag,
  tag_object: tagObject,
  branch_pushed: true,
  tag_pushed: true,
  github_release_uploaded: false,
  artifacts_remain_local: true,
  publication: path.join(here, "publication.json"),
};
state.last_verification = {
  kind: "v0.2.0_publication",
  phase: "P4",
  passed: true,
  manual_gate_status: "completed",
  completed_at: now,
  evidence: path.join(here, "publication.json"),
  outputs: {
    release_commit: releaseCommit,
    tag: publication.tag,
    tag_object: tagObject,
    branch_push: true,
    tag_push: true,
    artifact_manifest: publication.artifactManifest,
    github_release_uploaded: false,
  },
};

fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(planPath, path.join(here, "PLAN.complete.json"));
fs.copyFileSync(statePath, path.join(here, "STATE.complete.json"));

const reportPath = path.join(here, "FINAL_REPORT.md");
const report = `# v0.2.0 发布完成报告

- 状态：COMPLETED
- 发布提交：\`${releaseCommit}\`
- 远端标签：\`v0.2.0\`
- 标签对象：\`${tagObject}\`
- 维护分支：已推送
- 构建：exit 0
- 验证：PASS
- 便携版：\`${state.release.portable.sha256}\`
- 安装版：\`${state.release.installer.sha256}\`
- 回滚：PASS
- 签名：NotSigned
- GitHub Release 附件：未上传；产物保留在本机 \`desktop/dist\`
`;
fs.writeFileSync(reportPath, `${report}\n`, "utf8");
process.stdout.write(`${JSON.stringify(publication, null, 2)}\n`);
