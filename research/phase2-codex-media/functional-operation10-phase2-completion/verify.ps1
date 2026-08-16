[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = 'E:\deepseek_harness'
$state = Get-Content -LiteralPath (Join-Path $root '.agent\STATE.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$plan = Get-Content -LiteralPath (Join-Path $root '.agent\PLAN.json') -Raw -Encoding UTF8 | ConvertFrom-Json

if ($state.current_phase -ne 'phase3') { throw 'STATE current phase mismatch' }
if ($state.phase2_operation6_final.manual_gate_status -ne 'accepted') { throw 'Gate F status mismatch' }
if ($state.phase2_operation6_final.decision -ne 'retain-current') { throw 'Gate F decision mismatch' }
if ($state.phase2_completion.status -ne 'completed') { throw 'Phase 2 completion state mismatch' }
if ($state.phase3_execution.status -ne 'in_progress') { throw 'Phase 3 state mismatch' }

$p2 = $plan.phases | Where-Object { $_.id -eq 'P2' }
$p3 = $plan.phases | Where-Object { $_.id -eq 'P3' }
if ($plan.current_phase -ne 'P3' -or $p2.status -ne 'completed' -or $p3.status -ne 'in_progress') {
  throw 'PLAN phase transition mismatch'
}
if ($p3.rollback_point -ne '4c7244ed0779804cf81cab5a8c4618f8126550c4') { throw 'Phase 3 rollback point mismatch' }

$phase3Plan = Join-Path $root 'research\plugin-management\phase3-execution-plan.md'
if (-not (Test-Path -LiteralPath $phase3Plan -PathType Leaf)) { throw 'Phase 3 execution plan missing' }
$phase3Text = Get-Content -LiteralPath $phase3Plan -Raw -Encoding UTF8
foreach ($gate in 'G','H','I','J') {
  if ($phase3Text -notmatch "(?m)^### .+ $gate`r?$") { throw "Phase 3 gate missing: $gate" }
}

$persistenceOutput = Get-Content -LiteralPath (Join-Path $root 'research\phase2-codex-media\functional-operation9-persistence-recovery-final\evidence\verify-current-output.txt') -Raw -Encoding UTF8
if ($persistenceOutput -notmatch 'PERSISTENCE_OK=true' -or $persistenceOutput -notmatch 'VERIFY_CURRENT_EXIT=0') {
  throw 'Phase 2 persistence evidence mismatch'
}
$http = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10).StatusCode
if ($http -ne 200) { throw "DSH HTTP status mismatch: $http" }

Write-Output 'PHASE2_GATE_F=accepted'
Write-Output 'PHASE2_DECISION=retain-current'
Write-Output 'PHASE2_STATUS=completed'
Write-Output 'PHASE3_STATUS=in_progress'
Write-Output 'PHASE3_ROLLBACK_POINT=4c7244ed0779804cf81cab5a8c4618f8126550c4'
Write-Output 'PHASE3_MANUAL_GATES=G,H,I,J'
Write-Output "HTTP_STATUS=$http"
Write-Output 'VERIFY_OK=true'
