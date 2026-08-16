/**
 * dsh-desktop — a native desktop shell for DeepSeek Harness.
 *
 * Strategy: `dsh web` already ships a complete local Web GUI. This app
 * launches that server (hidden) and loads it into an Electron window, so
 * every official and community plugin keeps working exactly as in the
 * browser. If a DSH Web server is already running on the default port, the
 * app attaches to it instead of starting a second one.
 *
 * Lifecycle:
 *   1. probe http://127.0.0.1:3080 — if it serves the DSH frontend, attach
 *   2. otherwise spawn `dsh web --port <port>` (windowsHide), read the
 *      "dsh web: http://…" line from its stdout to learn the URL
 *      (works with --port 0 fallback when the port is taken by non-DSH)
 *   3. open a BrowserWindow on that URL
 *   4. on quit, kill only the server process we spawned (attach mode and
 *      DSH_DESKTOP_KEEP_RUNNING=1 leave it alive)
 */
const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const net = require("net");
const http = require("http");
const { parseDshWebPids } = require("./dsh-process");

const DEFAULT_PORT = 3080;
const STARTUP_TIMEOUT_MS = 60000;

let child = null; // the dsh web process we spawned (null when attaching)
let attached = false;
let mainWindow = null;
let quitting = false;
let serverOrigin = null; // origin of the DSH server the window is allowed to navigate within
let restartPhase = "ready";
let cachedDshVersion = null;

const log = (...args) => console.log("[dsh-desktop]", ...args);

// ---------------------------------------------------------------- helpers

function readDshVersion() {
  if (cachedDshVersion !== null) return cachedDshVersion;
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const packageFile = path.join(appData, "npm", "node_modules", "@deepseek-ai", "dsh", "package.json");
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    cachedDshVersion = typeof packageJson.version === "string" ? packageJson.version : "unknown";
  } catch {
    cachedDshVersion = "unknown";
  }
  return cachedDshVersion;
}

function desktopStatusPayload(extra = {}) {
  let port = DEFAULT_PORT;
  try { port = Number(new URL(serverOrigin).port) || DEFAULT_PORT; } catch { /* server is starting */ }
  return {
    desktop: true,
    desktopVersion: app.getVersion(),
    dshVersion: readDshVersion(),
    host: "127.0.0.1",
    port,
    mode: attached ? "attached" : "managed",
    phase: restartPhase,
    canRestart: true,
    ...extra,
  };
}

function publishDesktopStatus(extra = {}) {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return Promise.resolve(false);
  const payload = desktopStatusPayload(extra);
  const script = `(() => {
    const next = ${JSON.stringify(payload)};
    document.documentElement.setAttribute("data-dsh-desktop-status", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dsh-desktop-status", { detail: next }));
    return true;
  })()`;
  return mainWindow.webContents.executeJavaScript(script).catch(() => false);
}

async function setRestartPhase(phase, extra = {}) {
  restartPhase = phase;
  await publishDesktopStatus(extra);
  // Give the renderer a frame to paint the new non-blocking progress state.
  await new Promise((resolve) => setTimeout(resolve, 80));
}

function portBusy(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host: "127.0.0.1", port, timeout: 800 });
    sock.once("connect", () => { sock.destroy(); resolve(true); });
    sock.once("error", () => resolve(false));
    sock.once("timeout", () => { sock.destroy(); resolve(false); });
  });
}

function probeDsh(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/", timeout: 3000 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { body += c; if (body.length > 400000) req.destroy(); });
        res.on("end", () => resolve(res.statusCode === 200 && body.includes("__DSH_BOOT__")));
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

function findDshCommand() {
  const isWin = process.platform === "win32";
  // explicit override wins
  if (process.env.DSH_BIN) {
    return isWin
      ? { bin: "cmd.exe", args: ["/d", "/s", "/c", `"${process.env.DSH_BIN}"`] }
      : { bin: process.env.DSH_BIN, args: [] };
  }
  if (isWin) {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    // Preferred: run node directly against the installed dsh bin.js. Absolute
    // paths mean the packaged app does not depend on PATH or the npm cmd shim.
    const binJs = path.join(appData, "npm", "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
    if (fs.existsSync(binJs)) {
      const node = process.env.ProgramFiles
        ? path.join(process.env.ProgramFiles, "nodejs", "node.exe")
        : "node";
      return { bin: node, args: [binJs] };
    }
    // Fallback: the npm global shim.
    const dshCmd = path.join(appData, "npm", "dsh.cmd");
    if (fs.existsSync(dshCmd)) return { bin: "cmd.exe", args: ["/d", "/s", "/c", `"${dshCmd}"`] };
    return { bin: "cmd.exe", args: ["/d", "/s", "/c", '"dsh.cmd"'] };
  }
  return { bin: "dsh", args: [] };
}

/**
 * Start (or attach to) the DSH Web server and resolve its base URL.
 * @returns {Promise<string>} base URL, e.g. http://127.0.0.1:3080
 */
async function startServer() {
  if (await portBusy(DEFAULT_PORT)) {
    if (await probeDsh(DEFAULT_PORT)) {
      attached = true;
      log(`attaching to existing DSH Web server on port ${DEFAULT_PORT}`);
      return `http://127.0.0.1:${DEFAULT_PORT}`;
    }
    log(`port ${DEFAULT_PORT} is taken by another app — asking DSH for a free port`);
    return spawnAndWait(0);
  }
  return spawnAndWait(DEFAULT_PORT);
}

function buildDshChildEnv() {
  const env = { ...process.env };
  if (process.platform !== "win32") return env;

  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") || "Path";
  const programFiles = env.ProgramFiles || "C:\\Program Files";
  const preferred = [
    path.join(programFiles, "Git", "bin"),
    path.join(programFiles, "nodejs"),
  ].filter((entry) => fs.existsSync(entry));
  const current = String(env[pathKey] || "").split(path.delimiter).filter(Boolean);
  const seen = new Set();
  env[pathKey] = [...preferred, ...current]
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(path.delimiter);
  return env;
}

function spawnAndWait(port) {
  return new Promise((resolve, reject) => {
    const dsh = findDshCommand();
    const args = [...dsh.args, "web", "--port", String(port)];
    log(`starting: ${dsh.bin} ${args.join(" ")}`);
    child = spawn(dsh.bin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildDshChildEnv(),
    });

    let buffer = "";
    let settled = false;
    const finish = (fn) => { if (!settled) { settled = true; fn(); } };
    const timer = setTimeout(() => finish(() => reject(new Error(`dsh web did not print its URL within ${STARTUP_TIMEOUT_MS / 1000}s`))), STARTUP_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/dsh web:\s+(https?:\/\/\S+)/);
      if (match) finish(() => { clearTimeout(timer); resolve(match[1]); });
    });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", (err) => finish(() => { clearTimeout(timer); reject(err); }));
    child.on("exit", (code) => {
      if (!settled) {
        finish(() => { clearTimeout(timer); reject(new Error(`dsh web exited early (code ${code})`)); });
      } else {
        child = null;
        log(`dsh web exited (code ${code})`);
      }
    });
  });
}

function terminateProcessTree(pid) {
  if (!pid) return Promise.resolve({ pid, code: 0, detail: "no process" });
  if (process.platform !== "win32") {
    try {
      process.kill(pid, "SIGTERM");
      return Promise.resolve({ pid, code: 0, detail: "SIGTERM sent" });
    } catch (err) {
      return Promise.resolve({ pid, code: null, detail: err.message });
    }
  }
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    killer.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    killer.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    killer.on("error", (err) => resolve({ pid, code: null, detail: err.message }));
    killer.on("close", (code) => resolve({
      pid,
      code,
      detail: (stderr || stdout).trim(),
    }));
  });
}

async function killChild() {
  if (!child) return null;
  const pid = child.pid;
  child = null;
  log(`stopping managed dsh web pid ${pid}`);
  const result = await terminateProcessTree(pid);
  if (result.code !== 0) log(`managed dsh stop result for pid ${pid}:`, result.detail || result.code);
  return result;
}

/**
 * Find PIDs of any running `dsh … web` processes on this machine
 * (Windows: match the CLI entry path in the command line).
 */
function findDshWebPids() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve([]);
    const ps = spawn(
      "powershell",
      ["-NoProfile", "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"],
      { windowsHide: true },
    );
    let out = "";
    let err = "";
    ps.stdout.on("data", (c) => { out += c.toString(); });
    ps.stderr.on("data", (c) => { err += c.toString(); });
    ps.on("error", (error) => {
      log("failed to inspect DSH Web processes:", error.message);
      resolve([]);
    });
    ps.on("close", (code) => {
      if (code !== 0) {
        log("failed to inspect DSH Web processes:", err.trim() || `PowerShell exited ${code}`);
        return resolve([]);
      }
      try {
        resolve(parseDshWebPids(out, process.pid));
      } catch (error) {
        log("failed to parse DSH Web process list:", error.message);
        resolve([]);
      }
    });
  });
}

function waitPortFree(port, tries = 30) {
  return new Promise((resolve) => {
    const attempt = (left) => {
      const sock = net.connect({ host: "127.0.0.1", port, timeout: 500 });
      sock.once("connect", () => { sock.destroy(); if (left > 0) setTimeout(() => attempt(left - 1), 500); else resolve(false); });
      sock.once("error", () => resolve(true));
      sock.once("timeout", () => { sock.destroy(); resolve(true); });
    };
    attempt(tries);
  });
}

// ------------------------------------------------------- safe-shutdown helpers
// dsh session logs are multi-frame zstd JSONL; force-killing the server while
// it is appending can tear a frame. Wait for the newest log to stop growing
// and back it up before any kill.

function dshSessionsDir() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
  return path.join(home, "sessions");
}

function newestLogTick(dir) {
  let newest = null;
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "session.jsonl.zstd") {
        try {
          const st = fs.statSync(p);
          if (newest === null || st.mtimeMs > newest.m) newest = { p, m: st.mtimeMs, size: st.size };
        } catch { /* gone */ }
      }
    }
  };
  walk(dir);
  return newest === null ? null : `${newest.p}|${newest.m}|${newest.size}`;
}

function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch { /* Atomics.wait unavailable — degrade to busy wait */ }
}

/** Block until the newest session log stops changing, or the timeout hits. */
function waitSessionQuiescence(maxMs, quietMs) {
  const dir = dshSessionsDir();
  const started = Date.now();
  let quietSince = Date.now();
  let prev = newestLogTick(dir);
  while (Date.now() - started < maxMs) {
    sleepSync(500);
    const cur = newestLogTick(dir);
    if (cur === prev) {
      if (Date.now() - quietSince >= quietMs) return true;
    } else {
      quietSince = Date.now();
      prev = cur;
    }
  }
  return false;
}

/** Async restart variant: keeps the Electron UI responsive while polling. */
async function waitSessionQuiescenceAsync(maxMs, quietMs) {
  const dir = dshSessionsDir();
  const started = Date.now();
  let quietSince = Date.now();
  let prev = newestLogTick(dir);
  while (Date.now() - started < maxMs) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const cur = newestLogTick(dir);
    if (cur === prev) {
      if (Date.now() - quietSince >= quietMs) return true;
    } else {
      quietSince = Date.now();
      prev = cur;
    }
  }
  return false;
}

function backupSessions() {
  const dir = dshSessionsDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(path.dirname(dir), `sessions-backup-${stamp}`);
  try {
    fs.cpSync(dir, dest, { recursive: true });
    log(`session logs backed up to ${dest}`);
    return dest;
  } catch (err) {
    log("session backup failed:", err.message);
    return null;
  }
}

/**
 * Restart the Harness: stop whichever `dsh web` is running (an external one
 * we attached to, or the child we spawned), then start a fresh server and
 * reload the window onto it. Invoked only from the user-facing menu item.
 */
async function restartHarness() {
  if (!["ready", "error"].includes(restartPhase)) return;
  log("restart requested");
  await setRestartPhase("waiting");
  const quiet = await waitSessionQuiescenceAsync(20000, 1200);
  if (!quiet) log("WARNING: session log still growing — an agent turn may be mid-write");
  await setRestartPhase("backup", { sessionQuiet: quiet });
  const backupPath = backupSessions();
  await setRestartPhase("stopping", { sessionQuiet: quiet, backupPath });
  const stopResults = [];
  const managedStop = await killChild();
  if (managedStop) stopResults.push(managedStop);
  if (attached) {
    const pids = await findDshWebPids();
    log(`stopping external dsh web pids: ${pids.join(", ") || "none"}`);
    for (const pid of pids) {
      stopResults.push(await terminateProcessTree(pid));
    }
  }
  attached = false;
  await setRestartPhase("reconnecting", { mode: "managed", sessionQuiet: quiet, backupPath });
  const portFreed = await waitPortFree(DEFAULT_PORT);
  try {
    if (!portFreed) {
      const detail = stopResults.map((item) => `pid ${item.pid}: ${item.code ?? "error"} ${item.detail || ""}`.trim()).join("; ");
      throw new Error(`port ${DEFAULT_PORT} is still in use after stopping dsh web${detail ? ` (${detail})` : ""}`);
    }
    const url = await spawnAndWait(DEFAULT_PORT);
    restartPhase = "ready";
    if (mainWindow && !mainWindow.isDestroyed()) loadGui(url);
    log(`restarted: ${url}`);
  } catch (err) {
    restartPhase = "error";
    await publishDesktopStatus({ error: err.message });
    log("restart failed:", err.message);
    dialog.showErrorBox("Restart failed", `Could not start dsh web:\n${err.message}`);
  }
}

// ---------------------------------------------------------------- window

function windowStateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function readWindowState() {
  try { return JSON.parse(fs.readFileSync(windowStateFile(), "utf8")); }
  catch { return {}; }
}

function saveWindowState(win) {
  if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
  try {
    fs.writeFileSync(windowStateFile(), JSON.stringify(win.getBounds()));
  } catch { /* best effort */ }
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "Open in Browser", click: () => mainWindow && shell.openExternal(mainWindow.webContents.getURL()) },
        { type: "separator" },
        { role: "quit", label: "Exit" },
      ],
    },
    {
      label: "Harness",
      submenu: [
        { label: "Restart Harness (dsh web)", accelerator: "CmdOrCtrl+Shift+R", click: () => restartHarness() },
        { type: "separator" },
        { label: "Reload Window", accelerator: "CmdOrCtrl+R", click: () => mainWindow && mainWindow.webContents.reload() },
        { label: "Hard Reload (clear cache)", accelerator: "CmdOrCtrl+Shift+Alt+R", click: () => {
          if (!mainWindow) return;
          mainWindow.webContents.session.clearCache().then(() => mainWindow.webContents.reloadIgnoringCache());
        } },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "forceReload" }, { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" },
        { role: "togglefullscreen" }, { role: "toggleDevTools" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Load the GUI URL into the window and record its origin as the only
 * navigation-allowed origin (restarts may change the port).
 */
function loadGui(url) {
  serverOrigin = new URL(url).origin;
  mainWindow.loadURL(url);
}

function createWindow(url) {
  const state = readWindowState();
  mainWindow = new BrowserWindow({
    width: state.width ?? 1480,
    height: state.height ?? 920,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "icon.png"),
    title: "DeepSeek Harness",
    backgroundColor: "#0b1020",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", () => saveWindowState(mainWindow));
  mainWindow.on("closed", () => { mainWindow = null; });

  // Open every external link in the system browser, keep the app single-origin.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("dsh-desktop://restart")) {
      restartHarness();
      return { action: "deny" };
    }
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("dsh-desktop://restart")) {
      event.preventDefault();
      restartHarness();
      return;
    }
    if (serverOrigin !== null && new URL(url).origin !== serverOrigin) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  // Auto-recover: if the page fails to load (e.g. the server is mid-restart),
  // retry the server URL until it succeeds instead of sitting on a broken
  // text/blank state. ERR_ABORTED (-3) is expected during restarts/reloads.
  let retryTimer = null;
  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDesc, _url, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return;
    log(`load failed (${errorCode} ${errorDesc}) — retrying in 2s`);
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`${serverOrigin}/`);
    }, 2000);
  });
  mainWindow.webContents.on("did-navigate", () => {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  });
  mainWindow.webContents.on("did-finish-load", () => publishDesktopStatus());

  loadGui(url);
}

// ---------------------------------------------------------------- app

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    try {
      const url = await startServer();
      createWindow(url);
    } catch (err) {
      log("startup failed:", err.message);
      app.quit();
      return;
    }
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
        // Re-open a window against the server we own/attached to.
        if (attached || process.env.DSH_DESKTOP_KEEP_RUNNING === "1") createWindow(`http://127.0.0.1:${DEFAULT_PORT}`);
        else startServer().then(createWindow).catch(() => app.quit());
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
    const keep = process.env.DSH_DESKTOP_KEEP_RUNNING === "1" || attached;
    if (!keep) {
      // Best effort: give the session log up to 3s to settle before the kill
      // (dsh session logs are zstd frames; a mid-write kill can tear one).
      waitSessionQuiescence(3000, 800);
      void killChild();
    }
  });
}
