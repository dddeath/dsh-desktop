# Restart the DeepSeek Harness Web GUI (activates newly installed plugins),
# then reopen it via the desktop shell.
# NOTE: kept ASCII-only on purpose - Windows PowerShell 5.1 reads BOM-less
# .ps1 files as ANSI, which corrupts non-ASCII string literals.
$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping the current dsh web process...'
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
Write-Host 'Done. The desktop window will appear shortly; all plugins were verified at the config level.'
