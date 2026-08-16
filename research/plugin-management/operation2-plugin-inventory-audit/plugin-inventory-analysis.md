# 阶段 3 / 操作 1：当前插件结构分析

状态：**待人工验收 G**

快照对象：`C:\Users\19739\.dsh\profiles\web`

快照时间：2026-08-17 01:55（Asia/Shanghai）

## 1. 结论先行

- 当前 profile 声明 **15 个依赖**，profile 顺序中有 **16 个 bundle**（含 2 个官方基础 bundle），运行页返回 **49 个前端启动项**，工具服务返回 **5 个工具**。
- 当前运行健康：主页 HTTP `200`、工具清单 HTTP `200`；5 个工具名唯一，没有同名覆盖。
- 状态必须分开看：`dsh-arknights` 是“已安装但已禁用”，`dsh-deep-whale` 是“仅依赖、未装载”，其余 13 个依赖均有当前运行证据。
- 推荐保留当前主链路：`dsh-codex-tools@1.0.1`、`dsh-desktop-ui-compat`、Maid 主题适配、`dsh-context`、`dsh-better-sidebar`、`dsh-at-file`、`dshmarket`。
- 本操作只做盘点，不更新、不启停、不重启。当前 profile 文件晚于 DSH 进程启动时间，若现在重启会一次性吸收未运行过的 profile 状态；应留到后续受控操作。

## 2. 状态口径

| 状态 | 判据 |
|---|---|
| 运行中 | 前端 boot entry、已注册工具或明确的 host bundle 行为至少命中一项 |
| 已安装但禁用 | 依赖和 bundle 均存在，但市场禁用状态排除当前 boot entry |
| 仅依赖 | `package.json` 有声明，但不在 profile bundle、boot entry 与工具清单中 |
| 本地链接 | profile 直接链接仓库内目录，修改源目录即可成为下次加载内容 |

`dsh.profile.bundles` 是加载顺序，不是运行状态清单；市场禁用层还能在其上排除皮肤。DSH 官方仓库与本地安装说明均把 profile 依赖、bundle 顺序和 overlay 分为不同层，包集合变化需要重启进程。参考：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。

## 3. 插件逐项建议

| 插件 | 当前状态 | 职责 | 敏感能力/影响面 | 更新情况 | 建议 |
|---|---|---|---|---|---|
| `@dsh-external/dsh-client-ui-skin-maid-atelier@0.0.1` | 运行中/前端 | Maid 皮肤 | DOM/CSS/大图资源 | 子路径锁在 `cdb4da4`，与根仓库 HEAD 不同 | **保留启用**；皮肤单独更新 |
| `@liustack/modlens@3.16.7` | 运行中/前后端/工具 | 模型、视觉桥 | tools/agents/attachments/LLM、子进程与临时图片 | npm `3.18.1` | **保留并观察更新**；默认模型依赖它，隔离升级 |
| `dsh-arknights@0.1.0` | 已安装但禁用 | 备选皮肤 | DOM/CSS/大图资源 | Git HEAD 与锁定提交一致 | **按需启用**；同一时刻只启用一个主皮肤 |
| `dsh-at-file@0.6.1` | 运行中/前后端 | `@path` 工作区引用 | 路径搜索与工作区读取 | Git HEAD 一致 | **保留** |
| `dsh-better-sidebar@0.12.2` | 运行中/前后端 | 右栏、文件、终端、Git、浏览器 | webServer/sessions/tools、文件与进程 | npm `0.12.3` | **保留**；补丁升级另开验证 |
| `dsh-codex-tools@1.0.1` | 运行中/3 个工具 | Pro 订阅图像与搜索入口 | shell/credentials、网络、工作区写入 | 已显式锁定 `9519949`，与 HEAD 一致 | **保留并继续锁定** |
| `dsh-context@0.7.3` | 运行中/前后端 | “上下文”会话页 | 会话上下文读取与统计 | npm `0.10.1` | **保留并观察更新**；不是重复页面 |
| `dsh-deep-whale` | 仅依赖 | Maid 仓库根元包 | 当前无运行注入 | 根仓库 HEAD 与锁定一致 | **移除候选**；先证明子路径皮肤不依赖根元包 |
| `dsh-desktop-ui-compat@0.1.0` | 运行中/本地链接 | 跨主题 UI 核心 | DOM/CSS、设置页与工具目录读取 | 仓库内维护 | **保留**；作为统一 UI 修改入口 |
| `dsh-find-plugin@0.3.6` | 运行中/工具 | Agent 内插件发现 | 外部 GitHub 搜索 | npm 已最新 | **按需启用** |
| `dsh-maid-atelier-fix@0.3.0` | 运行中/本地链接 | Maid 外观与人物定位 | DOM/CSS | 仓库内维护 | **条件保留**；只在 Maid 启用时生效 |
| `dsh-notification@0.1.2` | 运行中/前后端 | 浏览器完成通知 | Notification API、设置读取 | Git HEAD 一致 | **保留** |
| `dsh-open-in-vscode@0.1.6` | 运行中/前后端 | 外部编辑器跳转 | 启动外部进程 | Git HEAD 一致 | **按需启用** |
| `dshmarket@1.2.2` | 运行中/前后端 | 市场、安装、卸载、皮肤状态 | 包管理、loader、配置变更 | npm `1.10.1` | **保留为管理底座**；版本跨度最大，单独升级 |
| `whale-girl@0.1.0` | 运行中/前后端 | 桌宠与状态账本 | jobs/agents/sessions/settings/webServer | Git HEAD 一致 | **保留并观察**；每次换主题复测透明度/定位 |

> “敏感能力”表示插件注入或实际代码触达的服务面，不等同于操作系统权限授予。

## 4. 职责重叠与冲突判断

| 组合 | 判断 | 管理规则 |
|---|---|---|
| `modlens_read_image` / `image_vision` | 能力重叠但工具名不同；前者服务文本模型与绝对路径/URL，后者服务 Codex Pro 且约束工作区相对路径 | 两者保留，工具详情中解释选用条件 |
| `dshmarket` / `dsh-find-plugin` | 都能发现插件；前者是 UI 安装管理，后者是 Agent 搜索工具 | 以 market 为管理入口，find-plugin 按需开放 |
| `dsh-at-file` / better-sidebar 文件浏览 | 都触达工作区；前者是输入框路径引用，后者是可视浏览/编辑 | 互补，不合并 |
| Maid / Arknights | 同属主皮肤，可能同时改写全局布局与背景 | 市场禁用状态作为唯一启用口径，同一时刻只开一个 |
| `whale-girl` / 主题人物 | 都占用边缘视觉空间 | 桌宠独立保留，但皮肤切换必须人工看透明度、遮挡、拖拽 |
| `dsh-context` / 官方会话页 | `dsh-context` 注册名为 `context` 的 conversation view，正是当前“上下文”页 | 归类为可观测插件，不标重复 |

## 5. 加载、版本与重启风险

1. **工具名冲突：无。** 当前工具为 `find_dsh_plugin`、`modlens_read_image`、`image_gen`、`image_vision`、`web_search`。
2. **加载顺序：** `dsh-maid-atelier-fix` 声明注入 `dsh-desktop-ui-compat`，运行 boot 也显示适配器依赖核心；两个本地包仍按 profile bundle 顺序登记，后续管理页应同时展示“声明顺序”和“实际依赖”。
3. **版本锁定：** `dsh-codex-tools` 已锁定完整提交；多数 Git 依赖只写仓库名，重新安装会跟随 HEAD；npm 依赖使用 `^`，lockfile 当前固定但更新动作会吸收兼容范围内版本。
4. **来源偏移：** Maid 子路径在 `cdb4da4`，根元包在 `873f5c6`。这不是足够证据判定损坏，但说明二者不能作为同一版本整体更新。
5. **重启：** 包添加、移除、版本变更和 bundle 结构变更统一标记“需要重启”；皮肤禁用状态可由市场层即时处理，但重启后仍需复核实际 boot entry。
6. **当前进程漂移：** DSH 进程启动于 `01:33:55`，profile 最后修改于 `01:45:45`，因此本次盘点不执行重启或真实启停。

## 6. 更新优先级

| 优先级 | 对象 | 原因 | 操作 2/3 策略 |
|---|---|---|---|
| P0 保持 | `dsh-codex-tools@1.0.1`、两个本地 UI 包 | 已通过阶段 1/2 人工验收 | 固定显示版本与健康状态，不改行为 |
| P1 管理底座 | `dshmarket 1.2.2 → 1.10.1` | 管理能力最相关，但版本跨度最大 | 先设计兼容层；升级单独立项 |
| P1 布局补丁 | `dsh-better-sidebar 0.12.2 → 0.12.3` | 改动小但直接影响已验收布局 | 快照设置后单独验证 |
| P2 能力更新 | `modlens 3.16.7 → 3.18.1` | 默认模型与视觉链路依赖 | 需模型调用、粘贴和图片读取回归 |
| P2 可观测更新 | `dsh-context 0.7.3 → 0.10.1` | 跨多个次版本 | 需会话页、统计与长上下文回归 |
| P3 清理 | `dsh-deep-whale` 根元包 | 当前仅依赖 | 隔离移除后验证 Maid 子路径仍可装载 |

## 7. 操作 2 推荐输入（人工验收 G）

建议按以下默认决策进入“管理结构方案”：

1. **管理入口：** 复用“设置 → 插件”，以 `dshmarket` 服务作为包状态底座，不增加第二套包管理器。
2. **状态模型：** 至少显示“运行中 / 已安装但禁用 / 仅依赖 / 本地链接 / 待重启”。
3. **默认动作级别：** 查看与健康检查可直接执行；启停、更新、移除、恢复必须二次确认并明确是否重启。
4. **默认清理候选：** 仅 `dsh-deep-whale` 根元包；本操作不实际移除。
5. **默认更新策略：** 一个插件一次更新；禁止把 market、sidebar、modlens、context 合并升级。

## 8. 证据

- 结构化摘要：`inventory-summary.json`
- 原始 profile/lock/boot/tool 快照：`evidence/`
- 在线版本与 Git HEAD：`evidence/update-check.txt`
- 运行时间漂移：`evidence/runtime-process.txt`
- 快照哈希：`evidence/snapshot.sha256`
- 官方项目：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 社区来源：[dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale)、[dsh-arknights](https://github.com/DocJlm/dsh-arknights)、[dsh-at-file](https://github.com/omdsh-dev/dsh-at-file)、[dsh-codex-tools](https://github.com/SPYQWER1/dsh-codex-tools)、[whale-girl](https://github.com/vlln/whale-girl)
