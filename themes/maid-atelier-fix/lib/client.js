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
/* 1) Left sidebar + top bar follow the light theme instead of staying navy */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) {
  --dsw-specific-sidebar-fill: #e7ecf7;          /* light periwinkle, was #0b1942e0 */
  --dsw-alias-label-tertiary: #46567c;           /* darker secondary text */
  --dsw-alias-label-caption: #566384;            /* darker caption text */
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sidebarCol'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='sidebar'] > div,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-pane='sidebar'] {
  background-color: #e7ecf7 !important;
}

/* Top menu bar: explicit light surface so the dark palace art doesn't show through */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='tablist'] {
  background: #edf1fa;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

/* 3) View tabs (对话 / 轨迹 / 上下文) get clear, theme-matching borders */
body[data-dsh-maid-atelier] [role='tab'] {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
}
body[data-dsh-maid-atelier] [role='tab'][aria-selected='true'] {
  border-color: var(--dsw-alias-border-l3);      /* gold accent */
  background: var(--dsw-alias-interactive-bg-active);
}

/* 2) Empty-state text (subagent / details panels) readable on light surfaces */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='empty'] {
  color: var(--dsw-alias-label-secondary);
}

/* 4) Right sidebar: themed periwinkle porcelain tint + gold accent edge */
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
