$ErrorActionPreference = "Stop"

$base = "http://127.0.0.1:3080/__dsh-plugin-control-center"
$profileFile = "C:\Users\19739\.dsh\profiles\web\package.json"
$pluginName = "dsh-notification"

function Invoke-ControlPost([string]$path, [hashtable]$body) {
  Invoke-RestMethod -Method Post -Uri "$base/$path" -ContentType "application/json" -Body ($body | ConvertTo-Json -Compress)
}

function Read-PluginSnapshot {
  $snapshot = (Invoke-RestMethod -Uri "$base/snapshot").value
  $plugin = $snapshot.plugins | Where-Object name -eq $pluginName
  if (-not $plugin) { throw "$pluginName is missing from the control center snapshot" }
  [pscustomobject]@{
    actionMode = $snapshot.actionMode
    inBundle = $plugin.inBundle
    bundleIndex = $plugin.bundleIndex
    profileSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $profileFile).Hash
  }
}

$before = Read-PluginSnapshot
$disablePlan = (Invoke-ControlPost "plan" @{ action = "stage-disable"; name = $pluginName }).value
$afterPlan = Read-PluginSnapshot
if ($afterPlan.profileSha256 -ne $before.profileSha256) { throw "planning changed profile package.json" }
$disable = (Invoke-ControlPost "execute" @{ planId = $disablePlan.planId; action = $disablePlan.action; name = $pluginName }).value
$disabled = Read-PluginSnapshot
if ($disabled.inBundle) { throw "disable execution did not remove the plugin from bundles" }

$enablePlan = (Invoke-ControlPost "plan" @{ action = "stage-enable"; name = $pluginName }).value
$enable = (Invoke-ControlPost "execute" @{ planId = $enablePlan.planId; action = $enablePlan.action; name = $pluginName }).value
$restored = Read-PluginSnapshot
if (-not $restored.inBundle) { throw "enable execution did not restore the plugin to bundles" }
if ($restored.bundleIndex -ne $before.bundleIndex) { throw "bundle position was not restored" }
if ($restored.profileSha256 -ne $before.profileSha256) { throw "profile package.json hash was not restored" }

[pscustomobject]@{
  target = $pluginName
  baseline = $before
  plan = [pscustomobject]@{
    executable = $disablePlan.executable
    execute = $disablePlan.execute
    profileUnchanged = ($afterPlan.profileSha256 -eq $before.profileSha256)
    backupPath = $disablePlan.backup.path
    manifestSha256 = $disablePlan.backup.manifestSha256
  }
  disabled = [pscustomobject]@{
    execute = $disable.execute
    profileChanged = $disable.profileChanged
    inBundle = $disabled.inBundle
    packageSha256 = $disabled.profileSha256
  }
  restored = [pscustomobject]@{
    execute = $enable.execute
    profileChanged = $enable.profileChanged
    inBundle = $restored.inBundle
    bundleIndex = $restored.bundleIndex
    packageSha256 = $restored.profileSha256
    exactBaselineHash = ($restored.profileSha256 -eq $before.profileSha256)
  }
} | ConvertTo-Json -Depth 8
