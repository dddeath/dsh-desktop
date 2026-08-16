param(
  [string]$Node = 'C:\Program Files\nodejs\node.exe',
  [string]$BaseUrl = 'http://127.0.0.1:3080'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$summaryPath = Join-Path $PSScriptRoot 'inventory-summary.json'
$inventoryPath = Join-Path $PSScriptRoot 'evidence\inventory.json'
$hashPath = Join-Path $PSScriptRoot 'evidence\snapshot.sha256'
$reportPath = Join-Path $PSScriptRoot 'plugin-inventory-analysis.md'

if (-not (Test-Path -LiteralPath $Node)) { throw "Node missing: $Node" }

& $Node -e @'
const fs = require('fs')
const summary = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'))
const inventory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const tools = inventory.runtime.tools.map((tool) => tool.name)
const unique = new Set(tools)
if (summary.counts.declaredDependencies !== 15) throw new Error('dependency count')
if (inventory.dependencies.length !== 15) throw new Error('inventory dependency count')
if (summary.counts.runtimeBootEntries !== inventory.runtime.bootEntries.length) throw new Error('boot count')
if (tools.length !== 5 || unique.size !== tools.length) throw new Error('tool names')
if (!summary.runtime.disabledSkins.includes('dsh-arknights')) throw new Error('disabled skin')
if (!summary.plugins.some((p) => p.name === 'dsh-deep-whale' && p.runtimeStatus === 'dependency-only')) throw new Error('meta dependency state')
console.log(`JSON_OK=true DEPENDENCIES=${inventory.dependencies.length} BOOT_ENTRIES=${inventory.runtime.bootEntries.length} TOOLS=${tools.length} UNIQUE_TOOLS=${unique.size}`)
'@ $summaryPath $inventoryPath
if ($LASTEXITCODE -ne 0) { throw "JSON verification exited $LASTEXITCODE" }

$report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8
$summary = Get-Content -LiteralPath $summaryPath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($plugin in $summary.plugins) {
  if (-not $report.Contains($plugin.name)) { throw "Report missing plugin: $($plugin.name)" }
}
Write-Output "REPORT_OK=true PLUGINS=$($summary.plugins.Count)"

$hashLines = Get-Content -LiteralPath $hashPath -Encoding UTF8
foreach ($line in $hashLines) {
  if (-not $line.Trim()) { continue }
  $parts = $line -split '\s+', 2
  $candidate = Join-Path $root ($parts[1] -replace '/', '\')
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash.ToLowerInvariant()
  if ($actual -ne $parts[0]) { throw "Hash mismatch: $candidate" }
}
Write-Output "HASH_OK=true FILES=$($hashLines.Count)"

$homeResponse = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/" -TimeoutSec 10
$toolInventory = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/__dsh-desktop-ui-compat/agent-tools" -TimeoutSec 10
if ($homeResponse.StatusCode -ne 200 -or $toolInventory.StatusCode -ne 200) { throw 'HTTP health' }
Write-Output "HTTP_OK=true HOME=$($homeResponse.StatusCode) TOOLS=$($toolInventory.StatusCode)"
Write-Output 'VERIFY_EXIT=0'
