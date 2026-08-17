# DSH MCP 工作区硬约束验证记录

## 修改目标

1. MCP 新建和继续会话必须显式提供真实 `cwd`；缺少 `cwd` 时在 MCP schema 层拒绝。
2. 所有 DSH 会话，包括 MCP 根会话、DSH 直接创建的会话和 subagent 子会话，均按 `SessionHeader.cwd` 自动归入工作区。
3. 启动时扫描并修复存量未分组会话。
4. 始终保留一个名为“默认工作区”的持久工作区。
5. 工作区不变量异常时，健康检查和会话操作返回异常状态，不继续产生未分组会话。

## 基线

命令：

```text
GET /__dsh-codex-bridge/v1/sessions
GET /__dsh-codex-bridge/v1/workspaces
从全部 session id 中减去所有 workspace.sessionIds
```

字面输出：

```text
SESSION_COUNT=59
GROUPED_COUNT=19
UNGROUPED_COUNT=40
WORKSPACE_COUNT=4
BASELINE EXIT_STATUS=0
```

## 实现

- 新增 `lib/workspace-invariant.js`，集中实现默认工作区、单会话归组、存量会话协调和不变量错误。
- `session/created` 全局钩子覆盖 MCP 之外创建的根会话和子会话；没有 `cwd` 的会话在创建边界被拒绝。
- 插件启动时执行一次全量协调；`sessions`、`workspaces` 和新增的 `workspace-invariant` 接口在返回前再次协调。
- 默认工作区路径：`C:\Users\19739\.dsh\default-workspace`，名称：`默认工作区`。
- MCP 新增 `dsh_workspace_status`，工具总数由 12 增至 13。

## 自动测试

命令：

```powershell
$env:Path='C:\Program Files\nodejs;'+$env:Path
C:\Program Files\nodejs\npm.cmd run check
```

字面结果：

```text
tests 14
pass 14
fail 0
EXIT_STATUS=0
```

覆盖内容包括：默认工作区幂等保留、无 cwd 会话拒绝、两个 cwd 的存量会话协调、归组失败报告、原有循环保护与 Prompt 追踪测试。

## 真实 DSH 重启与存量修复

命令：桌面协议 `dsh-desktop://restart`，随后读取 bridge health。

首次加载 0.1.3 的字面结果：

```text
PRE_PID=16940
POST_PID=4532
HEALTH_OK=True
VERSION=0.1.3
TOTAL_SESSIONS=59
ATTACHED=40
GROUPED_SESSIONS=59
UNGROUPED_SESSIONS=0
FAILURES=0
DEFAULT_WORKSPACE=默认工作区|C:\Users\19739\.dsh\default-workspace
EXIT_STATUS=0
```

最终重启复验：

```text
PRE_PID=4532
POST_PID=39204
HEALTH_OK=True
VERSION=0.1.3
TOTAL=60
GROUPED=60
UNGROUPED=0
DEFAULT=默认工作区|C:\Users\19739\.dsh\default-workspace
EXIT_STATUS=0
```

## 真实 MCP 验证

命令：

```powershell
C:\Program Files\nodejs\node.exe E:\deepseek_harness\plugins\dsh-codex-bridge\scripts\verify.mjs
```

字面结果：

```text
ok=true
toolCount=13
cwdRequired=true
missingCwdRejected=true
hardConstraint=true
workspaceInvariant.ready=true
totalSessions=60
groupedSessions=60
ungroupedSessionIds=[]
failures=[]
defaultWorkspace.title=默认工作区
loopGuard.error=loop_blocked
EXIT_STATUS=0
```

新建真实 MCP 会话 `session-5106ed88-d8cb-4991-a65a-aea8a0bae440` 的 `cwd` 为 `E:\deepseek_memory`，会话列表返回的工作区为 `deepseek_memory`，最终不变量仍为 `60/60`、未分组 `0`。

完整 MCP 输出：`evidence/mcp-verify-final.log`。

## 补丁与回滚

补丁在独立 HEAD 基线目录应用，七个目标文件与修改快照逐个执行 `git diff --no-index --exit-code`，全部退出 `0`。

回滚命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\bridge-runtime\operation3-workspace-invariant\rollback.ps1 -RepositoryRoot TARGET
```

隔离回滚结果：五个原文件哈希全部恢复，新模块和新测试均移除，`ROLLBACK_EXIT=0`。详细字面输出见 `evidence/patch-rollback-proof.txt`。

## 交付角色

- 原始备份：`E:\deepseek_harness\research\bridge-runtime\operation3-workspace-invariant\original`
- 修改产物：`E:\deepseek_harness\plugins\dsh-codex-bridge\lib\workspace-invariant.js`
- 补丁：`E:\deepseek_harness\research\bridge-runtime\operation3-workspace-invariant\change.patch`
- 验证记录：`E:\deepseek_harness\research\bridge-runtime\operation3-workspace-invariant\verification.md`
- 可执行回滚：`E:\deepseek_harness\research\bridge-runtime\operation3-workspace-invariant\rollback.ps1`
