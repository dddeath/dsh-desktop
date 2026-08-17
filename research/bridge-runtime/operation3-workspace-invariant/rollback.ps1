param(
  [string]$RepositoryRoot = 'E:\deepseek_harness'
)

$ErrorActionPreference = 'Stop'
$operationRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Join-Path $RepositoryRoot 'plugins\dsh-codex-bridge'

Copy-Item -LiteralPath (Join-Path $operationRoot 'original\lib\dsh-plugin.js') -Destination (Join-Path $packageRoot 'lib\dsh-plugin.js') -Force
Copy-Item -LiteralPath (Join-Path $operationRoot 'original\lib\mcp-server.js') -Destination (Join-Path $packageRoot 'lib\mcp-server.js') -Force
Copy-Item -LiteralPath (Join-Path $operationRoot 'original\scripts\verify.mjs') -Destination (Join-Path $packageRoot 'scripts\verify.mjs') -Force
Copy-Item -LiteralPath (Join-Path $operationRoot 'original\package.json') -Destination (Join-Path $packageRoot 'package.json') -Force
Copy-Item -LiteralPath (Join-Path $operationRoot 'original\package-lock.json') -Destination (Join-Path $packageRoot 'package-lock.json') -Force
Remove-Item -LiteralPath (Join-Path $packageRoot 'lib\workspace-invariant.js') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $packageRoot 'test\workspace-invariant.test.js') -Force -ErrorAction SilentlyContinue

Write-Output 'ROLLBACK_OK'
Write-Output 'Restart DSH to load the restored bridge files.'
