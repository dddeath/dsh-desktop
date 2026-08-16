"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { isDshWebCommandLine, parseDshWebPids } = require(path.resolve(__dirname, "../../../desktop/dsh-process.js"));

const fixtures = [
  { name: "profile-web", value: '"node" "C:\\Users\\ACCOUNT\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js" --profile web', expected: true },
  { name: "legacy-web", value: '"node" "C:\\Users\\ACCOUNT\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js" web --port 3080', expected: true },
  { name: "profile-plugin-command", value: '"node" "C:\\Users\\ACCOUNT\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js" --profile web plugin list', expected: false },
  { name: "unrelated-node", value: '"node" "C:\\APP\\server.js" --profile web', expected: false },
];

for (const fixture of fixtures) {
  const actual = isDshWebCommandLine(fixture.value);
  assert.equal(actual, fixture.expected, fixture.name);
  console.log(`FIXTURE=${fixture.name} MATCH=${actual}`);
}

const json = JSON.stringify(fixtures.map((fixture, index) => ({ ProcessId: 4100 + index, CommandLine: fixture.value })));
assert.deepEqual(parseDshWebPids(json, 9999), [4100, 4101]);
console.log("PARSED_PIDS=4100,4101");
console.log("PROCESS_MATCH_OK=true");
