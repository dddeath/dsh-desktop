# dsh-codex-bridge

一个共享包同时提供：

- **Codex MCP (`dsh-control`)**：启停 DSH、管理对话、查看/规划插件、获取 DSH 发给模型的完整最终请求。
- **DSH 插件**：注册 `codex_research`，通过现有 Codex 登录态与 ChatGPT 订阅 Responses 传输调研信息并返回摘要和来源。
- **硬限环协议**：`traceId + origin + hop + visited`。跨边界前检查目标是否已访问，最大 2 跳；DSH 来源的 Codex 子进程环境也会被 MCP 拒绝。

## 完整 prompt 追踪

插件在 `llm/stream` 调用 `next()` 之前只读抓取冻结后的最终请求，默认写入：

`%USERPROFILE%\.dsh\codex-bridge\prompt-traces\<uuid>.json`

内容包括 `system`、`messages`、`tools`、provider/model、reasoning effort、temperature、maxTokens 和 stop。该监听器不修改请求。后续记忆插件应通过 `ctx.systemPrompt.context()` / `section()` 修改组装阶段，而不是改写 `llm/stream` 参数。

## Codex 配置

```toml
[mcp_servers.dsh_control]
command = "C:\\Program Files\\nodejs\\node.exe"
args = ["E:\\deepseek_harness\\plugins\\dsh-codex-bridge\\lib\\mcp-server.js"]
cwd = "E:\\deepseek_harness"
startup_timeout_sec = 20
tool_timeout_sec = 600
```

## DSH 安装

```powershell
& 'C:\Program Files\nodejs\node.exe' `
  'C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js' `
  plugin --profile web add 'E:\deepseek_harness\plugins\dsh-codex-bridge'
```

## 验证

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test --prefix 'E:\deepseek_harness\plugins\dsh-codex-bridge'
Invoke-RestMethod http://127.0.0.1:3080/__dsh-codex-bridge/v1/health
```
