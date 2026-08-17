import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

function jsonClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export class PromptTraceStore {
  constructor(root = process.env.DSH_CODEX_BRIDGE_TRACE_DIR || join(homedir(), ".dsh", "codex-bridge", "prompt-traces")) {
    this.root = root;
    mkdirSync(root, { recursive: true });
  }

  capture(options, envelope) {
    const id = randomUUID();
    const trace = {
      schema: "dsh-full-prompt-trace/1",
      id,
      capturedAt: new Date().toISOString(),
      sessionId: options.sessionId === undefined ? null : String(options.sessionId),
      envelope: envelope || null,
      request: {
        provider: options.provider ?? null,
        model: options.model ?? null,
        reasoningEffort: options.reasoningEffort ?? null,
        system: options.system ?? null,
        messages: jsonClone(options.messages ?? []),
        tools: jsonClone(options.tools ?? []),
        temperature: options.temperature ?? null,
        maxTokens: options.maxTokens ?? null,
        stop: jsonClone(options.stop ?? null),
      },
    };
    const path = join(this.root, `${id}.json`);
    writeFileSync(path, JSON.stringify(trace, null, 2), { mode: 0o600 });
    return { ...trace, path };
  }

  list(limit = 50, sessionId) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    return readdirSync(this.root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^[0-9a-f-]{36}\.json$/i.test(entry.name))
      .map((entry) => {
        try {
          const value = JSON.parse(readFileSync(join(this.root, entry.name), "utf8"));
          return {
            id: value.id,
            capturedAt: value.capturedAt,
            sessionId: value.sessionId,
            provider: value.request?.provider ?? null,
            model: value.request?.model ?? null,
            traceId: value.envelope?.traceId ?? null,
          };
        } catch {
          return null;
        }
      })
      .filter((value) => value && (!sessionId || value.sessionId === String(sessionId)))
      .sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)))
      .slice(0, safeLimit);
  }

  get(id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
    try {
      return JSON.parse(readFileSync(join(this.root, `${id}.json`), "utf8"));
    } catch {
      return null;
    }
  }
}
