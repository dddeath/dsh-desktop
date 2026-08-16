param(
  [string]$ProfileName = 'web',
  [string]$ProfilePath = (Join-Path $HOME '.dsh\profiles\web'),
  [string]$BackupZip = (Join-Path $PSScriptRoot 'artifacts\web-profile-manifests-before.zip'),
  [switch]$SkipPackageManager
)

$ErrorActionPreference = 'Stop'

$expectedBefore = @{
  'package.json' = '661DBCA2ADBC5DCE7ACD32A11EB26FE8307643557392B63182B20A5A6BF02B81'
  'pnpm-lock.yaml' = '7A6AF21F6F569E03ED954061EA2BDA1EA7FEE3EBB46326D880E200521BF6CEC1'
}
$expectedModified = @{
  'package.json' = '765BB02389D2A7DE57C7C6E6CF63AE83049CE85B8F961D4413D3E963FF36A5B6'
  'pnpm-lock.yaml' = '886218B682F5EC17FEBCDA476E11DD1686C151745D0CD7BB991CBFAC53C35FC8'
}
$expectedZip = 'F75C4D8BE78F0C76EEF1B045EE69CAA33ED974BFAFCC5A21E89CA3D7AFEBB2B5'

$profileFull = [IO.Path]::GetFullPath($ProfilePath)
$zipFull = [IO.Path]::GetFullPath($BackupZip)
if (-not (Test-Path -LiteralPath $profileFull -PathType Container)) {
  throw "Profile directory does not exist: $profileFull"
}
if (-not (Test-Path -LiteralPath $zipFull -PathType Leaf)) {
  throw "Backup ZIP does not exist: $zipFull"
}
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $zipFull).Hash -ne $expectedZip) {
  throw 'Backup ZIP hash mismatch.'
}

if (-not $SkipPackageManager) {
  $expectedProfile = [IO.Path]::GetFullPath((Join-Path $HOME ".dsh\profiles\$ProfileName"))
  if (-not $profileFull.Equals($expectedProfile, [StringComparison]::OrdinalIgnoreCase)) {
    throw "ProfilePath must resolve to $expectedProfile when package-manager rollback is enabled."
  }
}

foreach ($name in $expectedModified.Keys) {
  $current = Join-Path $profileFull $name
  if (-not (Test-Path -LiteralPath $current -PathType Leaf)) {
    throw "Current profile file is missing: $current"
  }
  $currentHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $current).Hash
  if ($currentHash -ne $expectedModified[$name]) {
    throw "Current $name has changed since installation; rollback stopped before overwriting it."
  }
}

$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$extract = [IO.Path]::GetFullPath((Join-Path $tempBase ('dsh-codex-tools-rollback-' + [guid]::NewGuid().ToString('N'))))
if (-not $extract.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Temporary extraction path escaped the system temporary directory.'
}

try {
  New-Item -ItemType Directory -Path $extract | Out-Null
  Expand-Archive -LiteralPath $zipFull -DestinationPath $extract

  foreach ($name in $expectedBefore.Keys) {
    $restored = Join-Path $extract $name
    if (-not (Test-Path -LiteralPath $restored -PathType Leaf)) {
      throw "Backup is missing $name"
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $restored).Hash -ne $expectedBefore[$name]) {
      throw "Backup hash mismatch for $name"
    }
  }

  if (-not $SkipPackageManager) {
    $env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
    $dsh = Join-Path $env:APPDATA 'npm\dsh.cmd'
    if (-not (Test-Path -LiteralPath $dsh -PathType Leaf)) {
      throw "DSH command does not exist: $dsh"
    }
    $listed = (& $dsh plugin --profile $ProfileName list 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to read the current plugin list.' }
    if ($listed -match '(?m)^.*dsh-codex-tools@') {
      & $dsh plugin --profile $ProfileName remove dsh-codex-tools
      if ($LASTEXITCODE -ne 0) { throw 'DSH package removal failed.' }
    }
  }

  foreach ($name in $expectedBefore.Keys) {
    Copy-Item -LiteralPath (Join-Path $extract $name) -Destination (Join-Path $profileFull $name) -Force
  }

  $verified = @{}
  foreach ($name in $expectedBefore.Keys) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $profileFull $name)).Hash
    if ($hash -ne $expectedBefore[$name]) { throw "Restored hash mismatch for $name" }
    $verified[$name] = $hash
  }

  if (-not $SkipPackageManager) {
    $listedAfter = (& $dsh plugin --profile $ProfileName list 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to verify the plugin list after rollback.' }
    if ($listedAfter -match '(?m)^.*dsh-codex-tools@') { throw 'Plugin remains in the profile after rollback.' }
  }

  [ordered]@{
    ok = $true
    profile = $profileFull
    package_manager_executed = -not $SkipPackageManager
    restored_hashes = $verified
  } | ConvertTo-Json -Depth 4
}
finally {
  if ((Test-Path -LiteralPath $extract) -and $extract.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $extract -Recurse -Force
  }
}
