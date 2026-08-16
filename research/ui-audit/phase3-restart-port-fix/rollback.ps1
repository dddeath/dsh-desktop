[CmdletBinding()]
param(
  [string]$TargetRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [switch]$RestoreRuntime
)

$ErrorActionPreference = "Stop"
$targetRootPath = [IO.Path]::GetFullPath($TargetRoot)
$desktopTarget = Join-Path $targetRootPath "desktop"
$original = Join-Path $PSScriptRoot "original"

if (-not (Test-Path -LiteralPath $desktopTarget -PathType Container)) {
  throw "Desktop target does not exist: $desktopTarget"
}

Copy-Item -LiteralPath (Join-Path $original "main.js") -Destination (Join-Path $desktopTarget "main.js") -Force
Copy-Item -LiteralPath (Join-Path $original "package.json") -Destination (Join-Path $desktopTarget "package.json") -Force
$helperTarget = Join-Path $desktopTarget "dsh-process.js"
if (Test-Path -LiteralPath $helperTarget) {
  Remove-Item -LiteralPath $helperTarget -Force
}

if ($RestoreRuntime) {
  $runtimeRoot = Join-Path $desktopTarget "dist-status"
  $backupRoot = Join-Path $runtimeRoot "restart-fix-backup"
  $runtimeExe = Join-Path $runtimeRoot "win-unpacked\DeepSeek Harness Desktop.exe"
  $resolvedRuntime = [IO.Path]::GetFullPath($runtimeRoot)
  if (-not $resolvedRuntime.StartsWith($targetRootPath, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Runtime target escaped TargetRoot: $resolvedRuntime"
  }
  foreach ($required in @(
    (Join-Path $backupRoot "DeepSeek Harness Desktop.exe"),
    (Join-Path $backupRoot "resources\app.asar"),
    (Join-Path $backupRoot "DeepSeek-Harness-Desktop-0.1.0-portable.exe")
  )) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing runtime backup: $required" }
  }

  $roots = Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -eq $runtimeExe -and $_.CommandLine -notmatch "--type="
  }
  foreach ($process in $roots) {
    & taskkill.exe /PID ([string]$process.ProcessId) /T /F | Out-Host
  }
  Start-Sleep -Milliseconds 800

  Copy-Item -LiteralPath (Join-Path $backupRoot "DeepSeek Harness Desktop.exe") -Destination $runtimeExe -Force
  Copy-Item -LiteralPath (Join-Path $backupRoot "resources\app.asar") -Destination (Join-Path $runtimeRoot "win-unpacked\resources\app.asar") -Force
  Copy-Item -LiteralPath (Join-Path $backupRoot "DeepSeek-Harness-Desktop-0.1.0-portable.exe") -Destination (Join-Path $runtimeRoot "DeepSeek-Harness-Desktop-0.1.0-portable.exe") -Force
}

$mainHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $desktopTarget "main.js")).Hash
$packageHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $desktopTarget "package.json")).Hash
if ($mainHash -ne "0AA1F31B2CFF5CF8F5A3B1E96623611474F3037C003E6AE51008A82918C4E970") { throw "main.js rollback hash mismatch: $mainHash" }
if ($packageHash -ne "5B9E6E0FDC9F9A30CA97C5FC67801EA6667B5FC335C6D3B4AF5EE570D035AE02") { throw "package.json rollback hash mismatch: $packageHash" }
if (Test-Path -LiteralPath $helperTarget) { throw "dsh-process.js still exists after rollback" }

Write-Output "ROLLBACK_SOURCE_OK=true"
Write-Output "ROLLBACK_RUNTIME_RESTORED=$([bool]$RestoreRuntime)"
