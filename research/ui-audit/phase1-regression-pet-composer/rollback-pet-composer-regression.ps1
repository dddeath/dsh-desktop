param(
  [string]$Root = "E:\deepseek_harness"
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$target = Join-Path $rootPath "themes\maid-atelier-fix\lib\client.js"
$baseline = Join-Path $PSScriptRoot "baseline\client.pet-composer-original.js"
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Target is missing: $target" }
if (-not (Test-Path -LiteralPath $baseline -PathType Leaf)) { throw "Baseline is missing: $baseline" }

$backupRoot = Join-Path $rootPath ".agent\rollback-backups\phase1-pet-composer"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupRoot "client.$stamp.js"
Copy-Item -LiteralPath $target -Destination $backup
Copy-Item -LiteralPath $baseline -Destination $target -Force

$node = "C:\Program Files\nodejs\node.exe"
& $node --check $target
if ($LASTEXITCODE -ne 0) { throw "Rollback syntax check failed" }

Write-Output "ROLLBACK_TARGET=$target"
Write-Output "ROLLBACK_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash)"
Write-Output "ROLLBACK_BACKUP=$backup"
Write-Output "ROLLBACK_EXIT=0"
