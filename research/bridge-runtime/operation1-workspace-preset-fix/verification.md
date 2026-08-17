# DSH Codex bridge workspace and tool verification

## Changed contracts

1. `dsh_conversation_send.cwd` is required in the MCP schema.
2. The DSH HTTP boundary verifies that `cwd` exists and is a directory.
3. A continued session must use its original workspace; a different path returns `workspace_conflict`.
4. New and resumed bridge sessions mount the resolved default DSH agent preset, recording it in the session header and supplying its scoped tools.

## Baseline

Live prompt-trace inspection before the change:

```text
session=session-d8a9fb50-543c-41f0-8bd2-b0d1f7614a7e
cwd=E:\deepseek_memory
agentPreset=<absent>
toolCount=6
tools=codex_research,find_dsh_plugin,image_gen,image_vision,modlens_read_image,web_search
```

The requested target directory existed only in the message text; DSH bound the session to the server process cwd. File-oriented calls therefore produced `unknown tool` results.

## Source verification

Command:

```powershell
$env:Path='C:\Program Files\nodejs;C:\Users\19739\AppData\Roaming\npm;'+$env:Path
& 'C:\Program Files\nodejs\npm.cmd' run check --prefix E:\deepseek_harness\plugins\dsh-codex-bridge
```

Complete output: `evidence/check.log`.

```text
tests 10
pass 10
fail 0
CHECK_EXIT=0
```

## Real session contract test

Command:

```powershell
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\research\bridge-runtime\operation1-workspace-preset-fix\integration-verify.mjs
```

Complete output: `evidence/integration-corrected.log`; exit status `0`.

```text
missing cwd: HTTP 400 workspace_required
created cwd: E:\deepseek_harness
created agentPreset: standard-bash
assistantText: SESSION_CONTRACT_OK
toolCount: 31
required tools: bash,read,write
continued session with E:\deepseek_memory: HTTP 400 workspace_conflict
```

The full tool list also contains `glob`, `grep`, `edit`, `pwsh`, image tools, web search, goal tools, and subagent tools.

## Post-restart resume test

Input session: `session-codex-workspace-tools-c817eb1dadd44b36938ea094beb6bb7e`, originally bound to `E:\deepseek_harness` with `standard-bash`.

```text
HTTP_STATUS=200
cwd=E:\deepseek_harness
agentPreset=standard-bash
assistantText=BRIDGE_RESUME_TOOLS_OK
toolCount=31
HAS_READ=True HAS_WRITE=True HAS_BASH=True
RESUME_EXIT=0
```

## MCP and loop-guard verification

Command:

```powershell
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\plugins\dsh-codex-bridge\scripts\verify.mjs
```

Complete output: `evidence/mcp-verify.log`; exit status `0`.

```text
bridge version=0.1.1
MCP toolCount=12
dsh_conversation_send cwdRequired=true
captured provider toolCount=31
loop guard=loop_blocked
```

## Patch and rollback

Patch was applied to an isolated original tree with:

```powershell
git apply --ignore-space-change --ignore-whitespace --directory=research/bridge-runtime/operation1-workspace-preset-fix/evidence/patch-probe change.patch
```

Result: `PATCH_CORRECTED_EXIT=0`; all seven normalized modified-file hashes matched.

Rollback was executed against an isolated modified tree with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File rollback.ps1 -Root TARGET
```

```text
ROLLBACK_VERSION=0.1.0
ROLLBACK_EXIT=0
ROLLBACK_CONTENT_EXIT=0
NEW_CONTRACT_EXISTS=False
NEW_TEST_EXISTS=False
```

## Deliverable roles

- Primary modified artifact: `E:\deepseek_harness\plugins\dsh-codex-bridge\lib\dsh-plugin.js`
- MCP schema artifact: `E:\deepseek_harness\plugins\dsh-codex-bridge\lib\mcp-server.js`
- Workspace contract artifact: `E:\deepseek_harness\plugins\dsh-codex-bridge\lib\session-contract.js`
- Patch: `E:\deepseek_harness\research\bridge-runtime\operation1-workspace-preset-fix\change.patch`
- Verification record: `E:\deepseek_harness\research\bridge-runtime\operation1-workspace-preset-fix\verification.md`
- Runnable rollback: `E:\deepseek_harness\research\bridge-runtime\operation1-workspace-preset-fix\rollback.ps1`
