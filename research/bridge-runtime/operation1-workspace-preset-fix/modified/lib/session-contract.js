import { stat } from "node:fs/promises";
import { resolve } from "node:path";

export class WorkspaceContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WorkspaceContractError";
    this.code = code;
    this.statusCode = 400;
  }
}

function comparisonPath(value) {
  const absolute = resolve(String(value || ""));
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

export async function resolveWorkspaceDirectory(value) {
  const input = String(value || "").trim();
  if (!input) {
    throw new WorkspaceContractError(
      "workspace_required",
      "cwd must name the target workspace; mentioning a path only in the prompt does not bind the session workspace.",
    );
  }
  const workspace = resolve(input);
  let info;
  try { info = await stat(workspace); }
  catch {
    throw new WorkspaceContractError("workspace_not_found", `workspace directory does not exist: ${workspace}`);
  }
  if (!info.isDirectory()) {
    throw new WorkspaceContractError("workspace_not_directory", `workspace is not a directory: ${workspace}`);
  }
  return workspace;
}

export function assertWorkspaceMatch(sessionId, requested, actual) {
  if (comparisonPath(requested) === comparisonPath(actual)) return;
  throw new WorkspaceContractError(
    "workspace_conflict",
    `session ${sessionId} is bound to ${resolve(String(actual || ""))}, not ${resolve(String(requested || ""))}; create a new session for the target workspace.`,
  );
}
