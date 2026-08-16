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

/* base text tokens */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) {
  --dsw-alias-label-primary: #1e2a52 !important;
  --dsw-alias-label-tertiary: #46567c !important;
  --dsw-alias-label-caption: #566384 !important;
}

/* left sidebar: light surface + dark text */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sidebarCol'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='sidebar'] > div,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-pane='sidebar'] {
  background: rgba(231, 236, 247, 0.92) !important;
  color: #142044;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) {
  --dsw-alias-label-primary: #142044;
  --dsw-alias-label-secondary: #2a3a6e;
  --dsw-alias-label-tertiary: #46567c;
  --dsw-alias-label-caption: #566384;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) button,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [role='button'] {
  color: #1e2a52 !important;
}

/* hide navy/gold chrome + corner ornaments in light mode */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-skin-chrome='top-trim'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-skin-chrome='bottom-trim'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-skin-chrome='sidebar-corners'] {
  display: none !important;
}

/* sidebar rows: unselected black, selected navy + white */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionRow'] {
  color: #142044 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionRow'][aria-selected='true'] {
  background-color: #33487f !important;
  color: #ffffff !important;
}

/* 工作区 label + workspace folder name: dark */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='groupSection'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sectionHeader'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sectionLabel'] {
  color: #142044 !important;
}

/* top bar: ONE consistent opaque light surface + dark text everywhere
   (fixes 标准模式 white text and the tab/session.log transparency mismatch) */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_header,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='titleRow'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='titleCluster'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='crumbs'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='headerActions'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='headerUtilities'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='tablist'] {
  background-color: #eef2fa !important;
  color: #142044 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='crumb'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionLogButton'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='header'] [class*='label'] {
  color: #142044 !important;
}

/* tabs: sit on the opaque strip, dark text, active pill */
body[data-dsh-maid-atelier] [role='tab'] {
  background-color: transparent !important;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  color: #142044 !important;
}
body[data-dsh-maid-atelier] [role='tab'][aria-selected='true'] {
  background-color: #dbe3f4 !important;
  border-color: var(--dsw-alias-border-l3);
  color: #142044 !important;
}

/* session.log button: opaque pill matching the top bar */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionLogButton'] {
  background-color: #e2e9f7 !important;
  border: 1px solid var(--dsw-alias-border-l2);
}

/* settings + brand: consistent dark text (same family as new session) */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='trigger'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='brand'] {
  color: #1e2a52 !important;
}

/* empty / read-only text readable in light mode */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='empty' i],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='status'] {
  color: #46567c !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='empty' i] strong,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='status'] strong {
  color: #243866 !important;
}

/* right sidebar: light surface matching the left */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='detailsCol'] {
  background: rgba(231, 236, 247, 0.92);
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='details'] > div {
  background: rgba(231, 236, 247, 0.92);
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
