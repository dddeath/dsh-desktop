"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { _electron: electron } = require(path.resolve(__dirname, "../../dom-probe/node_modules/playwright-core"));

const executablePath = path.resolve(__dirname, "../../../desktop/dist-status/win-unpacked/DeepSeek Harness Desktop.exe");
const evidencePath = path.resolve(__dirname, "evidence/end-to-end-restart.json");

function listenerPid() {
  try {
    const output = execFileSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "$l=Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1;if($l){$l.OwningProcess}else{0}",
    ], { encoding: "utf8", windowsHide: true });
    return Number(output.trim()) || 0;
  } catch {
    return 0;
  }
}

async function httpStatus() {
  try {
    const response = await fetch("http://127.0.0.1:3080/", { signal: AbortSignal.timeout(2000) });
    return response.status;
  } catch {
    return 0;
  }
}

(async () => {
  const beforePid = listenerPid();
  if (!beforePid) throw new Error("No DSH Web listener before the restart test");

  const app = await electron.launch({
    executablePath,
    env: { ...process.env, DSH_DESKTOP_KEEP_RUNNING: "1", ELECTRON_ENABLE_LOGGING: "1" },
  });
  const stdout = [];
  const stderr = [];
  app.process().stdout?.on("data", (chunk) => stdout.push(chunk.toString()));
  app.process().stderr?.on("data", (chunk) => stderr.push(chunk.toString()));

  let success = false;
  const events = [];
  let lastState = "";
  let windowTitle = "";
  try {
    const window = await app.firstWindow({ timeout: 30000 });
    await window.waitForLoadState("domcontentloaded", { timeout: 30000 });
    windowTitle = await window.title();
    await window.evaluate(() => {
      window.open("dsh-desktop://restart", "_blank");
    });

    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const pid = listenerPid();
      const status = pid ? await httpStatus() : 0;
      const state = `${pid}/${status}`;
      if (state !== lastState) {
        events.push({ at: new Date().toISOString(), listenerPid: pid, httpStatus: status });
        lastState = state;
      }
      if (pid && pid !== beforePid && status === 200) {
        success = true;
        break;
      }
    }
  } finally {
    const record = {
      checkedAt: new Date().toISOString(),
      executablePath,
      windowTitle,
      beforePid,
      afterPid: listenerPid(),
      afterHttpStatus: await httpStatus(),
      success,
      events,
      stdout: stdout.join(""),
      stderr: stderr.join(""),
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`);
    await app.close().catch(() => app.process().kill());
    console.log(JSON.stringify(record, null, 2));
  }

  if (!success) process.exitCode = 4;
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
