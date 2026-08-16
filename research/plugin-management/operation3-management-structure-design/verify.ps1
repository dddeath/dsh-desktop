param(
  [string]$BaseUrl = 'http://127.0.0.1:3080'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$contractPath = Join-Path $PSScriptRoot 'management-contract.json'
$planPath = Join-Path $PSScriptRoot 'management-structure-plan.md'
$pngPath = Join-Path $PSScriptRoot 'mockup\management-center.png'
$probePath = Join-Path $PSScriptRoot 'evidence\service-probe.json'
$beforePath = Join-Path $PSScriptRoot 'evidence\profile-before.json'

$contract = Get-Content -LiteralPath $contractPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($contract.placement.slot -ne 'settings.plugins.tab' -or $contract.placement.order -ne 20) {
  throw 'Invalid settings placement contract'
}
if ($contract.actionPolicy.updateAll -ne $false -or $contract.actionPolicy.singleActionOnly -ne $true) {
  throw 'Invalid action protection contract'
}
if ($contract.protectedPackages.Count -ne 4) { throw 'Protected package set drifted' }
Write-Output "CONTRACT_OK=true TAB=$($contract.placement.id) ORDER=$($contract.placement.order) PROTECTED=$($contract.protectedPackages.Count)"

$plan = Get-Content -LiteralPath $planPath -Raw -Encoding UTF8
foreach ($required in @('dsh-plugin-control-center', 'dsh-desktop-ui-compat', 'dsh-codex-tools', '/dsh-market/updates', 'settings.plugins.tab', 'dshmarket', 'pnpm')) {
  if (-not $plan.Contains($required)) { throw "Plan missing requirement: $required" }
}
Write-Output 'PLAN_OK=true REQUIRED_FIELDS=7'

Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile($pngPath)
try {
  if ($image.Width -ne 1600 -or $image.Height -ne 1000) { throw "Unexpected mockup dimensions: $($image.Width)x$($image.Height)" }
  Write-Output "MOCKUP_OK=true WIDTH=$($image.Width) HEIGHT=$($image.Height)"
} finally {
  $image.Dispose()
}

$probe = Get-Content -LiteralPath $probePath -Raw -Encoding UTF8 | ConvertFrom-Json
if (($probe.rows | Where-Object { $_.status -ne 200 }).Count -ne 0) { throw 'Service probe contains a non-200 response' }
$installed = $probe.rows | Where-Object { $_.path -eq '/dsh-market/installed' }
$updates = $probe.rows | Where-Object { $_.path -eq '/dsh-market/updates' }
$tools = $probe.rows | Where-Object { $_.path -eq '/__dsh-desktop-ui-compat/agent-tools' }
if ($installed.installedCount -ne 15 -or $updates.updateCount -ne 4 -or $tools.toolCount -ne 5) { throw 'Service probe counts drifted' }
Write-Output "SERVICES_OK=true HTTP=200 INSTALLED=$($installed.installedCount) UPDATES=$($updates.updateCount) TOOLS=$($tools.toolCount)"

$before = Get-Content -LiteralPath $beforePath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($row in $before.files) {
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $row.file).Hash.ToLowerInvariant()
  if ($actual -ne $row.sha256) { throw "Live profile changed during Operation 2: $($row.file)" }
}
Write-Output "PROFILE_UNCHANGED=true FILES=$($before.files.Count)"

$homeResponse = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/" -TimeoutSec 10
$market = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/dsh-market/status" -TimeoutSec 10
if ($homeResponse.StatusCode -ne 200 -or $market.StatusCode -ne 200) { throw 'Live health check failed' }
Write-Output "LIVE_HTTP_OK=true HOME=$($homeResponse.StatusCode) MARKET=$($market.StatusCode)"
Write-Output 'VERIFY_EXIT=0'
