[CmdletBinding()]
param(
    [string]$WorkspaceRoot = 'E:\deepseek_harness'
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\')
$targets = @(
    @{ Source = 'original\client.js'; Destination = 'themes\maid-atelier-fix\lib\client.js'; Sha256 = '22bc8abd70d3d6a06bd131f6f5d29fb23e7a4a246961c223ad80021cf994b1f5' },
    @{ Source = 'original\index.js'; Destination = 'themes\maid-atelier-fix\lib\index.js'; Sha256 = '61e5ea3f442afb4842d8356b475b6edb95e6583111e0849dc0b69a5898984249' },
    @{ Source = 'original\package.json'; Destination = 'themes\maid-atelier-fix\package.json'; Sha256 = '0d2e3169fa8e2842a70cd736765c89cc2bfe1276f659fc4a2073c74c8f043830' }
)

foreach ($item in $targets) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $item.Source))
    $destination = [System.IO.Path]::GetFullPath((Join-Path $root $item.Destination))
    if (-not ($destination.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase))) {
        throw "Rollback target escaped workspace root: $destination"
    }
    $parent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    $actual = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $item.Sha256) {
        throw "Rollback hash mismatch: $destination expected=$($item.Sha256) actual=$actual"
    }
    Write-Output "RESTORED=$destination SHA256=$actual"
}

Write-Output 'ROLLBACK_STATUS=PASS'
