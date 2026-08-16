param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [switch]$SkipProfile
)

$ErrorActionPreference = 'Stop'
$original = Join-Path $PSScriptRoot 'evidence\original'
$maid = Join-Path $WorkspaceRoot 'themes\maid-atelier-fix'

$restore = @{
  'maid-client.js' = 'lib\client.js'
  'maid-index.js' = 'lib\index.js'
  'maid-package.json' = 'package.json'
  'maid-cordis.patch.yml' = 'cordis.patch.yml'
}

foreach ($entry in $restore.GetEnumerator()) {
  $source = Join-Path $original $entry.Key
  $target = Join-Path $maid $entry.Value
  if (-not (Test-Path -LiteralPath $source)) { throw "Missing rollback source: $source" }
  $parent = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
  "RESTORED=$target"
}

if (-not $SkipProfile) {
  $env:PATH = 'C:\Program Files\nodejs;C:\Users\19739\AppData\Roaming\npm;' + $env:PATH
  & 'C:\Users\19739\AppData\Roaming\npm\dsh.cmd' plugin --profile web remove dsh-desktop-ui-compat
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  'PROFILE_REMOVED=dsh-desktop-ui-compat'
}

$expected = @{
  'lib\client.js' = (Get-FileHash (Join-Path $original 'maid-client.js') -Algorithm SHA256).Hash
  'lib\index.js' = (Get-FileHash (Join-Path $original 'maid-index.js') -Algorithm SHA256).Hash
  'package.json' = (Get-FileHash (Join-Path $original 'maid-package.json') -Algorithm SHA256).Hash
  'cordis.patch.yml' = (Get-FileHash (Join-Path $original 'maid-cordis.patch.yml') -Algorithm SHA256).Hash
}
foreach ($entry in $expected.GetEnumerator()) {
  $actual = (Get-FileHash (Join-Path $maid $entry.Key) -Algorithm SHA256).Hash
  if ($actual -ne $entry.Value) { throw "Rollback hash mismatch: $($entry.Key)" }
  "ROLLBACK_HASH_PASS=$($entry.Key):$actual"
}
'ROLLBACK_EXIT=0'
