import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureDefaultWorkspace,
  ensureSessionWorkspace,
  reconcileSessionWorkspaces,
  ungroupedSessionIds,
  WorkspaceInvariantError,
} from "../lib/workspace-invariant.js";

function registryFixture(initial = []) {
  const workspaces = initial.map((entry) => ({ ...entry, sessionIds: [...entry.sessionIds] }));
  const headers = new Map();
  const registry = {
    headers,
    list: () => workspaces,
    async resolveByPath(path) { return workspaces.find((entry) => entry.path === path); },
    async create(path, title) {
      const workspace = {
        id: `workspace-${workspaces.length + 1}`,
        path,
        title: title || path.split(/[\\/]/).at(-1),
        sessionIds: [],
        async attachSession(id) {
          const header = headers.get(String(id));
          if (!header || header.cwd !== path) throw new Error("cwd mismatch");
          if (!this.sessionIds.includes(String(id))) this.sessionIds.unshift(String(id));
        },
      };
      workspaces.unshift(workspace);
      return workspace;
    },
  };
  for (const workspace of workspaces) {
    workspace.attachSession ||= async function attachSession(id) {
      const header = headers.get(String(id));
      if (!header || header.cwd !== this.path) throw new Error("cwd mismatch");
      if (!this.sessionIds.includes(String(id))) this.sessionIds.unshift(String(id));
    };
  }
  return registry;
}

test("creates and retains a default workspace", async () => {
  const registry = registryFixture();
  const workspace = await ensureDefaultWorkspace(registry, "C:\\default");
  assert.equal(workspace.title, "默认工作区");
  assert.equal(registry.list().length, 1);
  assert.equal(await ensureDefaultWorkspace(registry, "C:\\default"), workspace);
});

test("hard rejects a session without cwd", async () => {
  const registry = registryFixture();
  await assert.rejects(
    ensureSessionWorkspace(registry, { header: { id: "session-no-cwd" } }),
    (error) => error instanceof WorkspaceInvariantError && error.code === "session_workspace_required",
  );
});

test("reconciles every persisted session into its cwd workspace", async () => {
  const registry = registryFixture();
  const records = [
    { header: { id: "session-a", cwd: "E:\\alpha" } },
    { header: { id: "session-b", cwd: "E:\\beta" } },
  ];
  for (const record of records) registry.headers.set(record.header.id, record.header);
  const result = await reconcileSessionWorkspaces(registry, records);
  assert.deepEqual(result, {
    totalSessions: 2,
    attached: 2,
    groupedSessions: 2,
    ungroupedSessionIds: [],
    failures: [],
  });
  assert.deepEqual(ungroupedSessionIds(records, registry.list()), []);
});

test("reports a workspace attachment failure as an invariant violation", async () => {
  const registry = registryFixture();
  const records = [{ header: { id: "session-missing-header", cwd: "E:\\alpha" } }];
  const result = await reconcileSessionWorkspaces(registry, records);
  assert.equal(result.groupedSessions, 0);
  assert.deepEqual(result.ungroupedSessionIds, ["session-missing-header"]);
  assert.equal(result.failures.length, 1);
});
