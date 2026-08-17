# DSH ↔ Codex bridge verification record

Date: 2026-08-17 (Asia/Shanghai)
Workspace: `E:\deepseek_harness`
Branch: `codex/phase1-ui-complete-phase2-ready`

## Baseline and preservation

Baseline command:

```powershell
Get-FileHash C:\Users\19739\.dsh\profiles\web\package.json -Algorithm SHA256
Get-FileHash C:\Users\19739\.dsh\profiles\web\pnpm-lock.yaml -Algorithm SHA256
Get-FileHash C:\Users\19739\.codex\config.toml -Algorithm SHA256
```

Literal baseline output (exit 0):

```text
profile package  3A241EC9B52A3BF24B65DD7AC3980C5A6CF49EE613A9F7E9E3034281BBA3CA50
profile lock     D8A76DD6B2760504FBF9A008D2FFEEEF8057AB747EAAE315D7F540D5FFF3B6E9
Codex config     6F80D0D5A10B7466BEACD7AC4DE589B1801EBEC2B7F45F6CD7EB1F4DC93FD5F8
```

Before installation, `http://127.0.0.1:3080/__dsh-codex-bridge/v1/health` fell through to the DSH HTML shell and the client reported `bridge.ok=false, error=invalid_json`; no bridge API was loaded.

Preserved originals:

- `C:\Users\19739\.dsh\backups\dsh-codex-bridge-20260817-205958\package.json`
- `C:\Users\19739\.dsh\backups\dsh-codex-bridge-20260817-205958\pnpm-lock.yaml`
- `C:\Users\19739\.codex\backups\dsh-codex-bridge-20260817-205958\config.toml`
- Hash record: `E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\evidence\baseline-backups.json`

## Modified verification

### 1. Static checks and loop tests

Command:

```powershell
$env:Path='C:\Program Files\nodejs;'+$env:Path
& 'C:\Program Files\nodejs\npm.cmd' run check --prefix 'E:\deepseek_harness\plugins\dsh-codex-bridge'
```

Literal result (exit 0):

```text
tests 7
pass 7
fail 0
```

The tested decisions include Codex→DSH one-time entry, DSH→Codex one-time entry, rejection after the target is already in `visited`, rejection of DSH-originated MCP re-entry, and `MAX_BRIDGE_HOPS=2`.

Full output: `E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\evidence\npm-check.txt`

### 2. DSH instance and MCP handshake

Commands:

```powershell
node E:\deepseek_harness\plugins\dsh-codex-bridge\scripts\verify.mjs
```

Literal result (exit 0):

```json
{
  "ok": true,
  "mcp": { "toolCount": 12 },
  "instance": { "running": true, "baseUrl": "http://127.0.0.1:3080" },
  "plugin": { "count": 16, "bridgeInstalled": true },
  "conversation": { "assistantText": "BRIDGE_OK", "lastSeq": 85 },
  "loopGuard": { "ok": false, "error": "loop_blocked" }
}
```

Full output: `E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\evidence\bridge-verification.json`

### 3. Real conversation and complete prompt capture

Input sent through the MCP tool `dsh_conversation_send`:

```text
桥接验证：请只回复 BRIDGE_OK，不要调用任何工具。
```

Literal response:

```text
BRIDGE_OK
```

Verified session and bridge correlation:

```text
sessionId = session-9b5d87f3-61df-4a60-b321-b67ef948f7d5
traceId   = f49fef8e-38de-4613-b511-6041d71c59b7
promptId  = 8e45542d-7797-48f0-99d0-f0640c4910e8
provider  = opencode-go
model     = deepseek-v4-flash
systemChars = 1818
messageCount = 2
toolCount = 6
```

The prompt artifact exists at:

`C:\Users\19739\.dsh\codex-bridge\prompt-traces\8e45542d-7797-48f0-99d0-f0640c4910e8.json`

It contains the literal `system`, `messages`, `tools`, provider/model, reasoning effort, temperature, maxTokens, stop, session ID, and bridge envelope. The listener is read-only and runs before `next()`.

### 4. DSH → Codex research transport

Input:

```text
OpenAI Codex MCP official documentation URL
```

Literal result (exit 0):

```text
ok=true
model=gpt-5.4-mini
summary=The official OpenAI MCP documentation URL for Codex integration is https://developers.openai.com/mcp.
```

Complete JSON: `E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\evidence\codex-research.json`

### 5. Codex configuration

Command:

```powershell
C:\Users\19739\anaconda3\python.exe -c "import tomllib; tomllib.load(open(r'C:\Users\19739\.codex\config.toml','rb'))"
```

Literal result (exit 0):

```text
command=C:\Program Files\nodejs\node.exe
args=E:\deepseek_harness\plugins\dsh-codex-bridge\lib\mcp-server.js
cwd=E:\deepseek_harness
enabled=True
```

### 6. Rollback

Dry-run command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\rollback.ps1 -WhatIf
```

Literal result (exit 0):

```text
What if: Performing the operation "restore pre-bridge backups" on target "DSH web profile and Codex MCP config".
WhatIf=True
RestartSkipped=False
```

The script verifies all three original hashes before restoring the profile manifest, lockfile, and Codex config; it then reinstalls the frozen profile and restarts DSH.

An isolated, write-enabled rollback probe also ran the same script with `-SkipInstall -SkipRestart` against temporary modified copies. Literal result (exit 0):

```text
Restored=True
ProfilePackageHash=3A241EC9B52A3BF24B65DD7AC3980C5A6CF49EE613A9F7E9E3034281BBA3CA50
ProfileLockHash=D8A76DD6B2760504FBF9A008D2FFEEEF8057AB747EAAE315D7F540D5FFF3B6E9
CodexConfigHash=6F80D0D5A10B7466BEACD7AC4DE589B1801EBEC2B7F45F6CD7EB1F4DC93FD5F8
hashesMatch=true
```

Probe record: `E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\evidence\rollback-probe.json`

## Exit statuses

`E:\deepseek_harness\research\bridge-integration\operation1-dsh-codex-bridge\evidence\exit-statuses.json`:

```json
{
  "npmCheck": 0,
  "restart": 0,
  "bridgeVerify": 0,
  "tomlParse": 0,
  "rollbackWhatIf": 0,
  "rollbackProbe": 0,
  "patchApplyCheck": 0
}
```
