import test from "node:test";
import assert from "node:assert/strict";
import { assertWorkspaceMatch, resolveWorkspaceDirectory, WorkspaceContractError } from "../lib/session-contract.js";

test("workspace must be supplied as a real cwd field", async () => {
  await assert.rejects(
    resolveWorkspaceDirectory(""),
    (error) => error instanceof WorkspaceContractError && error.code === "workspace_required",
  );
});

test("workspace resolves to an existing directory", async () => {
  const workspace = await resolveWorkspaceDirectory(process.cwd());
  assert.equal(workspace, process.cwd());
});

test("continued sessions reject cwd changes", () => {
  assert.throws(
    () => assertWorkspaceMatch("session-test", "E:\\TARGET", "E:\\OTHER"),
    (error) => error instanceof WorkspaceContractError && error.code === "workspace_conflict",
  );
});
