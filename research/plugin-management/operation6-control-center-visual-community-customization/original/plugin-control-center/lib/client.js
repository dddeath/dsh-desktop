window.__ModuleLoader__.load({
  id: "dsh-plugin-control-center",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require("react");
    const h = React.createElement;
    const { useEffect, useMemo, useState } = React;

    const BASE = "/__dsh-plugin-control-center";
    const STYLE_ID = "dsh-plugin-control-center";
    const CSS = `
[data-dsh-plugin-control-center] { color: var(--dsh-text, inherit); text-shadow: none !important; filter: none !important; }
[data-dsh-plugin-control-center] * { box-sizing: border-box; text-shadow: none !important; filter: none !important; }
.dcc-shell { display: grid; gap: 16px; padding: 4px 2px 18px; }
.dcc-hero, .dcc-toolbar, .dcc-card, .dcc-action { color: inherit; background: color-mix(in srgb, var(--dsh-surface, Canvas) 94%, transparent); border: 1px solid color-mix(in srgb, currentColor 16%, transparent); border-radius: 14px; }
.dcc-hero { padding: 18px; display: grid; gap: 14px; }
.dcc-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.dcc-heading h2, .dcc-heading p, .dcc-card h3, .dcc-card p { margin: 0; }
.dcc-heading h2 { font-size: 20px; }
.dcc-muted { opacity: .7; font-size: 13px; }
.dcc-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.dcc-metric { padding: 10px 12px; border-radius: 10px; background: color-mix(in srgb, currentColor 6%, transparent); }
.dcc-metric b, .dcc-metric span { display: block; }
.dcc-metric b { font-size: 18px; }
.dcc-metric span { opacity: .68; font-size: 12px; margin-top: 2px; }
.dcc-toolbar { padding: 12px; display: grid; grid-template-columns: minmax(160px, 1fr) repeat(3, minmax(110px, auto)); gap: 9px; align-items: center; }
.dcc-field, .dcc-button { min-height: 36px; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius: 9px; color: inherit; background: color-mix(in srgb, var(--dsh-surface, Canvas) 96%, transparent); padding: 7px 10px; font: inherit; }
.dcc-button { cursor: pointer; font-weight: 600; }
.dcc-button:hover:not(:disabled) { background: color-mix(in srgb, currentColor 10%, transparent); }
.dcc-button:disabled { opacity: .48; cursor: not-allowed; }
.dcc-primary { border-color: color-mix(in srgb, var(--dsh-accent, currentColor) 58%, transparent); }
.dcc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.dcc-card { padding: 14px; display: grid; gap: 11px; min-width: 0; }
.dcc-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dcc-card h3 { font-size: 15px; overflow-wrap: anywhere; }
.dcc-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.dcc-tag { border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 999px; padding: 3px 8px; font-size: 12px; background: color-mix(in srgb, currentColor 5%, transparent); }
.dcc-tag[data-tone='good'] { color: var(--dsh-success, #237a4b); }
.dcc-tag[data-tone='warn'] { color: var(--dsh-warning, #946200); }
.dcc-tag[data-tone='bad'] { color: var(--dsh-danger, #b42318); }
.dcc-source { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; opacity: .78; }
.dcc-details { display: grid; gap: 8px; border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent); padding-top: 10px; }
.dcc-detail-row { display: grid; grid-template-columns: 88px 1fr; gap: 8px; font-size: 13px; }
.dcc-detail-row > span:first-child { opacity: .65; }
.dcc-actions { display: flex; flex-wrap: wrap; gap: 7px; }
.dcc-action { padding: 14px; display: grid; gap: 10px; }
.dcc-action pre { margin: 0; padding: 10px; border-radius: 8px; overflow: auto; background: color-mix(in srgb, currentColor 7%, transparent); white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; }
.dcc-check { display: flex; gap: 7px; align-items: center; font-size: 13px; }
.dcc-empty, .dcc-error { padding: 18px; border: 1px dashed color-mix(in srgb, currentColor 24%, transparent); border-radius: 12px; }
.dcc-error { color: var(--dsh-danger, #b42318); }
@media (max-width: 760px) { .dcc-grid { grid-template-columns: 1fr; } .dcc-summary { grid-template-columns: repeat(2, 1fr); } .dcc-toolbar { grid-template-columns: 1fr; } }
`;

    function fetchJson(url, options) {
      return fetch(url, { cache: "no-store", ...options }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) throw new Error(data.detail || data.error || `${response.status} ${response.statusText}`);
        return data.value === undefined ? data : data.value;
      });
    }

    function statusOf(plugin, installed, inventory, update) {
      const liveRows = inventory.filter((row) => row.moduleName === plugin.name);
      if (liveRows.some((row) => row.fiberPhase === "failed")) return "failed";
      const activation = installed.activation?.[plugin.name];
      if (activation?.state === "restart") return "pending-restart";
      if (activation?.state === "live" || liveRows.some((row) => row.enabled && row.fiberPhase === "active")) return "running";
      if (plugin.inBundle) return "installed-disabled";
      if (update?.kind === "dependency") return "dependency-only";
      return "installed-disabled";
    }

    const STATUS_LABEL = {
      running: "运行中",
      "pending-restart": "待重启",
      failed: "加载失败",
      "installed-disabled": "已安装未启用",
      "dependency-only": "仅依赖",
    };

    function ControlCenterTab({ loadInventory }) {
      const [data, setData] = useState(null);
      const [error, setError] = useState("");
      const [loading, setLoading] = useState(true);
      const [query, setQuery] = useState("");
      const [group, setGroup] = useState("all");
      const [status, setStatus] = useState("all");
      const [sensitivity, setSensitivity] = useState("all");
      const [updatesOnly, setUpdatesOnly] = useState(false);
      const [expanded, setExpanded] = useState({});
      const [action, setAction] = useState(null);
      const [confirmText, setConfirmText] = useState("");
      const [planResult, setPlanResult] = useState(null);
      const [planning, setPlanning] = useState(false);

      const reload = async () => {
        setLoading(true);
        setError("");
        try {
          const [inventoryValue, installed, runtime, updates, control] = await Promise.all([
            loadInventory(),
            fetchJson("/dsh-market/installed").catch(() => ({ installed: {}, activation: {} })),
            fetchJson("/dsh-market/status").catch(() => ({})),
            fetchJson("/dsh-market/updates").catch(() => ({ updates: {} })),
            fetchJson(`${BASE}/snapshot`),
          ]);
          const inventory = inventoryValue.entries || [];
          const updateMap = updates.updates || {};
          const plugins = control.plugins.map((plugin) => ({
            ...plugin,
            current: updateMap[plugin.name]?.current || null,
            latest: updateMap[plugin.name]?.latest || null,
            updateAvailable: updateMap[plugin.name]?.updateAvailable === true,
            activation: installed.activation?.[plugin.name] || null,
            runtimeRows: inventory.filter((row) => row.moduleName === plugin.name),
            status: statusOf(plugin, installed, inventory, updateMap[plugin.name]),
          }));
          setData({ control, installed, runtime, plugins, checkedAt: new Date().toISOString() });
        } catch (loadError) {
          setError(loadError.message || String(loadError));
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => { reload(); }, []);

      const groups = useMemo(() => Array.from(new Set((data?.plugins || []).map((item) => item.group))).sort(), [data]);
      const filtered = useMemo(() => (data?.plugins || []).filter((plugin) => {
        const needle = query.trim().toLowerCase();
        if (needle && !`${plugin.name} ${plugin.capabilities.join(" ")} ${plugin.recommendation}`.toLowerCase().includes(needle)) return false;
        if (group !== "all" && plugin.group !== group) return false;
        if (status !== "all" && plugin.status !== status) return false;
        if (sensitivity !== "all" && plugin.sensitivity !== sensitivity) return false;
        if (updatesOnly && !plugin.updateAvailable) return false;
        return true;
      }), [data, query, group, status, sensitivity, updatesOnly]);

      const openAction = (plugin, kind) => {
        setAction({ plugin, kind });
        setConfirmText("");
        setPlanResult(null);
      };

      const submitPlan = async () => {
        if (!action) return;
        setPlanning(true);
        setPlanResult(null);
        try {
          const value = await fetchJson(`${BASE}/plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action.kind, name: action.plugin.name }),
          });
          setPlanResult(value);
        } catch (planError) {
          setPlanResult({ error: planError.message || String(planError) });
        } finally {
          setPlanning(false);
        }
      };

      const summary = data ? {
        running: data.plugins.filter((item) => item.status === "running").length,
        pending: data.plugins.filter((item) => item.status === "pending-restart").length,
        updates: data.plugins.filter((item) => item.updateAvailable).length,
        total: data.plugins.length,
      } : { running: 0, pending: 0, updates: 0, total: 0 };

      return h("section", { className: "dcc-shell", "data-dsh-plugin-control-center": "true" },
        h("header", { className: "dcc-hero" },
          h("div", { className: "dcc-heading" },
            h("div", null,
              h("h2", null, "插件管理中心"),
              h("p", { className: "dcc-muted" }, "聚合运行状态、来源、版本与风险；本阶段操作只生成备份和执行计划。")
            ),
            h("button", { className: "dcc-button dcc-primary", type: "button", disabled: loading, onClick: reload, "data-control-refresh": "true" }, loading ? "核验中…" : "运行核验")
          ),
          h("div", { className: "dcc-summary", "data-control-summary": "true" },
            [[summary.running, "运行中"], [summary.pending, "待重启"], [summary.updates, "可更新"], [summary.total, "已纳管"]].map(([value, label]) =>
              h("div", { className: "dcc-metric", key: label }, h("b", null, value), h("span", null, label))
            )
          ),
          data ? h("p", { className: "dcc-muted" }, `配置：${data.control.profile} · 最后核验：${new Date(data.checkedAt).toLocaleString()} · 模式：只预演`) : null
        ),
        h("div", { className: "dcc-toolbar" },
          h("input", { className: "dcc-field", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "搜索插件、能力或建议", "aria-label": "搜索插件" }),
          h("select", { className: "dcc-field", value: group, onChange: (event) => setGroup(event.target.value), "aria-label": "按分组筛选" }, h("option", { value: "all" }, "全部分组"), groups.map((value) => h("option", { value, key: value }, value))),
          h("select", { className: "dcc-field", value: status, onChange: (event) => setStatus(event.target.value), "aria-label": "按状态筛选" }, h("option", { value: "all" }, "全部状态"), Object.entries(STATUS_LABEL).map(([value, label]) => h("option", { value, key: value }, label))),
          h("label", { className: "dcc-check" }, h("input", { type: "checkbox", checked: updatesOnly, onChange: (event) => setUpdatesOnly(event.target.checked) }), "仅看更新")
        ),
        h("div", { className: "dcc-toolbar" },
          h("select", { className: "dcc-field", value: sensitivity, onChange: (event) => setSensitivity(event.target.value), "aria-label": "按敏感度筛选" }, h("option", { value: "all" }, "全部敏感度"), ["高", "中", "低"].map((value) => h("option", { value, key: value }, `${value}敏感度`))),
          h("span", { className: "dcc-muted" }, `当前显示 ${filtered.length} / ${summary.total}`)
        ),
        error ? h("div", { className: "dcc-error", role: "alert" }, `加载失败：${error}`) : null,
        !error && !loading && filtered.length === 0 ? h("div", { className: "dcc-empty" }, "当前筛选条件下没有插件。") : null,
        h("div", { className: "dcc-grid" }, filtered.map((plugin) => {
          const open = !!expanded[plugin.name];
          const tone = plugin.status === "running" ? "good" : plugin.status === "failed" ? "bad" : "warn";
          const local = /^(link|file):/.test(plugin.source);
          return h("article", { className: "dcc-card", key: plugin.name, "data-plugin-management-card": "true", "data-plugin-name": plugin.name, "data-plugin-status": plugin.status },
            h("div", { className: "dcc-card-head" },
              h("div", null, h("h3", null, plugin.name), h("p", { className: "dcc-muted" }, plugin.current || plugin.source)),
              h("button", { className: "dcc-button", type: "button", onClick: () => setExpanded((current) => ({ ...current, [plugin.name]: !open })), "aria-expanded": open }, open ? "收起" : "详情")
            ),
            h("div", { className: "dcc-tags" },
              h("span", { className: "dcc-tag", "data-tone": tone }, STATUS_LABEL[plugin.status]),
              h("span", { className: "dcc-tag" }, plugin.group),
              h("span", { className: "dcc-tag" }, `${plugin.sensitivity}敏感度`),
              local ? h("span", { className: "dcc-tag" }, "本地链接") : null,
              plugin.protected ? h("span", { className: "dcc-tag" }, "受保护") : null,
              plugin.updateAvailable ? h("span", { className: "dcc-tag", "data-tone": "warn" }, `可更新 ${plugin.latest}`) : null
            ),
            h("p", { className: "dcc-source", title: plugin.source }, plugin.source),
            open ? h("div", { className: "dcc-details" },
              h("div", { className: "dcc-detail-row" }, h("span", null, "能力"), h("span", null, plugin.capabilities.join("、"))),
              h("div", { className: "dcc-detail-row" }, h("span", null, "装载位置"), h("span", null, plugin.inBundle ? `bundle #${plugin.bundleIndex}` : "未加入 bundle")),
              h("div", { className: "dcc-detail-row" }, h("span", null, "运行实例"), h("span", null, plugin.runtimeRows.length ? plugin.runtimeRows.map((row) => `${row.entryId}:${row.fiberPhase}`).join("；") : "未发现")),
              h("div", { className: "dcc-detail-row" }, h("span", null, "使用建议"), h("span", null, plugin.recommendation)),
              plugin.protected ? h("div", { className: "dcc-detail-row" }, h("span", null, "保护原因"), h("span", null, plugin.protectedReason)) : null
            ) : null,
            h("div", { className: "dcc-actions" },
              h("button", { className: "dcc-button", type: "button", disabled: plugin.protected, title: plugin.protectedReason || "", onClick: () => openAction(plugin, plugin.status === "running" ? "stage-disable" : "stage-enable") }, plugin.status === "running" ? "计划停用" : "计划启用"),
              h("button", { className: "dcc-button", type: "button", disabled: plugin.protected || !plugin.updateAvailable, title: plugin.protectedReason || (!plugin.updateAvailable ? "当前无可用更新" : ""), onClick: () => openAction(plugin, "update") }, "计划更新"),
              h("button", { className: "dcc-button", type: "button", disabled: plugin.protected, title: plugin.protectedReason || "", onClick: () => openAction(plugin, "remove") }, "卸载预演"),
              h("button", { className: "dcc-button", type: "button", disabled: plugin.protected, title: plugin.protectedReason || "", onClick: () => openAction(plugin, "restore") }, "恢复预演")
            )
          );
        })),
        action ? h("aside", { className: "dcc-action", "data-action-dialog": "true" },
          h("div", { className: "dcc-heading" }, h("div", null, h("h3", null, `操作预演：${action.plugin.name}`), h("p", { className: "dcc-muted" }, `动作：${action.kind}。将先保存配置快照，不会修改 profile，也不会自动重启。`)), h("button", { className: "dcc-button", type: "button", onClick: () => setAction(null) }, "关闭")),
          ["update", "remove", "restore"].includes(action.kind) ? h("label", null, h("span", { className: "dcc-muted" }, `输入插件名 ${action.plugin.name} 以确认`), h("input", { className: "dcc-field", value: confirmText, onChange: (event) => setConfirmText(event.target.value), "aria-label": "输入插件名确认" })) : null,
          h("button", { className: "dcc-button dcc-primary", type: "button", disabled: planning || (["update", "remove", "restore"].includes(action.kind) && confirmText !== action.plugin.name), onClick: submitPlan }, planning ? "生成中…" : "生成备份与计划"),
          planResult ? h("pre", { "data-action-preview": "true" }, planResult.error ? `错误：${planResult.error}` : `备份：${planResult.backup.path}\n清单 SHA-256：${planResult.backup.manifestSha256}\nprofileChanged：${planResult.profileChanged}\nexecute：${planResult.execute}\n下一步：${planResult.nextStep}`) : null
        ) : null
      );
    }

    const inject = ["slots", "remote", "remote.pluginInventory"];
    function apply(ctx) {
      if (typeof document === "undefined") return;
      if (!document.querySelector(`style[data-plugin='${STYLE_ID}']`)) {
        const style = document.createElement("style");
        style.dataset.plugin = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
      }
      const loadInventory = async () => {
        const result = await ctx.remote.pluginInventory.list();
        if (!result.ok) throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`);
        return result.value;
      };
      const dispose = ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
        name: "settings.plugins.tab",
        id: "manage",
        order: 20,
        label: () => /zh/i.test(document.documentElement.lang || navigator.language || "zh") ? "管理中心" : "Control center",
        inject: () => ({ loadInventory }),
      }, ControlCenterTab));
      return () => {
        dispose?.();
        document.querySelector(`style[data-plugin='${STYLE_ID}']`)?.remove();
      };
    }

    exports.inject = inject;
    exports.name = "dsh-plugin-control-center";
    exports.apply = apply;
    return module.exports;
  },
});
