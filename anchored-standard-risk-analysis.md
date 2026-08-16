# Anchored Standard 风险分析报告

**对象：** [`xiaobright/dsh-anchored-standard`](https://github.com/xiaobright/dsh-anchored-standard)
（含 `KDB-Wind/dsh-minimal-anchored` 等衍生 preset）
**结论先行：** 存在**实质性风险**,主要不是"恶意代码"型风险,而是 **效果不可复现/不稳定、安全边界降低、兼容性脆弱、评测伦理争议** 四类。建议只把它当**实验性研究工具**,不要在生产/正式评测中依赖它。

---

## 风险总览

| 风险类别 | 等级 | 一句话 |
|---|---|---|
| 效果不可复现(跨环境/跨轮) | 🔴 高 | 三环境 11 轮实测 85–90,未复现 98/99;同配置跨轮 `let me` 0–178 波动 |
| 模型权重漂移导致失效 | 🔴 高 | 作者实验基于 0813 权重;issue #51 已报告"当前权重上轨迹不可复现" |
| Windows 无沙箱 shell | 🟠 中高 | `custom-bash` 在 Windows 上**无 OS 沙箱**,模型输出直接作为命令执行 |
| 与用户 skill 冲突 | 🟠 中高 | 安装任意 skill 后注入 `skill-catalog`,锚定失效,思维链回到 `let me`(issue #35) |
| 长会话/后续轮次退化 | 🟠 中 | 多轮对话、compaction 后思维链退化;subagent 偶发"dumb mode"(issue #38/#41) |
| 兼容性脆弱 | 🟠 中 | 仅针对 DSH rc.5 验证;rc.6 上 `dev_tool_search` 解锁链路失效;Windows bash 路径硬编码(issue #28/#30) |
| 供应链/审计 | 🟡 中 | 第三方社区项目,无官方背书;WhaleHarness 审计 REJECT(打包合规);license 元数据为 NOASSERTION |
| 评测伦理/刷分争议 | 🟡 中 | 本质是利用后训练接口缺陷恢复"训练对齐"表现,分数不跨任务泛化(有 10/10 vs 6/10 反例) |
| 失败静默降级 | 🟡 低中 | 插件任何异常都 fail-open 为完整目录:锚定静默失效,用户可能误以为仍在生效 |
| 数据/隐私 | 🟢 低 | 插件无网络请求、无遥测;但所有对话仍发送 DeepSeek API(正常使用) |

---

## 1. 🔴 效果不可复现(最严重风险)

**来源:issue #51「Multi-env test report」**(独立第三方,2026-08-16):

- 三环境(macOS / Windows 11 ARM64 VM / Linux Lima Ubuntu aarch64)× 4 种 preset × 11 轮完整 Project2 评测,搭载 V4 Pro + max,**Ability 85–90,未复现 README 的 98/99**;
- **reasoning 轨迹(we/let me)与分数无相关**;「首轮工具 schema 决定轨迹」在当前模型上不再稳定——**同配置跨轮 `let_me` 0–178 波动**,甚至"微探针 standard 25 工具也 minimal-like";
- 冻结快照版在 Windows 首轮确为 `pwsh/read`(R10),但轨迹首行仍为 "Let me";
- 根因(该报告):F3-05(−5)与 F12-04(−1)全部 11 轮稳定失败,是**模型层稳定缺陷**(session 授权回退逻辑),与 OS/preset/轨迹无关。

**含义:**
- 98/99 是 **n=2 同题、同环境、同权重快照**下的观测,不是可担保的分数;
- 可能复现路径:同仓库冻结快照 + 同题面 + 同权重时期;换环境/换权重/换任务后分数与轨迹都可能大幅漂移;
- 该 issue 甚至说明:到了 8/16,连"轨迹指纹"都不再稳定(微探针 standard 25 工具也 minimal-like)。

## 2. 🔴 模型权重漂移 / 服务端变化

- 所有实验基于 0813 权重与"当时"的官方端点;DeepSeek 撤过公告、社区怀疑过回滚/换模型;
- 触发机制实验自己也写明:"模型端点会随时间漂移,把数字当快照,不是契约";
- 一旦后端调整(adapter 默认 maxTokens、工具 schema、prompt 注入方式),两条锚定路径(工具 schema / 1024 输出封顶)都可能失效(issue #25 实测过 maxTokens 漂到 384K 的情况)。

## 3. 🟠 Windows 无沙箱 shell(custom-bash)

代码级审查发现(`preset/custom-bash.mjs`):

- DSH 的 PTY 后端仅 linux/darwin,Windows 上改用 `custom-bash`:**通过 `ctx.subprocess.spawn` 直接 `bash -c <command>`**;
- 工具描述自述:"**runs without OS sandbox confinement on Windows (no landlock)**; treat output as untrusted";
- 也就是说:**Windows 上模型生成的任何 bash 命令都在无沙箱环境执行**,文件系统、进程、环境变量的访问边界完全依赖模型"自觉"与 DSH 的审批栈(approval 是否生效取决于配置);
- 硬编码 `bashPath: C:\Program Files\Git\bin\bash.exe`(issue #28/#30):scoop/choco/便携版 Git 用户直接坏掉,且该路径可能被替换为任意可执行文件——**安装路径本身就是信任边界**。

## 4. 🟠 与其他插件/skill 冲突

- issue #35:**只要安装任意 skill,DSH 会首先注入 `skill-catalog`,锚定直接失效**,思维链变回 `user want` 开头、大量 `let me`;
- `suppressedContextSources` 只剥离 `agent-instructions` / `skill-catalog` 两类注入;任何第三方向首轮注入 context(Claude Code memory、sandbox 策略等)都可能打破"纯净首请求";
- 说明这套方案与用户的插件生态**强耦合**,不是即插即用。

## 5. 🟠 长会话与子代理行为

- 多轮对话后思维链可能退化回 `let me`(issue #25 提出者实测;compaction 后也有退化报告);
- compaction 采用"epoch 机制":compaction 后回退到受控阶段,直到新的晋升信号——**长会话/重负载下行为与短会话不一致**;
- subagent 默认跳过 bootstrap(始终 promoted),但存在"**subagents sometimes start in dumb mode**"(issue #38)与"子代理首请求被 bootstrap 误伤"(issue #41)两类相反报告,说明子代理边界处理不可靠;
- `dev_tool_search` 解锁链路在 **rc.6** 上搜索不到任何工具(issue 列表),晋升后可能无法解锁重型工具。

## 6. 🟡 供应链与审计

- 第三方社区项目,README 自述"非官方 preset,不代表 DeepSeek 认可";
- [WhaleHarness 审计:REJECT](https://whaleharness.com/)(缺 `cordis.patch.yml` / bundle 命名不符)——虽是**打包合规**问题(可修复),但也说明**未通过任何独立安全审计**,安装即代表你自行承担代码审查责任;
- 仓库 license 元数据 `NOASSERTION`(README 声称 MIT,但 GitHub API 未确认);
- 依赖链:preset 直接引用 `@deepseek-ai/*` 官方包 + 本地 `./*.mjs`,本地插件代码量不大(可人工审查),但版本漂移时(rc.5 → rc.6+)未验证。

## 7. 🟡 评测伦理 / "刷分"边界

- 方案本质:利用 **RL 后训练对训练对齐接口(精确 prompt + 工具 schema)的依赖**,让正式版模型进入训练分布内的策略区域,恢复灰测级分数;
- 风险:若用于正式榜单/客户交付,**分数不跨任务泛化**——router 实验里同一模型在 Mario 任务 code 模式 10/10、anchored 模式 6/10,方向相反;Project2 高分 ≠ 通用能力强;
- 社区已出现"这是评测过拟合/刷分"的批评;若厂商视其为滥用(如修改 API 行为/封号),存在使用条款风险(未证实,需自行判断);
- 作者本身态度诚实(明确标注 experimental、不承诺普适、公开勘误),但"利用后训练缺陷"这一事实是承认的。

## 8. 🟡 静默降级(可用性陷阱)

代码审查(`tool-bootstrap.mjs`)显示全部错误路径 fail-open:

- bootstrap 工具缺失 → 一次性告警 + 暴露完整目录;
- 过滤器异常 → 保留全部消息;
- 任何 filter bug → 完整目录。

**好处**:不会 brick 会话;**坏处**:锚定失败时**无强提示**,用户可能以为 anchored 生效、实际跑的是 standard 行为,分数悄悄回落——对依赖它做评测的人尤其危险。

---

## 结论与建议

**如果用途是"理解/复现灰测能力机制"(研究):** 值得用,但请:
1. 锁定仓库 commit 与 DSH 版本(README 要求 rc.5 / commit 47f9438),不要用最新 DSH;
2. 只在**空白新会话**启用,勿中途切换 preset;
3. 用英文题面;预期结果区间设为 85–99,不要假定 98/99;
4. 安装前人工审阅 `preset/*.mjs`(总量约几百行)。

**如果用途是"生产/正式评测":** **不建议**。理由:不可复现性(85–90 vs 98/99)、Windows 无沙箱执行、与插件生态冲突、权重漂移失效、评测伦理风险,任一都足以否决。

**如果用途是"日常编码提升体验":** 可试,但记住它主要是"轨迹风格"调节,能力提升无跨任务保证;Windows 用户务必确认自己的 bash 路径与审批设置。

---

## 参考来源

- [issue #51 — Multi-env test report(85–90 未复现)](https://github.com/xiaobright/dsh-anchored-standard/issues/51)
- [issue #35 — 安装 skill 后注入 skill-catalog 导致失效](https://github.com/xiaobright/dsh-anchored-standard/issues/35)
- [issue #25 — dual-anchor 提议(锚定不稳定实测)](https://github.com/xiaobright/dsh-anchored-standard/issues/25)
- [issue #28/#30 — Windows bash 路径硬编码问题](https://github.com/xiaobright/dsh-anchored-standard/issues/28)
- [issue #38 — subagents sometimes start in dumb mode](https://github.com/xiaobright/dsh-anchored-standard/issues/38)
- [issue #45 — WhaleHarness audit REJECT](https://github.com/xiaobright/dsh-anchored-standard/issues/45)
- [README(风险自述:信任等级 = shell 访问)](https://github.com/xiaobright/dsh-anchored-standard)
- [modeltest 触发机制实验(端点漂移声明)](https://github.com/xiaobright/modeltest/blob/main/docs/v4.1/DEEPSEEK_V4_TRIGGER_MECHANISM_EXPERIMENTS_20260814.md)
