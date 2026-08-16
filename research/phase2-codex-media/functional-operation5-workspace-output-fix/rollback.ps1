[CmdletBinding()]
param(
  [string]$PluginRoot = 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools',
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json'
)

$ErrorActionPreference = 'Stop'
$node = 'C:\Program Files\nodejs\node.exe'
$original = Join-Path $PSScriptRoot 'original'
$baseline = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\baseline.json') -Raw -Encoding UTF8 | ConvertFrom-Json

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

$toolsTarget = Join-Path $PluginRoot 'tools.js'
$commonTarget = Join-Path $PluginRoot 'scripts\codex-common.mjs'
$imagegenTarget = Join-Path $PluginRoot 'scripts\codex-imagegen.mjs'

Restore-And-Verify (Join-Path $original 'tools.js') $toolsTarget $baseline.tools_sha256 'tools'
Restore-And-Verify (Join-Path $original 'codex-common.mjs') $commonTarget $baseline.common_sha256 'codex-common'
Restore-And-Verify (Join-Path $original 'codex-imagegen.mjs') $imagegenTarget $baseline.imagegen_sha256 'codex-imagegen'
Restore-And-Verify (Join-Path $original 'STATE.json') $StateTarget $baseline.state_sha256 'state'

foreach ($target in $toolsTarget,$commonTarget,$imagegenTarget) {
  & $node --check $target
  if ($LASTEXITCODE -ne 0) { throw "Rollback syntax check failed: $target" }
}

Write-Output 'RESTART_REQUIRED=true'
Write-Output 'ROLLBACK_OK=true'
