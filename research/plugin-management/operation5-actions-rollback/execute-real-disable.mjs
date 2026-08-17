import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createProfileBackup,
  profileHashes,
  setBundleEnabled,
} from "../../../plugins/plugin-control-center/lib/profile-actions.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.join(here, "evidence", "real-profile-drill");
const attempt1Path = path.join(evidenceRoot, "disable-staged.json");
const conflictPath = path.join(evidenceRoot, "conflict-observed.json");
const recordPath = path.join(evidenceRoot, "disable-staged-attempt-2.json");
const profileRoot = path.join(os.homedir(), ".dsh", "profiles", "web");
const packageName = "dsh-notification";
const marketStatusUrl = "http://127.0.0.1:3080/dsh-market/status";

function readProfile() {
  return JSON.parse(fs.readFileSync(path.join(profileRoot, "package.json"), "utf8"));
}

async function readSettledMarketStatus() {
  const response = await fetch(marketStatusUrl);
  assert.equal(response.ok, true, `dshmarket status HTTP ${response.status}`);
  const status = await response.json();
  assert.equal(status.active, false, "dshmarket is still modifying the profile");
  assert.equal(status.error, null, `dshmarket error: ${status.error}`);
  return status;
}

fs.mkdirSync(evidenceRoot, { recursive: true });
if (fs.existsSync(recordPath)) throw new Error(`disable record already exists: ${recordPath}`);

const marketBefore = await readSettledMarketStatus();
await new Promise((resolve) => setTimeout(resolve, 1200));
const marketStable = await readSettledMarketStatus();
const beforeHashes = profileHashes(profileRoot);
const beforeProfile = readProfile();
const originalIndex = beforeProfile.dsh?.profile?.bundles?.indexOf(packageName) ?? -1;
assert.notEqual(originalIndex, -1, `${packageName} must be enabled before the drill`);
assert.equal(beforeProfile.dependencies["dsh-deep-whale"], "github:Small-tailqwq/dsh-deep-whale");
assert.equal(beforeProfile.dependencies["whale-girl"], "github:vlln/whale-girl");
assert.equal(beforeProfile.dependencies["@liustack/modlens"], "^3.17.3");

const attempt1 = JSON.parse(fs.readFileSync(attempt1Path, "utf8"));
const conflict = {
  schemaVersion: 1,
  observedAt: new Date().toISOString(),
  result: "ATTEMPT 1 OVERWRITTEN BEFORE RESTART",
  reason: "dshmarket completed an already-running profile update after attempt 1 was staged",
  userRestartedAfterAttempt1: false,
  attempt1Record: attempt1Path,
  attempt1DisabledPackageSha256: attempt1.disabled.afterSha256,
  settledPackageSha256: beforeHashes["package.json"].sha256,
  settledProfilePreserved: {
    modlens: beforeProfile.dependencies["@liustack/modlens"],
    deepWhale: beforeProfile.dependencies["dsh-deep-whale"],
    whaleGirl: beforeProfile.dependencies["whale-girl"],
    dependencyCount: Object.keys(beforeProfile.dependencies).length,
    bundleCount: beforeProfile.dsh.profile.bundles.length,
  },
  marketStatus: marketStable,
};
fs.writeFileSync(conflictPath, `${JSON.stringify(conflict, null, 2)}\n`, "utf8");

const backup = createProfileBackup({
  profileRoot,
  backupRoot: path.join(os.homedir(), ".dsh", "control-center", "snapshots"),
  action: "real-stage-disable-attempt-2",
  packageName,
});
const evidenceBackupPath = path.join(evidenceRoot, "attempt-2-backup");
fs.cpSync(backup.path, evidenceBackupPath, { recursive: true, errorOnExist: true });

const disabled = setBundleEnabled({
  profileRoot,
  packageName,
  enabled: false,
  expectedPackageSha256: beforeHashes["package.json"].sha256,
});
assert.equal(disabled.afterIndex, -1);
const afterHashes = profileHashes(profileRoot);
for (const [name, record] of Object.entries(beforeHashes)) {
  if (name === "package.json") continue;
  assert.equal(afterHashes[name].sha256, record.sha256, `${name} changed during bundle-only action`);
}
const afterProfile = readProfile();
assert.equal(afterProfile.dependencies["dsh-deep-whale"], beforeProfile.dependencies["dsh-deep-whale"]);
assert.equal(afterProfile.dependencies["whale-girl"], beforeProfile.dependencies["whale-girl"]);
assert.equal(afterProfile.dependencies["@liustack/modlens"], beforeProfile.dependencies["@liustack/modlens"]);

await new Promise((resolve) => setTimeout(resolve, 1500));
const marketAfter = await readSettledMarketStatus();
const stableHashes = profileHashes(profileRoot);
assert.equal(stableHashes["package.json"].sha256, disabled.afterSha256, "profile was rewritten after staging attempt 2");
assert.equal(readProfile().dsh.profile.bundles.includes(packageName), false);

const record = {
  schemaVersion: 1,
  stagedAt: new Date().toISOString(),
  result: "DISABLE STAGED - ATTEMPT 2 STABLE",
  profileRoot,
  packageName,
  originalIndex,
  liveRuntimeRestarted: false,
  marketBefore,
  marketAfter,
  backup,
  evidenceBackupPath,
  beforeHashes,
  preservedProfileFacts: conflict.settledProfilePreserved,
  disabled,
  afterHashes: stableHashes,
  nextStep: "Manual Harness restart, then verify dsh-notification is absent from the runtime inventory.",
};
fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
