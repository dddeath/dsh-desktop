import { randomUUID } from "node:crypto";

export const BRIDGE_PROTOCOL = "dsh-codex-bridge/1";
export const MAX_BRIDGE_HOPS = 2;
const SIDES = new Set(["codex", "dsh"]);

function side(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!SIDES.has(normalized)) throw new TypeError(`${field} must be codex or dsh`);
  return normalized;
}

export function createEnvelope(origin, traceId = randomUUID()) {
  const normalized = side(origin, "origin");
  return Object.freeze({
    protocol: BRIDGE_PROTOCOL,
    traceId: String(traceId || randomUUID()),
    origin: normalized,
    hop: 0,
    visited: Object.freeze([normalized]),
  });
}

export function normalizeEnvelope(value, fallbackOrigin) {
  if (!value || typeof value !== "object") return createEnvelope(fallbackOrigin);
  const origin = side(value.origin || fallbackOrigin, "origin");
  const visited = Array.isArray(value.visited) ? value.visited.map((entry) => side(entry, "visited")) : [origin];
  if (!visited.includes(origin)) visited.unshift(origin);
  const hop = Number(value.hop);
  if (!Number.isInteger(hop) || hop < 0) throw new TypeError("hop must be a non-negative integer");
  return Object.freeze({
    protocol: BRIDGE_PROTOCOL,
    traceId: String(value.traceId || randomUUID()),
    origin,
    hop,
    visited: Object.freeze([...new Set(visited)]),
  });
}

export function enterBridge(value, from, to) {
  const source = side(from, "from");
  const target = side(to, "to");
  if (source === target) return { ok: false, error: "same_side_route", envelope: normalizeEnvelope(value, source) };
  const envelope = normalizeEnvelope(value, source);
  if (!envelope.visited.includes(source)) {
    return { ok: false, error: "source_not_visited", envelope };
  }
  if (envelope.visited.includes(target)) {
    return { ok: false, error: "loop_blocked", envelope };
  }
  if (envelope.hop >= MAX_BRIDGE_HOPS) {
    return { ok: false, error: "hop_limit", envelope };
  }
  return {
    ok: true,
    envelope: Object.freeze({
      ...envelope,
      hop: envelope.hop + 1,
      visited: Object.freeze([...envelope.visited, target]),
    }),
  };
}

export function assertMcpEntryAllowed(environment = process.env, value) {
  if (String(environment.DSH_CODEX_BRIDGE_ORIGIN || "").toLowerCase() === "dsh") {
    return { ok: false, error: "loop_blocked", detail: "DSH-originated Codex work cannot re-enter DSH." };
  }
  const envelope = normalizeEnvelope(value || createEnvelope("codex"), "codex");
  if (envelope.origin !== "codex" || envelope.visited.includes("dsh") || envelope.hop !== 0) {
    return { ok: false, error: "loop_blocked", detail: "MCP accepts only a fresh Codex-originated envelope.", envelope };
  }
  return { ok: true, envelope };
}

export function prepareDshToCodex(value) {
  const envelope = normalizeEnvelope(value || createEnvelope("dsh"), "dsh");
  if (envelope.visited.includes("codex")) {
    return { ok: false, error: "loop_blocked", detail: "A Codex-originated DSH turn cannot call Codex again.", envelope };
  }
  return enterBridge(envelope, "dsh", "codex");
}
