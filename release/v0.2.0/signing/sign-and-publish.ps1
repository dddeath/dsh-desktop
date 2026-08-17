[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$CertificatePath,

  [string]$PasswordEnvironmentVariable = 'DSH_CODESIGN_PASSWORD',
  [string]$Repository = 'dddeath/dsh-desktop',
  [string]$Tag = 'v0.2.0'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-NativeLogged {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList,
    [Parameter(Mandatory = $true)][string]$LogPath
  )

  $display = $FilePath + ' ' + (($ArgumentList | ForEach-Object {
        if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
      }) -join ' ')
  $lines = @(& $FilePath @ArgumentList 2>&1 | ForEach-Object { $_.ToString() })
  $exitCode = $LASTEXITCODE
  @(
    'COMMAND=' + $display
    'EXIT_STATUS=' + $exitCode
    'OUTPUT_BEGIN'
    $lines
    'OUTPUT_END'
  ) | Set-Content -LiteralPath $LogPath -Encoding utf8
  if ($exitCode -ne 0) {
    throw "Command failed with exit status ${exitCode}. See $LogPath"
  }
  return [pscustomobject]@{
    command = $display
    exitStatus = $exitCode
    log = $LogPath
  }
}

function Resolve-CommandPath {
  param([Parameter(Mandatory = $true)][string]$Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $command) { throw "Required command not found: $Name" }
  return $command.Source
}

function Resolve-SignTool {
  $command = Get-Command signtool.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($command) { return $command.Source }
  $roots = @(
    'C:\Program Files (x86)\Windows Kits\10\bin',
    'C:\Program Files\Windows Kits\10\bin'
  )
  $candidate = Get-ChildItem -LiteralPath $roots -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if (-not $candidate) { throw 'Windows SignTool x64 was not found.' }
  return $candidate.FullName
}

function Get-ArtifactRecord {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$SignTool,
    [Parameter(Mandatory = $true)][string]$VerificationLog
  )
  $signature = Get-AuthenticodeSignature -LiteralPath $Path
  if ($signature.Status -ne 'Valid') {
    throw "Authenticode verification failed for $Path with status $($signature.Status)."
  }
  if (-not $signature.TimeStamperCertificate) {
    throw "Authenticode timestamp verification failed for $Path because no timestamp certificate was found."
  }
  $verify = Invoke-NativeLogged -FilePath $SignTool -ArgumentList @('verify', '/pa', '/all', '/v', $Path) -LogPath $VerificationLog
  $item = Get-Item -LiteralPath $Path
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $Path
  return [pscustomobject]@{
    path = $item.FullName
    fileName = $item.Name
    bytes = $item.Length
    sha256 = $hash.Hash
    signatureStatus = $signature.Status.ToString()
    signerSubject = $signature.SignerCertificate.Subject
    signerThumbprint = $signature.SignerCertificate.Thumbprint
    signerNotAfter = $signature.SignerCertificate.NotAfter.ToUniversalTime().ToString('o')
    timestampSubject = if ($signature.TimeStamperCertificate) { $signature.TimeStamperCertificate.Subject } else { $null }
    signtoolExitStatus = $verify.exitStatus
    signtoolLog = $verify.log
  }
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$certificate = (Resolve-Path -LiteralPath $CertificatePath).Path
if ([IO.Path]::GetExtension($certificate) -notin @('.pfx', '.p12')) {
  throw 'CertificatePath must point to a .pfx or .p12 file.'
}
$certificatePassword = [Environment]::GetEnvironmentVariable($PasswordEnvironmentVariable, 'Process')
if ([string]::IsNullOrWhiteSpace($certificatePassword)) {
  throw "Set the certificate password in the process environment variable $PasswordEnvironmentVariable before running this script."
}

try {
  $pfx = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
    $certificate,
    $certificatePassword,
    [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet
  )
} catch {
  throw 'The PFX/P12 could not be opened with the supplied process-only password.'
}
try {
  if (-not $pfx.HasPrivateKey) { throw 'The signing certificate does not contain an accessible private key.' }
  $now = [DateTime]::UtcNow
  if ($pfx.NotBefore.ToUniversalTime() -gt $now -or $pfx.NotAfter.ToUniversalTime() -le $now) {
    throw 'The signing certificate is not currently within its validity period.'
  }
  $codeSigningEku = $false
  foreach ($extension in $pfx.Extensions) {
    if ($extension -is [Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]) {
      foreach ($oid in $extension.EnhancedKeyUsages) {
        if ($oid.Value -eq '1.3.6.1.5.5.7.3.3') { $codeSigningEku = $true }
      }
    }
  }
  if (-not $codeSigningEku) { throw 'The certificate does not declare the Code Signing enhanced key usage.' }
} finally {
  $pfx.Dispose()
}

$git = Resolve-CommandPath 'git.exe'
$npm = Resolve-CommandPath 'npm.cmd'
$gh = Resolve-CommandPath 'gh.exe'
$signTool = Resolve-SignTool

$logRoot = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$runId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$worktree = Join-Path $env:TEMP "dsh-authenticode-$runId"
$downloadProbe = Join-Path $env:TEMP "dsh-release-download-$runId"
$dist = Join-Path $repoRoot 'desktop\dist'
$backup = Join-Path $dist 'unsigned-v0.2.0-before-authenticode'
$releaseCreated = $false
$releaseCreateAttempted = $false
$releasePublished = $false

$portableName = 'DeepSeek-Harness-Desktop-0.2.0-portable.exe'
$installerName = 'DeepSeek-Harness-Desktop-Setup-0.2.0.exe'
$blockmapName = 'DeepSeek-Harness-Desktop-Setup-0.2.0.exe.blockmap'
$expectedUnsignedHashes = @{
  $portableName = '6622B6C7066853F33858A4BBAF42035772C8F664C5ABDC5042A36624915A958E'
  $installerName = 'E0CA067904A6A8623FA3B9BAF773A0320FB4C2F4D45AF83D0A2036FD7B91564D'
}
$notesPath = Join-Path $PSScriptRoot 'RELEASE_NOTES.signed.md'
$checksumsPath = Join-Path $PSScriptRoot 'SHA256SUMS.txt'
$verificationPath = Join-Path $PSScriptRoot 'signing-verification.json'
$publicationPath = Join-Path $PSScriptRoot 'publication.signed.json'

$previousWinLink = [Environment]::GetEnvironmentVariable('WIN_CSC_LINK', 'Process')
$previousWinPassword = [Environment]::GetEnvironmentVariable('WIN_CSC_KEY_PASSWORD', 'Process')

try {
  Push-Location $repoRoot
  try {
    $remoteTag = @(& $git ls-remote --exit-code --tags origin "refs/tags/$Tag")
    if ($LASTEXITCODE -ne 0 -or $remoteTag.Count -eq 0) { throw "Remote tag not found: $Tag" }
    & $git worktree add --detach $worktree $Tag | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to create detached worktree for $Tag." }
  } finally {
    Pop-Location
  }

  $tagCommit = (& $git -C $worktree rev-parse 'HEAD').Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Failed to resolve detached worktree commit.' }

  # The tagged source remains unchanged. This setting exists only in the
  # detached build worktree so electron-builder fails instead of emitting an
  # unsigned production artifact when credentials are rejected.
  $packagePath = Join-Path $worktree 'desktop\package.json'
  $packageConfig = Get-Content -Raw -Encoding utf8 -LiteralPath $packagePath | ConvertFrom-Json
  $packageConfig.build | Add-Member -NotePropertyName forceCodeSigning -NotePropertyValue $true -Force
  $packageJson = $packageConfig | ConvertTo-Json -Depth 20
  [IO.File]::WriteAllText($packagePath, $packageJson + "`n", [Text.UTF8Encoding]::new($false))

  [Environment]::SetEnvironmentVariable('WIN_CSC_LINK', $certificate, 'Process')
  [Environment]::SetEnvironmentVariable('WIN_CSC_KEY_PASSWORD', $certificatePassword, 'Process')
  $installResult = $null
  $buildResult = $null
  Push-Location (Join-Path $worktree 'desktop')
  try {
    $installResult = Invoke-NativeLogged -FilePath $npm -ArgumentList @('ci') -LogPath (Join-Path $logRoot "$runId-npm-ci.log")
    $buildResult = Invoke-NativeLogged -FilePath $npm -ArgumentList @('run', 'pack') -LogPath (Join-Path $logRoot "$runId-pack.log")
  } finally {
    Pop-Location
    if ($null -eq $previousWinLink) { Remove-Item Env:WIN_CSC_LINK -ErrorAction SilentlyContinue } else { [Environment]::SetEnvironmentVariable('WIN_CSC_LINK', $previousWinLink, 'Process') }
    if ($null -eq $previousWinPassword) { Remove-Item Env:WIN_CSC_KEY_PASSWORD -ErrorAction SilentlyContinue } else { [Environment]::SetEnvironmentVariable('WIN_CSC_KEY_PASSWORD', $previousWinPassword, 'Process') }
    $certificatePassword = $null
  }

  $builtDist = Join-Path $worktree 'desktop\dist'
  $builtPortable = Join-Path $builtDist $portableName
  $builtInstaller = Join-Path $builtDist $installerName
  $builtBlockmap = Join-Path $builtDist $blockmapName
  $builtApplication = Join-Path $builtDist 'win-unpacked\DeepSeek Harness Desktop.exe'
  foreach ($required in @($builtPortable, $builtInstaller, $builtBlockmap, $builtApplication)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Expected signed build output missing: $required" }
  }

  $applicationRecord = Get-ArtifactRecord -Path $builtApplication -SignTool $signTool -VerificationLog (Join-Path $logRoot "$runId-verify-application.log")
  $portableRecord = Get-ArtifactRecord -Path $builtPortable -SignTool $signTool -VerificationLog (Join-Path $logRoot "$runId-verify-portable.log")
  $installerRecord = Get-ArtifactRecord -Path $builtInstaller -SignTool $signTool -VerificationLog (Join-Path $logRoot "$runId-verify-installer.log")

  New-Item -ItemType Directory -Force -Path $backup | Out-Null
  foreach ($name in @($portableName, $installerName, $blockmapName)) {
    $current = Join-Path $dist $name
    $saved = Join-Path $backup $name
    if ((Test-Path -LiteralPath $current -PathType Leaf) -and -not (Test-Path -LiteralPath $saved)) {
      if ($expectedUnsignedHashes.ContainsKey($name)) {
        $currentHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $current).Hash
        if ($currentHash -ne $expectedUnsignedHashes[$name]) {
          throw "Refusing to create an unsigned backup from an unexpected $name hash."
        }
      }
      Copy-Item -LiteralPath $current -Destination $saved
    }
    if ((Test-Path -LiteralPath $saved -PathType Leaf) -and $expectedUnsignedHashes.ContainsKey($name)) {
      $savedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $saved).Hash
      if ($savedHash -ne $expectedUnsignedHashes[$name]) {
        throw "Unsigned backup hash mismatch: $saved"
      }
    }
  }

  Copy-Item -LiteralPath $builtPortable -Destination (Join-Path $dist $portableName) -Force
  Copy-Item -LiteralPath $builtInstaller -Destination (Join-Path $dist $installerName) -Force
  Copy-Item -LiteralPath $builtBlockmap -Destination (Join-Path $dist $blockmapName) -Force

  $localPortable = Get-ArtifactRecord -Path (Join-Path $dist $portableName) -SignTool $signTool -VerificationLog (Join-Path $logRoot "$runId-verify-local-portable.log")
  $localInstaller = Get-ArtifactRecord -Path (Join-Path $dist $installerName) -SignTool $signTool -VerificationLog (Join-Path $logRoot "$runId-verify-local-installer.log")
  @(
    "$($localPortable.sha256)  $portableName"
    "$($localInstaller.sha256)  $installerName"
  ) | Set-Content -LiteralPath $checksumsPath -Encoding ascii

  $signedNotes = @(
    '# DeepSeek Harness Desktop v0.2.0'
    ''
    "Release date: $([DateTime]::Now.ToString('yyyy-MM-dd'))"
    'Platform: Windows x64'
    ''
    '## Signed downloads'
    ''
    '| Artifact | Size | SHA-256 |'
    '|---|---:|---|'
    "| $portableName | $($localPortable.bytes) bytes | $($localPortable.sha256) |"
    "| $installerName | $($localInstaller.bytes) bytes | $($localInstaller.sha256) |"
    ''
    'Both Windows executables passed the default Authenticode policy and SignTool /pa /all verification.'
    'SHA256SUMS.txt is included as a separate release asset.'
    ''
    'See the tagged source RELEASE_NOTES.md for the full Chinese change summary.'
  )
  $signedNotes | Set-Content -LiteralPath $notesPath -Encoding utf8

  $verification = [ordered]@{
    schemaVersion = 1
    verifiedAt = [DateTime]::UtcNow.ToString('o')
    result = 'PASS'
    tag = $Tag
    tagCommit = $tagCommit
    credentialStorage = 'certificate path and password were process-only; no secret value recorded'
    commands = @($installResult, $buildResult)
    unpackedApplication = $applicationRecord
    portable = $localPortable
    installer = $localInstaller
    unsignedBackup = $backup
    checksums = $checksumsPath
  }
  $verification | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $verificationPath -Encoding utf8

  $savedPreference = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  & $gh release view $Tag --repo $Repository 2>$null | Out-Null
  $releaseViewExit = $LASTEXITCODE
  $ErrorActionPreference = $savedPreference
  if ($releaseViewExit -eq 0) { throw "GitHub Release $Tag already exists; inspect it before replacing assets." }

  $createArguments = @(
    'release', 'create', $Tag,
    '--repo', $Repository,
    '--verify-tag',
    '--draft',
    '--title', 'DeepSeek Harness Desktop v0.2.0',
    '--notes-file', $notesPath,
    ((Join-Path $dist $portableName) + '#Windows x64 portable (Authenticode signed)'),
    ((Join-Path $dist $installerName) + '#Windows x64 installer (Authenticode signed)'),
    ($checksumsPath + '#SHA-256 checksums')
  )
  $releaseCreateAttempted = $true
  $createResult = Invoke-NativeLogged -FilePath $gh -ArgumentList $createArguments -LogPath (Join-Path $logRoot "$runId-gh-release-create.log")
  $releaseCreated = $true

  New-Item -ItemType Directory -Force -Path $downloadProbe | Out-Null
  $downloadResult = Invoke-NativeLogged -FilePath $gh -ArgumentList @('release', 'download', $Tag, '--repo', $Repository, '--dir', $downloadProbe) -LogPath (Join-Path $logRoot "$runId-gh-release-download.log")
  foreach ($record in @($localPortable, $localInstaller)) {
    $downloaded = Join-Path $downloadProbe $record.fileName
    if (-not (Test-Path -LiteralPath $downloaded -PathType Leaf)) { throw "Uploaded asset download missing: $($record.fileName)" }
    $downloadedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $downloaded).Hash
    if ($downloadedHash -ne $record.sha256) { throw "Uploaded asset SHA-256 mismatch: $($record.fileName)" }
  }
  $downloadedChecksums = Join-Path $downloadProbe 'SHA256SUMS.txt'
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $downloadedChecksums).Hash -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $checksumsPath).Hash) {
    throw 'Uploaded SHA256SUMS.txt did not round-trip byte-for-byte.'
  }

  $publishResult = Invoke-NativeLogged -FilePath $gh -ArgumentList @('release', 'edit', $Tag, '--repo', $Repository, '--draft=false', '--latest') -LogPath (Join-Path $logRoot "$runId-gh-release-publish.log")
  $releasePublished = $true
  $releaseJson = @(& $gh release view $Tag --repo $Repository --json 'url,isDraft,isPrerelease,tagName,name,assets') -join "`n"
  if ($LASTEXITCODE -ne 0) { throw 'Failed to read the published GitHub Release.' }
  $release = $releaseJson | ConvertFrom-Json
  if ($release.isDraft -or $release.isPrerelease) { throw 'GitHub Release did not reach the expected public state.' }

  [ordered]@{
    schemaVersion = 1
    publishedAt = [DateTime]::UtcNow.ToString('o')
    result = 'PASS'
    repository = $Repository
    tag = $Tag
    tagCommit = $tagCommit
    url = $release.url
    isDraft = $release.isDraft
    isPrerelease = $release.isPrerelease
    assets = @($release.assets | ForEach-Object { [ordered]@{ name = $_.name; size = $_.size; url = $_.url } })
    uploadVerification = 'downloaded assets matched local SHA-256 byte-for-byte before publication'
    localVerification = $verificationPath
    rollback = (Join-Path $PSScriptRoot 'rollback-authenticode-release.ps1')
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $publicationPath -Encoding utf8

  Write-Output "SIGNED_RELEASE_URL=$($release.url)"
  Write-Output "SIGNING_VERIFICATION=$verificationPath"
  Write-Output "PUBLICATION_RECORD=$publicationPath"
} catch {
  if ($releaseCreateAttempted -and -not $releasePublished) {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $draftJson = @(& $gh release view $Tag --repo $Repository --json 'isDraft' 2>$null) -join "`n"
    $draftViewExit = $LASTEXITCODE
    $ErrorActionPreference = $savedPreference
    if ($draftViewExit -eq 0 -and $draftJson) {
      $draft = $draftJson | ConvertFrom-Json
      if ($draft.isDraft) { & $gh release delete $Tag --repo $Repository --yes *> $null }
    }
  }
  throw
} finally {
  if ($null -eq $previousWinLink) { Remove-Item Env:WIN_CSC_LINK -ErrorAction SilentlyContinue } else { [Environment]::SetEnvironmentVariable('WIN_CSC_LINK', $previousWinLink, 'Process') }
  if ($null -eq $previousWinPassword) { Remove-Item Env:WIN_CSC_KEY_PASSWORD -ErrorAction SilentlyContinue } else { [Environment]::SetEnvironmentVariable('WIN_CSC_KEY_PASSWORD', $previousWinPassword, 'Process') }
  $certificatePassword = $null
  if (Test-Path -LiteralPath $worktree) {
    & $git -C $repoRoot worktree remove --force $worktree *> $null
  }
  if (Test-Path -LiteralPath $downloadProbe) {
    Remove-Item -LiteralPath $downloadProbe -Recurse -Force
  }
}
