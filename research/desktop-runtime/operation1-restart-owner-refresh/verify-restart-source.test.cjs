"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..", "..");
const mainSource = fs.readFileSync(path.join(root, "desktop", "main.js"), "utf8");
const { isDshWebCommandLine } = require(path.join(root, "desktop", "dsh-process.js"));

test("recognizes the detached bridge DSH web command", () => {
  const command = String.raw`"C:\Program Files\nodejs\node.exe" C:\Users\ACCOUNT\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js web --port 3080`;
  assert.equal(isDshWebCommandLine(command), true);
});

test("restart refreshes ownership instead of trusting attached state", () => {
  const helper = mainSource.match(/async function stopDshWebForRestart\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  const restart = mainSource.match(/async function restartHarness\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(helper, /findDshWebPids\(\)/);
  assert.match(restart, /stopDshWebForRestart\(\)/);
  assert.doesNotMatch(restart, /if \(attached\)/);
});

test("a connect timeout is not treated as a free port", () => {
  const waitPort = mainSource.match(/function waitPortFree\(port, tries = 30\) \{[\s\S]*?\n\}/)?.[0] || "";
  const timeout = waitPort.match(/sock\.once\("timeout"[\s\S]*?\n\s*\}\);/)?.[0] || "";
  assert.match(timeout, /resolve\(false\)/);
  assert.doesNotMatch(timeout, /resolve\(true\)/);
});
