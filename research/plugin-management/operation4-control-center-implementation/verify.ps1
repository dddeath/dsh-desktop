[CmdletBinding()]
param(
  [string]$ProfileRoot = 'C:\Users\19739\.dsh\profiles\web',
  [switch]$RequireLiveEndpoint
)

$ErrorActionPreference = 'Stop'
$RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$PluginRoot = Join-Path $RepoRoot 'plugins\plugin-control-center'
$Node = 'C:\Program Files\nodejs\node.exe'

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw "VERIFY FAIL: $Message" }
}

Assert-True (Test-Path -LiteralPath $Node) "Node runtime missing: $Node"
& $Node --check (Join-Path $PluginRoot 'lib\index.js')
Assert-True ($LASTEXITCODE -eq 0) 'host entry syntax'
& $Node --check (Join-Path $PluginRoot 'lib\client.js')
Assert-True ($LASTEXITCODE -eq 0) 'client entry syntax'

$client = Get-Content -LiteralPath (Join-Path $PluginRoot 'lib\client.js') -Raw
foreach ($needle in @('settings.plugins.tab', 'data-dsh-plugin-control-center', 'data-plugin-management-card', 'data-action-preview', 'text-shadow: none')) {
  Assert-True ($client.Contains($needle)) "client contract missing: $needle"
}
$badShadow = [regex]::Matches($client, 'text-shadow\s*:\s*([^;]+);') | Where-Object { $_.Groups[1].Value.Trim() -ne 'none !important' }
Assert-True ($badShadow.Count -eq 0) 'client contains a non-none text shadow'

$profileFile = Join-Path $ProfileRoot 'package.json'
$lockFile = Join-Path $ProfileRoot 'pnpm-lock.yaml'
$patchFile = Join-Path $ProfileRoot 'cordis.patch.yml'
$profile = Get-Content -LiteralPath $profileFile -Raw | ConvertFrom-Json
$bundles = @($profile.dsh.profile.bundles)
$controlIndex = [Array]::IndexOf($bundles, 'dsh-plugin-control-center')
$marketIndex = [Array]::IndexOf($bundles, 'dshmarket')
Assert-True ($profile.dependencies.'dsh-plugin-control-center' -eq 'link:E:/deepseek_harness/plugins/plugin-control-center') 'profile dependency link'
Assert-True ($controlIndex -eq ($marketIndex + 1)) 'control center must immediately follow dshmarket'
Assert-True ((Get-Content -LiteralPath $patchFile -Raw) -notmatch '(?m)^- id:\s*auto-continue') 'stale auto-continue patch still present'
Assert-True (Test-Path -LiteralPath $lockFile) 'profile lockfile missing'

$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
$dsh = Join-Path $env:APPDATA 'npm\dsh.cmd'
& $dsh --profile web --dump-config 2>&1 | Out-String | Tee-Object -Variable dump | Out-Null
Assert-True ($LASTEXITCODE -eq 0) 'composed profile dump'
Assert-True ($dump.Contains('name: dsh-plugin-control-center')) 'composed profile omits control center'

$liveChecked = $false
if ($RequireLiveEndpoint) {
  $root = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 8
  Assert-True ($root.StatusCode -eq 200) 'root HTTP status'
  Assert-True ($root.Content.Contains('"id":"dsh-plugin-control-center"')) 'boot manifest omits control center client'
  $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/__dsh-plugin-control-center/snapshot' -TimeoutSec 8
  Assert-True ($response.StatusCode -eq 200) 'snapshot HTTP status'
  Assert-True ([string]$response.Headers.'Content-Type' -match 'application/json') 'snapshot content type'
  $snapshot = $response.Content | ConvertFrom-Json
  Assert-True ($snapshot.ok -eq $true) 'snapshot envelope'
  Assert-True ($snapshot.value.actionMode -eq 'preview-only') 'operation 3 action boundary'
  Assert-True (@($snapshot.value.protectedPackages).Count -eq 4) 'protected package count'
  Assert-True (@($snapshot.value.plugins).Count -ge 15) 'managed plugin count'
  $liveChecked = $true
}

[pscustomobject]@{
  result = 'PASS'
  profile = $ProfileRoot
  controlCenterBundleIndex = $controlIndex
  immediatelyAfterDshmarket = $true
  actionMode = 'preview-only'
  liveEndpointChecked = $liveChecked
  packageSha256 = (Get-FileHash -LiteralPath $profileFile -Algorithm SHA256).Hash
  lockSha256 = (Get-FileHash -LiteralPath $lockFile -Algorithm SHA256).Hash
  patchSha256 = (Get-FileHash -LiteralPath $patchFile -Algorithm SHA256).Hash
}
