param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [switch]$SkipRuntime
)

$ErrorActionPreference = 'Stop'
$node = 'C:\Program Files\nodejs\node.exe'
$core = Join-Path $WorkspaceRoot 'themes\desktop-ui-compat'
$maid = Join-Path $WorkspaceRoot 'themes\maid-atelier-fix'

function Assert-True([bool]$Condition, [string]$Name) {
  if (-not $Condition) { throw "CHECK_FAILED=$Name" }
  "CHECK_PASS=$Name"
}

& $node --check (Join-Path $core 'lib\client.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $node --check (Join-Path $core 'lib\index.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $node --check (Join-Path $maid 'lib\client.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $node --check (Join-Path $maid 'lib\index.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
"SYNTAX_EXIT=0"

$coreClient = Get-Content (Join-Path $core 'lib\client.js') -Raw
$coreCss = Get-Content (Join-Path $core 'lib\client.css') -Raw
$maidClient = Get-Content (Join-Path $maid 'lib\client.js') -Raw
$maidIndex = Get-Content (Join-Path $maid 'lib\index.js') -Raw
$null = Get-Content (Join-Path $core 'package.json') -Raw | ConvertFrom-Json
$null = Get-Content (Join-Path $maid 'package.json') -Raw | ConvertFrom-Json

Assert-True ($coreCss.Contains("body[data-dsh-ui-compat]")) 'core-scoped'
Assert-True ($coreClient.Contains('ctx.on?.("theme/change", syncTheme)')) 'theme-change-sync'
Assert-True (-not ($coreCss -match 'data-dsh-maid-atelier|data-ds-dark-theme')) 'core-theme-neutral'
Assert-True ($coreClient.Contains('/__dsh-desktop-ui-compat/agent-tools')) 'core-agent-route'
Assert-True (-not $coreClient.Contains('function installCharacterAlignment')) 'core-no-character-controller'
Assert-True (($coreCss -match 'text-shadow:\s*none\s*!important') -and ($coreCss -match '-webkit-text-stroke:\s*0 transparent\s*!important')) 'runtime-plain-text'
Assert-True ($maidClient.Contains('const disposeCharacterAlignment = installCharacterAlignment()')) 'maid-character-controller'
Assert-True (-not $maidClient.Contains('installComposerEnhancements')) 'maid-no-generic-controller'
Assert-True (-not $maidClient.Contains("body [data-dsh-agent")) 'maid-no-global-agent-style'
Assert-True (-not $maidClient.Contains('body[data-dsh-responsive-band')) 'maid-no-global-band-style'
Assert-True ($maidIndex.Contains('export function apply() {}')) 'maid-no-host-route'

if (-not $SkipRuntime) {
  $route = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/__dsh-desktop-ui-compat/agent-tools' -TimeoutSec 10
  Assert-True ($route.StatusCode -eq 200) 'runtime-route-status'
  Assert-True ($route.Headers['Content-Type'] -like 'application/json*') 'runtime-route-json'
  $catalog = $route.Content | ConvertFrom-Json
  Assert-True (@($catalog.tools.name) -contains 'image_gen') 'runtime-image-gen'
  Assert-True (@($catalog.tools.name) -contains 'image_vision') 'runtime-image-vision'
  "RUNTIME_TOOL_COUNT=$($catalog.tools.Count)"

  $page = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10
  Assert-True ($page.Content.Contains('dsh-desktop-ui-compat')) 'boot-core-entry'
  Assert-True ($page.Content.Contains('dsh-maid-atelier-fix')) 'boot-maid-entry'
}

"VERIFY_EXIT=0"
