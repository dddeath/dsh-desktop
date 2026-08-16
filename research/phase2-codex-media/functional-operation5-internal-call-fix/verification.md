# DSH 内部 `image_gen` 调用修复验证记录

- 时间：2026-08-16（Asia/Shanghai）
- 分支：`codex/phase1-ui-complete-phase2-ready`
- 插件：`dsh-codex-tools 1.0.1`
- 报告现象：DSH 对话内连续调用 `image_gen`，每次均返回 `backend returned no parseable result`
- 报告截图：`evidence/reported-internal-call-failure.png`

## 根因与修改字段

1. 桌面端启动 DSH 时沿用旧 PowerShell PATH，`bash` 会先解析到 Windows System32 的 WSL 入口，且未保证子进程可找到 Node。
2. 插件把 Windows 反斜杠脚本路径交给 bash 命令层，JSON 引号中的反斜杠被消费，Node 最终收到损坏的脚本路径。
3. `desktop/main.js` 新增 `buildDshChildEnv()`：Windows 下将 `C:\Program Files\Git\bin` 和 `C:\Program Files\nodejs` 前置并去重。
4. 已安装插件 `tools.js` 新增 `shellScriptPath()`：在 `shell.resolve()` 前将 CODEX、VISION、SEARCH 三个脚本路径统一为正斜杠。

## 基线行为

证据：`evidence/baseline-internal-failures.jsonl`，从用户报告对应 DSH session 压缩日志中只提取 4 条失败工具结果。

四次结果的字面值相同，退出状态由插件报告为 1：

```json
{
  "ok": false,
  "backend": "chatgpt-subscription",
  "exitCode": 1,
  "error": "backend returned no parseable result"
}
```

## 修复后行为 A：零额度解析探针

DSH 标准模式输入：

```text
仅调用一次 image_gen，不要重试。参数：prompt="internal parser probe"; out="research/phase2-codex-media/functional-operation5-image-gen/generated/dsh-maid-whale.png"; size="1024x1024"; format="png"。成功或失败都立即停止，并原样返回工具结果。
```

因目标文件已存在，脚本在访问图片后端前结束。工具耗时 0.7 秒，DSH 返回可解析结果：

```json
{
  "backend": "chatgpt-subscription",
  "ok": false,
  "error": "invalid_path"
}
```

对应 Git Bash/Node 直接探针记录：`evidence/windows-shell-path-probe.txt`。

```text
COMMAND=C:\Program Files\Git\bin\bash.exe -lc "command -v node; node <forward-slash-script-path>"
/c/Program Files/nodejs/node
{"ok":false,"error":"output_exists"}
EXIT_STATUS=1
```

`invalid_path` 是插件对脚本 `output_exists` 的稳定映射；此结果证明脚本已启动且 stdout JSON 已回到 DSH，不再出现空解析结果。

## 修复后行为 B：一次真实订阅生图

DSH 标准模式仅调用一次 `image_gen`，未进行自动重试。原始工具结果保存在 `evidence/internal-tool-results.jsonl`：

```json
{
  "backend": "chatgpt-subscription",
  "ok": true,
  "outputPath": "research/phase2-codex-media/functional-operation5-internal-call-fix/generated/internal-dsh-blue-whale-app-icon.png",
  "bytes": 1637568,
  "model": "gpt-5.5",
  "fileWritten": true
}
```

落盘核验：

```text
WIDTH=1254
HEIGHT=1254
BYTES=1637568
SHA256=a65d0ad66224590e0a7fd14ea1228ed8a8c27c940a3685a7d0fd081c787a40f8
```

请求尺寸为 `1024x1024`，订阅后端实际返回 `1254x1254`；PNG 解码、写入和对话内结果展示均通过。

## 自动验证

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\phase2-codex-media\functional-operation5-internal-call-fix\verify.ps1"
```

字面输出与退出状态（完整记录：`evidence/verify-output.txt`）：

```text
DESKTOP_NODE_CHECK_EXIT=0
PLUGIN_NODE_CHECK_EXIT=0
DESKTOP_PATH_BOOTSTRAP=true
PLUGIN_NORMALIZED_SCRIPT_PATHS=3
HTTP_STATUS=200
IMAGE_DECODE=true WIDTH=1254 HEIGHT=1254 BYTES=1637568 SHA256=a65d0ad66224590e0a7fd14ea1228ed8a8c27c940a3685a7d0fd081c787a40f8
VERIFY_OK=true
VERIFY_SCRIPT_EXIT=0
```

验证时 DSH 监听进程 PID 为 `40492`，`http://127.0.0.1:3080/` 返回 HTTP 200。

补丁角色也在隔离副本上重新打开并执行（完整记录：`evidence/patch-probe-output.txt`）：

```text
PLUGIN_PATCH_APPLY_EXIT=0
PLUGIN_PATCH_SEMANTIC_DIFF_EXIT=0
PLUGIN_PATCH_NORMALIZED_TEXT_MATCH=true
WORKSPACE_PATCH_REVERSE_CHECK_EXIT=0
PATCH_PROBE_OK=true
```

插件补丁应用后的原始字节哈希会受 Windows CRLF 转换影响，因此用空语义 diff 与归一化文本完全相等作为执行判据。

## 回滚验证

真实回滚入口：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\phase2-codex-media\functional-operation5-internal-call-fix\rollback.ps1"
```

为避免破坏当前运行方案，已将三个修改后文件复制到 `evidence/rollback-probe/`，对副本执行同一脚本并传入三个目标路径。字面输出（完整记录：`evidence/rollback-probe-output.txt`）：

```text
ROLLBACK_ROLE=desktop-main PATH=E:\deepseek_harness\research\phase2-codex-media\functional-operation5-internal-call-fix\evidence\rollback-probe\desktop-main.js SHA256=761eea114638eddcfbf311ea220de1121355d3bdd8d302f41390f70a43288fa2
ROLLBACK_ROLE=state PATH=E:\deepseek_harness\research\phase2-codex-media\functional-operation5-internal-call-fix\evidence\rollback-probe\STATE.json SHA256=ca37940df5de8efd262a9925c0f79d128e6235318cccf1120613fbfdf0cdf3b4
ROLLBACK_ROLE=installed-plugin-tools PATH=E:\deepseek_harness\research\phase2-codex-media\functional-operation5-internal-call-fix\evidence\rollback-probe\dsh-codex-tools-tools.js SHA256=d8c6080e62c3ecb6f2359cda82f9e10bbbdbff8e74e1a760708bfdef7d4201db
ROLLBACK_OK=true
ROLLBACK_PROBE_EXIT=0
```

## 交付角色

- 修改产物：`modified/desktop-main.js`、`modified/dsh-codex-tools-tools.js`、`modified/STATE.json`
- 工作区补丁：`change.patch`
- 已安装插件补丁：`installed-plugin.patch`
- 验证记录：`verification.md`
- 可运行回滚：`rollback.ps1`
- 真实生成图片：`generated/internal-dsh-blue-whale-app-icon.png`
