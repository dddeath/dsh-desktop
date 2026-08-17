[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$signingScript = Join-Path $PSScriptRoot 'sign-and-publish.ps1'
$rollbackScript = Join-Path $PSScriptRoot 'rollback-authenticode-release.ps1'
$parseRecords = @()

foreach ($file in @($signingScript, $rollbackScript, $PSCommandPath)) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path -LiteralPath $file),
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null
  $parseRecords += [ordered]@{
    path = (Resolve-Path -LiteralPath $file).Path
    passed = ($errors.Count -eq 0)
    errors = @($errors | ForEach-Object { $_.Message })
  }
  if ($errors.Count -ne 0) { throw "PowerShell parse failed: $file" }
}

$probe = Join-Path $env:TEMP ('dsh-empty-' + [guid]::NewGuid().ToString('N') + '.pfx')
[IO.File]::WriteAllBytes($probe, [byte[]](0))
$priorPassword = [Environment]::GetEnvironmentVariable('DSH_CODESIGN_PASSWORD', 'Process')
[Environment]::SetEnvironmentVariable('DSH_CODESIGN_PASSWORD', $null, 'Process')
try {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $probeOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $signingScript -CertificatePath $probe 2>&1 | ForEach-Object { $_.ToString() })
  $probeExit = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
} finally {
  [Environment]::SetEnvironmentVariable('DSH_CODESIGN_PASSWORD', $priorPassword, 'Process')
  Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
}
if ($probeExit -eq 0) { throw 'Credential failure gate unexpectedly passed.' }

$artifactPaths = @(
  (Join-Path $repoRoot 'desktop\dist\DeepSeek-Harness-Desktop-0.2.0-portable.exe'),
  (Join-Path $repoRoot 'desktop\dist\DeepSeek-Harness-Desktop-Setup-0.2.0.exe')
)
$artifacts = @($artifactPaths | ForEach-Object {
    $item = Get-Item -LiteralPath $_
    $signature = Get-AuthenticodeSignature -LiteralPath $_
    [ordered]@{
      path = $item.FullName
      bytes = $item.Length
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_).Hash
      signature = $signature.Status.ToString()
    }
  })

$gh = (Get-Command gh.exe -ErrorAction Stop).Source
$repoJson = @(& $gh api repos/dddeath/dsh-desktop) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'GitHub repository preflight failed.' }
$repository = $repoJson | ConvertFrom-Json
$immutableReleases = if ($repository.PSObject.Properties.Name -contains 'immutable_releases_enabled') {
  [bool]$repository.immutable_releases_enabled
} else {
  $false
}
$savedPreference = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& $gh release view v0.2.0 --repo dddeath/dsh-desktop 2>$null | Out-Null
$releaseViewExit = $LASTEXITCODE
$ErrorActionPreference = $savedPreference
$releaseExists = ($releaseViewExit -eq 0)

$certificates = @(Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My -CodeSigningCert -ErrorAction SilentlyContinue)
$configuredEnvironment = @('WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD', 'CSC_LINK', 'CSC_KEY_PASSWORD') | ForEach-Object {
  [ordered]@{
    name = $_
    present = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_, 'Process'))
  }
}

$record = [ordered]@{
  schemaVersion = 1
  checkedAt = [DateTime]::UtcNow.ToString('o')
  result = 'AWAITING_TRUSTED_CERTIFICATE'
  scriptParse = $parseRecords
  credentialFailureGate = [ordered]@{
    exitStatus = $probeExit
    passed = ($probeExit -ne 0)
    message = 'missing process password stopped before build, signing, or upload'
    output = @($probeOutput | Select-Object -First 8)
  }
  certificateDiscovery = [ordered]@{
    codeSigningCertificates = $certificates.Count
    configuredEnvironment = $configuredEnvironment
  }
  github = [ordered]@{
    repository = 'dddeath/dsh-desktop'
    visibility = $repository.visibility
    immutableReleases = $immutableReleases
    tag = 'v0.2.0'
    releaseExists = $releaseExists
    authenticated = $true
  }
  artifacts = $artifacts
  nextAction = 'inject a trusted PFX/P12 path and process-only password, then execute sign-and-publish.ps1'
  secretsRecorded = $false
}

$recordPath = Join-Path $PSScriptRoot 'preflight.json'
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $recordPath -Encoding utf8
Write-Output "PREFLIGHT_RESULT=$($record.result)"
Write-Output "CREDENTIAL_GATE_EXIT=$probeExit"
$artifacts | ForEach-Object { Write-Output "ARTIFACT=$($_.path) SHA256=$($_.sha256) SIGNATURE=$($_.signature)" }
Write-Output "PREFLIGHT_RECORD=$recordPath"
