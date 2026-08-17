import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

export const DEFAULT_BASE_URL = process.env.DSH_BASE_URL || "http://127.0.0.1:3080";
const STATE_ROOT = process.env.DSH_CODEX_BRIDGE_STATE_DIR || join(homedir(), ".dsh", "codex-bridge");
const PID_PATH = join(STATE_ROOT, "dsh-web.pid");
const LOG_PATH = join(STATE_ROOT, "dsh-web.log");
const NODE = process.env.DSH_NODE || join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe");
const DSH_BIN = process.env.DSH_BIN_JS || join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "npm", "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export async function request(path, { method = "GET", body, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request timeout")), timeoutMs);
  try {
    const response = await fetch(new URL(path, DEFAULT_BASE_URL), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let value;
    try { value = JSON.parse(text); } catch { value = { ok: false, error: "invalid_json", detail: text.slice(0, 1000) }; }
    if (!response.ok && value.ok !== false) value = { ok: false, error: `http_${response.status}`, value };
    return value;
  } finally {
    clearTimeout(timer);
  }
}

async function probeRoot() {
  try {
    const response = await fetch(DEFAULT_BASE_URL, { signal: AbortSignal.timeout(3000) });
    const text = await response.text();
    return response.status === 200 && text.includes("__DSH_BOOT__");
  } catch { return false; }
}

async function bridgeHealth() {
  try { return await request("/__dsh-codex-bridge/v1/health", { timeoutMs: 3000 }); }
  catch { return { ok: false, error: "bridge_unavailable" }; }
}

function readManagedPid() {
  try {
    const pid = Number(readFileSync(PID_PATH, "utf8").trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch { return null; }
}

function pidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function instanceStatus() {
  const pid = readManagedPid();
  const running = await probeRoot();
  return {
    ok: true,
    running,
    baseUrl: DEFAULT_BASE_URL,
    ownership: pid && pidAlive(pid) ? "mcp-managed" : running ? "external" : "none",
    pid: pid && pidAlive(pid) ? pid : null,
    bridge: running ? await bridgeHealth() : { ok: false, error: "dsh_not_running" },
    logPath: LOG_PATH,
  };
}

export async function startInstance({ timeoutMs = 60000 } = {}) {
  const before = await instanceStatus();
  if (before.running) return { ...before, action: "already_running" };
  mkdirSync(STATE_ROOT, { recursive: true });
  appendFileSync(LOG_PATH, `\n[${new Date().toISOString()}] start ${NODE} ${DSH_BIN} web --port 3080\n`);
  const out = openSync(LOG_PATH, "a");
  const child = spawn(NODE, [DSH_BIN, "web", "--port", "3080"], {
    cwd: process.cwd(),
    detached: true,
    windowsHide: true,
    stdio: ["ignore", out, out],
    env: withNodePath(process.env),
  });
  closeSync(out);
  child.unref();
  writeFileSync(PID_PATH, String(child.pid));
  const deadline = Date.now() + Math.max(5000, Math.min(120000, Number(timeoutMs) || 60000));
  while (Date.now() < deadline) {
    if (await probeRoot()) return { ...(await instanceStatus()), action: "started" };
    if (!pidAlive(child.pid)) break;
    await delay(500);
  }
  return { ok: false, error: "startup_failed", pid: child.pid, logPath: LOG_PATH };
}

function withNodePath(env) {
  const result = { ...env };
  const key = Object.keys(result).find((name) => name.toLowerCase() === "path") || "Path";
  const nodeDir = dirname(NODE);
  result[key] = [nodeDir, result[key] || ""].filter(Boolean).join(";");
  return result;
}

function taskkill(pid) {
  return spawnSync("taskkill.exe", ["/pid", String(pid), "/T", "/F"], { encoding: "utf8", windowsHide: true });
}

function discoverDshPids() {
  const script = [
    "$rows=Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '@deepseek-ai[\\\\/]dsh[\\\\/]lib[\\\\/]bin\\.js' -and ($_.CommandLine -match '\\sweb(\\s|$)' -or $_.CommandLine -match '--profile(?:=|\\s+)web') };",
    "$rows | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
  ].join(" ");
  const run = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
  if (run.status !== 0 || !run.stdout.trim()) return [];
  try {
    const value = JSON.parse(run.stdout);
    return (Array.isArray(value) ? value : [value]).map((row) => Number(row.ProcessId)).filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch { return []; }
}

export async function stopInstance({ forceExternal = false } = {}) {
  const before = await instanceStatus();
  if (!before.running) return { ...before, action: "already_stopped" };
  let pids = before.pid ? [before.pid] : [];
  if (!pids.length && forceExternal) pids = discoverDshPids();
  if (!pids.length) return { ok: false, error: "external_instance", detail: "Set forceExternal=true to stop a verified DSH web process." };
  const results = pids.map((pid) => ({ pid, exitCode: taskkill(pid).status }));
  try { unlinkSync(PID_PATH); } catch { /* absent */ }
  for (let i = 0; i < 30 && await probeRoot(); i += 1) await delay(200);
  return { ok: !(await probeRoot()), action: "stopped", results };
}

export async function restartInstance(options = {}) {
  const stopped = await stopInstance(options);
  if (!stopped.ok) return stopped;
  return startInstance(options);
}

export function runPluginCommand(action, target) {
  const allowed = new Set(["list", "add", "remove", "update", "install"]);
  if (!allowed.has(action)) return { ok: false, error: "invalid_action" };
  const args = [DSH_BIN, "plugin", "--profile", "web", action];
  if (target) args.push(String(target));
  const run = spawnSync(NODE, args, { encoding: "utf8", windowsHide: true, env: withNodePath(process.env), timeout: 180000 });
  return { ok: run.status === 0, action, target: target || null, exitCode: run.status, stdout: run.stdout, stderr: run.stderr };
}

export const paths = { stateRoot: STATE_ROOT, pidPath: PID_PATH, logPath: LOG_PATH, node: NODE, dshBin: DSH_BIN };
