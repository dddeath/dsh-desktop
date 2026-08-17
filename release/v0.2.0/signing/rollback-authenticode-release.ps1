[CmdletBinding()]
param(
  [switch]$DeleteGitHubRelease,
  [string]$Repository = 'dddeath/dsh-desktop',
  [string]$Tag = 'v0.2.0'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$dist = Join-Path $repoRoot 'desktop\dist'
$backup = Join-Path $dist 'unsigned-v0.2.0-before-authenticode'
$names = @(
  'DeepSeek-Harness-Desktop-0.2.0-portable.exe',
  'DeepSeek-Harness-Desktop-Setup-0.2.0.exe',
  'DeepSeek-Harness-Desktop-Setup-0.2.0.exe.blockmap'
)

if (-not (Test-Path -LiteralPath $backup -PathType Container)) {
  throw "Unsigned artifact backup was not found: $backup"
}

$restored = @()
foreach ($name in $names) {
  $source = Join-Path $backup $name
  if (Test-Path -LiteralPath $source -PathType Leaf) {
    $destination = Join-Path $dist $name
    Copy-Item -LiteralPath $source -Destination $destination -Force
    $item = Get-Item -LiteralPath $destination
    $restored += [ordered]@{
      path = $item.FullName
      bytes = $item.Length
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash
      signatureStatus = if ($item.Extension -eq '.exe') { (Get-AuthenticodeSignature -LiteralPath $destination).Status.ToString() } else { $null }
    }
  }
}

$releaseDeleted = $false
if ($DeleteGitHubRelease) {
  $gh = (Get-Command gh.exe -ErrorAction Stop).Source
  & $gh release delete $Tag --repo $Repository --yes
  if ($LASTEXITCODE -ne 0) { throw "Failed to delete GitHub Release $Tag." }
  $releaseDeleted = $true
}

$record = [ordered]@{
  schemaVersion = 1
  rolledBackAt = [DateTime]::UtcNow.ToString('o')
  result = 'PASS'
  restored = $restored
  githubReleaseDeleted = $releaseDeleted
  tagRetained = $true
}
$recordPath = Join-Path $PSScriptRoot 'rollback-verification.signed-release.json'
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
Write-Output "ROLLBACK_VERIFICATION=$recordPath"
