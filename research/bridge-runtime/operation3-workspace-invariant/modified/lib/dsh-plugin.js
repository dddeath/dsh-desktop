import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createEnvelope, enterBridge, normalizeEnvelope } from "./loop-guard.js";
import { PromptTraceStore } from "./trace-store.js";
import { query, readJsonBody, sendJson } from "./http-utils.js";
import { installCodexResearchTool } from "./codex-research.js";
import { assertWorkspaceMatch, resolveWorkspaceDirectory, WorkspaceContractError } from "./session-contract.js";
import { ensureDefaultWorkspace, ensureSessionWorkspace, reconcileSessionWorkspaces, sessionHeader, workspaceForSession } from "./workspace-invariant.js";

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
export const inject = ["webServer", "agents", "sessions", "sessionQuery", "agentDefaultModel", "tools", "shell", "credentials", "systemPrompt", "workspaceRegistry"];
const BASE = "/__dsh-codex-bridge/v1";
const DEFAULT_WORKSPACE_PATH = resolve(process.env.DSH_CODEX_DEFAULT_WORKSPACE || join(homedir(), ".dsh", "default-workspace"));
const DEFAULT_WORKSPACE_TITLE = "默认工作区";

function setupModel(ctx) {
  const selection = ctx.agentDefaultModel.currentSelection();
  return {
    selection,
    setup(agentCtx) { installModelSelection(agentCtx, { current: selection, assembled: undefined }); },
  };
}

async function composeAgent(ctx, presetId) {
  const model = setupModel(ctx);
  const presets = ctx.get("agentPresets");
  if (presets === undefined) return model;
  const resolvedPreset = (await presets.resolve(presetId)).id;
  return {
    selection: model.selection,
    agentPreset: resolvedPreset,
    async setup(agentCtx) {
      model.setup(agentCtx);
      await presets.mount(agentCtx, resolvedPreset);
    },
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
  let invariantQueue = Promise.resolve();
  let invariantState = {
    hardConstraint: true,
    ready: false,
    defaultWorkspace: null,
    totalSessions: 0,
    groupedSessions: 0,
    ungroupedSessionIds: [],
    failures: [],
    lastReconciledAt: null,
  };

  async function ensureWorkspace(cwd) {
    const existing = await ctx.workspaceRegistry.resolveByPath(cwd);
    return existing || ctx.workspaceRegistry.create(cwd);
  }

  function serializeInvariant(operation) {
    const run = invariantQueue.then(operation, operation);
    invariantQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  async function ensureDefault() {
    await mkdir(DEFAULT_WORKSPACE_PATH, { recursive: true });
    return ensureDefaultWorkspace(ctx.workspaceRegistry, DEFAULT_WORKSPACE_PATH, DEFAULT_WORKSPACE_TITLE);
  }

  async function reconcileAllSessions() {
    return serializeInvariant(async () => {
      const defaultWorkspace = await ensureDefault();
      const records = await ctx.sessionQuery.listSessions();
      const result = await reconcileSessionWorkspaces(ctx.workspaceRegistry, records);
      invariantState = {
        hardConstraint: true,
        ready: result.failures.length === 0 && result.ungroupedSessionIds.length === 0,
        defaultWorkspace: {
          id: defaultWorkspace.id,
          title: defaultWorkspace.title,
          path: defaultWorkspace.path,
          sessionIds: [...defaultWorkspace.sessionIds],
        },
        ...result,
        lastReconciledAt: new Date().toISOString(),
      };
      return invariantState;
    });
  }

  async function attachSessionInvariant(record) {
    return serializeInvariant(async () => {
      await ensureDefault();
      const workspace = await ensureSessionWorkspace(ctx.workspaceRegistry, record);
      const records = await ctx.sessionQuery.listSessions();
      const ungroupedSessionIds = records
        .map((candidate) => String(sessionHeader(candidate)?.id || ""))
        .filter((id) => id && workspaceForSession(ctx.workspaceRegistry.list(), id) === undefined);
      invariantState = {
        ...invariantState,
        ready: ungroupedSessionIds.length === 0,
        totalSessions: records.length,
        groupedSessions: records.length - ungroupedSessionIds.length,
        ungroupedSessionIds,
        failures: [],
        lastReconciledAt: new Date().toISOString(),
      };
      return workspace;
    });
  }

  function requireInvariantReady(state) {
    if (state.ready) return state;
    throw new WorkspaceContractError(
      "workspace_invariant_failed",
      `workspace invariant rejected the operation: ${state.ungroupedSessionIds.length} ungrouped session(s), ${state.failures.length} attachment failure(s)`,
    );
  }

  const initialInvariant = reconcileAllSessions().catch((error) => {
    invariantState = {
      ...invariantState,
      ready: false,
      failures: [{ sessionId: null, cwd: null, code: error?.code || "workspace_invariant_failed", detail: String(error?.message || error) }],
      lastReconciledAt: new Date().toISOString(),
    };
    return invariantState;
  });

  const offSessionCreated = ctx.on("session/created", (session) => {
    const header = sessionHeader(session);
    if (typeof header?.cwd !== "string" || header.cwd.trim().length === 0) {
      throw new WorkspaceContractError("session_workspace_required", `session ${String(header?.id || "")} has no cwd; every session must belong to a workspace`);
    }
    void attachSessionInvariant({ header }).catch((error) => {
      invariantState = {
        ...invariantState,
        ready: false,
        failures: [{ sessionId: String(header.id), cwd: header.cwd, code: error?.code || "workspace_invariant_failed", detail: String(error?.message || error) }],
        lastReconciledAt: new Date().toISOString(),
      };
      ctx.logger.warn(`workspace invariant could not attach session ${String(header.id)}: ${String(error?.message || error)}`);
    });
  }, { global: true });

  const defaultWorkspaceTimer = setInterval(() => {
    void serializeInvariant(ensureDefault).catch((error) => {
      ctx.logger.warn(`workspace invariant could not retain the default workspace: ${String(error?.message || error)}`);
    });
  }, 60000);
  defaultWorkspaceTimer.unref?.();

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
    if (agent) {
      assertWorkspaceMatch(sessionId, cwd, agent.session.header.cwd);
      return agent;
    }
    if (ownedHandles.has(sessionId)) {
      agent = ownedHandles.get(sessionId).agent;
      assertWorkspaceMatch(sessionId, cwd, agent.session.header.cwd);
      return agent;
    }
    const records = await ctx.sessionQuery.listSessions();
    const record = records.find((candidate) => String(candidate.header.id) === sessionId);
    if (record) assertWorkspaceMatch(sessionId, cwd, record.header.cwd);
    const composition = await composeAgent(ctx, record?.header?.agentPreset);
    const handle = record
      ? await ctx.agents.resume({ resumeSessionId: id, setup: composition.setup })
      : await ctx.agents.create({
          sessionId: id,
          meta: {
            cwd,
            ...(composition.agentPreset === undefined ? {} : { agentPreset: composition.agentPreset }),
          },
          agentOptions: { provider: composition.selection.provider, model: composition.selection.model },
          setup: composition.setup,
        });
    ownedHandles.set(sessionId, handle);
    return handle.agent;
  }

  const routes = [
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/health`, async handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        await initialInvariant;
        sendJson(res, 200, { ok: invariantState.ready, value: { version: "0.1.3", traceRoot: traces.root, protocol: "dsh-codex-bridge/1", maxHops: 2, workspaceInvariant: invariantState } });
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/workspace-invariant`, async handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        const value = await reconcileAllSessions();
        sendJson(res, value.ready ? 200 : 409, { ok: value.ready, value });
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/workspaces`, async handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        requireInvariantReady(await reconcileAllSessions());
        sendJson(res, 200, { ok: true, value: ctx.workspaceRegistry.list().map((workspace) => ({
          id: workspace.id,
          title: workspace.title,
          path: workspace.path,
          sessionIds: [...workspace.sessionIds],
          isDefault: workspace.path === DEFAULT_WORKSPACE_PATH,
        })) });
      },
    }),
    ctx.webServer.register({
      kind: "exact", path: `${BASE}/sessions`, async handler(req, res) {
        if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
        try {
          requireInvariantReady(await reconcileAllSessions());
          const records = await ctx.sessionQuery.listSessions();
          const workspaces = ctx.workspaceRegistry.list();
          sendJson(res, 200, { ok: true, value: records.map((record) => {
            const workspace = workspaceForSession(workspaces, sessionHeader(record)?.id);
            return { ...record, workspace: workspace ? { id: workspace.id, title: workspace.title, path: workspace.path } : null };
          }) });
        }
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
          requireInvariantReady(await initialInvariant);
          const cwd = await resolveWorkspaceDirectory(body.cwd);
          const sessionId = String(body.sessionId || `session-${randomUUID()}`);
          sessionEnvelopes.set(sessionId, route.envelope);
          await ensureWorkspace(cwd);
          const agent = await acquireAgent(sessionId, cwd);
          const workspace = await attachSessionInvariant({ header: agent.session.header });
          requireInvariantReady(invariantState);
          await agent.whenIdle();
          const firstSeq = agent.session.seq;
          agent.followup(createUserMessage({ content: [{ type: "text", text }], source: { kind: "user" } }));
          await agent.whenIdle();
          await ctx.sessions.flush(agent.session);
          const snapshot = summarizeSession(await ctx.sessionQuery.readSession(SessionId(sessionId)));
          sendJson(res, 200, { ok: true, value: {
            sessionId,
            cwd: agent.session.header.cwd,
            agentPreset: agent.session.header.agentPreset || null,
            workspaceId: workspace.id,
            workspaceTitle: workspace.title,
            firstSeq,
            envelope: route.envelope,
            session: snapshot.session,
            assistantText: snapshot.assistantText,
            lastSeq: snapshot.lastSeq,
          } });
        } catch (error) {
          const workspaceError = error instanceof WorkspaceContractError;
          sendJson(res, workspaceError ? error.statusCode : 500, {
            ok: false,
            error: workspaceError ? error.code : "conversation_failed",
            detail: String(error?.message || error).slice(0, 1000),
          });
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
    clearInterval(defaultWorkspaceTimer);
    offSessionCreated();
    for (const off of routes.reverse()) off();
    offResearch();
    offContext();
    offPrompt();
    for (const handle of ownedHandles.values()) await handle.dispose().catch(() => undefined);
  };
}
