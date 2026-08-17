import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createProfileBackup,
  pinDependency,
  profileHashes,
  restoreProfileBackup,
  setBundleEnabled,
  summarizeUpdate,
} from "../../../plugins/plugin-control-center/lib/profile-actions.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const originalProfile = path.join(here, "original", "profile");
const fixtureRoot = path.join(here, "evidence", `isolated-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const fixtureProfile = path.join(fixtureRoot, "profile");
const backupRoot = path.join(fixtureRoot, "backups");
fs.mkdirSync(fixtureRoot, { recursive: false });
fs.cpSync(originalProfile, fixtureProfile, { recursive: true });

const baselineHashes = profileHashes(fixtureProfile);
const baseline = JSON.parse(fs.readFileSync(path.join(fixtureProfile, "package.json"), "utf8"));
const packageName = "dsh-notification";
const versionPackage = "dsh-context";
const originalIndex = baseline.dsh.profile.bundles.indexOf(packageName);
assert.ok(originalIndex >= 0, `${packageName} must start enabled`);

const backup = createProfileBackup({
  profileRoot: fixtureProfile,
  backupRoot,
  action: "operation4-isolated-drill",
  packageName,
});

const disabled = setBundleEnabled({
  profileRoot: fixtureProfile,
  packageName,
  enabled: false,
  expectedPackageSha256: baselineHashes["package.json"].sha256,
});
assert.equal(disabled.afterIndex, -1);
assert.equal(profileHashes(fixtureProfile)["pnpm-lock.yaml"].sha256, baselineHashes["pnpm-lock.yaml"].sha256);

const enabled = setBundleEnabled({
  profileRoot: fixtureProfile,
  packageName,
  enabled: true,
  preferredIndex: originalIndex,
  expectedPackageSha256: disabled.afterSha256,
});
assert.equal(enabled.afterIndex, originalIndex);

const pinned = pinDependency({
  profileRoot: fixtureProfile,
  packageName: versionPackage,
  targetSpec: "0.7.3",
  expectedPackageSha256: enabled.afterSha256,
});
assert.equal(pinned.beforeSpec, "^0.7.3");
assert.equal(pinned.afterSpec, "0.7.3");

const updatesDocument = JSON.parse(fs.readFileSync(path.join(here, "..", "operation4-control-center-implementation", "evidence", "updates.json"), "utf8"));
const update = summarizeUpdate(versionPackage, updatesDocument.updates[versionPackage]);
assert.equal(update.current, "0.7.3");
assert.equal(update.latest, "0.10.2");
assert.equal(update.updateAvailable, true);

let protectionGuard = null;
try {
  pinDependency({
    profileRoot: fixtureProfile,
    packageName: "dsh-codex-tools",
    targetSpec: "1.0.1",
    expectedPackageSha256: pinned.afterSha256,
  });
} catch (error) {
  protectionGuard = error.message;
}
assert.equal(protectionGuard, "protected package: dsh-codex-tools");

let driftGuard = null;
try {
  setBundleEnabled({
    profileRoot: fixtureProfile,
    packageName,
    enabled: false,
    expectedPackageSha256: "0".repeat(64),
  });
} catch (error) {
  driftGuard = error.message;
}
assert.match(driftGuard, /profile package drift/);

const restored = restoreProfileBackup({
  profileRoot: fixtureProfile,
  backupRoot,
  manifestPath: backup.manifestPath,
  expectedPackageSha256: pinned.afterSha256,
});
const restoredHashes = profileHashes(fixtureProfile);
for (const [name, record] of Object.entries(baselineHashes)) {
  assert.equal(restoredHashes[name].sha256, record.sha256, `${name} must restore byte-for-byte`);
}

const result = {
  result: "PASS",
  fixtureProfile,
  liveProfileChanged: false,
  packageName,
  originalIndex,
  backup,
  disabled,
  enabled,
  pinned,
  update,
  protectionGuard,
  driftGuard,
  restored,
  baselineHashes,
  restoredHashes,
};
fs.writeFileSync(path.join(fixtureRoot, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
