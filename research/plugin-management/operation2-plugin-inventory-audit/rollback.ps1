param(
  [string]$TargetRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [switch]$KeepOperationArtifacts
)

$ErrorActionPreference = 'Stop'
$operationRelative = 'research\plugin-management\operation2-plugin-inventory-audit'
$operationRoot = Join-Path $TargetRoot $operationRelative
$originalState = Join-Path $operationRoot 'original\STATE.json'
$targetState = Join-Path $TargetRoot '.agent\STATE.json'

if (-not (Test-Path -LiteralPath $originalState)) {
  throw "Missing rollback source: $originalState"
}

$resolvedRoot = [IO.Path]::GetFullPath($TargetRoot).TrimEnd('\')
$resolvedState = [IO.Path]::GetFullPath($targetState)
if (-not $resolvedState.StartsWith($resolvedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw "Rollback target escaped workspace: $resolvedState"
}

Copy-Item -LiteralPath $originalState -Destination $targetState -Force
Write-Output "RESTORED_STATE=$targetState"

if (-not $KeepOperationArtifacts) {
  $resolvedOperation = [IO.Path]::GetFullPath($operationRoot)
  if (-not $resolvedOperation.StartsWith($resolvedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Rollback artifact target escaped workspace: $resolvedOperation"
  }
  Remove-Item -LiteralPath $resolvedOperation -Recurse -Force
  Write-Output "REMOVED_OPERATION=$resolvedOperation"
}

Write-Output 'ROLLBACK_OK=true'
