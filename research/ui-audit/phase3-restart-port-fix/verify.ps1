[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$node = "C:\Program Files\nodejs\node.exe"
$desktop = Join-Path $workspace "desktop"
$runtime = Join-Path $desktop "dist-status"

& $node --check (Join-Path $desktop "main.js")
if ($LASTEXITCODE -ne 0) { throw "main.js syntax check failed" }
& $node --check (Join-Path $desktop "dsh-process.js")
if ($LASTEXITCODE -ne 0) { throw "dsh-process.js syntax check failed" }
& $node (Join-Path $PSScriptRoot "verify-process-match.cjs")
if ($LASTEXITCODE -ne 0) { throw "process matcher fixtures failed" }

$e2e = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot "evidence\end-to-end-restart.json") | ConvertFrom-Json
if (-not $e2e.success -or $e2e.beforePid -eq $e2e.afterPid -or $e2e.afterHttpStatus -ne 200) {
  throw "end-to-end restart record failed"
}
if (-not ($e2e.events | Where-Object { $_.listenerPid -eq 0 })) {
  throw "end-to-end record does not contain a port-free transition"
}

$expected = @{
  "win-unpacked\DeepSeek Harness Desktop.exe" = "23A8B92DE2093C40EC9EF81223077C805FD28996932EF9FD78362DF153DC277D"
  "win-unpacked\resources\app.asar" = "C7F32CA8210AAB7B222E3D0468E6316A23496A405336AECF291CBF0CC9BCB035"
  "DeepSeek-Harness-Desktop-0.1.0-portable.exe" = "F7880508D3390EDBA7B601AF0DC5CAD50C56E31E9AD2F785943FCA6417F565C6"
}
foreach ($entry in $expected.GetEnumerator()) {
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $runtime $entry.Key)).Hash
  if ($actual -ne $entry.Value) { throw "runtime hash mismatch: $($entry.Key) $actual" }
  Write-Output "RUNTIME_HASH_OK=$($entry.Key) $actual"
}

$listener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 3080 -State Listen -ErrorAction Stop | Select-Object -First 1
$listenerProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
$desktopRoots = Get-CimInstance Win32_Process | Where-Object {
  $_.ExecutablePath -eq (Join-Path $runtime "win-unpacked\DeepSeek Harness Desktop.exe") -and $_.CommandLine -notmatch "--type="
}
if (-not $desktopRoots) { throw "desktop root process is not running" }
if ($listenerProcess.CommandLine -notmatch "@deepseek-ai[\\/]dsh[\\/]lib[\\/]bin\.js") { throw "3080 owner is not DSH Web" }

$homeResponse = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3080/" -TimeoutSec 15
$marketResponse = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3080/dsh-market/status" -TimeoutSec 15
if ($homeResponse.StatusCode -ne 200 -or $homeResponse.Content -notmatch "__DSH_BOOT__") { throw "DSH home verification failed" }
if ($marketResponse.StatusCode -ne 200) { throw "DSH market status verification failed" }

Write-Output "E2E_OLD_PID=$($e2e.beforePid)"
Write-Output "E2E_NEW_PID=$($e2e.afterPid)"
Write-Output "LIVE_LISTENER_PID=$($listener.OwningProcess)"
Write-Output "HOME_HTTP=$($homeResponse.StatusCode)"
Write-Output "MARKET_HTTP=$($marketResponse.StatusCode)"
Write-Output "VERIFY_OK=true"
