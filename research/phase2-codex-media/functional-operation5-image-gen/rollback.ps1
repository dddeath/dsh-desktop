param(
  [string]$TargetState = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\.agent\STATE.json')),
  [string]$TargetImage = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'generated\dsh-maid-whale.png'))
)
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'original\STATE.json'
if (-not (Test-Path -LiteralPath $source)) { throw "Missing rollback source: $source" }
$targetDir = Split-Path -Parent $TargetState
if (-not (Test-Path -LiteralPath $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
Copy-Item -LiteralPath $source -Destination $TargetState -Force
if (Test-Path -LiteralPath $TargetImage -PathType Leaf) { [IO.File]::Delete($TargetImage) }
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $TargetState).Hash.ToLowerInvariant()
Write-Output "ROLLBACK_STATE_SHA256=$hash"
Write-Output "ROLLBACK_IMAGE_EXISTS=$(Test-Path -LiteralPath $TargetImage)"
exit 0
