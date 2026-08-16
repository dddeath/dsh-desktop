[CmdletBinding()]
param(
  [string]$ProfileName = 'web',
  [string]$ProfilePath = 'C:\Users\19739\.dsh\profiles\web',
  [switch]$SkipPackageManager
)

$ErrorActionPreference = 'Stop'
$profileFull = [IO.Path]::GetFullPath($ProfilePath)
$snapshotProfile = Join-Path $PSScriptRoot 'current-profile'
$snapshotPlugin = Join-Path $PSScriptRoot 'current-plugin'
$pluginPath = Join-Path $profileFull 'node_modules\dsh-codex-tools'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\plugin-file-manifest-current.json') -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not $SkipPackageManager) {
  $expectedProfile = [IO.Path]::GetFullPath((Join-Path $HOME ".dsh\profiles\$ProfileName"))
  if (-not $profileFull.Equals($expectedProfile, [StringComparison]::OrdinalIgnoreCase)) {
    throw "ProfilePath must resolve to $expectedProfile when package-manager restore is enabled"
  }
  $env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
  $dsh = Join-Path $env:APPDATA 'npm\dsh.cmd'
  & $dsh plugin --profile $ProfileName add dsh-codex-tools@1.0.1
  if ($LASTEXITCODE -ne 0) { throw "Plugin add failed: exit=$LASTEXITCODE" }
}

New-Item -ItemType Directory -Force -Path $profileFull,$pluginPath | Out-Null
Copy-Item -LiteralPath (Join-Path $snapshotProfile 'package.json') -Destination (Join-Path $profileFull 'package.json') -Force
Copy-Item -LiteralPath (Join-Path $snapshotProfile 'pnpm-lock.yaml') -Destination (Join-Path $profileFull 'pnpm-lock.yaml') -Force
Copy-Item -Path (Join-Path $snapshotPlugin '*') -Destination $pluginPath -Recurse -Force

foreach ($entry in $manifest) {
  $target = Join-Path $pluginPath $entry.path.Replace('/', '\')
  $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $entry.sha256) { throw "Restored plugin hash mismatch: $($entry.path)" }
}
foreach ($name in 'package.json','pnpm-lock.yaml') {
  $target = Join-Path $profileFull $name
  $snapshot = Join-Path $snapshotProfile $name
  $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
  $snapshotHash = (Get-FileHash -LiteralPath $snapshot -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($targetHash -ne $snapshotHash) { throw "Restored profile hash mismatch: $name" }
}

if (-not $SkipPackageManager) {
  $listed = (& $dsh plugin --profile $ProfileName list 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0 -or $listed -notmatch 'dsh-codex-tools@1\.0\.1') {
    throw 'Restored plugin is not listed as dsh-codex-tools@1.0.1'
  }
}
Write-Output "PACKAGE_MANAGER_EXECUTED=$(-not $SkipPackageManager)"
Write-Output "RESTORED_PLUGIN_FILES=$($manifest.Count)"
Write-Output 'RESTART_REQUIRED=true'
Write-Output 'RESTORE_OK=true'
