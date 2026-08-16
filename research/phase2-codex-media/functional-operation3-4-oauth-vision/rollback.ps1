param(
  [string]$TargetState = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\.agent\STATE.json'))
)
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'original\STATE.json'
if (-not (Test-Path -LiteralPath $source)) { throw "Missing rollback source: $source" }
$targetDir = Split-Path -Parent $TargetState
if (-not (Test-Path -LiteralPath $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
Copy-Item -LiteralPath $source -Destination $TargetState -Force
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $TargetState).Hash.ToLowerInvariant()
Write-Output "ROLLBACK_STATE=$TargetState"
Write-Output "ROLLBACK_SHA256=$hash"
exit 0
