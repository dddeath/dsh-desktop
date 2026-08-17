import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PromptTraceStore } from "../lib/trace-store.js";

test("captures complete prompt-bearing request fields", () => {
  const root = mkdtempSync(join(tmpdir(), "dsh-trace-"));
  try {
    const store = new PromptTraceStore(root);
    const saved = store.capture({
      sessionId: "s1", provider: "p", model: "m", system: "SYS",
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
      tools: [{ name: "t", description: "tool", parameters: { type: "object" } }],
      reasoningEffort: "high", temperature: 0.2, maxTokens: 123, stop: ["END"],
      signal: new AbortController().signal,
    }, { traceId: "bridge-trace" });
    const loaded = store.get(saved.id);
    assert.equal(loaded.request.system, "SYS");
    assert.equal(loaded.request.messages[0].content[0].text, "hello");
    assert.equal(loaded.request.tools[0].name, "t");
    assert.equal("signal" in loaded.request, false);
    assert.equal(store.list(10, "s1")[0].id, saved.id);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
