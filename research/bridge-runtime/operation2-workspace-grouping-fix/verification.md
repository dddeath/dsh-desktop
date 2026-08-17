# Codex-started DSH workspace grouping verification

## Root cause

The previous bridge correctly wrote `cwd=E:\deepseek_harness` and mounted `standard-bash`, but it created the Agent directly without calling `workspaceRegistry`. The sidebar groups sessions from each workspace entity's durable `sessionIds`, so the conversation remained under `未分组`.

Baseline registry query:

```text
BASELINE_SESSION=session-contract-812c5f1c-451b-42c9-ab93-3cda3a9d76ae
BASELINE_CWD=E:\deepseek_harness
BASELINE_AGENT_PRESET=standard-bash
BASELINE_GROUPED=False
```

The same existing session was then continued through bridge `0.1.2`; the registry result became:

```text
assistantText=WORKSPACE_GROUP_REPAIR_OK
REPAIRED_GROUPED=True
REPAIRED_WORKSPACE=deepseek_harness
REPAIRED_WORKSPACE_ID=372a4ff5-a179-4477-9b54-799ccc456474
```

## Change

- Inject `workspaceRegistry` into `dsh-codex-bridge`.
- Resolve the existing workspace by canonical path or create it through the official registry.
- Await `workspace.attachSession(sessionId)` before running the turn.
- Return `workspaceId` and `workspaceTitle` from `dsh_conversation_send`.
- Provide a read-only bridge `/workspaces` view for exact verification.

## Real conversation

Command:

```powershell
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\research\bridge-runtime\operation2-workspace-grouping-fix\integration-grouping.mjs
```

Complete output: `evidence/integration.log`; exit status `0`.

```text
sessionId=session-grouping-59b70de8-c4a7-4e78-b4ad-e7c9a624d90e
cwd=E:\deepseek_harness
agentPreset=standard-bash
assistantText=WORKSPACE_GROUPING_OK
workspaceId=372a4ff5-a179-4477-9b54-799ccc456474
workspaceTitle=deepseek_harness
registry sessionIds contains sessionId=True
```

## Full bridge verification

Command:

```powershell
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\plugins\dsh-codex-bridge\scripts\verify.mjs
```

Complete output: `evidence/mcp-verify.log`; exit status `0`.

```text
bridge version=0.1.2
workspaceCount=3
grouped=true
workspace.path=E:\deepseek_harness
provider toolCount=31
loop guard=loop_blocked
```

## Patch and rollback

The patch was applied to an isolated original tree with exit status `0`; normalized content for all five modified files matched the delivered artifacts. The rollback script was executed against an isolated modified tree:

```text
ROLLBACK_VERSION=0.1.1
ROLLBACK_EXIT=0
ROLLBACK_CONTENT_EXIT=0
```

## Deliverable roles

- Modified artifact: `E:\deepseek_harness\plugins\dsh-codex-bridge\lib\dsh-plugin.js`
- Patch: `E:\deepseek_harness\research\bridge-runtime\operation2-workspace-grouping-fix\change.patch`
- Verification record: `E:\deepseek_harness\research\bridge-runtime\operation2-workspace-grouping-fix\verification.md`
- Runnable rollback: `E:\deepseek_harness\research\bridge-runtime\operation2-workspace-grouping-fix\rollback.ps1`
