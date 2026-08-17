param(
  [string]$RepositoryRoot = 'E:\deepseek_harness',
  [string]$InstalledPreset = 'C:\Users\19739\.dsh\.agent-presets\standard-bash'
)

$ErrorActionPreference = 'Stop'
$operationRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoPreset = Join-Path $RepositoryRoot 'standard-bash\preset'
$repoTest = Join-Path $RepositoryRoot 'standard-bash\test'

Copy-Item -LiteralPath (Join-Path $operationRoot 'original\preset\agent.cordis.yml') -Destination (Join-Path $repoPreset 'agent.cordis.yml') -Force
Remove-Item -LiteralPath (Join-Path $repoPreset 'custom-fs-search-windows.mjs') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $repoTest 'windows-search-path.test.mjs') -Force -ErrorAction SilentlyContinue

Copy-Item -LiteralPath (Join-Path $operationRoot 'original\installed\agent.cordis.yml') -Destination (Join-Path $InstalledPreset 'agent.cordis.yml') -Force
Copy-Item -LiteralPath (Join-Path $operationRoot 'original\installed\custom-bash.mjs') -Destination (Join-Path $InstalledPreset 'custom-bash.mjs') -Force
Remove-Item -LiteralPath (Join-Path $InstalledPreset 'custom-fs-search-windows.mjs') -Force -ErrorAction SilentlyContinue

Write-Output 'ROLLBACK_OK'
