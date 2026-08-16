[CmdletBinding()]
param(
  [string]$ProfileName = 'web',
  [string]$ProfilePath = 'C:\Users\19739\.dsh\profiles\web'
)

$ErrorActionPreference = 'Stop'
$snapshotProfile = Join-Path $PSScriptRoot 'current-profile'
$snapshotPlugin = Join-Path $PSScriptRoot 'current-plugin'
$pluginPath = Join-Path $ProfilePath 'node_modules\dsh-codex-tools'
$pluginManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\plugin-file-manifest-current.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$profileManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\profile-hashes-current.json') -Raw -Encoding UTF8 | ConvertFrom-Json

foreach ($name in 'package.json','pnpm-lock.yaml') {
  $live = Join-Path $ProfilePath $name
  $snapshot = Join-Path $snapshotProfile $name
  $liveHash = (Get-FileHash -LiteralPath $live -Algorithm SHA256).Hash.ToLowerInvariant()
  $snapshotHash = (Get-FileHash -LiteralPath $snapshot -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($liveHash -ne $snapshotHash -or $liveHash -ne $profileManifest.$name.sha256) {
    throw "$name profile snapshot mismatch"
  }
  Write-Output "PROFILE_ROLE=$name SHA256=$liveHash"
}

foreach ($entry in $pluginManifest) {
  $relative = $entry.path.Replace('/', '\')
  $live = Join-Path $pluginPath $relative
  $snapshot = Join-Path $snapshotPlugin $relative
  $liveHash = (Get-FileHash -LiteralPath $live -Algorithm SHA256).Hash.ToLowerInvariant()
  $snapshotHash = (Get-FileHash -LiteralPath $snapshot -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($liveHash -ne $entry.sha256 -or $liveHash -ne $snapshotHash) {
    throw "Plugin snapshot mismatch: $relative"
  }
}
Write-Output "PLUGIN_SNAPSHOT_FILES=$($pluginManifest.Count)"

$pluginPackage = Get-Content -LiteralPath (Join-Path $pluginPath 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($pluginPackage.name -ne 'dsh-codex-tools' -or $pluginPackage.version -ne '1.0.1') {
  throw 'Installed plugin identity mismatch'
}
$tools = Get-Content -LiteralPath (Join-Path $pluginPath 'tools.js') -Raw -Encoding UTF8
foreach ($toolName in 'image_gen','image_vision','web_search') {
  if ($tools -notmatch [regex]::Escape($toolName)) { throw "Tool registration missing: $toolName" }
  Write-Output "TOOL_SOURCE_PRESENT=$toolName"
}

$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
$dsh = Join-Path $env:APPDATA 'npm\dsh.cmd'
$pluginList = (& $dsh plugin --profile $ProfileName list 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'Current plugin list failed' }
if ($pluginList -notmatch 'dsh-codex-tools@1\.0\.1') { throw 'dsh-codex-tools@1.0.1 is not listed' }
Write-Output 'PLUGIN_LISTED=dsh-codex-tools@1.0.1'

$profileText = (Get-Content -LiteralPath (Join-Path $ProfilePath 'package.json') -Raw -Encoding UTF8) + (Get-Content -LiteralPath (Join-Path $ProfilePath 'pnpm-lock.yaml') -Raw -Encoding UTF8)
$apiKeyReferences = [regex]::Matches($profileText, 'OPENAI_API_KEY|api[_-]?key', 'IgnoreCase').Count
if ($apiKeyReferences -ne 0) { throw "Unexpected API-key reference count: $apiKeyReferences" }
$authPath = Join-Path $HOME '.codex\auth.json'
if (-not (Test-Path -LiteralPath $authPath -PathType Leaf)) { throw 'Codex auth file missing' }
$auth = Get-Content -LiteralPath $authPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $auth.tokens.access_token -or -not $auth.tokens.refresh_token) { throw 'Codex OAuth token fields are absent' }
Write-Output 'PROFILE_API_KEY_REFERENCE_COUNT=0'
Write-Output 'CODEX_AUTH_FIELDS_PRESENT=true'
Write-Output 'AUTH_VALUES_RECORDED=false'

$generated = 'E:\deepseek_workspace\pro1\output\imagegen\1786892171127.png'
$generatedHash = (Get-FileHash -LiteralPath $generated -Algorithm SHA256).Hash.ToLowerInvariant()
if ($generatedHash -ne '9a0fdff8892c73c49b5e694d9b737826bc7b06ee5ed051ec624f112c3fb4f454') {
  throw 'Persisted generated image hash mismatch'
}
Write-Output "PERSISTED_IMAGE=$generated SHA256=$generatedHash"

$exe = 'E:\deepseek_harness\desktop\dist-status\win-unpacked\DeepSeek Harness Desktop.exe'
$processCount = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $exe }).Count
if ($processCount -lt 1) { throw 'Rebuilt desktop process is not running' }
$http = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10).StatusCode
if ($http -ne 200) { throw "DSH HTTP status mismatch: $http" }
Write-Output "RUNNING_PROCESS_COUNT=$processCount"
Write-Output "HTTP_STATUS=$http"
Write-Output 'PERSISTENCE_OK=true'
