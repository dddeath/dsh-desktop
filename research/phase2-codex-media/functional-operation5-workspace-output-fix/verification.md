# `image_gen` 会话工作区输出修复验证记录

- 日期：2026-08-16（Asia/Shanghai）
- 分支：`codex/phase1-ui-complete-phase2-ready`
- 插件：`dsh-codex-tools 1.0.1`
- 会话：`session-3f189ad6-0cea-4286-9848-0f6ec0dad457`
- 会话工作区：`E:\deepseek_workspace\pro1`

## 问题与根因

会话头的 `cwd` 为 `E:\deepseek_workspace\pro1`，工具结果报告相对路径 `output/imagegen/1786892171127.png`，但原始文件实际写入 DSH 服务启动目录：

```text
E:\deepseek_harness\output\imagegen\1786892171127.png
```

根因是插件路径辅助函数使用 `process.cwd()`，未读取当前 DSH 会话的 `exec.agent.session.header.cwd`。

## 修改字段

1. `tools.js` 从 `exec.agent.session.header.cwd` 读取当前工作区，并通过 `DSH_WORKSPACE_ROOT` 注入 `image_gen` 与 `image_vision` 子进程。
2. `codex-common.mjs` 的路径解析、输入校验、输出准备和相对路径计算都接受显式工作区根目录。
3. `codex-imagegen.mjs` 成功结果新增 `absolutePath` 与 `workspaceRoot`，供模型直接定位生成文件。
4. `fileWritten` 直接核验成功结果中的绝对路径，避免再次经过服务工作目录解析。

## 原图恢复

已保留错误目录中的原图，并复制到本次会话的正确工作区：

```text
RECOVERED_PATH=E:\deepseek_workspace\pro1\output\imagegen\1786892171127.png
RECOVERED_BYTES=2470979
RECOVERED_SHA256=9a0fdff8892c73c49b5e694d9b737826bc7b06ee5ed051ec624f112c3fb4f454
```

源文件与恢复文件的字节数及 SHA-256 完全一致。

## 自动验证

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\phase2-codex-media\functional-operation5-workspace-output-fix\verify.ps1"
```

完整输出：`evidence/verify-output.txt`。关键字面输出与退出状态：

```text
NODE_CHECK_TOOLS_EXIT=0
NODE_CHECK_COMMON_EXIT=0
NODE_CHECK_IMAGEGEN_EXIT=0
NODE_CHECK_VISION_EXIT=0
SESSION_WORKSPACE=E:\deepseek_workspace\pro1
RESOLVED_OUTPUT=E:\deepseek_workspace\pro1\output\imagegen\future.png
CHILD_WORKSPACE_ENV=E:\deepseek_workspace\pro1
WORKSPACE_BINDING_TEST=true
FIXTURE_EXIT=0
CHILD_PREFLIGHT={"ok":false,"error":"output_exists"}
CHILD_PREFLIGHT_EXIT=1
SESSION_PROBE_EXISTS=True
SERVICE_PROBE_EXISTS=False
RECOVERED_BYTES=2470979
RECOVERED_SHA256=9a0fdff8892c73c49b5e694d9b737826bc7b06ee5ed051ec624f112c3fb4f454
HTTP_STATUS=200
VERIFY_OK=true
VERIFY_SCRIPT_EXIT=0
```

`output_exists` 是刻意创建的会话目录探针触发的预检结果，发生在访问图片后端之前；服务目录没有同名探针，证明子进程使用的是会话工作区。

## 实际 DSH 调用记录

重启后的 DSH 只调用一次：

```text
out=output/imagegen/workspace-binding-live.png
size=1024x1024
format=png
```

会话原始记录位于 `evidence/live-attempt-session-lines.jsonl`。工具本次返回：

```json
{
  "backend": "chatgpt-subscription",
  "ok": false,
  "error": "backend_unavailable"
}
```

调用次数为 1，未产生新文件。该结果记录后端当时状态；工作区注入和文件落点由不消耗生图额度的工具级夹具与子进程预检独立通过。

## 补丁与回滚验证

`change.patch` 已在隔离副本上执行：

```text
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_NORMALIZED_TOOLS=true
PATCH_NORMALIZED_CODEX_COMMON=true
PATCH_NORMALIZED_CODEX_IMAGEGEN=true
PATCH_NORMALIZED_STATE=true
PATCH_PROBE_OK=True
```

`rollback.ps1` 已在隔离副本上执行，三个插件文件与状态文件均恢复到基线 SHA-256：

```text
ROLLBACK_ROLE=tools SHA256=53488304bd8c10b07ed87a35c6f9bea70b5a4c1b4c24a06d684c88704d47d78d
ROLLBACK_ROLE=codex-common SHA256=25d7341d73ca70dda5edf2d1a0735781e91a15103942b6d7d88032bd021321cc
ROLLBACK_ROLE=codex-imagegen SHA256=f09e3dbd79ce72ed573dd5748ed92f58ee83364c6667765269a376515f0891bc
ROLLBACK_ROLE=state SHA256=03772a755fd680a1f40495179fc3554b868837719712c1f683710f3d7b9b274b
ROLLBACK_OK=true
ROLLBACK_PROBE_EXIT=0
```

真实回滚入口：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\phase2-codex-media\functional-operation5-workspace-output-fix\rollback.ps1"
```

回滚后按记录重启 DSH，使旧插件代码重新载入。

## 人工验收

1. 在 `E:\deepseek_workspace\pro1` 对应会话内调用一次 `image_gen`，使用一个尚不存在的相对 `out`。
2. 成功结果应同时包含：
   - `outputPath`：工作区相对路径；
   - `absolutePath`：以 `E:\deepseek_workspace\pro1\` 开头；
   - `workspaceRoot`：等于 `E:\deepseek_workspace\pro1`；
   - `fileWritten: true`。
3. 在资源管理器打开 `absolutePath`，确认文件位于当前工作目录下；随后让模型复述该路径，确认其可定位生成位置。

## 交付角色

- 修改产物：`modified/tools.js`、`modified/codex-common.mjs`、`modified/codex-imagegen.mjs`、`modified/STATE.json`
- 补丁：`change.patch`
- 验证记录：`verification.md`
- 回滚：`rollback.ps1`
