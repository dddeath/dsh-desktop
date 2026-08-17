export class WorkspaceInvariantError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WorkspaceInvariantError";
    this.code = code;
  }
}

export function sessionHeader(record) {
  return record?.header || record;
}

export function workspaceForSession(workspaces, sessionId) {
  const id = String(sessionId || "");
  return workspaces.find((workspace) => [...workspace.sessionIds].some((candidate) => String(candidate) === id));
}

export function ungroupedSessionIds(records, workspaces) {
  return records
    .map((record) => String(sessionHeader(record)?.id || ""))
    .filter((id) => id && workspaceForSession(workspaces, id) === undefined);
}

export async function ensureDefaultWorkspace(workspaceRegistry, path, title = "默认工作区") {
  const existing = await workspaceRegistry.resolveByPath(path);
  return existing || workspaceRegistry.create(path, title);
}

export async function ensureSessionWorkspace(workspaceRegistry, record) {
  const header = sessionHeader(record);
  const sessionId = String(header?.id || "");
  if (!sessionId) throw new WorkspaceInvariantError("session_id_required", "workspace invariant requires a session id");
  if (typeof header?.cwd !== "string" || header.cwd.trim().length === 0) {
    throw new WorkspaceInvariantError("session_workspace_required", `session ${sessionId} has no cwd and may not be created without a workspace`);
  }
  const workspace = await workspaceRegistry.resolveByPath(header.cwd)
    || await workspaceRegistry.create(header.cwd);
  await workspace.attachSession(sessionId);
  if (![...workspace.sessionIds].some((candidate) => String(candidate) === sessionId)) {
    throw new WorkspaceInvariantError("session_workspace_attach_failed", `session ${sessionId} was not retained by workspace ${workspace.path}`);
  }
  return workspace;
}

export async function reconcileSessionWorkspaces(workspaceRegistry, records) {
  const before = workspaceRegistry.list();
  const beforeUngrouped = new Set(ungroupedSessionIds(records, before));
  const failures = [];
  let attached = 0;

  for (const record of records) {
    const header = sessionHeader(record);
    try {
      await ensureSessionWorkspace(workspaceRegistry, record);
      if (beforeUngrouped.has(String(header.id))) attached += 1;
    } catch (error) {
      failures.push({
        sessionId: String(header?.id || ""),
        cwd: header?.cwd || null,
        code: error?.code || "workspace_invariant_failed",
        detail: String(error?.message || error),
      });
    }
  }

  const after = workspaceRegistry.list();
  return {
    totalSessions: records.length,
    attached,
    groupedSessions: records.length - ungroupedSessionIds(records, after).length,
    ungroupedSessionIds: ungroupedSessionIds(records, after),
    failures,
  };
}
