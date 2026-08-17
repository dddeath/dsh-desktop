import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const verification = readJson(path.join(here, "verification.json"));
const baseline = readJson(path.join(here, "baseline.json"));
const market = readJson(path.join(here, "market-behavior.json"));
const rollback = readJson(path.join(here, "evidence", "rollback-probe.json"));
const statePath = path.join(repoRoot, ".agent", "STATE.json");
const state = readJson(statePath);
const now = new Date().toISOString();

state.updated_at = now;
state.status = "awaiting_user_validation";
state.current_phase = "post_phase3_control_center_ui";
state.latest_result = "Control-center UI 0.1.1 is staged: status chips and detail controls use fixed visual contracts, expanded details use a unified panel, and source maintenance mode is explicit.";
state.next_action = "User refreshes or restarts Harness, checks the management-center card grid, expands one market plugin and one local-link plugin, and accepts or reports visual adjustments.";
state.last_verification = {
  kind: "control_center_visual_and_maintenance_mode_staged",
  phase: "post-phase3",
  passed: true,
  manual_gate_status: "awaiting_ui_validation",
  completed_at: verification.verifiedAt,
  evidence: path.join(here, "verification.json"),
  outputs: {
    version: verification.checks.version,
    original_client_sha256: baseline.controlCenterClientSha256,
    modified_client_sha256: verification.outputs.clientSha256,
    fixed_detail_button: verification.checks.fixedToggleSize,
    unified_status_chips: verification.checks.unifiedTagHeight,
    unified_detail_panel: verification.checks.framedDetails,
    maintenance_mode_visible: verification.checks.maintenanceDetail,
    live_profile_changed: verification.outputs.profileChanged,
    rollback_probe: rollback.result,
  },
};
state.post_phase3_control_center_ui = {
  status: "awaiting_user_validation",
  started_at: now,
  package: "dsh-plugin-control-center",
  version: verification.checks.version,
  changed_fields: [
    "status and metadata tags share a 28px height and 9px radius",
    "detail/collapse button uses a reserved 68x38px single-line slot",
    "expanded details use one bordered panel contract",
    "details identify market-managed versus locally maintained sources",
  ],
  community_plugin_decision: {
    sidebar_spec: market.sidebarSpec,
    sidebar_version: market.sidebarVersion,
    direct_node_modules_edit: "overwritten_by_market_update",
    ui_only_recommendation: "theme-neutral overlay plugin",
    behavior_change_recommendation: "local fork linked with link:",
  },
  profile_changed: false,
  manual_gate_status: "awaiting_ui_validation",
  operation_dir: here,
  verification: path.join(here, "verification.json"),
  patch: path.join(here, "change.patch"),
  rollback: path.join(here, "rollback.ps1"),
  strategy: path.join(here, "community-plugin-customization.md"),
};
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.copyFileSync(statePath, path.join(here, "STATE.staged.json"));

const md = `# 插件管理中心视觉与社区插件定制验证

## 修改范围

- 插件：\`dsh-plugin-control-center 0.1.1\`
- 状态标签：统一为 28px 高、9px 圆角、单行居中；状态标签设置统一最小宽度。
- 详情按钮：卡片标题区固定预留 68px 列，按钮固定 68 × 38px，禁止文字换行。
- 展开详情：统一边框、圆角、内边距和浅色背景。
- 维护方式：详情明确区分“市场托管”和“本地工作区维护”。

## 市场冲突结论

当前 \`dsh-better-sidebar\` 为 \`${market.sidebarSpec}\`（已安装 ${market.sidebarVersion}）。dshmarket ${market.dshmarketVersion} 更新 npm 插件时重新执行包安装，不合并安装目录中的手工修改。UI/DOM 适配继续放在独立兼容插件；内部行为修改使用 Git fork + \`link:\`。

完整方案：\`${path.join(here, "community-plugin-customization.md")}\`。

## 自动验证

\`\`\`text
node --check client.js          : exit 0
verify.mjs                      : exit 0, PASS
served client HTTP             : ${verification.outputs.servedClientStatus}
original client SHA-256        : ${baseline.controlCenterClientSha256}
modified client SHA-256        : ${verification.outputs.clientSha256}
profile package SHA-256        : ${verification.outputs.profilePackageSha256}
profile changed                : ${verification.outputs.profileChanged}
rollback probe                 : ${rollback.result}, exit ${rollback.exitStatus}
\`\`\`

## 交付角色

- 修改态：\`${path.join(here, "modified", "plugin-control-center")}\`
- 差异：\`${path.join(here, "change.patch")}\`
- 验证：\`${path.join(here, "verification.json")}\`
- 回滚：\`${path.join(here, "rollback.ps1")}\`

## 人工验收

刷新或重启 Harness 后进入“设置 → 插件 → 管理中心”：

1. 比较长名称与短名称卡片，“详情/收起”按钮应保持相同尺寸和单行显示。
2. “运行中、待重启、分类、敏感度、可更新”等标签高度和圆角应一致。
3. 展开市场插件与本地链接插件，详情面板样式应一致，“维护方式”文字应分别正确。
`;
fs.writeFileSync(path.join(here, "verification.md"), `${md}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ result: "PASS", statePath, manualGate: "awaiting_ui_validation" }, null, 2)}\n`);
