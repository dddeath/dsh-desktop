import test from "node:test";
import assert from "node:assert/strict";
import { assertMcpEntryAllowed, createEnvelope, enterBridge, MAX_BRIDGE_HOPS, prepareDshToCodex } from "../lib/loop-guard.js";

test("Codex can enter DSH exactly once", () => {
  const route = enterBridge(createEnvelope("codex", "trace-a"), "codex", "dsh");
  assert.equal(route.ok, true);
  assert.equal(route.envelope.hop, 1);
  assert.deepEqual(route.envelope.visited, ["codex", "dsh"]);
});

test("DSH cannot call Codex after a Codex-originated entry", () => {
  const first = enterBridge(createEnvelope("codex", "trace-b"), "codex", "dsh");
  const second = enterBridge(first.envelope, "dsh", "codex");
  assert.deepEqual(second, { ok: false, error: "loop_blocked", envelope: first.envelope });
});

test("DSH-originated Codex process cannot re-enter MCP", () => {
  const route = assertMcpEntryAllowed({ DSH_CODEX_BRIDGE_ORIGIN: "dsh" }, createEnvelope("codex"));
  assert.equal(route.ok, false);
  assert.equal(route.error, "loop_blocked");
});

test("MCP passes a fresh envelope to the DSH boundary without pre-consuming a hop", () => {
  const route = assertMcpEntryAllowed({}, createEnvelope("codex", "trace-fresh"));
  assert.equal(route.ok, true);
  assert.equal(route.envelope.hop, 0);
  assert.deepEqual(route.envelope.visited, ["codex"]);
});

test("DSH research tool rejects an envelope that already visited Codex", () => {
  const inbound = enterBridge(createEnvelope("codex", "trace-tool"), "codex", "dsh").envelope;
  const route = prepareDshToCodex(inbound);
  assert.equal(route.ok, false);
  assert.equal(route.error, "loop_blocked");
});

test("hop limit is finite and two", () => {
  assert.equal(MAX_BRIDGE_HOPS, 2);
  const envelope = { protocol: "dsh-codex-bridge/1", traceId: "trace-c", origin: "codex", hop: 2, visited: ["codex"] };
  const route = enterBridge(envelope, "codex", "dsh");
  assert.equal(route.ok, false);
  assert.equal(route.error, "hop_limit");
});
