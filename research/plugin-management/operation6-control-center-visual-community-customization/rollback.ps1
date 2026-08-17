param(
  [string]$RepoRoot = 'E:\deepseek_harness',
  [string]$OperationRoot = 'E:\deepseek_harness\research\plugin-management\operation6-control-center-visual-community-customization'
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath($RepoRoot)
$operation = [IO.Path]::GetFullPath($OperationRoot)

$records = @(
  [pscustomobject]@{
    Source = Join-Path $operation 'original\plugin-control-center\lib\client.js'
    Target = Join-Path $repo 'plugins\plugin-control-center\lib\client.js'
    Sha256 = '386D19B7B44CBDD176C6D3D18245AC6B913F656C7E4A8EB4AF4780F481201BD0'
  },
  [pscustomobject]@{
    Source = Join-Path $operation 'original\plugin-control-center\package.json'
    Target = Join-Path $repo 'plugins\plugin-control-center\package.json'
    Sha256 = 'DF28F1A78493AFF49DEB0F7330E98A161C0D1DA56A34988C25BCC442E12B6813'
  },
  [pscustomobject]@{
    Source = Join-Path $operation 'original\workspace\STATE.json'
    Target = Join-Path $repo '.agent\STATE.json'
    Sha256 = '90699F3367974169C3C7B61F7C0FEAC80D846CDEF902552F9690FF1C6FF64FC8'
  }
)

foreach ($record in $records) {
  $source = [IO.Path]::GetFullPath($record.Source)
  $target = [IO.Path]::GetFullPath($record.Target)
  if (-not $source.StartsWith($operation + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "rollback source escaped operation root: $source"
  }
  if (-not $target.StartsWith($repo + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "rollback target escaped repository root: $target"
  }
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash -ne $record.Sha256) {
    throw "rollback source hash mismatch: $source"
  }
  $parent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $temporary = "$target.rollback-$PID.tmp"
  Copy-Item -LiteralPath $source -Destination $temporary
  Move-Item -LiteralPath $temporary -Destination $target -Force
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash -ne $record.Sha256) {
    throw "rollback target hash mismatch: $target"
  }
}

[pscustomobject]@{
  result = 'ROLLBACK PASS'
  restored = $records.Target
  profileChanged = $false
  restartRequired = $true
} | ConvertTo-Json -Depth 4
