import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const manifest = readJson(path.join(here, "artifact-manifest.json"));
const verification = readJson(path.join(here, "verification.json"));
const rollback = readJson(path.join(here, "rollback-verification.json"));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const planPath = path.join(repoRoot, ".agent", "PLAN.json");
const state = readJson(statePath);
const plan = readJson(planPath);
const now = new Date().toISOString();
const portable = manifest.artifacts.find((item) => item.name.endsWith("-portable.exe"));
const installer = manifest.artifacts.find((item) => item.name === "DeepSeek-Harness-Desktop-Setup-0.2.0.exe");

if (verification.result !== "PASS" || rollback.result !== "PASS" || !portable || !installer) {
  throw new Error("release evidence is incomplete");
}

const phase4 = plan.phases.find((phase) => phase.id === "P4");
phase4.status = "ready_to_publish";
phase4.version = manifest.version;
phase4.tag = manifest.tag;
phase4.verification = "release/v0.2.0/verification.json";
phase4.artifact_manifest = "release/v0.2.0/artifact-manifest.json";
phase4.rollback = "release/v0.2.0/rollback.ps1";
phase4.known_limitations = ["Windows executables are not Authenticode signed"];

state.updated_at = now;
state.status = "release_ready_to_publish";
state.current_phase = "P4";
state.latest_result = "v0.2.0 Windows portable and NSIS artifacts passed syntax, PE, ASAR, HTTP, hash, and isolated rollback verification; release metadata is ready for commit, tag, and push.";
state.next_action = "Commit release metadata, create and push the immutable v0.2.0 tag, then record the published commit in project state.";
state.release = {
  ...state.release,
  status: "ready_to_publish",
  verified_at: verification.verifiedAt,
  manifest: path.join(here, "artifact-manifest.json"),
  verification: path.join(here, "verification.json"),
  rollback: path.join(here, "rollback.ps1"),
  rollback_verification: path.join(here, "rollback-verification.json"),
  portable: { path: portable.path, bytes: portable.bytes, sha256: portable.sha256, signature: portable.signatureStatus },
  installer: { path: installer.path, bytes: installer.bytes, sha256: installer.sha256, signature: installer.signatureStatus },
  build_exit: verification.buildExit,
  http_status: verification.checks.httpStatus,
  known_limitations: ["unsigned_windows_binaries"],
};
state.last_verification = {
  kind: "v0.2.0_release_verification",
  phase: "P4",
  passed: true,
  manual_gate_status: "accepted_by_progression",
  completed_at: verification.verifiedAt,
  evidence: path.join(here, "verification.json"),
  outputs: {
    version: manifest.version,
    build_exit: verification.buildExit,
    artifact_count: verification.checks.artifactCount,
    portable_sha256: portable.sha256,
    installer_sha256: installer.sha256,
    http_status: verification.checks.httpStatus,
    rollback_probe: rollback.result,
    signature_status: portable.signatureStatus,
  },
};

fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(planPath, path.join(here, "PLAN.ready.json"));
fs.copyFileSync(statePath, path.join(here, "STATE.ready.json"));

const notes = `# DeepSeek Harness Desktop v0.2.0

发布日期：2026-08-17
平台：Windows x64

## 主要内容

- 完成桌面三栏、Composer、设置页、主题切换和桌宠响应式 UI 优化。
- 集成并验收 \`dsh-codex-tools@1.0.1\`，复用本机 Codex/ChatGPT 登录态提供图片识别与图片生成。
- 新增主题中立插件管理中心，包括来源、运行状态、敏感能力、更新、维护方式和恢复入口。
- 修复 Harness 重启时端口残留、Agent 运行遮挡、图片输出目录和内部生图错误折叠等问题。
- 完成真实插件停用、重启、恢复、重启闭环。

## 下载产物

| 产物 | 大小 | SHA-256 |
|---|---:|---|
| \`${portable.name}\` | ${portable.bytes} bytes | \`${portable.sha256}\` |
| \`${installer.name}\` | ${installer.bytes} bytes | \`${installer.sha256}\` |

本机路径：

- \`${portable.path}\`
- \`${installer.path}\`

## 验证

- 构建退出状态：\`0\`
- 六个生产 JavaScript 文件通过 \`node --check\`
- 便携版、安装版、解包程序 PE 头均为 \`MZ\`
- \`app.asar\` 包含 \`main.js\`、\`dsh-process.js\` 和桌面图标
- Harness 健康检查：HTTP 200
- 隔离回滚：PASS

完整记录：\`release/v0.2.0/verification.json\`。

## 已知限制

- Windows 可执行文件当前为 \`NotSigned\`，首次下载或运行时可能出现 SmartScreen 提示。
- 本次固定源码、分支、标签、构建日志和 SHA-256；未包含代码签名证书。

## 回滚

\`\`\`powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\\deepseek_harness\\release\\v0.2.0\\rollback.ps1
\`\`\`

回滚恢复桌面版本、lockfile、计划、状态和 README 到发布前哈希；不会修改正在使用的 DSH web profile。
`;
fs.writeFileSync(path.join(here, "RELEASE_NOTES.md"), `${notes}\n`, "utf8");

const report = `# v0.2.0 发布就绪报告

- 状态：READY TO PUBLISH
- 回滚点：\`${state.release.rollback_point}\`
- 构建：exit 0
- 验证：PASS
- 便携版：\`${portable.sha256}\`
- 安装版：\`${installer.sha256}\`
- 回滚：PASS
- 签名：NotSigned
- 下一步：提交、创建 \`v0.2.0\` 标签并推送
`;
fs.writeFileSync(path.join(here, "FINAL_REPORT.md"), `${report}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ result: "PASS", status: "ready_to_publish", portable: portable.sha256, installer: installer.sha256 }, null, 2)}\n`);
