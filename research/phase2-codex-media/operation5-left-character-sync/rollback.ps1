[CmdletBinding()]
param([string]$WorkspaceRoot = 'E:\deepseek_harness')

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\')
$targets = @(
    @{ Source = 'original\client.js'; Destination = 'themes\maid-atelier-fix\lib\client.js'; Sha256 = '809fd96ed707cb0fa11c90b139cf1ab8dab73e9358bc2b73a36d5592dc077895' },
    @{ Source = 'original\package.json'; Destination = 'themes\maid-atelier-fix\package.json'; Sha256 = 'c62576db06f4e3515a806b54c33ab74c3cad1b67b1ac3f917f22d5f61c883d83' }
)

foreach ($item in $targets) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $item.Source))
    $destination = [System.IO.Path]::GetFullPath((Join-Path $root $item.Destination))
    if (-not $destination.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Rollback target escaped workspace root: $destination"
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    $actual = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $item.Sha256) { throw "Rollback hash mismatch: $destination" }
    Write-Output "RESTORED=$destination SHA256=$actual"
}
Write-Output 'ROLLBACK_STATUS=PASS'
