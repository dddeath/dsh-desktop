# Authenticode signing and public release

This directory contains the guarded release path for the Windows `v0.2.0`
artifacts. Private keys and certificate passwords must not be stored in this
repository.

## Required input

- A publicly trusted Microsoft Authenticode code-signing certificate exported
  as `.pfx` or `.p12`.
- Its password supplied only through the process environment variable
  `DSH_CODESIGN_PASSWORD`.
- An authenticated GitHub CLI session with permission to create releases for
  `dddeath/dsh-desktop`.

Do not copy the certificate into the repository and do not place its password
in `package.json`, a PowerShell script, a command history argument, or a GitHub
release note.

## Run

```powershell
$secure = Read-Host 'PFX password' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:DSH_CODESIGN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  E:\deepseek_harness\release\v0.2.0\signing\sign-and-publish.ps1 `
  -CertificatePath 'C:\absolute\private\codesign.pfx'
Remove-Item Env:DSH_CODESIGN_PASSWORD
```

The script checks out the existing `v0.2.0` tag into a temporary detached
worktree, lets electron-builder sign during packaging, verifies the unpacked
application and both distribution executables with Authenticode and SignTool,
backs up the previous unsigned artifacts, creates a draft GitHub Release,
downloads the uploaded assets for byte-for-byte SHA-256 verification, and only
then publishes the release.

## Outputs

- `E:\deepseek_harness\desktop\dist\DeepSeek-Harness-Desktop-0.2.0-portable.exe`
- `E:\deepseek_harness\desktop\dist\DeepSeek-Harness-Desktop-Setup-0.2.0.exe`
- `E:\deepseek_harness\release\v0.2.0\signing\SHA256SUMS.txt`
- `E:\deepseek_harness\release\v0.2.0\signing\signing-verification.json`
- `E:\deepseek_harness\release\v0.2.0\signing\publication.signed.json`

The original unsigned files are preserved under
`desktop\dist\unsigned-v0.2.0-before-authenticode`.

## Rollback

Restore the local unsigned artifacts:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  E:\deepseek_harness\release\v0.2.0\signing\rollback-authenticode-release.ps1
```

To also remove the public GitHub Release while retaining the `v0.2.0` tag, add
`-DeleteGitHubRelease`.
