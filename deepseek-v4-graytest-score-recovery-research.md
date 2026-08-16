# DeepSeek V4 Pro 恢复灰测级跑分方法 — 社区调研报告

**调研日期：** 2026-08（社区事件集中发生于 8 月 13–16 日）
**调研对象：** DeepSeek V4 Pro 正式版（0813）在 Project2 V4.1b 等评测中恢复灰测期跑分的方法
**核心结论：** 正式版模型本身具备灰测级能力上限（99/96），但**强依赖 API 首轮可见的工具 schema 与 system prompt**；社区通过"两阶段锚定"（首轮 Minimal 工具面锚定轨迹，随后恢复完整 Standard 工具）成功复现 98/99 分。

---

## 1. 背景：分数落差与"反转"

### 1.1 现象

- **灰测期**（7 月，OpenCode）：V4 Pro 两跑 **99 / 96**（均值 97.5）
- **正式版**（8 月 13 日 0813 上线，OpenCode）：四跑 **91 / 96 / 91 / 93**（均值 92.75），第四跑上下文峰值约 400k、大量无效工具探索
- 官方 minimal preset + max 推理（DSH / WSL）：**99 / 96**，与灰测持平
- 官方 standard preset + max（DSH / WSL）：**91**
- 官方 PTC（code 模式）+ max（DSH / WSL）：**92**
- 官方 WorkBuddy：**91**

参考带：Fable 5 单跑 98、Opus 5 单跑 97、GPT-5.6-sol 两跑 99/98。

### 1.2 社区的几种猜测（先后出现）

1. **"一个 API 三个模型"**（One API, Three Models）：不同会话表现不同，怀疑服务端路由了多个 checkpoint —— 后被社区测试修正为 **Agent 环境（scaffold）差异**，而非多个模型。
2. **"发错模型"**：DeepSeek 撤掉 V4 Pro 0813 发布公告，引发"上错模型"猜测；官方始终未公开回应。
3. **"后训练过拟合提示词"**：正式版对 RL 对齐的 prompt/schema 形成依赖，通用 harness 下泛化变差 —— 这是目前证据最充分、被社区广泛接受的解释。

---

## 2. 机制：为什么分数会掉

### 2.1 决定性变量 = 首轮 API 可见的工具 schema

`xiaobright/dsh-anchored-standard` issue #11 做了 45 个会话的首请求受控实验（官方端点、`reasoningEffort=max`、固定 system prompt、固定题面，只改首请求工具目录）：

| 首请求工具 | 来源 | n | 首行 | `let me` |
|---|---|---|---|---|
| `bash`(persistent) + `str_replace_editor` | 官方 minimal preset | 5 | 5/5 "We need modify…" | **0.0** |
| `pwsh` + `read` | anchored-standard | 8 | 8/8 "The user wants / Let me…" | 2.0–2.6 |
| `pwsh` only | 本地探针 | 3 | 3/3 "The user wants…" | 3.0 |
| `bash`(standard) + `read` | 本地探针 | 5 | 5/5 "The user wants…" | 1.0 |

→ **Minimal 的工具 schema 在 256000 maxTokens 下无需任何输出封顶即可稳定锚定（5/5）；所有 standard 系工具面全部落入 standard-like（11/11）。**

触发机制实验（`DEEPSEEK_V4_TRIGGER_MECHANISM_EXPERIMENTS_20260814.md`）进一步细化：

- `bash + glob` 组合 → standard-like（已观测分界之一）；`bash + edit`、`bash + write` → minimal-like
- 把完整工具目录文本放进 user message / tool result，而 API 层仍只暴露 minimal 工具 → 轨迹保持 `We/Need`（影响来自**模型实际可调用的 schema surface**，不是"看见工具名文本"）
- `reasoning_effort=high` 也无法让完整 Standard 目录恢复 minimal 风格

### 2.2 三个杠杆（issue #11 归纳）

1. **工具 schema** —— 256000 下的决定性变量（上述实验）
2. **输出预算** —— 首请求 1024 token 封顶也能锚定（26/32），但被 rc.5 包的 `adapterDefaults.maxTokens` 覆盖时不生效
3. **注入提醒** —— AGENTS.md/CLAUDE.md 摘要 + 可用技能目录提醒在场时锚定完全失败（**0/9**）；bootstrap 期间必须剥离

### 2.3 官方源码证据

- 官方 `minimal-preset.snapshot.ts` 的测试名就是 **`sends the exact RL prompt and schemas`**：完整 system prompt 固定为一句 `You are a helpful software engineer assistant.`，`complete: true`、`includeRuntimeContext: false`，只暴露持久 `bash` + `str_replace_editor`。
- standard 会额外注入最多 65536 字节工作区说明（AGENTS.md/CLAUDE.md），且 26 个插件、约 25 个工具同时在线，`read` 工具被要求分段读取、compaction 裁剪工具结果 —— 这些机制会诱发重复阅读、长链工具选择和上下文膨胀。

### 2.4 思维链"轨迹指纹"

| 轨迹 | 首行风格 | `let me` | `we` | reasoning 块 p50 | 阶段回复 |
|---|---|---|---|---|---|
| minimal（99/96） | `We need…` / `Good.` | 0 / 0 | 272 / 231 | 235–239 字符 | 1 |
| anchored-standard（98/99） | `We need…` | 1 / 0 | 179 / 165 | 111–144 字符 | 1 |
| standard（91） | `Let me…` | 208 | 11 | 437 字符 | 55 |

→ 轨迹风格是 **scaffold 是否生效的指纹**，不是能力证明（V4 Flash 切 minimal 后风格巨变、分数仍 92）。

---

## 3. 恢复方法（社区可复现方案）

### 方法 A：官方 Minimal preset（最直接）

DSH 中选择官方 `minimal` preset + `reasoningEffort=max` → Project2 **99 / 96**，与灰测持平。
代价：只有两个工具（`bash` + `str_replace_editor`），失去 Standard 的完整工具集。

### 方法 B：两阶段锚定 Anchored Standard（推荐，98/99）

首轮锚定 + 之后恢复完整工具能力，**不牺牲任何 Standard 工具**。实现仓库：
[`xiaobright/dsh-anchored-standard`](https://github.com/xiaobright/dsh-anchored-standard)（DSH 版，含 3 个模式）

原理：

1. 保持 Minimal 的完整 system prompt（`You are a helpful software engineer assistant.`，字节一致）；
2. **请求 #1 只暴露 Minimal 真实工具对**（`bash` + `str_replace_editor`，与官方 Minimal 逐字节一致）；
3. 首请求**剥离自动注入上下文**（AGENTS.md/CLAUDE.md 摘要 + 技能目录提醒，`suppressedContextSources`）；
4. 首次持久 `tool/call` 或首条 `assistant/message` 后**晋升**：暴露 bootstrap 对 + 发现工具（`dev_tool_search` / `skill_search` / `skill_load`），重型 Standard 工具按需解锁（不一次性倒出完整目录，避免"晋升后回退"）；
5. 阶段状态从持久 session 事件推导，resume / reload 不丢失。

实测（Project2 V4.1b、`reasoningEffort=max`、Windows）：**r1=98（we=179, let me=1）、r2=99（we=165, let me=0）**，两轮只有 2 份工具目录快照（2 工具 → 25 工具）。

变体：
- **Zero-Anchored Standard**：首轮 0 工具 + 固定消息"This round is a test…"，多花一次模型调用；
- **Whoami Standard**：首轮"你是谁"自我介绍 + 0 工具，子 agent 可继承锚定流程。

### 方法 C：Minimal Anchored（首轮用官方 Minimal 真 schema + 1024 封顶）

[`KDB-Wind/dsh-minimal-anchored`](https://github.com/KDB-Wind/dsh-minimal-anchored)：与 B 同思路，但首轮使用官方 Minimal 的 persistent `bash` + `str_replace_editor` + `bootstrapMaxTokens: 1024`，改善 Windows 上 V4 Pro 的 "Let me" 现象。中英文题面测试见其 README（英文题面稳定复现 `we` 指纹）。

### 方法 D：Pi Agent 移植版

- [`dbydd/pi-anchored-tool-for-dspro`](https://github.com/dbydd/pi-anchored-tool-for-dspro)：Pi 扩展，`before_provider_request` 层过滤首轮工具（shell + `read`），首轮后恢复完整目录，system prompt 整段改写为 minimal persona；
- [`hank9999/pi-ds-anchored`](https://github.com/hank9999/pi-ds-anchored)：同上思路，自动检测 `model.id` 含 `deepseek-v4-pro` 才启用；
- [`christopherarter/deep-pi`](https://github.com/christopherarter/deep-pi)：直连 DeepSeek API 的缓存/成本优化器（缓存前缀稳定、循环守卫、哈希校验编辑），非轨迹锚定类。

### 方法 E：任务感知路由 Router（研究向）

[`yjh051108/dsh-router-standard`](https://github.com/yjh051108/dsh-router-standard)：21 点 × n=2 的人设梯度探针发现 V4 Pro 沿 persona 轴坍缩为**三个稳定带**（spec 0–0.19 / mixed 0.2–0.49 / react 0.5–1.0），中间带是"过渡陷阱"。提供两个预设：
- **Router Standard**：首轮 RL 接口还原（训练句 + shell/str_replace_editor）→ 边想边做；
- **Router Spec**：分类 persona + 完整 prompt sections → 首轮超长思维链（"雷霆大思考"，101K 推理 0 行动是特征不是缺陷）。

⚠️ 该仓库 README 顶部有**重要勘误**：作者声明其理论解释（"双吸引子/自路由不可能"等强归因）已作废；可复现的实事是"利用后训练缺陷（断层带）实现了 V4 Flash 能力的可复现提升"，Pro 的机制仍在用黑盒 logprobs / 嵌入向量逆向继续实测。

---

## 4. 官方/权威信息与时间线

- 8 月 13 日夜：V4 Pro 0813 上线，撤掉发布公告（官方未公开说明）
- 8 月 14 日：modeltest 系列实验（harness 对照、触发机制、轨迹分析）发布
- 8 月 15 日：anchored-standard 两阶段复现 98/99；"一个 API 三个模型"传闻被修正为 Agent 环境差异
- 8 月 16 日：媒体报道"极简模式"真相（[腾讯新闻](https://news.qq.com/rain/a/20260816A036T700)、[EET-China](https://www.eet-china.com/mp/a517788.html)、[mydrivers](https://news.mydrivers.com/1/1143/1143938.htm)）

**推荐权威来源：**
- [xiaobright/modeltest — DEEPSEEK_V4_PRO_HARNESS_ANALYSIS_20260814.md](https://github.com/xiaobright/modeltest/blob/main/docs/v4.1/DEEPSEEK_V4_PRO_HARNESS_ANALYSIS_20260814.md)（最完整的对照实验）
- [xiaobright/modeltest — DEEPSEEK_V4_TRIGGER_MECHANISM_EXPERIMENTS_20260814.md](https://github.com/xiaobright/modeltest/blob/main/docs/v4.1/DEEPSEEK_V4_TRIGGER_MECHANISM_EXPERIMENTS_20260814.md)
- [dsh-anchored-standard issue #11](https://github.com/xiaobright/dsh-anchored-standard/issues/11)（45 会话首请求实验）
- 官方 Harness `minimal` preset 快照测试（`sends the exact RL prompt and schemas`）

---

## 5. 证据边界与注意事项

**能说的：**
- 正式 V4 Pro 在 minimal / 两阶段锚定栈下可复现灰测级成绩（Project2 本题）
- 首轮 minimal 组合（prompt + schema）是关键；完整工具目录可以在锚定后恢复而不丢轨迹
- 官方 minimal 明确复刻 "exact RL prompt and schemas"，高分具有训练接口对齐特征
- V4 Pro 的能力可访问性强依赖 harness；V4 Flash 跨 harness 更稳（反例）

**不能说的：**
- 灰测或正式服务是 Claude/Fable 5 代理（无 route id / 签名证据）
- `We need` / `Good.` 等措辞本身导致高分
- 98/99 会在其他仓库、任务长度或 provider 上稳定复现（仅 n=2 同题）
- 已证明 DeepSeek 7–8 月间专门对 minimal preset 过拟合（时间线无法验证）

**实践注意：**
- 必须**完全重启** DSH、新建空白 session 再选 preset；不要在已有内容的会话中途切换
- 中文题面不产生稳定的英文 `we` 指纹（实验用英文题面）
- 安装前审阅源码（预设与 shell 访问同信任等级）
- 本调研为社区第三方实验，非 DeepSeek 官方认可

---

## 附：关键仓库清单

| 仓库 | 平台 | 说明 |
|---|---|---|
| [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) | DSH | 两阶段锚定（3 模式），98/99 原始出处 |
| [KDB-Wind/dsh-minimal-anchored](https://github.com/KDB-Wind/dsh-minimal-anchored) | DSH | 首轮官方 Minimal 真 schema + 1024 封顶 |
| [dbydd/pi-anchored-tool-for-dspro](https://github.com/dbydd/pi-anchored-tool-for-dspro) | Pi | 首轮锚定移植版 |
| [hank9999/pi-ds-anchored](https://github.com/hank9999/pi-ds-anchored) | Pi | 同上，按 model.id 自动启用 |
| [christopherarter/deep-pi](https://github.com/christopherarter/deep-pi) | Pi | 缓存/成本优化（非轨迹锚定） |
| [yjh051108/dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | DSH | 任务感知路由（研究向，含勘误） |
| [xiaobright/modeltest](https://github.com/xiaobright/modeltest) | 评测 | 全部实验数据、评审、SHA-256 证据 |
