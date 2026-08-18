import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createLiveActionService } from "../lib/live-actions.js";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dcc-live-actions-"));
  const profileRoot = path.join(root, "profile");
  const backupRoot = path.join(root, "backups");
  fs.mkdirSync(profileRoot);
  fs.writeFileSync(path.join(profileRoot, "package.json"), `${JSON.stringify({
    dependencies: { "dsh-notification": "1.0.0", "dsh-at-file": "1.0.0" },
    dsh: { profile: { bundles: ["dsh-notification", "dsh-at-file"] } },
  }, null, 2)}\n`);
  return { root, profileRoot, backupRoot };
}

function bundles(profileRoot) {
  return JSON.parse(fs.readFileSync(path.join(profileRoot, "package.json"), "utf8")).dsh.profile.bundles;
}

test("confirmed disable writes the profile and cannot be replayed", () => {
  const f = fixture();
  try {
    const service = createLiveActionService({ profileRoot: f.profileRoot, backupRoot: f.backupRoot, createToken: () => "disable-plan" });
    const plan = service.createPlan({ action: "stage-disable", packageName: "dsh-notification", bundleIndex: 0 });
    assert.equal(plan.execute, false);
    assert.equal(plan.profileChanged, false);
    assert.ok(fs.existsSync(plan.backup.manifestPath));
    assert.deepEqual(bundles(f.profileRoot), ["dsh-notification", "dsh-at-file"]);

    const result = service.executePlan({ planId: plan.planId, action: plan.action, packageName: plan.packageName });
    assert.equal(result.execute, true);
    assert.equal(result.profileChanged, true);
    assert.deepEqual(bundles(f.profileRoot), ["dsh-at-file"]);
    assert.throws(() => service.executePlan({ planId: plan.planId, action: plan.action, packageName: plan.packageName }), /missing, expired, or already used/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("profile drift blocks execution without changing bundle state", () => {
  const f = fixture();
  try {
    const service = createLiveActionService({ profileRoot: f.profileRoot, backupRoot: f.backupRoot, createToken: () => "drift-plan" });
    const plan = service.createPlan({ action: "stage-disable", packageName: "dsh-notification", bundleIndex: 0 });
    const packageFile = path.join(f.profileRoot, "package.json");
    const profile = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    profile.marker = "external change";
    fs.writeFileSync(packageFile, `${JSON.stringify(profile, null, 2)}\n`);
    assert.throws(() => service.executePlan({ planId: plan.planId, action: plan.action, packageName: plan.packageName }), /profile package drift/);
    assert.deepEqual(bundles(f.profileRoot), ["dsh-notification", "dsh-at-file"]);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("disable remembers bundle position across service restart and enable restores it", () => {
  const f = fixture();
  try {
    const stateFile = path.join(f.root, "state.json");
    const first = createLiveActionService({ profileRoot: f.profileRoot, backupRoot: f.backupRoot, stateFile, createToken: () => "disable-plan" });
    const disabling = first.createPlan({ action: "stage-disable", packageName: "dsh-notification", bundleIndex: 0 });
    first.executePlan({ planId: disabling.planId, action: disabling.action, packageName: disabling.packageName });
    assert.deepEqual(bundles(f.profileRoot), ["dsh-at-file"]);

    const second = createLiveActionService({ profileRoot: f.profileRoot, backupRoot: f.backupRoot, stateFile, createToken: () => "enable-plan" });
    const enabling = second.createPlan({ action: "stage-enable", packageName: "dsh-notification", bundleIndex: -1 });
    const result = second.executePlan({ planId: enabling.planId, action: enabling.action, packageName: enabling.packageName });
    assert.equal(result.afterIndex, 0);
    assert.deepEqual(bundles(f.profileRoot), ["dsh-notification", "dsh-at-file"]);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("expired plans are rejected", () => {
  const f = fixture();
  let current = 1000;
  try {
    const service = createLiveActionService({ profileRoot: f.profileRoot, backupRoot: f.backupRoot, ttlMs: 50, now: () => current, createToken: () => "expiring-plan" });
    const expiring = service.createPlan({ action: "stage-disable", packageName: "dsh-notification", bundleIndex: 0 });
    current += 51;
    assert.throws(() => service.executePlan({ planId: expiring.planId, action: expiring.action, packageName: expiring.packageName }), /missing, expired, or already used/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
