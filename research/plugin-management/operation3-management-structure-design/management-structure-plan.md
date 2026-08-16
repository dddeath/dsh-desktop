# 阶段 3 / 操作 2：插件管理结构方案

状态：**待人工验收 H**

目标：复用 DSH 现有设置页、官方 Loader 清单和 `dshmarket` 服务，增加一个统一的已安装插件管理视图，不建立第二套包管理器。

## 1. 最终入口

```text
设置
└─ 插件
   ├─ 插件配置（保留官方页面）
   ├─ 插件列表（保留官方只读 Loader 页面）
   └─ 管理中心（新增，order 20）

设置
└─ 插件市场（保留 dshmarket 的发现/安装页面）
```

“插件市场”继续负责发现和安装；“管理中心”只负责已安装插件的状态、风险、更新、启停计划和恢复。二者不重复拥有包安装逻辑。

## 2. 实现归属

操作 3 新增独立本地插件：

- 包名：`dsh-plugin-control-center`
- 目录：`E:\deepseek_harness\plugins\plugin-control-center`
- profile：`link:E:/deepseek_harness/plugins/plugin-control-center`
- bundle：放在 `dshmarket` 后

不把包管理写入 `dsh-desktop-ui-compat`，避免让主题无关 UI 核心获得 profile 写权限；不修改 `node_modules\dshmarket`，避免更新时覆盖本地改动。

客户端注册 `settings.plugins.tab`：

```js
{
  name: "settings.plugins.tab",
  id: "manage",
  order: 20,
  label: () => "管理中心"
}
```

## 3. 数据复用

| 数据 | 现有来源 | 用途 |
|---|---|---|
| Loader 状态 | `ctx.remote.pluginInventory.list()` | `enabled`、`fiberPhase`、entry id、module name |
| 已安装来源 | `GET /dsh-market/installed` | profile spec、本地 link、hot mount |
| 包操作状态 | `GET /dsh-market/status` | pnpm、进行中的动作、boot id |
| 更新检查 | `GET /dsh-market/updates` | current/latest、npm/Git/link、是否可更新 |
| 更新/皮肤/移除 | 现有 dshmarket POST 路由 | 复用实际包动作，不重新实现 pnpm |
| 分组与风险 | control-center 策略目录 | 职责、敏感能力、建议、保护状态 |
| 待重启与恢复 | profile/lock/overlay 哈希 + 动作快照 | 变更漂移、恢复点、最近验证时间 |

官方 `pluginInventory` 只提供 Loader 当下状态，明确没有来源、历史或修改能力；因此用它作为运行状态权威，用 `dshmarket` 作为依赖和包动作权威，两者通过包名和 module name 合并。

## 4. 页面信息架构

### 4.1 顶部状态条

固定展示四项：

1. 运行健康：运行中/异常数量；
2. 待处理：待重启、待恢复数量；
3. 可用更新：只统计已确认可更新项；
4. 最近验证：本次快照时间和“重新检查”按钮。

### 4.2 筛选区

- 搜索：名称、描述、来源；
- 分组：UI、模型/视觉、工具、工作区、可观测、市场、桌宠、系统、依赖；
- 状态：运行中、已禁用、仅依赖、失败、待重启；
- 风险：低、中、高；
- 开关：仅看可更新。

### 4.3 插件卡片

默认两列、窄窗口一列。收起态只保留：

- 名称与版本；
- 状态、分组、风险标签；
- 来源摘要；
- 更新/待重启提示；
- 展开按钮。

展开态再显示：敏感服务、完整来源、版本锁定、健康明细、最近验证、使用建议及动作区，避免 15 个插件同时铺满字段。

### 4.4 状态口径

| UI 状态 | 合并规则 |
|---|---|
| 运行中 | Loader `enabled=true` 且 fiber active，或已注册 host 工具 |
| 已安装但禁用 | profile 已安装，但 Loader/皮肤状态明确禁用 |
| 仅依赖 | package 依赖存在，Loader 与工具均未装载 |
| 本地链接 | spec 为 `link:`/`file:`，作为来源标签叠加显示 |
| 失败 | fiber phase 为 failed，或健康检查明确失败 |
| 待重启 | profile/lock/计划状态晚于当前 boot，或动作结果要求重启 |
| 未知 | 数据源不完整；不把未知推断为运行中 |

## 5. 动作保护

### 5.1 动作分级

| 级别 | 动作 | 交互 |
|---|---|---|
| 只读 | 刷新、健康检查、更新检查、导出日志 | 直接执行 |
| 中风险 | 切换皮肤、计划启用、计划停用 | 一次确认；展示是否待重启 |
| 高风险 | 更新、移除、恢复 | 自动备份；输入插件名确认；完成后健康检查 |

不提供“全部更新”，同一时间只运行一个写动作。

### 5.2 保护对象

下列包默认只读，按钮显示锁定原因：

- `dsh-plugin-control-center`：管理与恢复入口自身；
- `dshmarket`：复用的包操作服务；
- `dsh-desktop-ui-compat`：阶段 1 已验收 UI 核心；
- `dsh-codex-tools`：阶段 2 已验收且提交锁定的工具链。

后续如需变更保护对象，先在管理页“高级操作”临时解锁一次，不持久解除保护。

### 5.3 确认框必须展示

- 插件名称、当前状态、目标状态；
- 将改动的 profile 文件；
- 备份路径和 SHA-256；
- 是否需要重启；
- 停用后消失的工具/界面；
- 恢复命令。

## 6. 启停、更新与恢复语义

### 启停

- 皮肤：复用 `dshmarket` 的实时皮肤切换；同一时刻只启用一个主皮肤。
- 普通 bundle：依赖仍保留，只调整 profile bundle 计划；界面立即显示“待重启”，不自动重启。
- 仅依赖条目：可“计划启用”，恢复其记录的 bundle 位置。

### 更新

- npm/Git：复用 `/dsh-market/update`；更新前固定 package、lock、overlay 与市场状态。
- 本地 link：不显示在线更新按钮，显示仓库路径和 Git 状态。
- 更新后统一标记待重启，不进行批量更新。

### 恢复

快照至少包含：`package.json`、`pnpm-lock.yaml`、`cordis.yml`、`cordis.patch.yml`、市场皮肤状态、动作元数据和 SHA-256。恢复时写回快照并通过：

```powershell
dsh.cmd plugin --profile web install --offline --frozen-lockfile
```

重建依赖；界面仅给出手动重启说明。

## 7. 重启标记

| 场景 | 标记 |
|---|---|
| dshmarket 报告皮肤实时激活成功 | 无需重启 |
| hot install/remove 明确成功 | 采用 dshmarket 返回结果 |
| 插件更新 | 需要重启 |
| 普通 bundle 启用/停用 | 需要重启 |
| profile 恢复 | 需要重启 |

页面不提供自动杀进程/自动重启，避免再次触发端口占用和状态漂移。

## 8. 拟修改区域

| 区域 | 操作 3 计划 |
|---|---|
| `plugins/plugin-control-center/` | 新增独立 Host/Client 插件与语义化 CSS |
| web profile `package.json` | 新增 local link，并在 `dshmarket` 后加入 bundle |
| 设置 → 插件 | 新增“管理中心”标签；保留已有两页 |
| `dshmarket` | 只调用既有 HTTP 服务，不修改包文件 |
| `desktop-ui-compat` | 不增加包管理权限；只复用现有设置布局 |

## 9. 操作 3 最小交付范围

实现：

- 聚合只读快照、分组、筛选、卡片展开；
- 健康检查、更新检查和最近验证时间；
- 受保护的启停、更新、恢复入口；
- 动作前快照与动作后健康检查；
- 主题无关、宽窄窗口响应式布局。

留到操作 4：

- 对真实 web profile 执行一次启停演练；
- 真实插件更新和恢复演练；
- 最终配置哈希与发布固定点。

本操作不升级 `dshmarket`，不改外部包，不执行真实插件动作。

## 10. 人工验收 H

请确认以下五项：

1. 入口采用“设置 → 插件 → 管理中心”；
2. 使用独立本地插件，不把包管理写入 UI 核心；
3. `dshmarket` 继续负责发现/安装，管理中心负责已安装状态与受保护动作；
4. 默认保护四个关键包，并取消“全部更新”；
5. 操作 3 只实现界面与受保护入口，真实 profile 动作留到操作 4 人工决定。

通过后开始操作 3。
