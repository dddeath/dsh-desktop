param(
  [string]$RepoRoot = 'E:\deepseek_harness',
  [string]$ReleaseRoot = 'E:\deepseek_harness\release\v0.2.0'
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath($RepoRoot)
$release = [IO.Path]::GetFullPath($ReleaseRoot)
$baseline = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $release 'baseline.json') | ConvertFrom-Json

$records = @(
  [pscustomobject]@{ Source = Join-Path $release 'original\desktop\package.json'; Target = Join-Path $repo 'desktop\package.json'; Sha256 = $baseline.originalHashes.desktopPackage },
  [pscustomobject]@{ Source = Join-Path $release 'original\desktop\package-lock.json'; Target = Join-Path $repo 'desktop\package-lock.json'; Sha256 = $baseline.originalHashes.desktopLock },
  [pscustomobject]@{ Source = Join-Path $release 'original\agent\STATE.json'; Target = Join-Path $repo '.agent\STATE.json'; Sha256 = $baseline.originalHashes.state },
  [pscustomobject]@{ Source = Join-Path $release 'original\agent\PLAN.json'; Target = Join-Path $repo '.agent\PLAN.json'; Sha256 = $baseline.originalHashes.plan },
  [pscustomobject]@{ Source = Join-Path $release 'original\README.md'; Target = Join-Path $repo 'README.md'; Sha256 = $baseline.originalHashes.readme }
)

foreach ($record in $records) {
  $source = [IO.Path]::GetFullPath($record.Source)
  $target = [IO.Path]::GetFullPath($record.Target)
  if (-not $source.StartsWith($release + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "source escaped release root: $source" }
  if (-not $target.StartsWith($repo + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "target escaped repo root: $target" }
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash -ne $record.Sha256) { throw "source hash mismatch: $source" }
  $temporary = "$target.release-rollback-$PID.tmp"
  Copy-Item -LiteralPath $source -Destination $temporary
  Move-Item -LiteralPath $temporary -Destination $target -Force
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash -ne $record.Sha256) { throw "restored hash mismatch: $target" }
}

[ordered]@{
  result = 'ROLLBACK PASS'
  restoredVersion = '0.1.0'
  restoredFiles = $records.Target
  retainedEvidence = $release
  liveProfileChanged = $false
} | ConvertTo-Json -Depth 5
