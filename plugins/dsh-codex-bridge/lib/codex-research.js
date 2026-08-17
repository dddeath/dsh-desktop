import { homedir } from "node:os";
import { join } from "node:path";
import { prepareDshToCodex } from "./loop-guard.js";

function parseLastJson(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(lines[i]); } catch { /* continue */ }
  }
  return null;
}

function researchScriptPath() {
  return process.env.DSH_CODEX_SEARCH_SCRIPT || join(
    process.env.DSH_PROFILE_DIR || join(homedir(), ".dsh", "profiles", "web"),
    "node_modules", "dsh-codex-tools", "scripts", "codex-search.mjs",
  );
}

export function installCodexResearchTool(ctx, defineTool, sessionEnvelopes) {
  const tool = defineTool({
    name: "codex_research",
    description: "Delegate current-information research to the Codex subscription and return a concise summary with source URLs. This bridge has a hard loop guard: a conversation that entered DSH from Codex cannot call back into Codex.",
    parameters: {
      query: { type: "string", required: true, description: "Research question, up to 4000 characters." },
      maxSources: { type: "number", description: "1 to 10, default 5." },
      freshness: { type: "string", enum: ["cached", "live"], description: "Use live for time-sensitive research." },
      model: { type: "string", description: "Optional Codex backend model id." },
    },
    output: {
      schema: { type: "json" },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value, null, 2) }],
    },
    async execute(args, exec) {
      const query = String(args.query || "").trim();
      if (!query || query.length > 4000) return { ok: false, error: "invalid_query" };
      const sessionId = String(exec?.agent?.session?.id || exec?.agent?.session?.header?.id || "");
      const inbound = sessionEnvelopes.get(sessionId);
      const route = prepareDshToCodex(inbound);
      if (!route.ok) return route;

      const access = await ctx.credentials.resolve("OPENAI_CODEX_API_KEY").catch(() => undefined);
      const refresh = await ctx.credentials.resolve("OPENAI_CODEX_REFRESH_TOKEN").catch(() => undefined);
      const env = {
        CODEX_PREFER_AUTH_FILE: "1",
        CS_QUERY: query,
        CS_MAX_SOURCES: String(Math.max(1, Math.min(10, Number(args.maxSources) || 5))),
        CS_FRESHNESS: args.freshness === "live" ? "live" : "cached",
        DSH_CODEX_BRIDGE_ORIGIN: "dsh",
        DSH_CODEX_BRIDGE_TRACE_ID: route.envelope.traceId,
      };
      if (typeof args.model === "string" && args.model.trim()) env.CS_MODEL = args.model.trim();
      if (access?.value) env.CODEX_ACCESS_TOKEN = access.value;
      if (refresh?.value) env.CODEX_REFRESH_TOKEN = refresh.value;
      const script = researchScriptPath().replaceAll("\\", "/");
      try {
        const spec = ctx.shell.resolve({
          command: `node ${JSON.stringify(script)}`,
          env,
          timeoutMs: 180000,
          stdoutMaxBytes: 2 * 1024 * 1024,
          signal: exec.signal,
        });
        const run = await ctx.shell.run(spec);
        const result = parseLastJson(run.stdout);
        if (!result) return { ok: false, error: "backend_unavailable", exitCode: run.exitCode, envelope: route.envelope };
        return { ...result, envelope: route.envelope };
      } catch (error) {
        return { ok: false, error: "backend_unavailable", detail: String(error?.message || error).slice(0, 500), envelope: route.envelope };
      }
    },
  });
  return ctx.tools.register(tool);
}
