# Harness 重启端口冲突修复验证

- 故障：新实例启动时报 `EADDRINUSE 127.0.0.1:3080`。
- 已确认占用者：PID `19300`，命令为 `dsh web --port 3080`。
- 根因：`desktop/main.js` 启动 `taskkill` 后未等待其完成、未检查退出状态，并忽略 `waitPortFree()` 的失败结果。

## 运行恢复

基线命令与输出：

```text
Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 3080 -State Listen
PID=19300
HTTP_STATUS=200
```

停止命令与字面输出：

```text
taskkill.exe /PID 19300 /T /F
SUCCESS: The process with PID 19300 (child process of PID 47340) has been terminated.
EXIT=0
```

修改后启动命令与字面输出：

```text
C:\Users\19739\AppData\Roaming\npm\dsh.cmd web --port 3080
dsh web: http://127.0.0.1:3080
SESSION_ID=95956
NEW_PID=43744
HTTP_STATUS=200
PLUGIN_CONFIG=tool-codex-tools / dsh-codex-tools
```

启动命令当前处于持续运行状态；`HTTP 200` 和插件配置均已验证。

## 源码修改

修改分支：桌面端 `restartHarness()` 的进程终止与端口释放分支。

1. 新增 `terminateProcessTree(pid)`，等待 Windows `taskkill` 的 `close` 事件并保留退出码/输出。
2. `killChild()` 改为异步等待受管实例终止。
3. 外部 DSH PID 改为逐个等待终止。
4. 检查 `waitPortFree(DEFAULT_PORT)` 的布尔结果；端口仍占用时进入现有错误状态，不再继续 `spawnAndWait()`。

安装前源码：

```text
baseline/desktop-main.js
SHA256=EF24E438D24A14978D77767957A69018C605944CD20D004511C706FE48FE7373
```

修改后源码：

```text
modified/desktop-main.js
SHA256=761EEA114638EDDCFBF311EA220DE1121355D3BDD8D302F41390F70A43288FA2
```

精确补丁：

```text
desktop-main.patch
SHA256=6869390C1DDB865002F5C390C007D6347888CC4AC6240437382F340CD66A272E
```

## 机器验证

命令：

```powershell
& 'C:\Program Files\nodejs\node.exe' --check 'desktop\main.js'
```

字面输出：

```text
SYNTAX_EXIT=0
```

控制流探针字面输出：

```json
{"hasAwaitedTaskkill":true,"awaitsManagedStop":true,"awaitsExternalStops":true,"guardsPortBeforeSpawn":true}
```

```text
PROBE_EXIT=0
LIVE_PID=43744
HTTP_STATUS=200
```

## 回滚

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\phase2-codex-media\operation2-restart-recovery\rollback.ps1"
```

回滚脚本会在修改后源码哈希仍匹配时恢复基线文件，并核对恢复哈希。隔离执行记录见 `evidence/rollback-probe.txt`。
