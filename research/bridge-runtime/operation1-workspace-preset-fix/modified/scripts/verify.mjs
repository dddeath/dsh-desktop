#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { assertMcpEntryAllowed } from "../lib/loop-guard.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const workspace = resolve(packageRoot, "..", "..");
const serverPath = join(packageRoot, "lib", "mcp-server.js");
const node = process.execPath;

const client = new Client({ name: "dsh-codex-bridge-verifier", version: "0.1.0" });
const transport = new StdioClientTransport({ command: node, args: [serverPath], cwd: workspace });
await client.connect(transport);

async function call(name, args = {}) {
  const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 60000 });
  return JSON.parse(response.content[0].text);
}

try {
  const tools = await client.listTools();
  const conversationSend = tools.tools.find((entry) => entry.name === "dsh_conversation_send");
  const conversationRequired = conversationSend?.inputSchema?.required || [];
  const status = await call("dsh_instance_status");
  const plugins = await call("dsh_plugin_list");
  const traces = await call("dsh_prompt_trace_list", { limit: 50 });
  const candidates = (traces.value || []).filter((entry) => entry.provider === "opencode-go").slice(0, 20);
  const loadedPrompts = [];
  for (const candidate of candidates) loadedPrompts.push(await call("dsh_prompt_trace_get", { id: candidate.id }));
  const prompt = loadedPrompts
    .filter((entry) => entry.ok)
    .sort((a, b) => (b.value.request?.tools?.length || 0) - (a.value.request?.tools?.length || 0))[0] || null;
  const sessionId = prompt?.value?.sessionId;
  const conversation = sessionId ? await call("dsh_conversation_get", { sessionId }) : null;
  const dshOriginGuard = assertMcpEntryAllowed({ DSH_CODEX_BRIDGE_ORIGIN: "dsh" });
  const pluginItems = plugins.value?.plugins || [];
  const summary = {
    ok: Boolean(
      status.ok && status.running && status.bridge?.ok &&
      tools.tools.length === 12 &&
      conversationRequired.includes("cwd") &&
      pluginItems.some((entry) => entry.name === "dsh-codex-bridge") &&
      prompt?.ok && prompt.value?.request?.system && Array.isArray(prompt.value?.request?.messages) &&
      dshOriginGuard.ok === false && dshOriginGuard.error === "loop_blocked"
    ),
    mcp: { toolCount: tools.tools.length, toolNames: tools.tools.map((entry) => entry.name) },
    sessionContract: {
      cwdRequired: conversationRequired.includes("cwd"),
      cwdDescription: conversationSend?.inputSchema?.properties?.cwd?.description || null,
    },
    instance: status,
    plugin: { count: pluginItems.length, bridgeInstalled: pluginItems.some((entry) => entry.name === "dsh-codex-bridge") },
    prompt: prompt?.ok ? {
      id: prompt.value.id,
      sessionId: prompt.value.sessionId,
      traceId: prompt.value.envelope?.traceId,
      provider: prompt.value.request.provider,
      model: prompt.value.request.model,
      systemChars: prompt.value.request.system?.length || 0,
      messageCount: prompt.value.request.messages?.length || 0,
      toolCount: prompt.value.request.tools?.length || 0,
    } : null,
    conversation: conversation?.ok ? {
      sessionId,
      assistantText: conversation.value.assistantText,
      lastSeq: conversation.value.lastSeq,
    } : null,
    loopGuard: dshOriginGuard,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
} finally {
  await client.close();
}
