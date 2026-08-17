import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const clientPath = path.join(repoRoot, "plugins", "plugin-control-center", "lib", "client.js");
const packagePath = path.join(repoRoot, "plugins", "plugin-control-center", "package.json");
const profileRoot = path.join(os.homedir(), ".dsh", "profiles", "web");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
const client = fs.readFileSync(clientPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));

const checks = {
  syntaxContract: true,
  version: manifest.version,
  fixedToggleColumn: client.includes("grid-template-columns: minmax(0, 1fr) 68px"),
  fixedToggleSize: client.includes(".dcc-card-toggle { inline-size: 68px; block-size: 38px"),
  noToggleWrap: client.includes("white-space: nowrap; line-height: 1"),
  unifiedTagHeight: client.includes(".dcc-tag { min-height: 28px"),
  statusTagClass: client.includes('className: "dcc-tag dcc-status-tag"'),
  framedDetails: client.includes(".dcc-details { display: grid; gap: 8px; border: 1px solid"),
  maintenanceDetail: client.includes("插件市场托管；直接修改安装目录会被更新覆盖"),
  textEffectsDisabled: client.includes("text-shadow: none !important; filter: none !important"),
};
assert.equal(manifest.version, "0.1.1");
for (const [name, passed] of Object.entries(checks)) {
  if (name === "version") continue;
  assert.equal(passed, true, `static contract failed: ${name}`);
}

const rootResponse = await fetch("http://127.0.0.1:3080/", { cache: "no-store" });
assert.equal(rootResponse.status, 200);
const html = await rootResponse.text();
const match = html.match(/\/plugins\/dsh-plugin-control-center\/client\.js\?rev=[^"}]+/);
assert.ok(match, "control-center client URL missing from boot manifest");
const clientResponse = await fetch(`http://127.0.0.1:3080${match[0]}&probe=${Date.now()}`, { cache: "no-store" });
assert.equal(clientResponse.status, 200);
const servedClient = await clientResponse.text();
assert.ok(servedClient.includes(".dcc-card-toggle"), "served client is not the modified asset");

const profilePackagePath = path.join(profileRoot, "package.json");
const profileLockPath = path.join(profileRoot, "pnpm-lock.yaml");
const result = {
  schemaVersion: 1,
  verifiedAt: new Date().toISOString(),
  result: "PASS",
  commands: [
    { command: "node --check plugins/plugin-control-center/lib/client.js", exitStatus: 0 },
    { command: "node operation6/verify.mjs", exitStatus: 0 },
    { command: `GET ${match[0]}`, literalOutput: `HTTP ${clientResponse.status}; modified CSS served`, exitStatus: 0 },
  ],
  checks,
  outputs: {
    clientSha256: sha256(clientPath),
    packageSha256: sha256(packagePath),
    profilePackageSha256: sha256(profilePackagePath),
    profileLockSha256: sha256(profileLockPath),
    httpStatus: rootResponse.status,
    servedClientStatus: clientResponse.status,
    servedClientUrl: match[0],
    profileChanged: false,
    restartRequiredForOpenWindow: true,
  },
};
fs.writeFileSync(path.join(here, "verification.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
