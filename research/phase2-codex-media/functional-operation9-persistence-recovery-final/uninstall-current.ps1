[CmdletBinding()]
param(
  [string]$ProfileName = 'web',
  [string]$ProfilePath = 'C:\Users\19739\.dsh\profiles\web',
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$expectedProfile = [IO.Path]::GetFullPath((Join-Path $HOME ".dsh\profiles\$ProfileName"))
$profileFull = [IO.Path]::GetFullPath($ProfilePath)
if (-not $profileFull.Equals($expectedProfile, [StringComparison]::OrdinalIgnoreCase)) {
  throw "ProfilePath must resolve to $expectedProfile"
}

$pluginPath = Join-Path $profileFull 'node_modules\dsh-codex-tools'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\plugin-file-manifest-current.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($entry in $manifest) {
  $target = Join-Path $pluginPath $entry.path.Replace('/', '\')
  $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $entry.sha256) { throw "Current plugin changed; uninstall stopped: $($entry.path)" }
}

$command = "dsh.cmd plugin --profile $ProfileName remove dsh-codex-tools"
Write-Output "UNINSTALL_COMMAND=$command"
if (-not $Execute) {
  Write-Output 'UNINSTALL_EXECUTED=false'
  Write-Output 'UNINSTALL_DRY_RUN_OK=true'
  return
}

$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
$dsh = Join-Path $env:APPDATA 'npm\dsh.cmd'
& $dsh plugin --profile $ProfileName remove dsh-codex-tools
if ($LASTEXITCODE -ne 0) { throw "Plugin removal failed: exit=$LASTEXITCODE" }
$listed = (& $dsh plugin --profile $ProfileName list 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'Post-uninstall plugin list failed' }
if ($listed -match 'dsh-codex-tools@') { throw 'Plugin remains listed after uninstall' }
Write-Output 'UNINSTALL_EXECUTED=true'
Write-Output 'RESTART_REQUIRED=true'
Write-Output 'UNINSTALL_OK=true'
