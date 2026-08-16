[CmdletBinding()]
param(
  [string]$WorkspaceRoot,
  [string]$PluginTools = 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools\tools.js',
  [string]$ImagePath,
  [string]$Url = 'http://127.0.0.1:3080/'
)

$ErrorActionPreference = 'Stop'
if (-not $WorkspaceRoot) { $WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
if (-not $ImagePath) { $ImagePath = Join-Path $PSScriptRoot 'generated\internal-dsh-blue-whale-app-icon.png' }
$desktopMain = Join-Path $WorkspaceRoot 'desktop\main.js'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$programFiles = if ($env:ProgramFiles) { $env:ProgramFiles } else { 'C:\Program Files' }
$nodeFallback = Join-Path $programFiles 'nodejs\node.exe'
$node = if ($nodeCommand) { $nodeCommand.Source } elseif (Test-Path -LiteralPath $nodeFallback) { $nodeFallback } else { throw 'node.exe was not found' }

& $node --check $desktopMain
if ($LASTEXITCODE -ne 0) { throw "desktop node check failed: $LASTEXITCODE" }
Write-Output 'DESKTOP_NODE_CHECK_EXIT=0'

& $node --check $PluginTools
if ($LASTEXITCODE -ne 0) { throw "plugin node check failed: $LASTEXITCODE" }
Write-Output 'PLUGIN_NODE_CHECK_EXIT=0'

$desktopSource = Get-Content -LiteralPath $desktopMain -Raw -Encoding UTF8
if ($desktopSource -notmatch 'function buildDshChildEnv\(\)' -or $desktopSource -notmatch '"Git", "bin"' -or $desktopSource -notmatch '"nodejs"') {
  throw 'desktop PATH bootstrap markers are incomplete'
}
Write-Output 'DESKTOP_PATH_BOOTSTRAP=true'

$pluginSource = Get-Content -LiteralPath $PluginTools -Raw -Encoding UTF8
$wrappedScripts = ([regex]::Matches($pluginSource, 'JSON\.stringify\(shellScriptPath\(SCRIPT_(CODEX|VISION|SEARCH)\)\)')).Count
if ($wrappedScripts -ne 3) { throw "expected 3 normalized script paths, got $wrappedScripts" }
Write-Output "PLUGIN_NORMALIZED_SCRIPT_PATHS=$wrappedScripts"

$response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 10
if ([int]$response.StatusCode -ne 200) { throw "unexpected HTTP status: $($response.StatusCode)" }
Write-Output "HTTP_STATUS=$([int]$response.StatusCode)"

Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile($ImagePath)
try {
  $width = $image.Width
  $height = $image.Height
} finally {
  $image.Dispose()
}
$bytes = (Get-Item -LiteralPath $ImagePath).Length
$sha256 = (Get-FileHash -LiteralPath $ImagePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($bytes -ne 1637568 -or $sha256 -ne 'a65d0ad66224590e0a7fd14ea1228ed8a8c27c940a3685a7d0fd081c787a40f8') {
  throw "generated image mismatch: bytes=$bytes sha256=$sha256"
}
Write-Output "IMAGE_DECODE=true WIDTH=$width HEIGHT=$height BYTES=$bytes SHA256=$sha256"
Write-Output 'VERIFY_OK=true'
