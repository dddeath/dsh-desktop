"use strict";

const DSH_ENTRY_RE = /(?:@deepseek-ai[\\/])?dsh[\\/]lib[\\/]bin\.js/i;
const DSH_WEB_COMMAND_RE = /^web(?:\s|$)/i;
const DSH_WEB_PROFILE_RE = /^--profile(?:=|\s+)web\s*$/i;

function isDshWebCommandLine(commandLine) {
  const value = String(commandLine || "");
  const entry = DSH_ENTRY_RE.exec(value);
  if (!entry) return false;
  const args = value.slice(entry.index + entry[0].length).replace(/^\s*["']?\s*/, "");
  return DSH_WEB_COMMAND_RE.test(args) || DSH_WEB_PROFILE_RE.test(args);
}

function parseDshWebPids(jsonText, selfPid = process.pid) {
  const parsed = JSON.parse(String(jsonText || "null"));
  const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return rows
    .filter((row) => row && isDshWebCommandLine(row.CommandLine))
    .map((row) => Number(row.ProcessId))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== Number(selfPid));
}

module.exports = { isDshWebCommandLine, parseDshWebPids };
