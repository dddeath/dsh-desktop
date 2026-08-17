# Grep/Glob Git Bash 路径转换验证记录

## 范围

- 仅修改 `standard-bash` 预设中的 `grep` / `glob` 可选 `path` 参数。
- Windows 上将 `/c/...`（以及同形的 `/mnt/c/...`）转换为 `C:\...` 后交给官方原生 ripgrep。
- Bash 工具、Bash 非零退出码语义、read/write/edit/pwsh 等工具均保持原样。
- 官方 `@deepseek-ai/dsh-tool-fs-search` 的 schema、结果渲染、结果保留、超时及 post-execute hook 均由适配器复用。

## 基线

命令：

```text
C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@vscode\ripgrep-win32-x64\bin\rg.exe --files -- /c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop
```

字面输出：

```text
STDOUT:

STDERR:
rg: /c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop: IO error for operation on /c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop: 系统找不到指定的路径。 (os error 3)

EXIT_STATUS: 2
```

完整证据：`evidence/baseline.txt`。

## 修改后静态与集成验证

命令：

```powershell
& 'C:\Program Files\nodejs\node.exe' --test 'E:\deepseek_harness\standard-bash\test\windows-search-path.test.mjs'
```

字面结果：

```text
tests 4
pass 4
fail 0
UNIT_EXIT=0
```

命令：

```powershell
& 'C:\Program Files\nodejs\node.exe' 'E:\deepseek_harness\research\standard-bash\operation1-windows-search-path-fix\integration-verify.mjs'
```

输入及字面结果：

```json
{
  "input": "/c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop",
  "normalized": "C:\\Users\\19739\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\node_modules\\@deepseek-ai\\dsh-agent-loop",
  "exitCode": 0,
  "firstResult": "C:\\Users\\19739\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\node_modules\\@deepseek-ai\\dsh-agent-loop\\README.zh.md"
}
INTEGRATION_EXIT=0
```

完整证据：`evidence/unit-tests.log`、`evidence/integration.log`。

## 真实 DSH 会话验证

重载记录：

```text
PRE_PID=18852
TRIGGER_EXIT=0
POST_PID=45200
HEALTH={"ok":true,"value":{"version":"0.1.2","protocol":"dsh-codex-bridge/1","maxHops":2}}
```

### Grep

会话：`session-c5325700-7982-46e4-bc0f-e9371ff348f7`

输入：

```json
{"pattern":"dsh-agent-loop","path":"/c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop/README.md"}
```

字面结果摘要：

```text
Found 2 matches
C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-agent-loop\README.md
Line 1: # dsh-agent-loop
isError=false
GREP_EXIT_STATUS=0
```

### Glob

会话：`session-af8b98d2-b380-49a6-aec0-331cb37cc631`

输入：

```json
{"pattern":"README.md","path":"/c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop"}
```

字面结果：

```text
C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-agent-loop\README.md
isError=false
GLOB_EXIT_STATUS=0
```

完整事件：`evidence/real-search-proof.txt`，完整会话快照保存在同目录的 `real-grep-session.json` 与 `real-glob-session.json`。

## 补丁与回滚验证

补丁探针字面结果：

```text
PATCH_EXIT=0
DIFF_agent.cordis.yml_EXIT=0
DIFF_custom-fs-search-windows.mjs_EXIT=0
DIFF_windows-search-path.test.mjs_EXIT=0
```

回滚命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\standard-bash\operation1-windows-search-path-fix\rollback.ps1 -RepositoryRoot PROBE_REPO -InstalledPreset PROBE_PRESET
```

隔离回滚字面结果：

```text
ROLLBACK_OK
ROLLBACK_EXIT=0
SOURCE_RESTORED=True
INSTALLED_RESTORED=True
ADAPTER_REMOVED=True
```

## 交付角色

- 原始备份：`E:\deepseek_harness\research\standard-bash\operation1-windows-search-path-fix\original`
- 修改产物：`E:\deepseek_harness\standard-bash\preset\custom-fs-search-windows.mjs`
- 补丁：`E:\deepseek_harness\research\standard-bash\operation1-windows-search-path-fix\change.patch`
- 验证记录：`E:\deepseek_harness\research\standard-bash\operation1-windows-search-path-fix\verification.md`
- 可执行回滚：`E:\deepseek_harness\research\standard-bash\operation1-windows-search-path-fix\rollback.ps1`
