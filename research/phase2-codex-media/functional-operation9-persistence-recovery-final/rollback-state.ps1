[CmdletBinding()]
param(
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json'
)

$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'original\STATE.json'
$expected = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
$parent = Split-Path -Parent $StateTarget
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "State target parent missing: $parent" }
Copy-Item -LiteralPath $source -Destination $StateTarget -Force
$actual = (Get-FileHash -LiteralPath $StateTarget -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "State rollback hash mismatch: expected=$expected actual=$actual" }
Write-Output "STATE_ROLLBACK_SHA256=$actual"
Write-Output 'STATE_ROLLBACK_OK=true'
