[CmdletBinding()]
param(
  [string]$AssetRoot = 'E:\deepseek_harness\desktop\assets',
  [string]$StateTarget = 'E:\deepseek_harness\.agent\STATE.json',
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$original = Join-Path $PSScriptRoot 'original'
$hashes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\baseline-hashes.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Restore-And-Verify {
  param([string]$Source, [string]$Target, [string]$Expected, [string]$Role)
  $parent = Split-Path -Parent $Target
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "$Role target parent is missing: $parent" }
  Copy-Item -LiteralPath $Source -Destination $Target -Force
  $actual = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Expected) { throw "$Role rollback hash mismatch: expected=$Expected actual=$actual" }
  Write-Output "ROLLBACK_ROLE=$Role PATH=$Target SHA256=$actual"
}

Restore-And-Verify (Join-Path $original 'icon.png') (Join-Path $AssetRoot 'icon.png') $hashes.'icon.png' 'icon-png'
Restore-And-Verify (Join-Path $original 'icon.ico') (Join-Path $AssetRoot 'icon.ico') $hashes.'icon.ico' 'icon-ico'
Restore-And-Verify (Join-Path $original 'STATE.json') $StateTarget $hashes.'STATE.json' 'state'

if ($Rebuild) {
  $desktopRoot = Split-Path -Parent $AssetRoot
  $expectedDesktop = [IO.Path]::GetFullPath('E:\deepseek_harness\desktop')
  if ([IO.Path]::GetFullPath($desktopRoot) -ne $expectedDesktop) { throw 'Rebuild is restricted to the real desktop root' }
  $runtimeExe = Join-Path $desktopRoot 'dist-status\win-unpacked\DeepSeek Harness Desktop.exe'
  Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $runtimeExe } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
  }
  $env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
  $builder = Join-Path $desktopRoot 'node_modules\.bin\electron-builder.cmd'
  & $builder --win
  if ($LASTEXITCODE -ne 0) { throw "Default rebuild failed: exit=$LASTEXITCODE" }
  & $builder --win portable --config.directories.output=dist-status
  if ($LASTEXITCODE -ne 0) { throw "dist-status rebuild failed: exit=$LASTEXITCODE" }
  Write-Output 'ROLLBACK_REBUILD_OK=true'
}

Write-Output "REBUILD_PERFORMED=$([bool]$Rebuild)"
Write-Output 'RESTART_REQUIRED=true'
Write-Output 'ROLLBACK_OK=true'
