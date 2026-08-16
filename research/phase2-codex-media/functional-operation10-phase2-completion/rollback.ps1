[CmdletBinding()]
param(
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json',
  [string]$PlanTarget = 'E:\deepseek_harness\.agent\PLAN.json'
)

$ErrorActionPreference = 'Stop'
foreach ($entry in @(
  @('STATE.json', $StateTarget, 'state'),
  @('PLAN.json', $PlanTarget, 'plan')
)) {
  $source = Join-Path $PSScriptRoot "original\$($entry[0])"
  $target = $entry[1]
  $parent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "$($entry[2]) target parent missing" }
  $expected = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
  Copy-Item -LiteralPath $source -Destination $target -Force
  $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "$($entry[2]) rollback hash mismatch" }
  Write-Output "ROLLBACK_ROLE=$($entry[2]) SHA256=$actual"
}
Write-Output 'ROLLBACK_OK=true'
