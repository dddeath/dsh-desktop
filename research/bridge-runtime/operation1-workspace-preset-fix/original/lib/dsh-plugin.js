import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createEnvelope, enterBridge, normalizeEnvelope } from "./loop-guard.js";
import { PromptTraceStore } from "./trace-store.js";
import { query, readJsonBody, sendJson } from "./http-utils.js";
import { installCodexResearchTool } from "./codex-research.js";

const hostPackage = process.env.DSH_HOST_PACKAGE_JSON || join(
  process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
  "npm", "node_modules", "@deepseek-ai", "dsh", "package.json",
);
const hostRequire = createRequire(hostPackage);
const hostImport = (name) => import(pathToFileURL(hostRequire.resolve(name)).href);
const [{ installModelSelection }, { createUserMessage }, { SessionId }, { defineTool }] = await Promise.all([
  hostImport("@deepseek-ai/dsh-agent"),
  hostImport("@deepseek-ai/dsh-llm"),
  hostImport("@deepseek-ai/dsh-session"),
  hostImport("@deepseek-ai/dsh-tools"),
]);

export const name = "dsh-codex-bridge";
export const inject = ["webServer", "agents", "sessions", "sessionQuery", "agentDefaultModel", "tools", "shell", "credentials", "systemPrompt"];
const BASE = "/__dsh-codex-bridge/v1";

function setupModel(ctx) {
  const selection = ctx.agentDefaultModel.currentSelection();
  return {
    selection,
    setup(agentCtx) { installModelSelection(agentCtx, { current: selection, assembled: undefined }); },
  };
}

function eventText(event) {
  const content = event?.data?.message?.content || event?.message?.content || event?.data?.content || event?.content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("\n");
}

function summarizeSession(snapshot) {
  return {
    session: snapshot.session,
    events: snapshot.events,
    assistantText: snapshot.events.filter((event) => event.type === "assistant/message").map(eventText).filter(Boolean).at(-1) || "",
    lastSeq: snapshot.events.at(-1)?.seq ?? null,
  };
}

export function apply(ctx) {
  const traces = new PromptTraceStore();
  const sessionEnvelopes = new Map();
  const ownedHandles = new Map();

  const offPrompt = ctx.on("llm/stream", (options, next) => {
    const sid = options.sessionId === undefined ? "" : String(options.sessionId);
    traces.capture(options, sessionEnvelopes.get(sid));
    return next();
  });

  const offContext = ctx.systemPrompt.context({
    name: "dsh-codex-bridge:research",
    order: 125,
    text: "Use codex_research for current public information when helpful, then report concise findings with sources. Bridge calls carry a two-hop envelope; if a call returns loop_blocked, do not retry through the other bridge.",
  });
  const offResearch = installCodexResearchTool(ctx, defineTool, sessionEnvelopes);

  async function acquireAgent(sessionId, cwd) {
    const id = SessionId(sessionId);
    let agent = ctx.agents.get(id);
    if (agent) return agent;
    if (ownedHandles.has(sessionId)) return ownedHandles.get(sessionId).agent;
    const records = await ctx.sessionQuery.listSessions();
    const persisted = records.some((record) => String(record.header.id) === sessionId);
    const model = setupModel(ctx);
    const handle = persisted
      ? await ctx.agents.resume({ resumeSessionId: id, setup: model.setup })
      : await ctx.agents.create({
          sessionId: id,
          meta: { cwd: resolve(cwd || process.cwd()) },
          agentOptions: { provider: model.selection.provider, model: model.selection.model },
          setup: model.setup,
        });
    ownedHandles.set(sessionId, handle);
    return handle.agent;
  }

  const routes = [
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/health`, handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        sendJson(res, 200, { ok: true, value: { version: "0.1.0", traceRoot: traces.root, protocol: "dsh-codex-bridge/1", maxHops: 2 } });
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/sessions`, async handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        try { sendJson(res, 200, { ok: true, value: await ctx.sessionQuery.listSessions() }); }
        catch (error) { sendJson(res, 500, { ok: false, error: "sessions_failed", detail: error.message }); }
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/session`, async handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        const id = query(req).get("id");
        if (!id) return sendJson(res, 400, { ok: false, error: "session_id_required" });
        try { sendJson(res, 200, { ok: true, value: summarizeSession(await ctx.sessionQuery.readSession(SessionId(id))) }); }
        catch (error) { sendJson(res, 404, { ok: false, error: "session_not_found", detail: error.message }); }
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/conversation`, async handler(req, res) {
        if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        try {
          const body = await readJsonBody(req);
          const text = String(body.message || "").trim();
          if (!text || text.length > 200000) return sendJson(res, 400, { ok: false, error: "invalid_message" });
          const inbound = normalizeEnvelope(body.envelope, "codex");
          const route = enterBridge(inbound, "codex", "dsh");
          if (!route.ok) return sendJson(res, 409, route);
          const sessionId = String(body.sessionId || `session-${randomUUID()}`);
          sessionEnvelopes.set(sessionId, route.envelope);
          const agent = await acquireAgent(sessionId, body.cwd);
          await agent.whenIdle();
          const firstSeq = agent.session.seq;
          agent.followup(createUserMessage({ content: [{ type: "text", text }], source: { kind: "user" } }));
          await agent.whenIdle();
          await ctx.sessions.flush(agent.session);
          const snapshot = summarizeSession(await ctx.sessionQuery.readSession(SessionId(sessionId)));
          sendJson(res, 200, { ok: true, value: {
            sessionId,
            firstSeq,
            envelope: route.envelope,
            session: snapshot.session,
            assistantText: snapshot.assistantText,
            lastSeq: snapshot.lastSeq,
          } });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: "conversation_failed", detail: String(error?.message || error).slice(0, 1000) });
        }
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/prompts`, handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        const params = query(req);
        sendJson(res, 200, { ok: true, value: traces.list(params.get("limit"), params.get("sessionId")) });
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/prompt`, handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        const value = traces.get(query(req).get("id"));
        if (!value) return sendJson(res, 404, { ok: false, error: "prompt_not_found" });
        sendJson(res, 200, { ok: true, value });
      },
    }),
  ];

  return async () => {
    for (const off of routes.reverse()) off();
    offResearch();
    offContext();
    offPrompt();
    for (const handle of ownedHandles.values()) await handle.dispose().catch(() => undefined);
  };
}
