# Install the human-approved plugin set into the dsh web profile.
$ErrorActionPreference = 'Continue'

$pkgs = @(
  'dshmarket',                                # A: plugin market GUI
  'dsh-find-plugin',                          # A: conversational plugin finder
  'dsh-better-sidebar',                       # B: file/terminal/git workbench
  'github:omdsh-dev/dsh-at-file',             # B: @file references
  '@liustack/modlens',                        # B: vision plugin
  'dsh-context',                              # B: context window insight
  'github:omdsh-dev/dsh-notification',        # B: system notifications
  'dsh-client-auto-continue',                 # B: auto-continue after interruption
  'github:omdsh-dev/dsh-open-in-vscode',      # B: open in VS Code
  'github:vlln/whale-girl',                   # D: QQ-style desktop pet
  'github:Small-tailqwq/dsh-deep-whale'       # D: whale-girl skin series
)

$results = @()
foreach ($p in $pkgs) {
  Write-Host "`n===== INSTALL: $p ====="
  & dsh.cmd plugin --profile web add $p
  $code = $LASTEXITCODE
  $results += [pscustomobject]@{ Package = $p; ExitCode = $code }
  Write-Host "===== RESULT: $p -> exit $code ====="
}

Write-Host "`n===== SUMMARY ====="
$results | Format-Table -AutoSize
if (($results | Where-Object { $_.ExitCode -ne 0 }).Count -gt 0) { exit 1 }
