param(
  [string]$TargetRoot = "E:\deepseek_harness\plugins\plugin-control-center"
)

$ErrorActionPreference = "Stop"
$workspaceRoot = [IO.Path]::GetFullPath("E:\deepseek_harness")
$target = [IO.Path]::GetFullPath($TargetRoot)
$original = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "original"))

if (-not $target.StartsWith("$workspaceRoot\", [StringComparison]::OrdinalIgnoreCase)) {
  throw "rollback target escaped workspace: $target"
}
if (-not (Test-Path -LiteralPath (Join-Path $original "original-hashes.json")) -and
    -not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "original-hashes.json"))) {
  throw "original hash manifest is missing"
}

foreach ($relativePath in @("lib\index.js", "lib\client.js", "lib\profile-actions.js", "package.json", "README.md")) {
  $source = Join-Path $original $relativePath
  $destination = Join-Path $target $relativePath
  New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
  Copy-Item -LiteralPath $source -Destination $destination -Force
}

foreach ($relativePath in @("lib\live-actions.js", "test\live-actions.test.js")) {
  $file = Join-Path $target $relativePath
  if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
}

$expected = Get-Content -LiteralPath (Join-Path $PSScriptRoot "original-hashes.json") -Raw | ConvertFrom-Json
$actual = foreach ($record in $expected) {
  $file = Join-Path $target $record.relative
  [pscustomobject]@{
    relative = $record.relative
    expectedSha256 = $record.sha256
    actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash
  }
}
if ($actual.Where({ $_.expectedSha256 -ne $_.actualSha256 }).Count -gt 0) {
  throw "rollback hash verification failed"
}

[pscustomobject]@{
  ok = $true
  target = $target
  restoredVersion = (Get-Content -LiteralPath (Join-Path $target "package.json") -Raw | ConvertFrom-Json).version
  hashes = $actual
  nextStep = "在桌面端使用 Ctrl+Shift+R 或顶部的重启 Harness 按钮加载回滚版本"
} | ConvertTo-Json -Depth 6
