import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  profileHashes,
  restoreProfileBackup,
} from "../../../plugins/plugin-control-center/lib/profile-actions.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.join(here, "evidence", "real-profile-drill");
const disableRecordPath = path.join(evidenceRoot, "disable-staged-attempt-2.json");
const restoreRecordPath = path.join(evidenceRoot, "restore-staged.json");
const disableRecord = JSON.parse(fs.readFileSync(disableRecordPath, "utf8"));
const manifestPath = path.join(evidenceRoot, "attempt-2-backup", "manifest.json");
const currentHashes = profileHashes(disableRecord.profileRoot);

if (currentHashes["package.json"].sha256 === disableRecord.beforeHashes["package.json"].sha256) {
  for (const [name, record] of Object.entries(disableRecord.beforeHashes)) {
    assert.equal(currentHashes[name].sha256, record.sha256, `${name} already-restored mismatch`);
  }
  const currentProfile = JSON.parse(fs.readFileSync(path.join(disableRecord.profileRoot, "package.json"), "utf8"));
  assert.equal(currentProfile.dsh.profile.bundles.indexOf(disableRecord.packageName), disableRecord.originalIndex);
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    result: "RESTORE ALREADY APPLIED",
    packageName: disableRecord.packageName,
    bundleIndex: disableRecord.originalIndex,
    restoredHashes: currentHashes,
    profileChanged: false,
  }, null, 2)}\n`);
  process.exit(0);
}

assert.equal(
  currentHashes["package.json"].sha256,
  disableRecord.disabled.afterSha256,
  "profile is neither the staged-disabled state nor the restored baseline",
);

const restored = restoreProfileBackup({
  profileRoot: disableRecord.profileRoot,
  backupRoot: evidenceRoot,
  manifestPath,
  expectedPackageSha256: disableRecord.disabled.afterSha256,
});
const restoredHashes = profileHashes(disableRecord.profileRoot);
for (const [name, record] of Object.entries(disableRecord.beforeHashes)) {
  assert.equal(restoredHashes[name].sha256, record.sha256, `${name} restore mismatch`);
}
const restoredProfile = JSON.parse(fs.readFileSync(path.join(disableRecord.profileRoot, "package.json"), "utf8"));
assert.equal(restoredProfile.dsh.profile.bundles.indexOf(disableRecord.packageName), disableRecord.originalIndex);
assert.equal(restoredProfile.dependencies["@liustack/modlens"], disableRecord.preservedProfileFacts.modlens);
assert.equal(restoredProfile.dependencies["dsh-deep-whale"], disableRecord.preservedProfileFacts.deepWhale);
assert.equal(restoredProfile.dependencies["whale-girl"], disableRecord.preservedProfileFacts.whaleGirl);

const record = {
  schemaVersion: 1,
  stagedAt: new Date().toISOString(),
  result: "RESTORE STAGED FROM SETTLED ATTEMPT-2 BASELINE",
  packageName: disableRecord.packageName,
  originalIndex: disableRecord.originalIndex,
  liveRuntimeRestarted: false,
  restored,
  restoredHashes,
  preservedProfileFacts: disableRecord.preservedProfileFacts,
  nextStep: "Manual Harness restart, then verify dsh-notification is active again.",
};
if (!fs.existsSync(restoreRecordPath)) {
  fs.writeFileSync(restoreRecordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
