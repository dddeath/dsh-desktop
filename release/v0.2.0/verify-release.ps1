param(
  [string]$RepoRoot = 'E:\deepseek_harness'
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath($RepoRoot)
$release = Join-Path $repo 'release\v0.2.0'
$dist = Join-Path $repo 'desktop\dist'
$node = 'C:\Program Files\nodejs\node.exe'
$asarCli = Join-Path $repo 'desktop\node_modules\@electron\asar\bin\asar.js'
$expectedVersion = '0.2.0'
$commands = @()

function Add-CommandRecord([string]$Command, [string]$LiteralOutput, [int]$ExitStatus) {
  $script:commands += [ordered]@{ command = $Command; literalOutput = $LiteralOutput; exitStatus = $ExitStatus }
}

function Get-PeMagic([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $first = $stream.ReadByte()
    $second = $stream.ReadByte()
    return [Text.Encoding]::ASCII.GetString([byte[]]@($first, $second))
  } finally {
    $stream.Dispose()
  }
}

$package = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repo 'desktop\package.json') | ConvertFrom-Json
if ($package.version -ne $expectedVersion) { throw "desktop version mismatch: $($package.version)" }
Add-CommandRecord 'parse desktop/package.json' "version=$($package.version)" 0

$syntaxFiles = @(
  'desktop\main.js',
  'desktop\dsh-process.js',
  'themes\maid-atelier-fix\lib\client.js',
  'themes\desktop-ui-compat\lib\client.js',
  'plugins\plugin-control-center\lib\client.js',
  'plugins\plugin-control-center\lib\profile-actions.js'
)
foreach ($relative in $syntaxFiles) {
  & $node --check (Join-Path $repo $relative)
  if ($LASTEXITCODE -ne 0) { throw "node --check failed: $relative" }
  Add-CommandRecord "node --check $relative" 'no output' 0
}

$portable = Join-Path $dist "DeepSeek-Harness-Desktop-$expectedVersion-portable.exe"
$installer = Join-Path $dist "DeepSeek-Harness-Desktop-Setup-$expectedVersion.exe"
$blockmap = "$installer.blockmap"
$unpackedExe = Join-Path $dist 'win-unpacked\DeepSeek Harness Desktop.exe'
$asar = Join-Path $dist 'win-unpacked\resources\app.asar'
$artifactPaths = @($portable, $installer, $blockmap, $unpackedExe, $asar)
foreach ($file in $artifactPaths) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "release artifact missing: $file" }
}
if ((Get-Item -LiteralPath $portable).Length -lt 50000000) { throw 'portable artifact is unexpectedly small' }
if ((Get-Item -LiteralPath $installer).Length -lt 50000000) { throw 'installer artifact is unexpectedly small' }
if ((Get-PeMagic $portable) -ne 'MZ' -or (Get-PeMagic $installer) -ne 'MZ' -or (Get-PeMagic $unpackedExe) -ne 'MZ') {
  throw 'one or more executable artifacts lack an MZ header'
}
Add-CommandRecord 'verify PE headers and minimum sizes' 'portable=MZ; installer=MZ; unpacked=MZ; size gates=PASS' 0

$asarList = & $node $asarCli list $asar
if ($LASTEXITCODE -ne 0) { throw 'asar list failed' }
$asarText = $asarList -join "`n"
foreach ($required in @('\main.js', '\dsh-process.js', '\assets\icon.ico', '\assets\icon.png', '\package.json')) {
  if (-not $asarText.Contains($required)) { throw "app.asar missing $required" }
}
Add-CommandRecord 'asar list desktop/dist/win-unpacked/resources/app.asar' 'main.js,dsh-process.js,icon.ico,icon.png,package.json present' 0

$http = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10
if ([int]$http.StatusCode -ne 200) { throw "Harness HTTP status $($http.StatusCode)" }
Add-CommandRecord 'GET http://127.0.0.1:3080/' "HTTP $([int]$http.StatusCode)" 0

$buildLog = Join-Path $release 'build.log'
if (-not (Select-String -LiteralPath $buildLog -Pattern 'BUILD_EXIT=0' -Quiet)) { throw 'build log lacks BUILD_EXIT=0' }
Add-CommandRecord 'npm.cmd run pack' 'BUILD_EXIT=0; portable and nsis targets built' 0

$artifactRecords = foreach ($file in $artifactPaths) {
  $item = Get-Item -LiteralPath $file
  $signature = if ($file.EndsWith('.exe', [StringComparison]::OrdinalIgnoreCase)) { Get-AuthenticodeSignature -LiteralPath $file } else { $null }
  $versionInfo = if ($file.EndsWith('.exe', [StringComparison]::OrdinalIgnoreCase)) { $item.VersionInfo } else { $null }
  [ordered]@{
    path = $item.FullName
    name = $item.Name
    bytes = $item.Length
    sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $item.FullName).Hash
    modifiedAt = $item.LastWriteTimeUtc.ToString('O')
    peMagic = if ($file.EndsWith('.exe', [StringComparison]::OrdinalIgnoreCase)) { Get-PeMagic $file } else { $null }
    fileVersion = if ($null -ne $versionInfo) { $versionInfo.FileVersion } else { $null }
    productVersion = if ($null -ne $versionInfo) { $versionInfo.ProductVersion } else { $null }
    signatureStatus = if ($null -ne $signature) { $signature.Status.ToString() } else { $null }
    signer = if ($null -ne $signature -and $null -ne $signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
  }
}

$manifest = [ordered]@{
  schemaVersion = 1
  version = $expectedVersion
  tag = 'v0.2.0'
  platform = 'win32-x64'
  generatedAt = (Get-Date).ToUniversalTime().ToString('O')
  artifacts = $artifactRecords
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $release 'artifact-manifest.json')

$verification = [ordered]@{
  schemaVersion = 1
  verifiedAt = (Get-Date).ToUniversalTime().ToString('O')
  result = 'PASS'
  version = $expectedVersion
  buildExit = 0
  commands = $commands
  checks = [ordered]@{
    packageVersion = $package.version
    syntaxFiles = $syntaxFiles.Count
    portablePe = 'MZ'
    installerPe = 'MZ'
    asarRequiredFiles = 5
    httpStatus = [int]$http.StatusCode
    artifactCount = $artifactRecords.Count
  }
  manifest = Join-Path $release 'artifact-manifest.json'
  rollback = Join-Path $release 'rollback.ps1'
}
$verification | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $release 'verification.json')
$verification | ConvertTo-Json -Depth 10
