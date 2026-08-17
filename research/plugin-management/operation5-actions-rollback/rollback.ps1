[CmdletBinding()]
param(
  [string]$PluginRoot = 'E:\deepseek_harness\plugins\plugin-control-center',
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json',
  [switch]$RestoreState
)

$ErrorActionPreference = 'Stop'
$PluginRoot = [IO.Path]::GetFullPath($PluginRoot)
$StateTarget = [IO.Path]::GetFullPath($StateTarget)
$RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$Original = Join-Path $PSScriptRoot 'original\plugin'

if (-not $PluginRoot.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $PluginRoot -Leaf) -ne 'plugin-control-center') {
  throw "ROLLBACK GUARD: unexpected plugin root $PluginRoot"
}

function Assert-Hash([string]$Path, [string]$Expected, [string]$Role) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "ROLLBACK GUARD: missing $Role" }
  $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
  if ($actual -ne $Expected) { throw "ROLLBACK GUARD: $Role drift $actual" }
}

$packageFile = Join-Path $PluginRoot 'package.json'
$readmeFile = Join-Path $PluginRoot 'README.md'
$actionFile = Join-Path $PluginRoot 'lib\profile-actions.js'
Assert-Hash $packageFile 'DF28F1A78493AFF49DEB0F7330E98A161C0D1DA56A34988C25BCC442E12B6813' 'modified package'
Assert-Hash $readmeFile 'A855EB676EA85F0EC5B5F3EED89152A194E7271CB7C3D0F149ED2319619EBDFE' 'modified README'
Assert-Hash $actionFile '208F484CFAD4A0DA02816029809C9155F1C2B50CD7C1D1BBC0E979D47ABB3585' 'action engine'

Copy-Item -LiteralPath (Join-Path $Original 'package.json') -Destination $packageFile -Force
Copy-Item -LiteralPath (Join-Path $Original 'README.md') -Destination $readmeFile -Force
Remove-Item -LiteralPath $actionFile -Force

Assert-Hash $packageFile '839F974F5FBA9CDD375F3B4B620F12A5EB59F8968C40A512023D37378722A173' 'restored package'
Assert-Hash $readmeFile '435187229F5971910D323A7E77604CA5FB0245915F0096E26B27AB5AE1766ACB' 'restored README'
if (Test-Path -LiteralPath $actionFile) { throw 'ROLLBACK: action engine still exists' }

if ($RestoreState) {
  Assert-Hash $StateTarget '0152ECC98C3935E2CDBE16C61C1122E6A372D4BA1C7D39CCFB09E5B2C6B6E0C1' 'modified state'
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'original\STATE.json') -Destination $StateTarget -Force
  Assert-Hash $StateTarget '90D3EDF3FA282452ABD9B89F80A58549FF42A6509BD277598AAFF7A3D542D80B' 'restored state'
}

[pscustomobject]@{
  result = 'ROLLBACK PASS'
  pluginRoot = $PluginRoot
  actionEngineRemoved = $true
  stateRestored = [bool]$RestoreState
  profileChanged = $false
}
