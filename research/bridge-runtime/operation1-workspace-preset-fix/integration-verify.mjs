import { randomUUID } from "node:crypto";

const base = "http://127.0.0.1:3080/__dsh-codex-bridge/v1";
const cwd = "E:\\deepseek_harness";
const conflictCwd = "E:\\deepseek_memory";
const sessionId = `session-contract-${randomUUID()}`;

function envelope(label) {
  return {
    protocol: "dsh-codex-bridge/1",
    traceId: `${label}-${randomUUID()}`,
    origin: "codex",
    hop: 0,
    visited: ["codex"],
  };
}

async function conversation(body) {
  const response = await fetch(`${base}/conversation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(600000),
  });
  return { status: response.status, body: await response.json() };
}

const missing = await conversation({ message: "missing cwd probe", envelope: envelope("missing") });
const created = await conversation({
  message: "Reply exactly SESSION_CONTRACT_OK. Do not delegate and do not call codex_research.",
  sessionId,
  cwd,
  envelope: envelope("create"),
});

const tracesResponse = await fetch(`${base}/prompts?limit=50&sessionId=${encodeURIComponent(sessionId)}`);
const traces = (await tracesResponse.json()).value || [];
const loadedTraces = [];
for (const candidate of traces) {
  const traceResponse = await fetch(`${base}/prompt?id=${encodeURIComponent(candidate.id)}`);
  loadedTraces.push((await traceResponse.json()).value);
}
const trace = loadedTraces.sort((a, b) => (b.request?.tools?.length || 0) - (a.request?.tools?.length || 0))[0];
const toolNames = (trace.request.tools || []).map((entry) => entry.name);

const conflict = await conversation({
  message: "conflicting cwd probe",
  sessionId,
  cwd: conflictCwd,
  envelope: envelope("conflict"),
});

const summary = {
  ok: missing.status === 400 && missing.body.error === "workspace_required"
    && created.status === 200 && created.body.value?.cwd === cwd
    && Boolean(created.body.value?.agentPreset)
    && ["bash", "read", "write"].every((name) => toolNames.includes(name))
    && conflict.status === 400 && conflict.body.error === "workspace_conflict",
  sessionId,
  missing,
  created: {
    status: created.status,
    cwd: created.body.value?.cwd,
    agentPreset: created.body.value?.agentPreset,
    assistantText: created.body.value?.assistantText,
  },
  tools: {
    count: toolNames.length,
    requiredPresent: ["bash", "read", "write"].filter((name) => toolNames.includes(name)),
    names: toolNames,
  },
  conflict,
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
