[CmdletBinding()]
param(
  [string]$WorkspaceRoot,
  [string]$ClientTarget,
  [string]$PackageTarget,
  [string]$StateTarget
)

$ErrorActionPreference = 'Stop'
if (-not $WorkspaceRoot) { $WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
if (-not $ClientTarget) { $ClientTarget = Join-Path $WorkspaceRoot 'themes\maid-atelier-fix\lib\client.js' }
if (-not $PackageTarget) { $PackageTarget = Join-Path $WorkspaceRoot 'themes\maid-atelier-fix\package.json' }
if (-not $StateTarget) { $StateTarget = Join-Path $WorkspaceRoot '.agent\STATE.json' }
$original = Join-Path $PSScriptRoot 'original'
$hashes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\baseline-hashes.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Restore-And-Verify {
  param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Target,
    [Parameter(Mandatory)] [string]$ExpectedSha256,
    [Parameter(Mandatory)] [string]$Role
  )
  $parent = Split-Path -Parent $Target
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "$Role target parent is missing: $parent" }
  Copy-Item -LiteralPath $Source -Destination $Target -Force
  $actual = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $ExpectedSha256) { throw "$Role rollback hash mismatch: expected=$ExpectedSha256 actual=$actual" }
  Write-Output "ROLLBACK_ROLE=$Role PATH=$Target SHA256=$actual"
}

Restore-And-Verify -Source (Join-Path $original 'client.js') -Target $ClientTarget -ExpectedSha256 $hashes.client_sha256 -Role 'theme-client'
Restore-And-Verify -Source (Join-Path $original 'package.json') -Target $PackageTarget -ExpectedSha256 $hashes.package_sha256 -Role 'theme-package'
Restore-And-Verify -Source (Join-Path $original 'STATE.json') -Target $StateTarget -ExpectedSha256 $hashes.state_sha256 -Role 'state'
Write-Output 'ROLLBACK_OK=true'

