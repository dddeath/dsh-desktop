[CmdletBinding()]
param(
  [string]$PluginRoot = 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools',
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json'
)

$ErrorActionPreference = 'Stop'
$node = 'C:\Program Files\nodejs\node.exe'
$original = Join-Path $PSScriptRoot 'original'
$hashes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\baseline-hashes.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Restore-And-Verify {
  param([string]$Source, [string]$Target, [string]$Expected, [string]$Role)
  $parent = Split-Path -Parent $Target
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "$Role target parent is missing: $parent" }
  Copy-Item -LiteralPath $Source -Destination $Target -Force
  $actual = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Expected) { throw "$Role rollback hash mismatch: expected=$Expected actual=$actual" }
  Write-Output "ROLLBACK_ROLE=$Role PATH=$Target SHA256=$actual"
}

Restore-And-Verify (Join-Path $original 'tools.js') (Join-Path $PluginRoot 'tools.js') $hashes.'tools.js' 'tools'
Restore-And-Verify (Join-Path $original 'codex-common.mjs') (Join-Path $PluginRoot 'scripts\codex-common.mjs') $hashes.'codex-common.mjs' 'codex-common'
Restore-And-Verify (Join-Path $original 'codex-imagegen.mjs') (Join-Path $PluginRoot 'scripts\codex-imagegen.mjs') $hashes.'codex-imagegen.mjs' 'codex-imagegen'
Restore-And-Verify (Join-Path $original 'codex-vision.mjs') (Join-Path $PluginRoot 'scripts\codex-vision.mjs') $hashes.'codex-vision.mjs' 'codex-vision'
Restore-And-Verify (Join-Path $original 'codex-search.mjs') (Join-Path $PluginRoot 'scripts\codex-search.mjs') $hashes.'codex-search.mjs' 'codex-search'
Restore-And-Verify (Join-Path $original 'STATE.json') $StateTarget $hashes.'STATE.json' 'state'

foreach ($file in 'tools.js','scripts\codex-common.mjs','scripts\codex-imagegen.mjs','scripts\codex-vision.mjs','scripts\codex-search.mjs') {
  & $node --check (Join-Path $PluginRoot $file)
  if ($LASTEXITCODE -ne 0) { throw "Rollback syntax check failed: $file" }
}
Write-Output 'RESTART_REQUIRED=true'
Write-Output 'ROLLBACK_OK=true'
