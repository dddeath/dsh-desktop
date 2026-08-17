#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { assertMcpEntryAllowed, createEnvelope } from "./loop-guard.js";
import { instanceStatus, request, restartInstance, runPluginCommand, startInstance, stopInstance } from "./dsh-client.js";

const server = new McpServer({ name: "dsh-control", version: "0.1.1" }, {
  instructions: [
    "Control the local DeepSeek Harness instance, conversations, plugins, and exact final LLM prompt traces.",
    "Every Codex-to-DSH conversation must use the bridge envelope returned by this server.",
    "Hard loop rule: when DSH_CODEX_BRIDGE_ORIGIN=dsh, all DSH re-entry tools return loop_blocked.",
    "Prompt traces are read-only snapshots. Future memory plugins should modify prompt assembly through DSH systemPrompt contributions, not by mutating llm/stream requests.",
  ].join(" "),
});

function result(value, isError = value?.ok === false) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value && typeof value === "object" ? value : { value },
    isError,
  };
}

function guard(envelope) {
  return assertMcpEntryAllowed(process.env, envelope || createEnvelope("codex"));
}

server.registerTool("dsh_instance_status", {
  description: "Get DSH Web and bridge status without changing the instance.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async () => result(await instanceStatus(), false));

server.registerTool("dsh_instance_start", {
  description: "Start DSH Web on 127.0.0.1:3080, or attach if it is already running.",
  inputSchema: { timeoutMs: z.number().int().min(5000).max(120000).optional() },
  annotations: { destructiveHint: false, openWorldHint: false },
}, async (args) => result(await startInstance(args)));

server.registerTool("dsh_instance_stop", {
  description: "Stop the MCP-managed DSH instance. External DSH processes require forceExternal=true and are command-line verified before termination.",
  inputSchema: { forceExternal: z.boolean().optional() },
  annotations: { destructiveHint: true, openWorldHint: false },
}, async (args) => result(await stopInstance(args)));

server.registerTool("dsh_instance_restart", {
  description: "Restart DSH. Use forceExternal=true only when the desktop app owns the verified DSH process.",
  inputSchema: { forceExternal: z.boolean().optional(), timeoutMs: z.number().int().min(5000).max(120000).optional() },
  annotations: { destructiveHint: true, openWorldHint: false },
}, async (args) => result(await restartInstance(args)));

server.registerTool("dsh_conversation_list", {
  description: "List DSH conversations from the live-preferred session corpus.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async () => result(await request("/__dsh-codex-bridge/v1/sessions")));

server.registerTool("dsh_conversation_get", {
  description: "Read the complete event log and latest assistant text for one DSH conversation.",
  inputSchema: { sessionId: z.string().min(1) },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ sessionId }) => result(await request(`/__dsh-codex-bridge/v1/session?id=${encodeURIComponent(sessionId)}`)));

server.registerTool("dsh_conversation_send", {
  description: "Create or continue a DSH conversation in the explicit cwd workspace and wait for its agent response. Always pass the real target directory in cwd; a path written only inside message does not set the workspace. The default DSH agent preset is mounted so workspace and shell tools are available. Captures the exact final provider prompt. Nested Codex/DSH re-entry is blocked.",
  inputSchema: {
    message: z.string().min(1).max(200000),
    sessionId: z.string().min(1).optional(),
    cwd: z.string().min(1).describe("Existing target workspace directory. Required for both new and continued sessions; it must match the session's bound cwd."),
    envelope: z.object({
      protocol: z.string().optional(),
      traceId: z.string().min(1),
      origin: z.enum(["codex", "dsh"]),
      hop: z.number().int().min(0),
      visited: z.array(z.enum(["codex", "dsh"])),
    }).optional(),
  },
  annotations: { destructiveHint: false, openWorldHint: true },
}, async ({ message, sessionId, cwd, envelope }) => {
  const route = guard(envelope);
  if (!route.ok) return result(route, true);
  return result(await request("/__dsh-codex-bridge/v1/conversation", {
    method: "POST",
    timeoutMs: 600000,
    body: { message, sessionId, cwd, envelope: route.envelope },
  }));
});

server.registerTool("dsh_prompt_trace_list", {
  description: "List exact final DSH-to-provider prompt captures. Each capture includes system, messages, tool schemas, model, and generation settings.",
  inputSchema: { limit: z.number().int().min(1).max(200).optional(), sessionId: z.string().min(1).optional() },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ limit = 50, sessionId }) => {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (sessionId) qs.set("sessionId", sessionId);
  return result(await request(`/__dsh-codex-bridge/v1/prompts?${qs}`));
});

server.registerTool("dsh_prompt_trace_get", {
  description: "Read one exact final DSH provider request snapshot by trace id.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ id }) => result(await request(`/__dsh-codex-bridge/v1/prompt?id=${encodeURIComponent(id)}`)));

server.registerTool("dsh_plugin_list", {
  description: "List installed/running DSH plugins through the local plugin control center.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async () => {
  const snapshot = await request("/__dsh-plugin-control-center/snapshot").catch(() => null);
  return result(snapshot?.ok ? snapshot : runPluginCommand("list"));
});

server.registerTool("dsh_plugin_plan", {
  description: "Create a safety snapshot and stage a DSH plugin action without applying it.",
  inputSchema: {
    action: z.enum(["stage-enable", "stage-disable", "update", "remove", "restore"]),
    name: z.string().min(1),
  },
  annotations: { destructiveHint: false, openWorldHint: false },
}, async ({ action, name }) => result(await request("/__dsh-plugin-control-center/plan", { method: "POST", body: { action, name } })));

server.registerTool("dsh_plugin_apply", {
  description: "Apply a DSH profile package command. add accepts a package/path; remove and update accept a package name; install refreshes the profile. Restart DSH afterward.",
  inputSchema: {
    action: z.enum(["add", "remove", "update", "install"]),
    target: z.string().min(1).optional(),
  },
  annotations: { destructiveHint: true, openWorldHint: true },
}, async ({ action, target }) => result(runPluginCommand(action, target)));

const transport = new StdioServerTransport();
await server.connect(transport);
