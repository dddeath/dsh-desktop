/**
 * maid-atelier skin fixes — browser client bundle.
 *
 * DSH serves client bundles as classic scripts that self-register through
 * `window.__ModuleLoader__.load(...)` and return `module.exports` (with an
 * `apply` export) from the factory. No bare ESM `export` is allowed here.
 */
window.__ModuleLoader__.load({
  id: "dsh-maid-atelier-fix",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const CSS = `
/* ===== maid-atelier light-mode fixes ===== */

/* darker secondary/caption text tokens (win any cascade) */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) {
  --dsw-alias-label-tertiary: #46567c !important;
  --dsw-alias-label-caption: #566384 !important;
}

/* 1) Left sidebar follows the light theme instead of staying navy */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sidebarCol'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='sidebar'] > div,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-pane='sidebar'] {
  background-color: #e7ecf7 !important;
}

/* 1 + 4) Hide the skin's navy/gold top chrome in light mode so the native
   light top bar (标准模式 / 对话标题) shows through, and the right-sidebar
   top buttons (close, subagent controls) are no longer covered by it. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-skin-chrome='top-trim'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-skin-chrome='bottom-trim'] {
  display: none !important;
}

/* 4) Top bar (标准模式 / 对话标题) and tab strip get a light surface */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='header'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='tablist'] {
  background: #edf1fa;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='header'] {
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

/* 3) View tabs (对话 / 轨迹 / 上下文): clear borders + readable text */
body[data-dsh-maid-atelier] [role='tab'] {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  color: var(--dsw-alias-label-primary) !important;
}
body[data-dsh-maid-atelier] [role='tab'][aria-selected='true'] {
  border-color: var(--dsw-alias-border-l3);      /* gold accent */
  background: var(--dsw-alias-interactive-bg-active);
}

/* 2) Empty-state / read-only text (subagent, details) readable in light mode.
   The i flag matches both empty and camelCase Empty class names
   (e.g. better-sidebar's subagentEmpty / subagentEmptyHint). */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='empty' i],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='status'] {
  color: #46567c !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='empty' i] strong,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='status'] strong {
  color: #243866 !important;
}

/* 4) Right sidebar: themed periwinkle porcelain tint */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='detailsCol'] {
  background: #e8edf8;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='details'] > div {
  background: #e8edf8f2;
}
`;

    const TAG_ID = "dsh-maid-atelier-fix/overrides.css";

    function apply(ctx) {
      if (typeof document === "undefined") return;
      if (document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]")) return;

      const style = document.createElement("style");
      style.dataset.plugin = "dsh-maid-atelier-fix";
      style.dataset.pluginCss = TAG_ID;
      style.textContent = CSS;
      document.head.appendChild(style);

      if (ctx && typeof ctx.effect === "function") {
        try { ctx.effect(() => () => style.remove()); } catch { /* no disposer */ }
      }
    }

    exports.apply = apply;
    return module.exports;
  }
});
