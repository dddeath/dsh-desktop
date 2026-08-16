# 桌面端重启 3080 端口占用修复验证记录

验证时间：2026-08-17（Asia/Shanghai）

## 1. 问题与根因

用户可见错误：

```text
Restart failed
Could not start dsh web:
port 3080 is still in use after stopping dsh web
```

原始截图已保存为 `evidence/reported-restart-error.png`（SHA-256 `A1DC49AC7BB340EB46C5A852B3F413A7FABF5D09F34DD8A6F4B405586AD2820F`）。

错误发生时，3080 的唯一监听者为 PID `46316`：

```text
"node" "C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js" --profile web
```

`desktop/main.js` 原匹配式只识别 `bin.js web`，没有识别当前实际运行的 `bin.js --profile web`。因此桌面端附着到外部 DSH 后执行“Restart Harness”时，未找到旧进程，端口一直不释放。

## 2. 修改内容

1. 新增 `desktop/dsh-process.js`，集中解析 DSH Web 命令行。
2. 同时识别：
   - `bin.js web --port PORT`
   - `bin.js --profile web`
3. 明确排除 `bin.js --profile web plugin list` 等插件管理命令。
4. `findDshWebPids()` 改为从 PowerShell 读取 `ProcessId + CommandLine` JSON，再由 Node 侧解析，避免 PowerShell 正则转义漂移。
5. `desktop/package.json` 将新模块加入 ASAR 打包清单。

修改前源码 SHA-256：

```text
desktop/main.js      0AA1F31B2CFF5CF8F5A3B1E96623611474F3037C003E6AE51008A82918C4E970
desktop/package.json 5B9E6E0FDC9F9A30CA97C5FC67801EA6667B5FC335C6D3B4AF5EE570D035AE02
```

## 3. 服务恢复

仅结束经过可执行文件与命令行双重校验的旧 DSH PID `46316`，随后使用相同 `--profile web` 配置隐藏启动新实例。

```text
OldPid=46316
OldPidRunning=false
NewPid=43708
HomeStatus=200
HomeHasBoot=true
MarketStatus=200
```

记录：`evidence/runtime-recovery.json`

## 4. 打包与运行版更新

构建命令：

```powershell
$env:PATH='C:\Program Files\nodejs;'+$env:PATH
desktop\node_modules\.bin\electron-builder.cmd --win portable --config.directories.output=dist-restart-fix
```

退出状态：`0`。ASAR 已核对包含：

```text
\main.js
\dsh-process.js
```

当前 `dist-status` 运行版哈希：

```text
win-unpacked\DeepSeek Harness Desktop.exe
  23A8B92DE2093C40EC9EF81223077C805FD28996932EF9FD78362DF153DC277D
win-unpacked\resources\app.asar
  C7F32CA8210AAB7B222E3D0468E6316A23496A405336AECF291CBF0CC9BCB035
DeepSeek-Harness-Desktop-0.1.0-portable.exe
  F7880508D3390EDBA7B601AF0DC5CAD50C56E31E9AD2F785943FCA6417F565C6
```

旧运行版备份：`desktop/dist-status/restart-fix-backup/`（构建目录，Git 忽略）。

## 5. 端到端真实重启

验证入口不是模拟函数调用，而是由新版 EXE 打开实际页面，再触发 `dsh-desktop://restart`：

```text
beforePid=43708
listenerPid=43708, httpStatus=200
listenerPid=0,     httpStatus=0
listenerPid=45720, httpStatus=200
success=true
```

桌面主进程日志：

```text
[dsh-desktop] stopping external dsh web pids: 43708
[dsh-desktop] starting: C:\Program Files\nodejs\node.exe ...\dsh\lib\bin.js web --port 3080
[dsh-desktop] restarted: http://127.0.0.1:3080
```

完整记录：`evidence/end-to-end-restart.json`。

测试结束后已恢复正常桌面窗口；最终复核首页 `200`、`__DSH_BOOT__=true`、市场状态接口 `200`。

## 6. 最终验证命令与原样输出

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\ui-audit\phase3-restart-port-fix\verify.ps1
```

退出状态：`0`

```text
FIXTURE=profile-web MATCH=true
FIXTURE=legacy-web MATCH=true
FIXTURE=profile-plugin-command MATCH=false
FIXTURE=unrelated-node MATCH=false
PARSED_PIDS=4100,4101
PROCESS_MATCH_OK=true
E2E_OLD_PID=43708
E2E_NEW_PID=45720
HOME_HTTP=200
MARKET_HTTP=200
VERIFY_OK=true
```

完整输出：`evidence/verify-output.txt`。

## 7. 补丁与回滚

补丁探针：

```text
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_NORMALIZED_MATCH_main.js=True
PATCH_NORMALIZED_MATCH_package.json=True
PATCH_NORMALIZED_MATCH_dsh-process.js=True
PATCH_PROBE_OK=true
```

回滚探针：

```text
ROLLBACK_SOURCE_OK=true
ROLLBACK_RUNTIME_RESTORED=False
ROLLBACK_SCRIPT_EXIT=0
ROLLBACK_MATCH_main.js=True
ROLLBACK_MATCH_package.json=True
ROLLBACK_HELPER_EXISTS=False
ROLLBACK_PROBE_OK=true
```

真实源码回滚：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\ui-audit\phase3-restart-port-fix\rollback.ps1
```

连同当前 `dist-status` 运行版回滚（会关闭该桌面窗口）：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\ui-audit\phase3-restart-port-fix\rollback.ps1 -RestoreRuntime
```

## 8. 四个交付角色

1. 修改后产物：`desktop/main.js`、`desktop/dsh-process.js`、`desktop/package.json`，快照位于 `modified/`。
2. 可应用补丁：`change.patch`。
3. 验证记录：本文件、`verify.ps1` 与 `evidence/`。
4. 可执行回滚：`rollback.ps1`，原始源码位于 `original/`，旧运行版位于 `desktop/dist-status/restart-fix-backup/`。

阶段 3 操作 2 的 Gate H 状态保持不变；本项只修复中断验收的桌面重启回归。
