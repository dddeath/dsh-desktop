param(
  [string]$Target = "E:\deepseek_harness\desktop\main.js"
)

$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "original\main.js"
$resolvedSource = (Resolve-Path -LiteralPath $source).Path
$targetFull = [System.IO.Path]::GetFullPath($Target)

if (-not (Test-Path -LiteralPath $resolvedSource -PathType Leaf)) {
  throw "Rollback source is missing: $resolvedSource"
}

$allowedRoot = [System.IO.Path]::GetFullPath("E:\deepseek_harness")
if (-not $targetFull.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Rollback target must stay inside $allowedRoot"
}

$parent = Split-Path -Parent $targetFull
New-Item -ItemType Directory -Force -Path $parent | Out-Null
Copy-Item -LiteralPath $resolvedSource -Destination $targetFull -Force
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $targetFull).Hash
Write-Output "ROLLBACK_TARGET=$targetFull"
Write-Output "ROLLBACK_SHA256=$hash"
