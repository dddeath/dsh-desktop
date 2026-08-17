[CmdletBinding(SupportsShouldProcess)]
param(
  [switch]$SkipRestart,
  [switch]$SkipInstall,
  [string]$ProfilePath,
  [string]$CodexConfigPath
)

$ErrorActionPreference = 'Stop'
$Workspace = 'E:\deepseek_harness'
$Plugin = Join-Path $Workspace 'plugins\dsh-codex-bridge'
$DshProfile = if ($ProfilePath) { $ProfilePath } else { 'C:\Users\19739\.dsh\profiles\web' }
$DshBackup = 'C:\Users\19739\.dsh\backups\dsh-codex-bridge-20260817-205958'
$CodexConfig = if ($CodexConfigPath) { $CodexConfigPath } else { 'C:\Users\19739\.codex\config.toml' }
$CodexBackup = 'C:\Users\19739\.codex\backups\dsh-codex-bridge-20260817-205958\config.toml'
$Node = 'C:\Program Files\nodejs\node.exe'
$DshBin = 'C:\Users\19739\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js'

function Get-Sha256([string]$Path) {
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  $Hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($Bytes)
  return ([System.BitConverter]::ToString($Hash)).Replace('-', '')
}

foreach ($Path in @(
  (Join-Path $DshBackup 'package.json'),
  (Join-Path $DshBackup 'pnpm-lock.yaml'),
  $CodexBackup,
  (Join-Path $Plugin 'lib\dsh-client.js')
)) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Rollback input missing: $Path" }
}

$Expected = @{
  ProfilePackage = '3A241EC9B52A3BF24B65DD7AC3980C5A6CF49EE613A9F7E9E3034281BBA3CA50'
  ProfileLock = 'D8A76DD6B2760504FBF9A008D2FFEEEF8057AB747EAAE315D7F540D5FFF3B6E9'
  CodexConfig = '6F80D0D5A10B7466BEACD7AC4DE589B1801EBEC2B7F45F6CD7EB1F4DC93FD5F8'
}
$Actual = @{
  ProfilePackage = Get-Sha256 (Join-Path $DshBackup 'package.json')
  ProfileLock = Get-Sha256 (Join-Path $DshBackup 'pnpm-lock.yaml')
  CodexConfig = Get-Sha256 $CodexBackup
}
foreach ($Key in $Expected.Keys) {
  if ($Expected[$Key] -ne $Actual[$Key]) { throw "Rollback backup hash mismatch: $Key" }
}

if (-not $PSCmdlet.ShouldProcess('DSH web profile and Codex MCP config', 'restore pre-bridge backups')) {
  [pscustomobject]@{ WhatIf = $true; BackupHashes = $Actual; RestartSkipped = $SkipRestart }
  return
}

if (-not $SkipRestart) {
  & $Node --input-type=module -e "import('file:///$($Plugin.Replace('\','/'))/lib/dsh-client.js').then(m=>m.stopInstance({forceExternal:true})).then(x=>{console.log(JSON.stringify(x));if(!x.ok)process.exit(1)})"
  if ($LASTEXITCODE -ne 0) { throw 'Failed to stop DSH before rollback.' }
}

Copy-Item -LiteralPath (Join-Path $DshBackup 'package.json') -Destination (Join-Path $DshProfile 'package.json') -Force
Copy-Item -LiteralPath (Join-Path $DshBackup 'pnpm-lock.yaml') -Destination (Join-Path $DshProfile 'pnpm-lock.yaml') -Force
Copy-Item -LiteralPath $CodexBackup -Destination $CodexConfig -Force

if (-not $SkipInstall) {
  $env:Path = 'C:\Program Files\nodejs;' + $env:Path
  & $Node $DshBin plugin --profile web install --offline --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw 'DSH profile dependency restore failed.' }
}

if (-not $SkipRestart) {
  & $Node --input-type=module -e "import('file:///$($Plugin.Replace('\','/'))/lib/dsh-client.js').then(m=>m.startInstance({timeoutMs:90000})).then(x=>{console.log(JSON.stringify(x));if(!x.ok)process.exit(1)})"
  if ($LASTEXITCODE -ne 0) { throw 'DSH restart after rollback failed.' }
}

[pscustomobject]@{
  Restored = $true
  ProfilePackageHash = (Get-FileHash -LiteralPath (Join-Path $DshProfile 'package.json') -Algorithm SHA256).Hash
  ProfileLockHash = (Get-FileHash -LiteralPath (Join-Path $DshProfile 'pnpm-lock.yaml') -Algorithm SHA256).Hash
  CodexConfigHash = (Get-FileHash -LiteralPath $CodexConfig -Algorithm SHA256).Hash
  RestartSkipped = $SkipRestart
  InstallSkipped = $SkipInstall
}
