[CmdletBinding()]
param(
  [string]$WorkspaceRoot,
  [string]$DesktopMainTarget,
  [string]$StateTarget,
  [string]$PluginToolsTarget = 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools\tools.js'
)

$ErrorActionPreference = 'Stop'
if (-not $WorkspaceRoot) { $WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
if (-not $DesktopMainTarget) { $DesktopMainTarget = Join-Path $WorkspaceRoot 'desktop\main.js' }
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
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
    throw "$Role target parent is missing: $parent"
  }
  Copy-Item -LiteralPath $Source -Destination $Target -Force
  $actual = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $ExpectedSha256) {
    throw "$Role rollback hash mismatch: expected=$ExpectedSha256 actual=$actual"
  }
  Write-Output "ROLLBACK_ROLE=$Role PATH=$Target SHA256=$actual"
}

Restore-And-Verify -Source (Join-Path $original 'desktop-main.js') -Target $DesktopMainTarget -ExpectedSha256 $hashes.desktop_main_sha256 -Role 'desktop-main'
Restore-And-Verify -Source (Join-Path $original 'STATE.json') -Target $StateTarget -ExpectedSha256 $hashes.state_sha256 -Role 'state'
Restore-And-Verify -Source (Join-Path $original 'dsh-codex-tools-tools.js') -Target $PluginToolsTarget -ExpectedSha256 $hashes.installed_tools_sha256 -Role 'installed-plugin-tools'
Write-Output 'ROLLBACK_OK=true'
