param(
  [string]$Root = "E:\deepseek_harness"
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$desktopTarget = Join-Path $rootPath "desktop\main.js"
$themeTarget = Join-Path $rootPath "themes\maid-atelier-fix\lib\client.js"
$baselineRoot = Join-Path $PSScriptRoot "baseline"
$desktopBaseline = Join-Path $baselineRoot "desktop-main.original.js"
$themeBaseline = Join-Path $baselineRoot "maid-atelier-client.original.js"

foreach ($path in @($desktopTarget, $themeTarget, $desktopBaseline, $themeBaseline)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required rollback file is missing: $path"
  }
}

$backupRoot = Join-Path $rootPath ".agent\rollback-backups\phase1-ui"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -LiteralPath $desktopTarget -Destination (Join-Path $backupRoot "desktop-main.$stamp.js")
Copy-Item -LiteralPath $themeTarget -Destination (Join-Path $backupRoot "maid-atelier-client.$stamp.js")

Copy-Item -LiteralPath $desktopBaseline -Destination $desktopTarget -Force
Copy-Item -LiteralPath $themeBaseline -Destination $themeTarget -Force

$node = "C:\Program Files\nodejs\node.exe"
& $node --check $desktopTarget
if ($LASTEXITCODE -ne 0) { throw "desktop/main.js rollback syntax check failed" }
& $node --check $themeTarget
if ($LASTEXITCODE -ne 0) { throw "maid-atelier client rollback syntax check failed" }

Write-Output "ROLLBACK_ROOT=$rootPath"
Write-Output "ROLLBACK_DESKTOP_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $desktopTarget).Hash)"
Write-Output "ROLLBACK_THEME_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $themeTarget).Hash)"
Write-Output "ROLLBACK_BACKUP=$backupRoot"
Write-Output "ROLLBACK_EXIT=0"
