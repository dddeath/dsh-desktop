[CmdletBinding()]
param(
  [string]$WorkspaceRoot,
  [string]$Url = 'http://127.0.0.1:3080/'
)

$ErrorActionPreference = 'Stop'
if (-not $WorkspaceRoot) { $WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
$client = Join-Path $WorkspaceRoot 'themes\maid-atelier-fix\lib\client.js'
$package = Join-Path $WorkspaceRoot 'themes\maid-atelier-fix\package.json'
$metricsPath = Join-Path $PSScriptRoot 'evidence\layout-metrics.json'
$programFiles = if ($env:ProgramFiles) { $env:ProgramFiles } else { 'C:\Program Files' }
$nodeFallback = Join-Path $programFiles 'nodejs\node.exe'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$node = if ($nodeCommand) { $nodeCommand.Source } elseif (Test-Path -LiteralPath $nodeFallback) { $nodeFallback } else { throw 'node.exe was not found' }

& $node --check $client
if ($LASTEXITCODE -ne 0) { throw "client node check failed: $LASTEXITCODE" }
Write-Output 'CLIENT_NODE_CHECK_EXIT=0'

$manifest = Get-Content -LiteralPath $package -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.version -ne '0.2.3') { throw "unexpected theme version: $($manifest.version)" }
Write-Output "THEME_VERSION=$($manifest.version)"

$source = Get-Content -LiteralPath $client -Raw -Encoding UTF8
$required = @(
  "flex: 0 0 38px !important;",
  "width: 38px !important;",
  "min-width: 38px !important;",
  "max-width: 38px !important;",
  "padding-inline: 0 !important;",
  ":is([class*='_triggerLabel'], [class*='_chevron'])",
  "display: none !important;"
)
foreach ($marker in $required) {
  if (-not $source.Contains($marker)) { throw "missing permission style marker: $marker" }
}
Write-Output 'PERMISSION_ICON_ONLY_RULE=true'

$metrics = Get-Content -LiteralPath $metricsPath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($state in @('open', 'collapsed')) {
  $value = $metrics.modified.$state
  if ($value.button_width -ne 38 -or $value.button_height -ne 36 -or $value.padding_inline -ne '0px' -or $value.label_display -ne 'none') {
    throw "layout metrics mismatch for $state"
  }
  Write-Output "LAYOUT_STATE=$state WIDTH=$($value.button_width) HEIGHT=$($value.button_height) PADDING=$($value.padding_inline) LABEL=$($value.label_display)"
}

Add-Type -AssemblyName System.Drawing
foreach ($name in @('acceptance-open-sidebar.jpg', 'acceptance-collapsed-sidebar.jpg')) {
  $path = Join-Path $PSScriptRoot "evidence\$name"
  $image = [System.Drawing.Image]::FromFile($path)
  try { $size = "$($image.Width)x$($image.Height)" } finally { $image.Dispose() }
  Write-Output "SCREENSHOT=$name DECODE=true SIZE=$size"
}

$response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 10
if ([int]$response.StatusCode -ne 200) { throw "unexpected HTTP status: $($response.StatusCode)" }
Write-Output "HTTP_STATUS=$([int]$response.StatusCode)"
Write-Output 'VERIFY_OK=true'

