[CmdletBinding()]
param(
  [string]$PluginRoot = 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools'
)

$ErrorActionPreference = 'Stop'
$node = 'C:\Program Files\nodejs\node.exe'
$modified = Join-Path $PSScriptRoot 'modified'
$evidence = Join-Path $PSScriptRoot 'evidence'

function Assert-Snapshot {
  param([string]$Actual, [string]$Expected, [string]$Role)
  $a = (Get-FileHash -LiteralPath $Actual -Algorithm SHA256).Hash.ToLowerInvariant()
  $b = (Get-FileHash -LiteralPath $Expected -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($a -ne $b) { throw "$Role installed file differs from modified snapshot" }
  Write-Output "MODIFIED_ROLE=$Role SHA256=$a"
}

$roles = @(
  @{ Role='tools'; Actual=(Join-Path $PluginRoot 'tools.js'); Expected=(Join-Path $modified 'tools.js') },
  @{ Role='codex-common'; Actual=(Join-Path $PluginRoot 'scripts\codex-common.mjs'); Expected=(Join-Path $modified 'codex-common.mjs') },
  @{ Role='codex-imagegen'; Actual=(Join-Path $PluginRoot 'scripts\codex-imagegen.mjs'); Expected=(Join-Path $modified 'codex-imagegen.mjs') },
  @{ Role='codex-vision'; Actual=(Join-Path $PluginRoot 'scripts\codex-vision.mjs'); Expected=(Join-Path $modified 'codex-vision.mjs') },
  @{ Role='codex-search'; Actual=(Join-Path $PluginRoot 'scripts\codex-search.mjs'); Expected=(Join-Path $modified 'codex-search.mjs') }
)
foreach ($role in $roles) {
  Assert-Snapshot $role.Actual $role.Expected $role.Role
  & $node --check $role.Actual
  $exit = $LASTEXITCODE
  Write-Output "NODE_CHECK_$($role.Role.ToUpper().Replace('-','_'))_EXIT=$exit"
  if ($exit -ne 0) { throw "Node syntax check failed: $($role.Actual)" }
}

$publication = & $node (Join-Path $evidence 'test-staged-publication.mjs') 2>&1
$publicationExit = $LASTEXITCODE
$publication | ForEach-Object { Write-Output $_ }
Write-Output "PUBLICATION_FIXTURE_EXIT=$publicationExit"
if ($publicationExit -ne 0 -or (($publication -join "`n") -notmatch 'STAGED_PUBLICATION_TEST=true')) { throw 'Publication fixture failed.' }

$result = Get-Content -LiteralPath (Join-Path $evidence 'successful-internal-result.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$path = $result.absolutePath
if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Live output missing: $path" }
$item = Get-Item -LiteralPath $path
$sha = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile($path)
try { $width=$image.Width; $height=$image.Height } finally { $image.Dispose() }
Write-Output "LIVE_OUTPUT=$path"
Write-Output "LIVE_BYTES=$($item.Length)"
Write-Output "LIVE_SIZE=${width}x${height}"
Write-Output "LIVE_SHA256=$sha"
Write-Output "LIVE_FILE_WRITTEN=$($result.fileWritten)"
if (-not $result.ok -or -not $result.fileWritten -or $item.Length -ne $result.bytes -or $sha -ne $result.sha256 -or $width -ne $result.width -or $height -ne $result.height) { throw 'Live output integrity mismatch.' }

$acceptance = Join-Path $evidence 'acceptance-internal-success.png'
$acceptanceImage = [System.Drawing.Image]::FromFile($acceptance)
try { Write-Output "ACCEPTANCE_SCREENSHOT=true SIZE=$($acceptanceImage.Width)x$($acceptanceImage.Height)" } finally { $acceptanceImage.Dispose() }
$http = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10).StatusCode
Write-Output "HTTP_STATUS=$http"
if ($http -ne 200) { throw "Unexpected HTTP status: $http" }
Write-Output 'VERIFY_OK=true'
