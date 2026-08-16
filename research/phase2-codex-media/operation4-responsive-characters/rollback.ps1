[CmdletBinding()]
param(
    [string]$WorkspaceRoot = 'E:\deepseek_harness'
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\')
$targets = @(
    @{ Source = 'original\client.js'; Destination = 'themes\maid-atelier-fix\lib\client.js'; Sha256 = 'bfd5cc754bb0f3f5174d5ea41c68f455ea4273dd4cb8af4a3912c809c852f00d' },
    @{ Source = 'original\package.json'; Destination = 'themes\maid-atelier-fix\package.json'; Sha256 = 'c7a0c928cbc03a3daf34111d05125a86bcd3699205959224781ff8457255453f' }
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
    if ($actual -ne $item.Sha256) {
        throw "Rollback hash mismatch: $destination expected=$($item.Sha256) actual=$actual"
    }
    Write-Output "RESTORED=$destination SHA256=$actual"
}

Write-Output 'ROLLBACK_STATUS=PASS'
