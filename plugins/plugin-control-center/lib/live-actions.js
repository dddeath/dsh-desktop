import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createProfileBackup, profileHashes, setBundleEnabled } from "./profile-actions.js";

export const LIVE_ACTIONS = Object.freeze(["stage-enable", "stage-disable"]);

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export function createLiveActionService({
  profileRoot,
  backupRoot,
  stateFile,
  ttlMs = 5 * 60 * 1000,
  now = () => Date.now(),
  createToken = () => crypto.randomBytes(24).toString("hex"),
} = {}) {
  const root = requireText(profileRoot, "profileRoot");
  const backups = requireText(backupRoot, "backupRoot");
  const plans = new Map();

  function readPositions() {
    if (!stateFile || !fs.existsSync(stateFile)) return {};
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      return state.schemaVersion === 1 && state.positions && typeof state.positions === "object" ? state.positions : {};
    } catch {
      return {};
    }
  }

  function writePositions(positions) {
    if (!stateFile) return;
    const file = path.resolve(stateFile);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporary, `${JSON.stringify({ schemaVersion: 1, positions }, null, 2)}\n`, "utf8");
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    }
  }

  function purgeExpired() {
    const current = now();
    for (const [planId, plan] of plans) {
      if (plan.expiresAtMs <= current || plan.consumed) plans.delete(planId);
    }
  }

  function createPlan({ action, packageName, bundleIndex }) {
    purgeExpired();
    if (!LIVE_ACTIONS.includes(action)) throw new Error(`unsupported live action: ${action}`);
    const name = requireText(packageName, "packageName");
    const packageRecord = profileHashes(root)["package.json"];
    if (!packageRecord?.sha256) throw new Error("profile package hash is unavailable");
    const backup = createProfileBackup({ profileRoot: root, backupRoot: backups, action, packageName: name });
    const createdAtMs = now();
    const planId = createToken();
    const rememberedIndex = readPositions()[name];
    const plan = {
      planId,
      action,
      packageName: name,
      enabled: action === "stage-enable",
      preferredIndex: Number.isInteger(bundleIndex) && bundleIndex >= 0
        ? bundleIndex
        : (Number.isInteger(rememberedIndex) ? rememberedIndex : undefined),
      expectedPackageSha256: packageRecord.sha256,
      backup,
      createdAtMs,
      expiresAtMs: createdAtMs + ttlMs,
      consumed: false,
    };
    plans.set(planId, plan);
    return {
      planId,
      action,
      packageName: name,
      executable: true,
      execute: false,
      profileChanged: false,
      expectedPackageSha256: plan.expectedPackageSha256,
      expiresAt: new Date(plan.expiresAtMs).toISOString(),
      backup,
      restartRequired: true,
      nextStep: action === "stage-disable" ? "确认停用并重启" : "确认启用并重启",
    };
  }

  function executePlan({ planId, action, packageName }) {
    purgeExpired();
    const id = requireText(planId, "planId");
    const plan = plans.get(id);
    if (!plan) throw new Error("action plan is missing, expired, or already used");
    if (plan.consumed) throw new Error("action plan was already used");
    if (plan.action !== action || plan.packageName !== packageName) throw new Error("action plan does not match the request");

    // Consume before writing so one confirmation can never be replayed after an error.
    plan.consumed = true;
    plans.delete(id);
    const result = setBundleEnabled({
      profileRoot: root,
      packageName: plan.packageName,
      enabled: plan.enabled,
      expectedPackageSha256: plan.expectedPackageSha256,
      preferredIndex: plan.preferredIndex,
    });
    const positions = readPositions();
    if (plan.action === "stage-disable" && result.beforeIndex >= 0) {
      positions[plan.packageName] = result.beforeIndex;
      writePositions(positions);
    } else if (plan.action === "stage-enable" && result.afterIndex >= 0) {
      delete positions[plan.packageName];
      writePositions(positions);
    }
    return {
      ...result,
      planId: id,
      execute: true,
      profileChanged: result.changed,
      backup: plan.backup,
      nextStep: result.changed ? "配置已写入，正在安全重启" : "配置原本已是目标状态，正在刷新核验",
    };
  }

  return { createPlan, executePlan, purgeExpired };
}
