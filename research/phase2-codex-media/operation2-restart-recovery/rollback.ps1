param(
  [string]$Target = 'E:\deepseek_harness\desktop\main.js',
  [string]$Baseline = (Join-Path $PSScriptRoot 'baseline\desktop-main.js')
)

$ErrorActionPreference = 'Stop'
$expectedModified = '761EEA114638EDDCFBF311EA220DE1121355D3BDD8D302F41390F70A43288FA2'
$expectedBaseline = 'EF24E438D24A14978D77767957A69018C605944CD20D004511C706FE48FE7373'

$targetFull = [IO.Path]::GetFullPath($Target)
$baselineFull = [IO.Path]::GetFullPath($Baseline)
if (-not (Test-Path -LiteralPath $targetFull -PathType Leaf)) { throw "Target is missing: $targetFull" }
if (-not (Test-Path -LiteralPath $baselineFull -PathType Leaf)) { throw "Baseline is missing: $baselineFull" }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $targetFull).Hash -ne $expectedModified) {
  throw 'Target changed after the restart fix; rollback stopped before overwrite.'
}
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $baselineFull).Hash -ne $expectedBaseline) {
  throw 'Baseline hash mismatch.'
}

Copy-Item -LiteralPath $baselineFull -Destination $targetFull -Force
$restored = (Get-FileHash -Algorithm SHA256 -LiteralPath $targetFull).Hash
if ($restored -ne $expectedBaseline) { throw 'Restored file hash mismatch.' }

[ordered]@{
  ok = $true
  target = $targetFull
  restored_sha256 = $restored
} | ConvertTo-Json
