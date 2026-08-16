/** Host-side read-only catalog used by the Agent Tools settings page. */
export const inject = ["tools", "webServer"];

export function apply(ctx) {
  let revision = 0;
  const offChange = ctx.on("tools/change", () => {
    revision += 1;
  });
  const offRoute = ctx.webServer.register({
    kind: "exact",
    path: "/__dsh-desktop-ui-compat/agent-tools",
    handler(_req, res) {
      const tools = ctx.tools.schemas().map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
      const body = JSON.stringify({ revision, tools });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Length", Buffer.byteLength(body));
      res.end(body);
    },
  });
  return () => {
    offRoute();
    offChange();
  };
}
