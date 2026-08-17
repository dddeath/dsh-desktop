param(
  [string]$Root = "E:\deepseek_harness\plugins\dsh-codex-bridge"
)

$ErrorActionPreference = "Stop"
$rootFull = [System.IO.Path]::GetFullPath($Root)
$workspace = [System.IO.Path]::GetFullPath("E:\deepseek_harness")
if (-not $rootFull.StartsWith($workspace + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Rollback root must stay inside $workspace"
}

$original = Join-Path $PSScriptRoot "original"
$restore = @(
  "lib\dsh-plugin.js",
  "lib\mcp-server.js",
  "scripts\verify.mjs",
  "package.json",
  "package-lock.json"
)
foreach ($relative in $restore) {
  $source = Join-Path $original $relative
  $target = Join-Path $rootFull $relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
}

foreach ($relative in @("lib\session-contract.js", "test\session-contract.test.js")) {
  $target = Join-Path $rootFull $relative
  if (Test-Path -LiteralPath $target -PathType Leaf) {
    Remove-Item -LiteralPath $target -Force
  }
}

Write-Output "ROLLBACK_ROOT=$rootFull"
Write-Output "ROLLBACK_VERSION=$((Get-Content -LiteralPath (Join-Path $rootFull 'package.json') -Raw | ConvertFrom-Json).version)"
