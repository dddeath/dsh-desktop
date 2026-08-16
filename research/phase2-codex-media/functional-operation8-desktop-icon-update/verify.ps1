[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = 'E:\deepseek_harness'
$desktop = Join-Path $root 'desktop'
$operation = $PSScriptRoot
$python = 'C:\Users\19739\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$source = Join-Path $operation 'source\1786892171127.png'
$png = Join-Path $desktop 'assets\icon.png'
$icoPath = Join-Path $desktop 'assets\icon.ico'
$exe = Join-Path $desktop 'dist-status\win-unpacked\DeepSeek Harness Desktop.exe'
$extracted = Join-Path $operation 'evidence\exe-associated-icon.png'

foreach ($pair in @(
  @($png, (Join-Path $operation 'modified\icon.png'), 'icon-png'),
  @($icoPath, (Join-Path $operation 'modified\icon.ico'), 'icon-ico'),
  @((Join-Path $root '.agent\STATE.json'), (Join-Path $operation 'modified\STATE.json'), 'state')
)) {
  $liveHash = (Get-FileHash -LiteralPath $pair[0] -Algorithm SHA256).Hash.ToLowerInvariant()
  $snapshotHash = (Get-FileHash -LiteralPath $pair[1] -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($liveHash -ne $snapshotHash) { throw "$($pair[2]) live/snapshot mismatch" }
  Write-Output "MODIFIED_ROLE=$($pair[2]) SHA256=$liveHash"
}

Add-Type -AssemblyName System.Drawing
$associated = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
try {
  $bitmap = $associated.ToBitmap()
  try { $bitmap.Save($extracted, [System.Drawing.Imaging.ImageFormat]::Png) }
  finally { $bitmap.Dispose() }
}
finally { $associated.Dispose() }

& $python (Join-Path $operation 'evidence\verify-icon-metadata.py') $source $png $icoPath $extracted
if ($LASTEXITCODE -ne 0) { throw "Icon metadata verification failed: exit=$LASTEXITCODE" }

$package = Get-Content -LiteralPath (Join-Path $desktop 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($package.build.win.icon -ne 'assets/icon.ico') { throw 'electron-builder icon field mismatch' }
$main = Get-Content -LiteralPath (Join-Path $desktop 'main.js') -Raw -Encoding UTF8
if ($main -notmatch 'assets"\s*,\s*"icon\.png') { throw 'BrowserWindow runtime icon reference mismatch' }
Write-Output 'CONFIG_RUNTIME_ICON=assets/icon.png'
Write-Output 'CONFIG_PACKAGE_ICON=assets/icon.ico'

foreach ($artifact in @(
  (Join-Path $desktop 'dist\DeepSeek-Harness-Desktop-0.1.0-portable.exe'),
  (Join-Path $desktop 'dist\DeepSeek-Harness-Desktop-Setup-0.1.0.exe'),
  (Join-Path $desktop 'dist-status\DeepSeek-Harness-Desktop-0.1.0-portable.exe'),
  $exe
)) {
  $item = Get-Item -LiteralPath $artifact
  $hash = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash.ToLowerInvariant()
  Write-Output "BUILD_ARTIFACT=$artifact BYTES=$($item.Length) SHA256=$hash"
}

$processCount = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $exe }).Count
if ($processCount -lt 1) { throw 'Rebuilt desktop process is not running' }
$http = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10).StatusCode
if ($http -ne 200) { throw "DSH HTTP status mismatch: $http" }
Write-Output "RUNNING_PROCESS_COUNT=$processCount"
Write-Output "HTTP_STATUS=$http"
Write-Output 'VERIFY_OK=true'
