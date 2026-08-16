# 阶段 2 操作 1：Codex 视觉与生图候选源码审计

- 审计时间：2026-08-16 21:01 +08:00
- 范围：只读核验源码、远端状态与离线检查；未安装插件，未读取或输出任何 OAuth 内容。
- 当前 DSH 目标：`web` profile，DSH `0.1.0-rc.6`。
- 目标：使用现有 ChatGPT/Codex 登录额度，为 Harness 增加独立的视觉识别和图片生成工具入口，尽量不改变当前默认模型与 UI Provider。

## 结论

推荐第一候选：`dsh-codex-tools`，固定提交 `9519949dd340ff07a7ef8182692704d2487ce690`。

理由：它是三个候选中唯一同时直接注册 `image_vision` 与 `image_gen`、又不注册主模型 Provider 的实现；依赖最少，不改默认模型，生成图片直接写入工作区，符合本阶段“为现有 Harness 补工具入口”的最小改动目标。

## 对比

| 项目 | 源码快照 | 登录/额度路径 | 视觉入口 | 生图入口与产物 | 结构影响 | 审计判断 |
|---|---|---|---|---|---|---|
| `dsh-codex-tools` 1.0.1 | `9519949` | 复用 `CODEX_HOME/auth.json` 或 `~/.codex/auth.json`；也可由 DSH credential 注入；本方案不配置普通 API Key | `image_vision`，支持工作区内 PNG/JPEG/WebP/GIF，最大 15 MiB | `image_gen`；PNG/JPEG/WebP，默认 `output/imagegen/<timestamp>.<format>`，禁止覆盖已有文件 | 只注册 3 个工具；无 npm 运行时依赖；不注册 LLM Provider | **首选** |
| `dsh-plugin-codex` / `dsh-llm-codex-app-server` 0.1.16 | `296ae6f` | 使用原生 `codex login` 与 `CODEX_HOME`；插件声明不读取/保存 token | App Server 保留原生看图工具，但 Provider 的直接输入只接受文本 | 原生生图输出提交到 Harness 持久附件；写入项目文件仍需额外修改工具 | 新增完整 `codex-local` Provider、浏览器渲染器、固定 `@openai/codex@0.147.0` 与多项 peer | 功能较重，适合“把 Codex 作为主模型”，不适合作为最小工具补丁 |
| `dsh-codex-connect` 0.1.0-alpha.4.6 | `e2b4c80` | 在 DSH 内独立完成 ChatGPT OAuth，保存到 `$DSH_HOME/.openai-codex-auth.json`；不复用 `~/.codex/auth.json` | 可选 `view_image`，默认关闭 | 未发现独立图片生成工具 | 新增 `openai-codex` Provider、设置卡、OAuth 存储、可选搜索/看图 | 管理体验完整，但单独使用不满足“视觉识别 + 生图”双入口 |

## 首选源码核验

1. `index.js` 向 `ctx.tools` 注册 `image_gen`、`image_vision`、`web_search`。
2. `package.json` 要求 Node.js `>=22`，无 `dependencies`，仅声明 Harness peer dependencies。
3. `scripts/codex-common.mjs` 显式处理 Windows 绝对路径、盘符、反斜杠和工作区边界。
4. `image_gen` 采用独占写入，创建父目录但不覆盖已有文件；结果返回工作区相对 `outputPath`。
5. `image_vision` 将本地图片作为 `input_image` 发送并返回文本结果。
6. 认证优先级为注入的 `CODEX_ACCESS_TOKEN` / `CODEX_REFRESH_TOKEN`，其次为现有 Codex auth 文件。HTTP 401 时最多刷新一次，并可能更新所选 auth 文件。
7. 三项工具直接请求 `chatgpt.com/backend-api/codex/responses`；README 明确该路径属于内部兼容点，并将 web search / image generation 计入 ChatGPT 方案的 Codex usage bucket。

## 离线检查结果

运行时：Codex 自带 Node.js `v24.19.0`、pnpm `11.19.0`。

| 检查 | 字面结果 | 状态 |
|---|---|---|
| 6 个 JS/MJS 文件 `node --check` | 全部 exit `0` | 通过 |
| `pnpm pack --dry-run` | 入口、工具、4 个 transport、README、patch 均在包内；exit `0` | 通过 |
| `node --test test/tools.test.mjs` | tests `7`，pass `6`，fail `1` | 部分通过 |
| 唯一失败原因 | Windows `symlink` 返回 `EPERM`，测试在创建测试夹具时中止 | 环境权限限制；安装后需人工实测路径行为 |

## 风险与约束

1. 三个仓库均创建于 2026-08-14 或 2026-08-15，历史很短；首选仓库当前 14 次提交、3 stars、1 个 tag，成熟度仍低。
2. 首选依赖 Codex CLI 使用的内部 ChatGPT 后端路径，后端协议变动时可能失效。
3. 首选 README 自述 profile 安装、重启/卸载、OAuth 刷新和跨平台仍待集成测试；这些项目将在安装后由“最小机器门禁 + 人工验收”覆盖。
4. `image_gen` 只生成新位图，不编辑现有图，不直接生成透明背景。
5. `image_vision` 只接受 transport 当前工作区内的相对路径；用户图片若位于工作区外，需要先复制到工作区测试目录。
6. 401 刷新可能更新 Codex auth 文件；安装阶段只记录文件元数据和哈希变化，不读取或提交文件内容。

## 待人工验收 A

建议安装命令（尚未执行）：

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web add 'github:SPYQWER1/dsh-codex-tools#9519949dd340ff07a7ef8182692704d2487ce690'
```

安装后先做四项最小机器检查：命令 exit `0`、dump-config 中出现插件、三个工具完成注册、Harness HTTP 返回 `200`。随后由用户在桌面端人工核对插件状态和入口，再进入真实图片识别与生图验收。

卸载命令预案：

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web remove dsh-codex-tools
```

## 来源

- https://github.com/SPYQWER1/dsh-codex-tools
- https://github.com/wss534857356/dsh-plugin-codex
- https://github.com/franksong2702/dsh-codex-connect
- https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md

