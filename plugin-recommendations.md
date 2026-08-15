# DeepSeek Harness 桌面端 · 社区插件推荐清单（待人工验收）

> 生成日期：2026-08-15 之后（本次会话）
> 数据来源：[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com) 社区精选目录（766 个插件）＋ [awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) 生态目录（dsh-external/hub ＋ GitHub dsh-plugin topic）
> ⚠️ 社区声明：安装插件等于在本机运行第三方代码，权限与用户本人相同。收录 ≠ 安全审查，请装前审阅源码。

---

## 一、桌面端方案（已实现，无需验收）

在 `E:\deepseek_harness\desktop` 自建了一个 **Electron 桌面壳**，包装官方 `dsh web`（DeepSeek Harness 自带的完整 Web GUI）：

| 特性 | 说明 |
|---|---|
| 启动方式 | `cd desktop && npm start`（Electron 37.10.3 已装好） |
| 服务管理 | 自动探测 3080 端口：已有 DSH 服务则**附加连接**（不重复起进程）；被别的程序占用则让 DSH 自动选空闲端口 |
| 窗口 | 独立原生窗口、记忆位置/大小、单实例锁、外部链接走系统浏览器 |
| 退出行为 | 仅停止**自己拉起**的服务进程；附加模式或 `DSH_DESKTOP_KEEP_RUNNING=1` 时保持服务运行 |
| 与插件的关系 | 全部官方/社区插件照常工作，桌面壳与插件体系完全正交 |

备选：社区也有桌面壳插件（dsh-desktop-windowos、dsh-window、dsh-splash-launcher），但它们会自动下载第三方预编译 exe，且与本自建壳功能重叠 → 列入"不建议默认安装"。

---

## 二、插件清单（请逐项勾选确认）

### 梯队 A — 基础设施（建议必装 1 个）

| 勾选 | 插件 | 星标 | 一句话功能 | 备注 |
|---|---|---|---|---|
| ☐ | [dshmarket](https://github.com/dsh-market/dsh-market) | ★266 | 插件市场 GUI：浏览/搜索 300+ 社区插件、一键安装/更新/卸载、主题一键切换 | 社区 README 首推；安装源仅限 awesome 精选目录；默认屏蔽构建脚本；装完需重启 dsh web |
| ☐ | [dsh-find-plugin](https://github.com/awesome-dsh-plugin/dsh-find-plugin) | ★26 | 对话式找插件：直接问 agent 要什么插件 | awesome-dsh-plugin 官方出品，可与市场二选一或都装 |

### 梯队 B — 高频刚需（强烈推荐，按需勾选）

| 勾选 | 插件 | 星标 | 一句话功能 | 备注 |
|---|---|---|---|---|
| ☐ | [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | ★1198 | 侧栏工作台：文件浏览/预览、终端、Git，可拖拽 | npm 包 dsh-better-sidebar；社区最流行的 UI 增强之一 |
| ☐ | [dsh-at-file](https://github.com/omdsh-dev/dsh-at-file) | ★214 | Codex 风格 `@file` 文件引用，输入框直接搜文件 | |
| ☐ | [modlens](https://github.com/liustack/modlens) | ★1837 | 社区首个视觉插件：让纯文本模型看图（粘贴图片即可） | MIT；npm 月下载 5,900，全库最高 |
| ☐ | [hindsight](https://github.com/vectorize-io/hindsight) | ★19,981 | 跨会话长期记忆系统（agent 越用越聪明） | vectorize.io 出品、MIT、有论文；需注册其云服务或自托管 |
| ☐ | [dsh-context](https://github.com/bowenliang123/dsh-context) | ★42 | 上下文窗口构成/趋势/压缩事件洞察面板 | |
| ☐ | [dsh-notification](https://github.com/omdsh-dev/dsh-notification) | ★49 | 会话完成/需要你输入时发系统通知 | 桌面端场景很实用 |
| ☐ | [dsh-auto-continue](https://github.com/HsiangNianian/dsh-auto-continue) | ★18 | 网络/超时/宿主崩溃等中断后自动续跑 | npm 包 dsh-client-auto-continue |
| ☐ | [dsh-open-in-vscode](https://github.com/omdsh-dev/dsh-open-in-vscode) | ★46 | 一键在 VS Code 中打开文件/工作区 | |

### 梯队 C — 体验增强（可选）

| 勾选 | 插件 | 星标 | 一句话功能 | 备注 |
|---|---|---|---|---|
| ☐ | [dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize) | ★114 | 对话内生成式 UI：模型把交互式 HTML 卡片画进会话 | 与 dsh-genui 功能重叠，二选一 |
| ☐ | [dsh-genui](https://github.com/omdsh-dev/dsh-genui) | ★105 | 回复内渲染交互式组件（图表/表单/mermaid/3D） | 与 dsh-visualize 二选一 |
| ☐ | [dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) | ★327 | 多 agent 团队协作工作流 | npm 包 @nanmicoder/dsh-agent-teams |
| ☐ | [dsh-deep-research](https://github.com/omdsh-dev/dsh-deep-research) | ★12 | 自适应深度研究编排 | |
| ☐ | [dsh-usage-stats](https://github.com/Ychris12138/dsh-usage-stats) | ★33 | 多供应商 Token/余额用量看板 | 与 modlens 无冲突（modlens 是视觉）；与其他余额插件重叠，只装一个 |
| ☐ | [dsh-web-ui-all](https://github.com/zhu1090093659/dsh-web-ui) | ★2622 | UI 插件与皮肤大合集（看板/git 图/桌宠/皮肤中心…） | 量最大但容易与其它 UI 插件样式冲突，谨慎勾选 |

### 梯队 D — 个性化（兴趣类，均无依赖冲突）

| 勾选 | 插件 | 星标 | 一句话功能 |
|---|---|---|---|
| ☐ | [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) | ★884 | 鲸鱼娘皮肤系列（主题类第一名） |
| ☐ | [dsh-catppuccin](https://github.com/NoNameLeGo/dsh-catppuccin) | ★5 | Catppuccin 四套主题 |
| ☐ | [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin) | ★6 | 8 套主题＋壁纸＋自定义 |
| ☐ | [whale-girl](https://github.com/vlln/whale-girl) | ★168 | QQ 宠物风格桌宠 |
| ☐ | [dsh-pets](https://github.com/hellosz/dsh-pets) | ★2 | Codex Pets 风格像素桌宠 |
| ☐ | [dsh-voice](https://github.com/haoku123/dsh-voice) | ★0 | 本地 whisper 全双工语音对话（免 key） |
| ☐ | [dsh-plugin-tts](https://github.com/1624318455/dsh-plugin-tts) | ★1 | Edge TTS 朗读 AI 回复 |
| ☐ | [voco-input-sh](https://github.com/Nothree-code/voco-input-sh) | ★1 | 离线语音输入 |
| ☐ | [dsh-minigames](https://github.com/lhh010/dsh-minigames) | ★18 | 侧栏 18 款小游戏（等模型时摸鱼） |
| ☐ | [dsh-gomoku](https://github.com/omdsh-dev/dsh-gomoku) | ★13 | 与 AI 下五子棋 |
| ☐ | [dsh-emoji](https://github.com/hellodigua/dsh-emoji) | ★17 | 回复自动加表情 |
| ☐ | [dsh-ads](https://github.com/Nagi-ovo/dsh-ads) | ★404 | 2005 中文站风整活广告（纯搞笑） |
| ☐ | [dsh-web-mobile](https://github.com/mexiaosqwq/dsh-web-mobile) | ★13 | 手机浏览器移动端适配 |
| ☐ | [dsh-mobile-gate](https://github.com/Bernardxu123/dsh-mobile-gate) | ★2 | 局域网手机访问网关（令牌门卫＋限流） |

### 不建议默认安装（风险提示）

| 插件 | 原因 |
|---|---|
| dsh-auto-approval / dsh-auto-classifier | 自动批准工具调用，绕开人工审批流程，权限风险自担 |
| dsh-desktop-windowos / dsh-window / dsh-splash-launcher | 自动下载第三方预编译 exe（供应链风险）；与本自建桌面端功能重叠 |
| 其余几十个余额/用量插件 | 与 dsh-usage-stats / modlens 重复，装一个即可 |

---

## 三、安装与验收流程

1. **人工勾选**上面清单（直接回复勾选的插件名即可）。
2. 我执行 `dsh plugin --profile web add <包名>` 逐个安装到 web profile；
   git 源插件若带构建脚本，按 pnpm 提示把对应包名加入 `profiles/web/pnpm-workspace.yaml` 的 `allowBuilds` 白名单。
3. 重启 `dsh web`（桌面端 Reload / 浏览器刷新），逐个验证插件在 GUI 中出现且不互相冲突。
4. 每个插件保留"可卸载"状态：`dsh plugin --profile web remove <包名>` 或经 dshmarket 一键卸载。

---

## 附：全量数据

- `research/plugin-report.md` — 766 个插件：全库 Top 40 ＋ 12 个分类各 Top 12（含 npm 月下载量、Hub 收录标记）。
- `research/plugins.json` — 原始结构化数据（awesome-dsh-plugin.com 官方发布）。
