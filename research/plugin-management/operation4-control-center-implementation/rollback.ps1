[CmdletBinding()]
param(
  [string]$ProfileRoot = 'C:\Users\19739\.dsh\profiles\web',
  [string]$PluginRoot = 'E:\deepseek_harness\plugins\plugin-control-center',
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json',
  [switch]$SkipInstall,
  [switch]$RestoreWorkspace
)

$ErrorActionPreference = 'Stop'
$ProfileRoot = [IO.Path]::GetFullPath($ProfileRoot)
$PluginRoot = [IO.Path]::GetFullPath($PluginRoot)
$StateTarget = [IO.Path]::GetFullPath($StateTarget)
$Original = Join-Path $PSScriptRoot 'original'

$ExpectedModified = @{
  Package = 'CC8B82C9C5AFB4C616484292A41E59CB5D6008FB74BF79ADEE138D61C7E0CCEE'
  Lock = '6747E099BA23F07CB5D94D693D24DD0EA517B7AD2A3215DAC6E3DB42DE698131'
  Patch = '803B183C9B487A26981FEEA690D22C942A8DE4899D6E671E03429763C949D354'
  State = '9083C2A7546CF3A8D79D996DD05377A10A9EE1B2058968FEE4FCCB13BC795049'
}
$ExpectedOriginal = @{
  Package = 'B47943F6F707DA9A34B106D3353169A63C540A4505912010C64544E7FE8CF1D6'
  Lock = '386782CE50A4C6E32AEE8E9BDE3B84C46046FB83380654B927651C26950DA771'
  Patch = '9374D4607541E9FDDFCCC1B0B2E841BA10CA2D595D9B0C7AA3B53844FE23A5C8'
  State = '1CB877BDFF81A60197B305166FA2267EADE5884A61E07F70247288FDA516F0C2'
}
$PluginHashes = @{
  'package.json' = '839F974F5FBA9CDD375F3B4B620F12A5EB59F8968C40A512023D37378722A173'
  'cordis.patch.yml' = 'AE55167CE0C2A35D749CD73A5F41429A5EDF6BE5308F203293AC7440BBBDB74D'
  'lib\index.js' = '0549732026485B3B474CEF818F4479528F236A5562D980162B238CF3A211DD21'
  'lib\client.js' = '386D19B7B44CBDD176C6D3D18245AC6B913F656C7E4A8EB4AF4780F481201BD0'
  'README.md' = '435187229F5971910D323A7E77604CA5FB0245915F0096E26B27AB5AE1766ACB'
}

function Assert-Hash([string]$Path, [string]$Expected, [string]$Role) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "ROLLBACK GUARD: missing $Role at $Path" }
  $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
  if ($actual -ne $Expected) { throw "ROLLBACK GUARD: $Role hash drift: $actual" }
}

$packageFile = Join-Path $ProfileRoot 'package.json'
$lockFile = Join-Path $ProfileRoot 'pnpm-lock.yaml'
$patchFile = Join-Path $ProfileRoot 'cordis.patch.yml'
Assert-Hash $packageFile $ExpectedModified.Package 'modified profile package'
Assert-Hash $lockFile $ExpectedModified.Lock 'modified profile lock'
Assert-Hash $patchFile $ExpectedModified.Patch 'modified profile patch'

Copy-Item -LiteralPath (Join-Path $Original 'profile\package.json') -Destination $packageFile -Force
Copy-Item -LiteralPath (Join-Path $Original 'profile\pnpm-lock.yaml') -Destination $lockFile -Force
Copy-Item -LiteralPath (Join-Path $Original 'profile\cordis.patch.yml') -Destination $patchFile -Force

if (-not $SkipInstall) {
  $env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
  & (Join-Path $env:APPDATA 'npm\dsh.cmd') plugin --profile web install --offline --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw "ROLLBACK: profile install exited $LASTEXITCODE" }
}

Assert-Hash $packageFile $ExpectedOriginal.Package 'restored profile package'
Assert-Hash $lockFile $ExpectedOriginal.Lock 'restored profile lock'
Assert-Hash $patchFile $ExpectedOriginal.Patch 'restored profile patch'

if ($RestoreWorkspace) {
  Assert-Hash $StateTarget $ExpectedModified.State 'modified state'
  Copy-Item -LiteralPath (Join-Path $Original 'STATE.json') -Destination $StateTarget -Force
  Assert-Hash $StateTarget $ExpectedOriginal.State 'restored state'

  $repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
  if (-not $PluginRoot.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $PluginRoot -Leaf) -ne 'plugin-control-center') {
    throw "ROLLBACK GUARD: plugin path is outside the intended repository leaf: $PluginRoot"
  }
  foreach ($entry in $PluginHashes.GetEnumerator()) {
    Assert-Hash (Join-Path $PluginRoot $entry.Key) $entry.Value "plugin source $($entry.Key)"
  }
  Remove-Item -LiteralPath $PluginRoot -Recurse -Force
  if (Test-Path -LiteralPath $PluginRoot) { throw 'ROLLBACK: plugin source still exists' }
}

[pscustomobject]@{
  result = 'ROLLBACK PASS'
  profile = $ProfileRoot
  workspaceRestored = [bool]$RestoreWorkspace
  installExecuted = -not [bool]$SkipInstall
  restartRequired = $true
}
