[CmdletBinding()]
param(
  [string]$PluginRoot = 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools',
  [string]$SessionWorkspace = 'E:\deepseek_workspace\pro1',
  [string]$ServiceWorkspace = 'E:\deepseek_harness'
)

$ErrorActionPreference = 'Stop'
$node = 'C:\Program Files\nodejs\node.exe'
$evidence = Join-Path $PSScriptRoot 'evidence'
$modified = Join-Path $PSScriptRoot 'modified'
$baseline = Get-Content -LiteralPath (Join-Path $evidence 'baseline.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Assert-EqualHash {
  param([string]$Actual, [string]$Expected, [string]$Role)
  $actualHash = (Get-FileHash -LiteralPath $Actual -Algorithm SHA256).Hash.ToLowerInvariant()
  $expectedHash = (Get-FileHash -LiteralPath $Expected -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) { throw "$Role modified snapshot mismatch: actual=$actualHash expected=$expectedHash" }
  Write-Output "MODIFIED_ROLE=$Role SHA256=$actualHash"
}

$tools = Join-Path $PluginRoot 'tools.js'
$common = Join-Path $PluginRoot 'scripts\codex-common.mjs'
$imagegen = Join-Path $PluginRoot 'scripts\codex-imagegen.mjs'
$vision = Join-Path $PluginRoot 'scripts\codex-vision.mjs'

Assert-EqualHash $tools (Join-Path $modified 'tools.js') 'tools'
Assert-EqualHash $common (Join-Path $modified 'codex-common.mjs') 'codex-common'
Assert-EqualHash $imagegen (Join-Path $modified 'codex-imagegen.mjs') 'codex-imagegen'

foreach ($pair in @(
  @{ Name = 'TOOLS'; Path = $tools },
  @{ Name = 'COMMON'; Path = $common },
  @{ Name = 'IMAGEGEN'; Path = $imagegen },
  @{ Name = 'VISION'; Path = $vision }
)) {
  & $node --check $pair.Path
  $exit = $LASTEXITCODE
  Write-Output "NODE_CHECK_$($pair.Name)_EXIT=$exit"
  if ($exit -ne 0) { throw "Node syntax check failed: $($pair.Path)" }
}

$fixtureOutput = & $node (Join-Path $evidence 'test-workspace-binding.mjs') 2>&1
$fixtureExit = $LASTEXITCODE
$fixtureOutput | ForEach-Object { Write-Output $_ }
Write-Output "FIXTURE_EXIT=$fixtureExit"
if ($fixtureExit -ne 0 -or (($fixtureOutput -join "`n") -notmatch 'WORKSPACE_BINDING_TEST=true')) {
  throw 'Session workspace binding fixture failed.'
}

$probe = Join-Path $SessionWorkspace 'output\imagegen\.workspace-root-verify-probe'
$serviceProbe = Join-Path $ServiceWorkspace 'output\imagegen\.workspace-root-verify-probe'
if (Test-Path -LiteralPath $serviceProbe) { throw "Service-root probe collision: $serviceProbe" }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $probe) | Out-Null
Set-Content -LiteralPath $probe -Value 'workspace-root-verify-probe' -NoNewline -Encoding UTF8
try {
  $old = @{}
  foreach ($name in 'DSH_WORKSPACE_ROOT','CG_PROMPT','CG_OUT','CG_SIZE','CG_FORMAT') { $old[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
  $env:DSH_WORKSPACE_ROOT = $SessionWorkspace
  $env:CG_PROMPT = 'workspace root preflight verification'
  $env:CG_OUT = 'output/imagegen/.workspace-root-verify-probe'
  $env:CG_SIZE = '1024x1024'
  $env:CG_FORMAT = 'png'
  $childOutput = & $node $imagegen 2>&1
  $childExit = $LASTEXITCODE
  Write-Output "CHILD_PREFLIGHT=$($childOutput -join '')"
  Write-Output "CHILD_PREFLIGHT_EXIT=$childExit"
  Write-Output "SESSION_PROBE_EXISTS=$([bool](Test-Path -LiteralPath $probe))"
  Write-Output "SERVICE_PROBE_EXISTS=$([bool](Test-Path -LiteralPath $serviceProbe))"
  if ($childExit -ne 1 -or (($childOutput -join "`n") -notmatch 'output_exists')) { throw 'Child preflight did not use the session workspace.' }
} finally {
  foreach ($name in $old.Keys) { [Environment]::SetEnvironmentVariable($name, $old[$name], 'Process') }
  if (Test-Path -LiteralPath $probe) { [IO.File]::Delete($probe) }
}

$recovered = $baseline.expected_path
if (-not (Test-Path -LiteralPath $recovered -PathType Leaf)) { throw "Recovered image missing: $recovered" }
$item = Get-Item -LiteralPath $recovered
$hash = (Get-FileHash -LiteralPath $recovered -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "RECOVERED_PATH=$recovered"
Write-Output "RECOVERED_BYTES=$($item.Length)"
Write-Output "RECOVERED_SHA256=$hash"
if ($item.Length -ne $baseline.bytes -or $hash -ne $baseline.sha256) { throw 'Recovered image integrity mismatch.' }

$http = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10).StatusCode
Write-Output "HTTP_STATUS=$http"
if ($http -ne 200) { throw "Unexpected HTTP status: $http" }

Write-Output 'VERIFY_OK=true'
