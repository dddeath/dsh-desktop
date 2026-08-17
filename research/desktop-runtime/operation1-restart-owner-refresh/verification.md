# Desktop restart ownership refresh verification

## Scope

- Changed branch: restart stop path in `restartHarness()`.
- Root cause: after an out-of-band Codex bridge restart, Electron's cached `attached` / managed state no longer described the process actually listening on port 3080.
- Fix: every desktop restart re-discovers verified `dsh/lib/bin.js web` processes, terminates them in up to two passes, and treats a socket timeout as still occupied rather than free.

## Baseline command and literal result

Command (PowerShell, working directory `E:\deepseek_harness`):

```powershell
$c = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 3080 -State Listen
$c.OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" |
  Select-Object ProcessId,ParentProcessId,Name,CommandLine
Get-Content C:\Users\19739\.dsh\codex-bridge\dsh-web.pid
```

Literal result, exit status `0`:

```text
LISTENER_PID=33956
ProcessId       : 33956
ParentProcessId : 18064
Name            : node.exe
CommandLine     : "C:\Program Files\nodejs\node.exe" C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js web --port 3080
PID_FILE=33956
```

The running desktop had stale managed ownership and the user-facing restart path reported `port 3080 is still in use after stopping dsh web`.

## Modified source checks

Command:

```powershell
& 'C:\Program Files\nodejs\node.exe' --check E:\deepseek_harness\desktop\main.js
& 'C:\Program Files\nodejs\node.exe' --test E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\verify-restart-source.test.cjs
```

The complete literal output is preserved in `evidence/source-tests.log`; both exit statuses were `0`. Normalized summary:

```text
PASS recognizes the detached bridge DSH web command
PASS restart refreshes ownership instead of trusting attached state
PASS a connect timeout is not treated as a free port
tests 3
pass 3
fail 0
SYNTAX_EXIT=0
TEST_EXIT=0
```

## Package and deployment

Corrected package command (the first run lacked Node in the inherited PATH):

```powershell
$env:Path='C:\Program Files\nodejs;C:\Users\19739\AppData\Roaming\npm;'+$env:Path
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\desktop\node_modules\electron-builder\cli.js --dir --win --config.directories.output=dist-restart-fix
```

The complete literal output is preserved in `evidence/package-corrected.log`; exit status was `0`. Key lines:

```text
packaging platform=win32 arch=x64 electron=37.10.3 appOutDir=dist-restart-fix\win-unpacked
updating asar integrity executable resource
PACKAGE_CORRECTED_EXIT=0
SOURCE_ASAR_SHA256=E98083AF695E4022C21EF83E610BE4B70807A04B7CA136777583051A60313AD8
DEPLOYED_ASAR_SHA256=E98083AF695E4022C21EF83E610BE4B70807A04B7CA136777583051A60313AD8
```

The matching ASAR was copied to `E:\deepseek_harness\desktop\dist-status\win-unpacked` and that executable was relaunched.

## Real restart drill

Input: an MCP-managed DSH Web process, PID `33956`, already listening on `127.0.0.1:3080` while the fixed desktop attached to it.

Trigger command:

```powershell
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\trigger-restart.mjs
```

The complete literal output is preserved in `evidence/real-restart.log`; exit status was `0`:

```text
BASELINE_DSH_PID=33956
{"id":1,"result":{"result":{"type":"string","value":"dsh-desktop://restart"}}}
TRIGGER_EXIT=0
MODIFIED_DSH_PID=46264
OLD_PID_ALIVE=False
ROOT_STATUS=200 DSH_BOOT=True
BRIDGE_STATUS=200
ProcessId       : 46264
ParentProcessId : 43264
CommandLine     : "C:\Program Files\nodejs\node.exe" C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js web --port 3080
```

Desktop status read command:

```powershell
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\read-desktop-status.mjs
```

The complete literal output is preserved in `evidence/desktop-status.log`; exit status was `0`:

```json
{"desktop":true,"desktopVersion":"0.2.0","dshVersion":"0.1.0-rc.6","host":"127.0.0.1","port":3080,"mode":"managed","phase":"ready","canRestart":true}
```

Verified behavior: the former bridge process is gone, a new desktop-owned DSH process listens on the same port, the DSH page and bridge health endpoint both return HTTP 200, and the desktop phase is `ready` without an error field.

## Patch and rollback drills

Patch command against an isolated copy of the original:

```powershell
git apply --ignore-space-change --ignore-whitespace E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\change.patch
```

Literal result, exit status `0`:

```text
PATCH_EXIT=0
PATCHED_TEXT_SHA256=C5BFAFF3100F85D6A9CB5A094ABCEAE24EBA7C3044FA6324ACC13E2AEA53823E
MODIFIED_TEXT_SHA256=C5BFAFF3100F85D6A9CB5A094ABCEAE24EBA7C3044FA6324ACC13E2AEA53823E
```

Rollback command against an isolated copy of the modified artifact:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\rollback.ps1 -Target TARGET
```

Literal result, exit status `0`:

```text
ROLLBACK_EXIT=0
ROLLED_SHA256=9D2DEEAE18702DDCE1569FC680FB602EF343BA51A196D79AFF6FF13E99B9E56B
ORIGINAL_SHA256=9D2DEEAE18702DDCE1569FC680FB602EF343BA51A196D79AFF6FF13E99B9E56B
```

## Deliverable roles

- Modified artifact: `E:\deepseek_harness\desktop\main.js`
- Patch/diff: `E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\change.patch`
- Verification record: `E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\verification.md`
- Runnable rollback: `E:\deepseek_harness\research\desktop-runtime\operation1-restart-owner-refresh\rollback.ps1`
