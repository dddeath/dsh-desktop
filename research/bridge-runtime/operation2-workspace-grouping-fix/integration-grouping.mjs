import { randomUUID } from "node:crypto";

const base = "http://127.0.0.1:3080/__dsh-codex-bridge/v1";
const cwd = "E:\\deepseek_harness";
const sessionId = `session-grouping-${randomUUID()}`;
const body = {
  message: "Reply exactly WORKSPACE_GROUPING_OK. Do not delegate and do not call codex_research.",
  sessionId,
  cwd,
  envelope: {
    protocol: "dsh-codex-bridge/1",
    traceId: `trace-${sessionId}`,
    origin: "codex",
    hop: 0,
    visited: ["codex"],
  },
};

const response = await fetch(`${base}/conversation`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(600000),
});
const conversation = await response.json();
const workspaceResponse = await fetch(`${base}/workspaces`);
const workspaces = await workspaceResponse.json();
const grouped = (workspaces.value || []).find((workspace) => workspace.sessionIds.includes(sessionId));

const summary = {
  ok: response.status === 200
    && conversation.value?.cwd === cwd
    && Boolean(conversation.value?.workspaceId)
    && grouped?.id === conversation.value.workspaceId,
  status: response.status,
  sessionId,
  cwd: conversation.value?.cwd,
  agentPreset: conversation.value?.agentPreset,
  assistantText: conversation.value?.assistantText,
  responseWorkspace: {
    id: conversation.value?.workspaceId,
    title: conversation.value?.workspaceTitle,
  },
  registryWorkspace: grouped || null,
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
