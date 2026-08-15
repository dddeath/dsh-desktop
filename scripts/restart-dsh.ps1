# Restart the DeepSeek Harness Web GUI safely:
#   1. wait for the session log to go quiet (agent idle) to avoid tearing a
#      zstd frame mid-write;
#   2. back up the current session logs as a safety net;
#   3. stop the running dsh web process and reopen via the desktop shell.
# NOTE: kept ASCII-only on purpose - Windows PowerShell 5.1 reads BOM-less
# .ps1 files as ANSI, which corrupts non-ASCII string literals.
$ErrorActionPreference = 'SilentlyContinue'

$dshHome = $env:DSH_HOME
if (-not $dshHome) { $dshHome = Join-Path $env:USERPROFILE '.dsh' }
$sessionsDir = Join-Path $dshHome 'sessions'

function Get-NewestLogTick {
  $latest = Get-ChildItem $sessionsDir -Recurse -Filter 'session.jsonl.zstd' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latest) { return "$($latest.FullName)|$($latest.LastWriteTime.Ticks)|$($latest.Length)" }
  return $null
}

# 1. Wait for quiescence: two consecutive 600ms polls with no change, up to 60s.
Write-Host 'Step 1/3: waiting for the session log to settle (agent idle)...'
$settled = $false
for ($i = 0; $i -lt 100; $i++) {
  $t1 = Get-NewestLogTick
  Start-Sleep -Milliseconds 600
  $t2 = Get-NewestLogTick
  if ($t1 -eq $t2) { $settled = $true; break }
}
if ($settled) { Write-Host '  log is quiet.' }
else { Write-Host '  WARNING: log kept growing for 60s - an agent turn may still be writing.' }

# 2. Safety backup of all session logs.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $dshHome "sessions-backup-$stamp"
Copy-Item $sessionsDir $backupDir -Recurse
if (Test-Path $backupDir) { Write-Host "Step 2/3: session logs backed up to $backupDir" }
else { Write-Host 'Step 2/3: backup FAILED - aborting to protect session history'; exit 1 }

# 3. Stop the current dsh web process.
Write-Host 'Step 3/3: stopping the current dsh web process...'
$killed = $false
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'dsh[\\/]lib[\\/]bin\.js"?\s+web' } |
  ForEach-Object {
    Write-Host "  Stopping PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force
    $killed = $true
  }
if (-not $killed) { Write-Host '  No running dsh web process found.' }

# Wait for port 3080 to free up (max 15s)
$waited = 0
while ($waited -lt 30) {
  $busy = $false
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', 3080)
    $c.Close()
    $busy = $true
  } catch { }
  if (-not $busy) { break }
  Start-Sleep -Milliseconds 500
  $waited++
}

Write-Host 'Starting the desktop shell (it launches dsh web)...'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'cd /d "E:\deepseek_harness\desktop" && npm.cmd start' -WorkingDirectory 'E:\deepseek_harness\desktop'
Write-Host 'Done. If the trajectory view shows a history read error again, restore the session log from the backup above.'
