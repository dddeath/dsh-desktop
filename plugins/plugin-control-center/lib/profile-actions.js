import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PROFILE_FILES = ["package.json", "pnpm-lock.yaml", "cordis.yml", "cordis.patch.yml"];
export const PROTECTED_PACKAGE_NAMES = Object.freeze([
  "dsh-plugin-control-center",
  "dshmarket",
  "dsh-desktop-ui-compat",
  "dsh-codex-tools",
]);

function assertMutablePackage(packageName) {
  if (PROTECTED_PACKAGE_NAMES.includes(packageName)) throw new Error(`protected package: ${packageName}`);
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
}

function safeProfileRoot(profileRoot) {
  const root = path.resolve(profileRoot);
  const packageFile = path.join(root, "package.json");
  if (!fs.statSync(root).isDirectory() || !fs.statSync(packageFile).isFile()) {
    throw new Error(`invalid profile root: ${root}`);
  }
  return root;
}

function readProfile(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
}

function atomicWriteJson(file, value) {
  const temporary = `${file}.control-center-${process.pid}-${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function fileRecord(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const stat = fs.statSync(absolutePath);
  return { relativePath, bytes: stat.size, sha256: sha256File(absolutePath) };
}

export function profileHashes(profileRoot) {
  const root = safeProfileRoot(profileRoot);
  return Object.fromEntries(PROFILE_FILES.map((name) => [name, fileRecord(root, name)]).filter(([, value]) => value));
}

function assertExpectedPackageHash(root, expectedPackageSha256) {
  const packageFile = path.join(root, "package.json");
  const actual = sha256File(packageFile);
  if (actual !== String(expectedPackageSha256 || "").toUpperCase()) {
    throw new Error(`profile package drift: expected ${expectedPackageSha256}, got ${actual}`);
  }
  return actual;
}

export function createProfileBackup({ profileRoot, backupRoot, action, packageName }) {
  const root = safeProfileRoot(profileRoot);
  const base = path.resolve(backupRoot);
  fs.mkdirSync(base, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = String(packageName).replace(/[^a-zA-Z0-9._-]+/g, "_");
  const destination = path.join(base, `${stamp}-${action}-${safeName}`);
  if (!destination.startsWith(`${base}${path.sep}`)) throw new Error("backup path escaped backup root");
  fs.mkdirSync(destination, { recursive: false });
  const files = [];
  for (const relativePath of PROFILE_FILES) {
    const source = path.join(root, relativePath);
    if (!fs.existsSync(source)) continue;
    fs.copyFileSync(source, path.join(destination, relativePath));
    files.push(fileRecord(destination, relativePath));
  }
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    action,
    packageName,
    profileRoot: root,
    files,
  };
  const manifestPath = path.join(destination, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { path: destination, manifestPath, manifestSha256: sha256File(manifestPath), files };
}

export function setBundleEnabled({ profileRoot, packageName, enabled, expectedPackageSha256, preferredIndex }) {
  assertMutablePackage(packageName);
  const root = safeProfileRoot(profileRoot);
  const beforeSha256 = assertExpectedPackageHash(root, expectedPackageSha256);
  const profile = readProfile(root);
  if (!Object.hasOwn(profile.dependencies || {}, packageName)) throw new Error(`package is not installed: ${packageName}`);
  const bundles = [...(profile.dsh?.profile?.bundles || [])];
  const beforeIndex = bundles.indexOf(packageName);
  const withoutPackage = bundles.filter((name) => name !== packageName);
  if (enabled) {
    const requested = Number.isInteger(preferredIndex) ? preferredIndex : withoutPackage.length;
    const index = Math.max(0, Math.min(requested, withoutPackage.length));
    withoutPackage.splice(index, 0, packageName);
  }
  profile.dsh.profile.bundles = withoutPackage;
  atomicWriteJson(path.join(root, "package.json"), profile);
  const afterSha256 = sha256File(path.join(root, "package.json"));
  return {
    action: enabled ? "stage-enable" : "stage-disable",
    packageName,
    changed: beforeIndex !== (enabled ? withoutPackage.indexOf(packageName) : -1),
    beforeIndex,
    afterIndex: withoutPackage.indexOf(packageName),
    beforeSha256,
    afterSha256,
    restartRequired: true,
  };
}

export function pinDependency({ profileRoot, packageName, targetSpec, expectedPackageSha256 }) {
  assertMutablePackage(packageName);
  const root = safeProfileRoot(profileRoot);
  const beforeSha256 = assertExpectedPackageHash(root, expectedPackageSha256);
  const profile = readProfile(root);
  if (!Object.hasOwn(profile.dependencies || {}, packageName)) throw new Error(`package is not installed: ${packageName}`);
  if (typeof targetSpec !== "string" || !targetSpec.trim()) throw new Error("target spec is empty");
  const beforeSpec = profile.dependencies[packageName];
  profile.dependencies[packageName] = targetSpec.trim();
  atomicWriteJson(path.join(root, "package.json"), profile);
  return {
    action: "pin-version",
    packageName,
    beforeSpec,
    afterSpec: profile.dependencies[packageName],
    beforeSha256,
    afterSha256: sha256File(path.join(root, "package.json")),
    installRequired: true,
    restartRequired: true,
  };
}

export function summarizeUpdate(packageName, updateRow) {
  if (!updateRow || typeof updateRow !== "object") return { packageName, known: false, updateAvailable: false };
  return {
    packageName,
    known: true,
    kind: updateRow.kind || "unknown",
    current: updateRow.current ?? updateRow.version ?? null,
    latest: updateRow.latest ?? null,
    updateAvailable: updateRow.updateAvailable === true,
  };
}

export function restoreProfileBackup({ profileRoot, backupRoot, manifestPath, expectedPackageSha256 }) {
  const root = safeProfileRoot(profileRoot);
  const beforeSha256 = assertExpectedPackageHash(root, expectedPackageSha256);
  const absoluteManifest = path.resolve(manifestPath);
  const allowedBackupRoot = path.resolve(backupRoot);
  if (!absoluteManifest.startsWith(`${allowedBackupRoot}${path.sep}`)) throw new Error("manifest is outside the allowed backup root");
  const backupDirectory = path.dirname(absoluteManifest);
  const manifest = JSON.parse(fs.readFileSync(absoluteManifest, "utf8"));
  if (manifest.schemaVersion !== 1 || path.resolve(manifest.profileRoot) !== root) {
    throw new Error("backup manifest does not belong to this profile");
  }
  for (const record of manifest.files || []) {
    if (!PROFILE_FILES.includes(record.relativePath)) throw new Error(`unexpected backup file: ${record.relativePath}`);
    const source = path.join(backupDirectory, record.relativePath);
    if (sha256File(source) !== record.sha256) throw new Error(`backup hash mismatch: ${record.relativePath}`);
    const target = path.join(root, record.relativePath);
    const temporary = `${target}.control-center-restore-${process.pid}-${Date.now()}.tmp`;
    try {
      fs.copyFileSync(source, temporary);
      fs.renameSync(temporary, target);
    } finally {
      if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    }
  }
  return {
    action: "restore",
    manifestPath: absoluteManifest,
    beforeSha256,
    afterSha256: sha256File(path.join(root, "package.json")),
    restoredFiles: (manifest.files || []).map((item) => item.relativePath),
    restartRequired: true,
  };
}
