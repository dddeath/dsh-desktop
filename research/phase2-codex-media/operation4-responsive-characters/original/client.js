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

    const React = require("react");
    const {
      createElement: h,
      useEffect,
      useMemo,
      useState,
      useSyncExternalStore,
    } = React;

    const CSS = `
/* ===== maid-atelier light-mode fixes ===== */

/* base text tokens */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) {
  --dsw-alias-label-primary: #1e2a52 !important;
  --dsw-alias-label-secondary: #33466f !important;
  --dsw-alias-label-tertiary: #46567c !important;
  --dsw-alias-label-caption: #566384 !important;
  --maid-fix-surface-main: rgba(247, 249, 254, 0.94);
  --maid-fix-surface-strong: rgba(251, 252, 255, 0.97);
  --maid-fix-surface-panel: rgba(238, 243, 252, 0.96);
  --maid-fix-border: rgba(76, 98, 151, 0.30);
  --maid-fix-border-strong: rgba(62, 88, 151, 0.52);
  --maid-fix-shadow: 0 18px 52px rgba(29, 48, 94, 0.18);
  --maid-fix-focus: #315fc4;
}

/* left sidebar: light surface + dark text */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sidebarCol'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='sidebar'] > div,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-pane='sidebar'] {
  background: var(--maid-fix-surface-panel) !important;
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
/* active workspace folder: navy + white (selected), rest stay dark */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-maid-workspace-active],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='projectRow'][data-maid-workspace-active] {
  background-color: #33487f !important;
  color: #ffffff !important;
  border-radius: 8px;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-maid-workspace-active] [class*='folder'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='folderActive'] {
  color: #ffffff !important;
}

/* 工作区 label + workspace folder name: dark */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='groupSection'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sectionHeader'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sectionLabel'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='projectRow'] {
  color: #142044 !important;
}

/* top bar: transparent background (palace art shows through), dark text */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_header,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='titleRow'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='titleCluster'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='crumbs'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='headerActions'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='headerUtilities'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='tablist'] {
  background-color: transparent !important;
  color: #142044 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='crumb'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionLogButton'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='header'] [class*='label'] {
  color: #142044 !important;
}

/* remove the 1px separator line DSH draws under the conversation header
   (.wSkVaW_header::after) so the top bar and the history read as one surface */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_header::after {
  display: none !important;
}

/* Conversation / trace / context: a compact segmented control. The selected
   item uses a quiet elevated surface instead of the old outlined pill and
   underline combination. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_tabs[role='tablist'] {
  width: fit-content;
  gap: 4px !important;
  padding: 4px !important;
  background: rgba(226, 233, 247, 0.82) !important;
  border: 1px solid rgba(76, 98, 151, 0.18) !important;
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_tabs [role='tab'] {
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 8px;
  color: #405174 !important;
  padding: 5px 13px !important;
  line-height: 18px !important;
  box-shadow: none !important;
  transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_tabs [role='tab']::after {
  display: none !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_tabs [role='tab']:hover {
  background: rgba(255, 255, 255, 0.58) !important;
  color: #253a6c !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_tabs [role='tab'][aria-selected='true'] {
  background: rgba(255, 255, 255, 0.96) !important;
  border-color: rgba(49, 95, 196, 0.18) !important;
  color: #244b9b !important;
  font-weight: 600;
  box-shadow: 0 2px 7px rgba(31, 55, 111, 0.16), inset 0 1px 0 #ffffff !important;
}

/* session.log button: opaque pill matching the top bar */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionLogButton'] {
  background-color: #e2e9f7 !important;
  border: 1px solid var(--dsw-alias-border-l2);
}

/* settings + brand (SIDEBAR ONLY): button frame matching the new-session
   button. Scoped to the sidebar so the composer's model/reasoning selector
   triggers (also classed *trigger*) are NOT affected. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) button[class*='trigger'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [class*='brand'] {
  color: #1e2a52 !important;
  border: 1px solid var(--maid-fix-border) !important;
  border-radius: 10px !important;
  background-color: rgba(255, 255, 255, 0.78) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) button[class*='trigger']:hover,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [class*='brand']:hover {
  background-color: rgba(255, 255, 255, 0.96) !important;
}

/* The footer settings entry is a plain navigation action. Remove the nested
   trigger frame so its label is never clipped by a second bordered surface. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_footArea'] button[class*='trigger'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_footArea'] [class*='_triggerLabel'] {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_footArea'] button[class*='trigger'] {
  padding-inline: 12px !important;
}

/* Brand header: remove the heavy double navy frame and place the wordmark in
   the same restrained material language as the rest of the sidebar. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [class*='_logoRow'] {
  background: rgba(255, 255, 255, 0.72) !important;
  border: 1px solid rgba(76, 98, 151, 0.22) !important;
  border-radius: 14px !important;
  box-shadow: 0 8px 22px rgba(31, 52, 103, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90) !important;
  padding: 9px 10px !important;
  gap: 10px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [class*='_logoRow'] [class*='_brand'] {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [class*='_logoRow'] [class*='_toggle'] {
  background: rgba(226, 233, 247, 0.78) !important;
  border: 1px solid rgba(76, 98, 151, 0.20) !important;
  color: #29447f !important;
  box-shadow: none !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is([data-pane='sidebar'], [class*='sidebarCol']) [class*='_logoRow'] [class*='_toggle']:hover {
  background: rgba(214, 225, 246, 0.96) !important;
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
  background: var(--maid-fix-surface-panel) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='details'] > div {
  background: var(--maid-fix-surface-panel) !important;
}

/* Third-party desktop pets own their requested opacity through --pet-opacity.
   whale-girl also writes opacity: .25 inline while its root is marked inert;
   keep the user's configured opacity instead of washing out the sprite. */
body[data-dsh-maid-atelier] [data-whale-girl] {
  opacity: var(--pet-opacity, 1) !important;
}

/* Workbench/right sidebar: inner panes previously repainted the unified panel
   with an almost-white layer. Apply the left sidebar material through the
   complete pane stack so both sides share the same visible background. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_workbench'] :is(
  [class*='_panel'],
  [class*='_panelBody'],
  [class*='_pane'],
  [class*='_paneContent'],
  [class*='_paneTab'],
  [class*='_explorer'],
  [class*='_explorerBody']
) {
  background: var(--maid-fix-surface-panel) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_workbench'] > [class*='_panel'] {
  border-left: 1px solid rgba(76, 98, 151, 0.18) !important;
}

/* ===== phase-2 clarity pass ===== */

/* Composer: retain the ornate outer frame, but give text and controls a
   stable high-contrast surface independent of the illustration behind it. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_card']:has(textarea) {
  background: var(--maid-fix-surface-main) !important;
  border: 1px solid var(--maid-fix-border-strong) !important;
  box-shadow: var(--maid-fix-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(14px) saturate(0.82) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_card']:has(textarea) textarea {
  caret-color: #1e2a52 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_card']:has(textarea) [class*='_grow']::after,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_card']:has(textarea) textarea::placeholder {
  color: #46567c !important;
  opacity: 1 !important;
}

/* Composer controls read as one action row instead of floating directly over
   the themed background. The selectors use accessible names rather than the
   build-generated class prefix where DSH exposes one. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is(
  [aria-label='命令'],
  [aria-label^='访问模式'],
  [aria-label^='选择模型']
) {
  background-color: rgba(235, 241, 251, 0.96) !important;
  border: 1px solid rgba(76, 98, 151, 0.24) !important;
  color: #1e2a52 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [aria-label^='选择模型'] {
  max-width: min(360px, 48vw) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [aria-label='发送消息'] {
  box-shadow: 0 8px 20px rgba(49, 79, 146, 0.26) !important;
}

/* Settings: make the dialog the authoritative reading surface. The structural
   selector remains independent from the generated VOzbGW class prefix. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='dialog'][aria-modal='true']:has(> nav) {
  background: var(--maid-fix-surface-strong) !important;
  border: 1px solid var(--maid-fix-border-strong) !important;
  box-shadow: 0 24px 72px rgba(18, 34, 76, 0.28), 0 3px 12px rgba(18, 34, 76, 0.14) !important;
  backdrop-filter: blur(22px) saturate(0.78) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='dialog'][aria-modal='true']:has(> nav) > nav {
  background: rgba(231, 237, 249, 0.82) !important;
  border-right: 1px solid rgba(76, 98, 151, 0.18) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='dialog'][aria-modal='true']:has(> nav) > nav button:hover {
  background-color: rgba(255, 255, 255, 0.88) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='dialog'][aria-modal='true']:has(> nav) > :not(nav) {
  background: rgba(251, 252, 255, 0.72) !important;
}

/* Unified settings center: grouped navigation, a clear page header, and
   card-based option hierarchy without coupling to generated class prefixes. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='dialog'][aria-modal='true'][data-dsh-settings-center='enhanced'] {
  width: min(980px, calc(100vw - 48px)) !important;
  height: min(760px, calc(100vh - 40px)) !important;
  max-width: none !important;
  max-height: none !important;
  display: grid !important;
  grid-template-columns: 220px minmax(0, 1fr) !important;
  overflow: hidden !important;
  border-radius: 24px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] > nav[data-dsh-settings-nav='true'] {
  width: auto !important;
  min-width: 0 !important;
  padding: 18px 14px 16px !important;
  overflow: hidden !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-nav-list='true'] {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  gap: 4px !important;
  padding: 2px 2px 12px !important;
  overflow-y: auto !important;
  scrollbar-width: thin;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-group-label] {
  order: var(--dsh-settings-order) !important;
  margin: 12px 10px 4px !important;
  color: #8390aa !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 16px !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  user-select: none !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-nav-list='true'] > button {
  order: var(--dsh-settings-order) !important;
  min-height: 40px !important;
  height: 40px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  border: 1px solid transparent !important;
  border-radius: 11px !important;
  color: #596987 !important;
  font-size: 13px !important;
  font-weight: 650 !important;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease, transform 150ms ease !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-nav-list='true'] > button:hover {
  background: rgba(255, 255, 255, 0.68) !important;
  border-color: rgba(123, 146, 190, 0.22) !important;
  color: #29436f !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-nav-list='true'] > button[aria-current='true'] {
  position: relative !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border-color: rgba(85, 117, 181, 0.26) !important;
  color: #294f98 !important;
  font-weight: 800 !important;
  box-shadow: 0 8px 18px rgba(31, 53, 98, 0.10) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-nav-list='true'] > button[aria-current='true']::before {
  content: '' !important;
  position: absolute !important;
  left: 5px !important;
  top: 11px !important;
  bottom: 11px !important;
  width: 3px !important;
  border-radius: 999px !important;
  background: #395b9d !important;
  box-shadow: 0 0 0 3px rgba(57, 91, 157, 0.08) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] > [data-dsh-settings-content='true'] {
  width: auto !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  background: rgba(246, 248, 252, 0.98) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-header='true'] {
  flex: 0 0 72px !important;
  min-height: 72px !important;
  gap: 10px !important;
  padding: 11px 18px 11px 22px !important;
  background: rgba(255, 255, 255, 0.88) !important;
  border-bottom: 1px solid rgba(135, 151, 183, 0.20) !important;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-heading='true'] {
  display: flex !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 2px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-title='true'] {
  overflow: hidden !important;
  color: #21365e !important;
  font-size: 17px !important;
  font-weight: 850 !important;
  line-height: 22px !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-subtitle='true'] {
  overflow: hidden !important;
  color: #7a879e !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  line-height: 16px !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-meta='true'] {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-meta='true'] > span {
  display: inline-flex !important;
  min-height: 26px !important;
  align-items: center !important;
  padding: 0 9px !important;
  border: 1px solid rgba(120, 142, 184, 0.22) !important;
  border-radius: 999px !important;
  background: rgba(234, 239, 249, 0.72) !important;
  color: #60708e !important;
  font-size: 10px !important;
  font-weight: 750 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-config-action='true'] {
  min-height: 34px !important;
  padding: 0 12px !important;
  border: 1px solid rgba(101, 128, 182, 0.28) !important;
  border-radius: 10px !important;
  background: rgba(241, 245, 252, 0.92) !important;
  color: #38537f !important;
  font-size: 12px !important;
  font-weight: 750 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-close='true'] {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  border-radius: 10px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding: 16px 22px 28px !important;
  background: rgba(246, 248, 252, 0.98) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] [class$='_row'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] [class$='_group'] {
  margin: 8px 0 !important;
  padding: 15px 17px !important;
  border: 1px solid rgba(120, 140, 180, 0.20) !important;
  border-radius: 15px !important;
  background: rgba(255, 255, 255, 0.86) !important;
  box-shadow: 0 6px 18px rgba(39, 57, 91, 0.045) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] [class$='_selector'] {
  min-height: 36px !important;
  border: 1px solid rgba(106, 132, 182, 0.25) !important;
  border-radius: 10px !important;
  background: rgba(240, 244, 251, 0.92) !important;
  color: #334d78 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] :is([class$='_rowCard'], [class$='_addBlock'], [class$='_card'], [class$='_panel']) {
  border-color: rgba(115, 137, 180, 0.22) !important;
  border-radius: 15px !important;
  background: rgba(255, 255, 255, 0.86) !important;
  box-shadow: 0 6px 18px rgba(39, 57, 91, 0.045) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] [class$='_tabs'] {
  width: fit-content !important;
  padding: 3px !important;
  gap: 3px !important;
  border: 1px solid rgba(119, 140, 181, 0.20) !important;
  border-radius: 12px !important;
  background: rgba(230, 236, 248, 0.78) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] [class$='_tab'] {
  min-height: 32px !important;
  padding: 0 12px !important;
  border: 0 !important;
  border-radius: 9px !important;
}
@media (max-width: 900px) {
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [role='dialog'][aria-modal='true'][data-dsh-settings-center='enhanced'] {
    width: calc(100vw - 24px) !important;
    height: calc(100vh - 24px) !important;
    grid-template-columns: 180px minmax(0, 1fr) !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] > nav[data-dsh-settings-nav='true'] {
    padding-inline: 10px !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-header='true'] {
    padding-inline: 16px 12px !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-meta='true'] > span:last-child {
    display: none !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-settings-center='enhanced'] [data-dsh-settings-options='true'] {
    padding: 12px 14px 22px !important;
  }
}

/* Agent tool inventory: a read-only view of the selected session's latest
   model-visible catalog, including Code Mode tools declared in the SDK block. */
body [data-dsh-agent-tools='true'] {
  box-sizing: border-box;
  width: 100%;
  max-width: 780px;
  color: var(--dsw-alias-label-primary);
}
body [data-dsh-agent-tools-header='true'] {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
body [data-dsh-agent-tools-heading='true'] h2,
body [data-dsh-agent-tools-heading='true'] p {
  margin: 0;
}
body [data-dsh-agent-tools-heading='true'] h2 {
  font-size: 18px;
  line-height: 26px;
}
body [data-dsh-agent-tools-heading='true'] p {
  margin-top: 3px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
body [data-dsh-agent-tools-refresh='true'] {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}
body [data-dsh-agent-tools-refresh='true']:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
body [data-dsh-agent-tools-summary='true'] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 11px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
body [data-dsh-agent-tools-dot='true'] {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-primary);
}
body [data-dsh-agent-tools-pill='true'] {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 650;
}
body [data-dsh-agent-tools-search='true'] {
  display: block;
  margin-bottom: 12px;
}
body [data-dsh-agent-tools-search='true'] input {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  outline: none;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
body [data-dsh-agent-tools-search='true'] input:focus-visible {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);
}
body [data-dsh-agent-tools-list='true'] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
body [data-dsh-agent-tool-card='true'] {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 11px;
  background: var(--dsw-alias-bg-layer-1);
}
body [data-dsh-agent-tool-card='true'][data-open='true'] {
  border-color: var(--dsw-alias-border-l1);
  box-shadow: var(--dsw-shadow-lv1);
}
body [data-dsh-agent-tool-toggle='true'] {
  box-sizing: border-box;
  width: 100%;
  min-height: 82px;
  padding: 12px 13px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
body [data-dsh-agent-tool-toggle='true']:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
body [data-dsh-agent-tool-title='true'] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
body [data-dsh-agent-tool-title='true'] code {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body [data-dsh-agent-tool-origin='true'] {
  flex: none;
  padding: 2px 6px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
  color: var(--dsw-alias-state-business-primary);
  font-size: 10px;
  font-weight: 700;
}
body [data-dsh-agent-tool-description='true'] {
  display: -webkit-box;
  margin: 7px 0 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 17px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
body [data-dsh-agent-tool-details='true'] {
  padding: 10px 13px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
}
body [data-dsh-agent-tool-details='true'] p {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 17px;
}
body [data-dsh-agent-tool-details='true'] pre {
  max-height: 190px;
  margin: 8px 0 0;
  padding: 9px;
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: 10px/16px var(--ds-font-family-code);
  white-space: pre-wrap;
}
body [data-dsh-agent-tools-empty='true'] {
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 11px;
  color: var(--dsw-alias-label-tertiary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
  line-height: 19px;
}
@media (max-width: 760px) {
  body [data-dsh-agent-tools-list='true'] {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Desktop runtime status: one compact source of truth in the title row. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-anchor='true'] {
  position: relative !important;
  min-width: 0 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-status='true'] {
  position: relative !important;
  z-index: 65 !important;
  flex: 0 0 auto !important;
  margin-left: auto !important;
}
/* Runtime information must remain plain text in every theme and interaction
   state. The skin's decorative type treatments are intentionally not inherited
   by this diagnostic surface: no shadow, stroke or filter is permitted. */
body[data-dsh-maid-atelier] [data-dsh-runtime-status='true'],
body[data-dsh-maid-atelier] [data-dsh-runtime-status='true'] :is(button, span, strong),
body[data-dsh-maid-atelier] [data-dsh-runtime-status='true'] :is(button, span, strong)::before,
body[data-dsh-maid-atelier] [data-dsh-runtime-status='true'] :is(button, span, strong)::after {
  text-shadow: none !important;
  -webkit-text-stroke: 0 transparent !important;
  filter: none !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-summary='true'] {
  display: inline-flex !important;
  min-height: 28px !important;
  align-items: center !important;
  gap: 7px !important;
  padding: 0 9px !important;
  border: 1px solid rgba(91, 116, 167, 0.24) !important;
  border-radius: 10px !important;
  background: #fafcff !important;
  color: #425678 !important;
  box-shadow: 0 5px 14px rgba(34, 54, 91, 0.07) !important;
  font-size: 10px !important;
  font-weight: 750 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-summary='true']:hover,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-summary='true'][aria-expanded='true'] {
  border-color: rgba(60, 94, 159, 0.38) !important;
  background: rgba(255, 255, 255, 0.98) !important;
  color: #244576 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-dot='true'] {
  width: 7px !important;
  height: 7px !important;
  flex: 0 0 7px !important;
  border-radius: 50% !important;
  background: #38a169 !important;
  box-shadow: 0 0 0 3px rgba(56, 161, 105, 0.12) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-status][data-dsh-runtime-phase='waiting'] [data-dsh-runtime-dot],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-status][data-dsh-runtime-phase='backup'] [data-dsh-runtime-dot],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-status][data-dsh-runtime-phase='stopping'] [data-dsh-runtime-dot] {
  background: #d89b2b !important;
  box-shadow: 0 0 0 3px rgba(216, 155, 43, 0.14) !important;
  animation: dsh-runtime-pulse 1.2s ease-in-out infinite !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-status][data-dsh-runtime-phase='reconnecting'] [data-dsh-runtime-dot] {
  background: #3d6fbe !important;
  box-shadow: 0 0 0 3px rgba(61, 111, 190, 0.14) !important;
  animation: dsh-runtime-pulse 0.9s ease-in-out infinite !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-status][data-dsh-runtime-phase='error'] [data-dsh-runtime-dot] {
  background: #cc4a4a !important;
  box-shadow: 0 0 0 3px rgba(204, 74, 74, 0.14) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-segment='true'] + [data-dsh-runtime-segment='true']::before {
  content: '' !important;
  display: inline-block !important;
  width: 1px !important;
  height: 11px !important;
  margin-right: 7px !important;
  vertical-align: -2px !important;
  background: rgba(109, 128, 164, 0.24) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-caret='true'] {
  color: #74839c !important;
  font-size: 10px !important;
  transition: transform 150ms ease !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-summary='true'][aria-expanded='true'] [data-dsh-runtime-caret='true'] {
  transform: rotate(180deg) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-panel='true'] {
  position: absolute !important;
  top: calc(100% + 8px) !important;
  right: 0 !important;
  width: 338px !important;
  padding: 14px !important;
  border: 1px solid rgba(88, 112, 162, 0.26) !important;
  border-radius: 16px !important;
  background: #fcfdff !important;
  color: #263b61 !important;
  box-shadow: 0 18px 42px rgba(25, 42, 76, 0.18), 0 4px 12px rgba(25, 42, 76, 0.10) !important;
  backdrop-filter: none !important;
  isolation: isolate !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-panel='true'][hidden] {
  display: none !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-panel-head='true'] {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-bottom: 12px !important;
  padding-bottom: 11px !important;
  border-bottom: 1px solid rgba(120, 140, 180, 0.18) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-panel-title='true'] {
  display: block !important;
  color: #20375f !important;
  font-size: 14px !important;
  font-weight: 850 !important;
  line-height: 18px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-phase-label='true'] {
  display: inline-flex !important;
  min-height: 24px !important;
  align-items: center !important;
  padding: 0 8px !important;
  border-radius: 999px !important;
  background: rgba(228, 242, 235, 0.9) !important;
  color: #2f7a53 !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-phase-label='true'][data-tone='busy'] {
  background: rgba(249, 237, 211, 0.92) !important;
  color: #966618 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-phase-label='true'][data-tone='error'] {
  background: rgba(249, 224, 224, 0.92) !important;
  color: #a73d3d !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-grid='true'] {
  display: grid !important;
  grid-template-columns: 88px minmax(0, 1fr) !important;
  gap: 8px 12px !important;
  align-items: center !important;
  font-size: 11px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-key='true'] {
  color: #8490a5 !important;
  font-weight: 700 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-value='true'] {
  overflow: hidden !important;
  color: #354c73 !important;
  font-weight: 750 !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-actions='true'] {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-top: 13px !important;
  padding-top: 11px !important;
  border-top: 1px solid rgba(120, 140, 180, 0.18) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-note='true'] {
  max-width: 190px !important;
  color: #8893a7 !important;
  font-size: 9px !important;
  font-weight: 650 !important;
  line-height: 14px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-restart='true'] {
  min-height: 32px !important;
  padding: 0 11px !important;
  border: 1px solid rgba(71, 103, 165, 0.30) !important;
  border-radius: 9px !important;
  background: #edf2fb !important;
  color: #294f86 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-restart='true']:disabled {
  cursor: wait !important;
  opacity: 0.55 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-pending='true'] {
  color: #9b6816 !important;
}
@keyframes dsh-runtime-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.86); }
}
@media (max-width: 1100px) {
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-segment='plugins'] {
    display: none !important;
  }
}
@media (max-width: 960px) {
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-segment='port'],
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-segment='mode'] {
    display: none !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-runtime-panel='true'] {
    width: min(320px, calc(100vw - 32px)) !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  body[data-dsh-maid-atelier] [data-dsh-runtime-dot='true'] {
    animation: none !important;
  }
}

/* Workbench surfaces: Explorer/details and lower panels use the same material
   as the session sidebar so the three-pane workspace reads as one product. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) :is(
  [class*='_sidePanel'],
  [class*='_sideCol'],
  [class*='_bottomPanel']
) {
  background: var(--maid-fix-surface-panel) !important;
  color: #172347 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='_tabBar'] {
  background: rgba(239, 244, 252, 0.98) !important;
  border-color: rgba(76, 98, 151, 0.18) !important;
}

/* ===== responsive three-column pass ===== */

/* At laptop widths the session column remains useful while the workbench
   sidebar is coordinated by the client controller below. Protect the main
   task surface from shrinking below the accepted reading width. */
body[data-dsh-responsive-band='medium'] [class*='_centerCol'] {
  min-width: 680px !important;
}

/* Preserve the upstream inline width written by the resize handle without a
   second, CSS-only cap. A visual max-width here used to stop the panel around
   half of a wide screen while dsh-better-sidebar kept increasing its layout
   variable, so the conversation continued shrinking behind a frozen panel.
   Let the upstream single width value drive both surfaces instead. */
body[data-dsh-responsive-band='wide'] [class*='_panel']:has(> [class*='_panelBody']) {
  min-width: 300px !important;
  max-width: none !important;
}
body[data-dsh-responsive-band='wide'] [class*='_centerCol'] {
  min-width: 0 !important;
}
body[data-dsh-responsive-band='wide'] #root {
  margin-right: var(--dsh-sidebar-width, 0px) !important;
}

/* Compact windows use the built-in icon rail and let the conversation own the
   remaining viewport. The min() guard keeps very small windows scroll-safe. */
body[data-dsh-responsive-band='compact'] [class*='_centerCol'] {
  min-width: min(680px, 100vw) !important;
}
body[data-dsh-responsive-band='compact'] [class*='sidebarCol'] {
  box-shadow: 4px 0 18px rgba(25, 43, 86, 0.14) !important;
}

/* ===== composer hierarchy pass ===== */

/* Keep the themed frame, but make the input body and the action shelf read as
   two deliberate layers. The JS enhancer below assigns stable semantic data
   attributes so these rules do not depend on generated CSS-module prefixes. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-composer-card='true'][data-dsh-composer='layered'] {
  container-type: inline-size !important;
  min-height: 176px !important;
  padding: 14px 16px 10px !important;
  gap: 8px !important;
  border-radius: 24px !important;
  overflow: visible !important;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-composer-card='true'][data-dsh-composer='layered']:focus-within {
  border-color: var(--maid-fix-focus) !important;
  box-shadow: 0 0 0 4px rgba(93, 140, 255, 0.16), var(--maid-fix-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.92) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-layer='body'] {
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  min-height: 96px !important;
  padding: 12px !important;
  border: 1px solid rgba(76, 98, 151, 0.18) !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.56) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-layer='body'] [class*='_grow'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-layer='body'] textarea {
  min-height: 70px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-layer='body'] textarea {
  line-height: 1.55 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-layer='actions'] {
  box-sizing: border-box !important;
  flex: 0 0 42px !important;
  height: 42px !important;
  min-height: 42px !important;
  max-height: 42px !important;
  margin-top: 0 !important;
  padding: 6px 2px 0 !important;
  gap: 10px !important;
  border-top: 1px solid rgba(76, 98, 151, 0.16) !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-group] {
  min-width: 0 !important;
  gap: 8px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-group='status'] {
  flex: 1 1 auto !important;
  justify-content: flex-end !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role] {
  box-sizing: border-box !important;
  height: 36px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  border-radius: 10px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='permission'] {
  width: auto !important;
  max-width: 168px !important;
  padding-inline: 10px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='permission'] [class*='_triggerLabel'] {
  display: inline-block !important;
  max-width: 116px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='model'] {
  flex: 0 1 auto !important;
  width: auto !important;
  max-width: min(360px, 46vw) !important;
  min-width: 0 !important;
  padding-inline: 10px !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='model'] [class*='_triggerLabel'] {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='model'] [class*='_triggerEffort'] {
  flex: 0 0 auto !important;
  padding: 2px 7px !important;
  border-radius: 999px !important;
  background: rgba(211, 222, 244, 0.72) !important;
}
/* Upstream uses the card's ::before for its ornamental frame. Reusing that
   pseudo-element as a running badge inherits the frame geometry and creates a
   large white layer over the input. DSH already renders the live agent state
   above the composer, so the enhancer only keeps the machine-readable data. */
body[data-dsh-maid-atelier] [data-composer-card='true'][data-dsh-composer-status]::before {
  content: none !important;
  display: none !important;
}

/* Opening the workbench reduces the main column even on a wide viewport.
   Mirror the compact permission treatment for that state so the model and
   send actions never collide with the input group. */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-composer-card='true'][data-dsh-composer-compact-actions='true'] [data-dsh-composer-role='permission'] {
  box-sizing: border-box !important;
  flex: 0 0 38px !important;
  width: 38px !important;
  min-width: 38px !important;
  max-width: 38px !important;
  padding-inline: 0 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-composer-card='true'][data-dsh-composer-compact-actions='true'] [data-dsh-composer-role='permission'] :is([class*='_triggerLabel'], [class*='_chevron']) {
  display: none !important;
}

@media (max-width: 1099px) {
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-composer-card='true'][data-dsh-composer='layered'] {
    padding-inline: 14px !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-layer='actions'] {
    gap: 8px !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='permission'] {
    width: 38px !important;
    padding-inline: 0 !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='permission'] :is([class*='_triggerLabel'], [class*='_chevron']) {
    display: none !important;
  }
  body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-dsh-composer-role='model'] {
    width: auto !important;
    max-width: min(340px, 48vw) !important;
    min-width: 0 !important;
  }
}

/* Keyboard users receive a consistent visible focus indicator across the
   official UI and community plugin controls. */
body[data-dsh-maid-atelier] :is(button, [role='button'], [role='tab'], textarea, input, select, [tabindex]):focus-visible {
  outline: 3px solid var(--maid-fix-focus, #5d8cff) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 5px rgba(49, 95, 196, 0.18) !important;
}

@media (prefers-reduced-motion: reduce) {
  body[data-dsh-maid-atelier] *,
  body[data-dsh-maid-atelier] *::before,
  body[data-dsh-maid-atelier] *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

    const TAG_ID = "dsh-maid-atelier-fix/overrides.css";

    const RESPONSIVE_BREAKPOINTS = Object.freeze({
      compactMax: 1099,
      mediumMax: 1439,
    });

    function responsiveBand(width) {
      if (width <= RESPONSIVE_BREAKPOINTS.compactMax) return "compact";
      if (width <= RESPONSIVE_BREAKPOINTS.mediumMax) return "medium";
      return "wide";
    }

    function ariaLabel(button) {
      return (button && button.getAttribute("aria-label") || "").trim();
    }

    function isRightSidebarLabel(label, action) {
      const normalized = label.toLowerCase();
      if (action === "collapse") {
        return label === "折叠侧边栏" || normalized === "collapse sidebar" || normalized === "hide sidebar";
      }
      return label === "展开侧边栏" || normalized === "expand sidebar" || normalized === "show sidebar";
    }

    function isLeftSidebarLabel(label, action) {
      const normalized = label.toLowerCase();
      if (action === "collapse") {
        return label === "收起侧边栏" || normalized === "close sidebar" || normalized === "collapse navigation";
      }
      return label === "打开侧边栏" || normalized === "open sidebar" || normalized === "expand navigation";
    }

    function findRightSidebarToggle(action) {
      /* DSH renders the workbench toggle cluster through a portal directly
         under body, so it is intentionally located by its control class. */
      const controls = document.querySelectorAll("button[class*='_toggleButton'][aria-label]");
      return Array.from(controls).find((button) => isRightSidebarLabel(ariaLabel(button), action)) || null;
    }

    function findLeftSidebarToggle(action) {
      const controls = document.querySelectorAll("button[class*='_toggle'][aria-label]");
      return Array.from(controls).find((button) => isLeftSidebarLabel(ariaLabel(button), action)) || null;
    }

    function installResponsiveLayout() {
      let disposed = false;
      let activeBand = null;
      let pendingRightCollapse = false;
      let pendingLeftCollapse = false;
      let scheduled = false;

      function syncWideSidebarPush() {
        const root = document.getElementById("root");
        if (!root) return;
        if (document.body?.dataset.dshResponsiveBand === "wide") {
          root.style.setProperty("margin-right", "var(--dsh-sidebar-width, 0px)", "important");
          root.dataset.dshResponsiveRootPush = "true";
          return;
        }
        if (root.dataset.dshResponsiveRootPush === "true") {
          root.style.removeProperty("margin-right");
          delete root.dataset.dshResponsiveRootPush;
        }
      }

      function scheduleReconcile(delay = 0) {
        if (disposed || scheduled) return;
        scheduled = true;
        window.setTimeout(() => {
          scheduled = false;
          reconcile();
        }, delay);
      }

      function reconcile() {
        if (disposed || !document.body) return;

        syncWideSidebarPush();

        if (findRightSidebarToggle("collapse")) {
          document.body.dataset.dshWorkbenchSidebar = "open";
        } else if (findRightSidebarToggle("expand")) {
          document.body.dataset.dshWorkbenchSidebar = "closed";
        }

        if (pendingRightCollapse) {
          const collapse = findRightSidebarToggle("collapse");
          if (collapse) {
            pendingRightCollapse = false;
            document.body.dataset.dshResponsiveRight = "auto-collapsed";
            collapse.click();
            scheduleReconcile(180);
            return;
          }
          if (findRightSidebarToggle("expand")) {
            pendingRightCollapse = false;
            document.body.dataset.dshResponsiveRight = "collapsed";
          }
        }

        if (pendingLeftCollapse) {
          const collapse = findLeftSidebarToggle("collapse");
          if (collapse) {
            pendingLeftCollapse = false;
            document.body.dataset.dshResponsiveLeft = "icon-rail";
            collapse.click();
            return;
          }
          if (findLeftSidebarToggle("expand")) {
            pendingLeftCollapse = false;
            document.body.dataset.dshResponsiveLeft = "icon-rail";
          }
        }
      }

      function evaluateViewport() {
        if (disposed || !document.body) return;
        const nextBand = responsiveBand(window.innerWidth);
        document.body.dataset.dshResponsiveBand = nextBand;
        if (nextBand === activeBand) return;

        activeBand = nextBand;
        pendingRightCollapse = nextBand !== "wide";
        pendingLeftCollapse = nextBand === "compact";
        if (nextBand !== "compact") {
          delete document.body.dataset.dshResponsiveLeft;
        }
        if (nextBand === "wide") {
          delete document.body.dataset.dshResponsiveRight;
        }
        scheduleReconcile();
      }

      const observer = new MutationObserver(() => scheduleReconcile(40));
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
      window.addEventListener("resize", evaluateViewport, { passive: true });
      evaluateViewport();

      return () => {
        disposed = true;
        observer.disconnect();
        window.removeEventListener("resize", evaluateViewport);
        if (document.body) {
          delete document.body.dataset.dshResponsiveBand;
          delete document.body.dataset.dshResponsiveLeft;
          delete document.body.dataset.dshResponsiveRight;
          delete document.body.dataset.dshWorkbenchSidebar;
        }
        const root = document.getElementById("root");
        if (root?.dataset.dshResponsiveRootPush === "true") {
          root.style.removeProperty("margin-right");
          delete root.dataset.dshResponsiveRootPush;
        }
      };
    }

    function installComposerEnhancements() {
      let disposed = false;
      let scheduled = false;

      function assign(button, role) {
        if (button) button.dataset.dshComposerRole = role;
      }

      function enhanceCard(card) {
        card.dataset.dshComposer = "layered";
        card.dataset.dshComposerCompactActions = card.getBoundingClientRect().width <= 700 || document.body.dataset.dshWorkbenchSidebar === "open" ? "true" : "false";

        const inputLayer = card.querySelector("[data-input-scroll='true']");
        const actionLayer = Array.from(card.children).find((node) => node.matches("[class*='_row']"));
        const tools = actionLayer && actionLayer.querySelector("[class*='_tools']");
        const trailing = actionLayer && actionLayer.querySelector("[class*='_trailing']");
        const textarea = card.querySelector("textarea");

        if (inputLayer) inputLayer.dataset.dshComposerLayer = "body";
        if (actionLayer) {
          actionLayer.dataset.dshComposerLayer = "actions";
          if (!actionLayer.getAttribute("aria-label")) actionLayer.setAttribute("aria-label", "Composer actions");
        }
        if (tools) {
          tools.dataset.dshComposerGroup = "input";
          tools.setAttribute("role", "group");
          if (!tools.getAttribute("aria-label")) tools.setAttribute("aria-label", "输入与权限");
        }
        if (trailing) {
          trailing.dataset.dshComposerGroup = "status";
          trailing.setAttribute("role", "group");
          if (!trailing.getAttribute("aria-label")) trailing.setAttribute("aria-label", "模型、上下文与发送");
        }
        if (textarea && !textarea.getAttribute("aria-label")) {
          textarea.setAttribute("aria-label", "消息输入");
          textarea.dataset.dshComposerAriaOwned = "true";
        }

        assign(tools && tools.querySelector("button[aria-haspopup='listbox']"), "command");
        assign(tools && Array.from(tools.querySelectorAll("button")).find((button) => button.getAttribute("aria-haspopup") !== "listbox"), "permission");

        const modelButton = card.querySelector("[data-slot='conversation.input.model'] button");
        const modelLabel = modelButton && modelButton.querySelector("[class*='_triggerLabel']");
        const effortLabel = modelButton && modelButton.querySelector("[class*='_triggerEffort']");
        assign(modelButton, "model");
        if (modelButton && modelLabel) {
          const fullLabel = modelLabel.textContent.trim();
          const effort = effortLabel && effortLabel.textContent.trim();
          const nextTitle = effort ? `${fullLabel} · ${effort}` : fullLabel;
          modelButton.dataset.dshFullLabel = fullLabel;
          if (modelButton.title !== nextTitle) modelButton.title = nextTitle;
          if (modelLabel.title !== fullLabel) modelLabel.title = fullLabel;
        }

        assign(trailing && trailing.querySelector("button[aria-haspopup='dialog']"), "context");
        assign(trailing && trailing.querySelector("button[class*='_primary']"), "primary");

        const labels = Array.from(card.querySelectorAll("button[aria-label]"), (button) => button.getAttribute("aria-label") || "");
        let status = "idle";
        let statusLabel = "";
        if (labels.some((label) => /等待批准|waiting for approval|approve/i.test(label))) {
          status = "approval";
          statusLabel = "等待批准";
        } else if (labels.some((label) => /已排队|queued|queue/i.test(label))) {
          status = "queued";
          statusLabel = "已排队";
        } else if (labels.some((label) => /停止|stop/i.test(label))) {
          status = "running";
          statusLabel = "智能体运行中";
        }
        card.dataset.dshComposerStatus = status;
        if (statusLabel) card.dataset.dshComposerStatusLabel = statusLabel;
        else delete card.dataset.dshComposerStatusLabel;
      }

      function enhance() {
        if (disposed) return;
        document.querySelectorAll("[data-composer-card='true']").forEach(enhanceCard);
      }

      function scheduleEnhance() {
        if (disposed || scheduled) return;
        scheduled = true;
        window.setTimeout(() => {
          scheduled = false;
          enhance();
        }, 16);
      }

      const observer = new MutationObserver(scheduleEnhance);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-label", "disabled", "title", "data-dsh-workbench-sidebar"],
      });
      window.addEventListener("resize", scheduleEnhance, { passive: true });
      enhance();

      return () => {
        disposed = true;
        observer.disconnect();
        window.removeEventListener("resize", scheduleEnhance);
        document.querySelectorAll("[data-composer-card='true']").forEach((card) => {
          delete card.dataset.dshComposer;
          delete card.dataset.dshComposerCompactActions;
          delete card.dataset.dshComposerStatus;
          delete card.dataset.dshComposerStatusLabel;
          card.querySelectorAll("[data-dsh-composer-layer]").forEach((node) => delete node.dataset.dshComposerLayer);
          card.querySelectorAll("[data-dsh-composer-group]").forEach((node) => delete node.dataset.dshComposerGroup);
          card.querySelectorAll("[data-dsh-composer-role]").forEach((node) => delete node.dataset.dshComposerRole);
          card.querySelectorAll("[data-dsh-composer-aria-owned='true']").forEach((node) => {
            node.removeAttribute("aria-label");
            delete node.dataset.dshComposerAriaOwned;
          });
        });
      };
    }

    function installDesktopStatusEnhancements() {
      const phaseCopy = {
        ready: { zh: "\u8fd0\u884c\u6b63\u5e38", en: "Running", tone: "ready" },
        waiting: { zh: "\u7b49\u5f85\u4f1a\u8bdd\u7a33\u5b9a", en: "Waiting for session", tone: "busy" },
        backup: { zh: "\u5907\u4efd\u4f1a\u8bdd\u65e5\u5fd7", en: "Backing up logs", tone: "busy" },
        stopping: { zh: "\u505c\u6b62 Harness \u670d\u52a1", en: "Stopping Harness", tone: "busy" },
        reconnecting: { zh: "\u6b63\u5728\u91cd\u65b0\u8fde\u63a5", en: "Reconnecting", tone: "busy" },
        error: { zh: "\u91cd\u8fde\u5f02\u5e38", en: "Reconnect error", tone: "error" },
      };
      const setText = (node, value) => {
        const text = String(value ?? "");
        if (node && node.textContent !== text) node.textContent = text;
      };
      const isChineseUi = () => (document.documentElement.lang || "").toLowerCase().startsWith("zh")
        || /[\u3400-\u9fff]/.test(document.body?.innerText?.slice(0, 800) || "");

      const readRuntimeState = () => {
        let nativeState = {};
        const serializedDesktopState = document.documentElement.getAttribute("data-dsh-desktop-status");
        if (serializedDesktopState) {
          try { nativeState = JSON.parse(serializedDesktopState); }
          catch { nativeState = {}; }
        }
        const boot = window.__DSH_BOOT__ || {};
        const entries = Array.isArray(boot.entries) ? boot.entries : [];
        const zh = isChineseUi();
        const phase = phaseCopy[nativeState.phase] ? nativeState.phase : "ready";
        const version = nativeState.dshVersion && nativeState.dshVersion !== "unknown"
          ? nativeState.dshVersion
          : (boot.rev ? `rev ${String(boot.rev).slice(0, 7)}` : (zh ? "\u7248\u672c\u5f85\u540c\u6b65" : "version pending"));
        const port = nativeState.port || window.location.port || "-";
        const mode = nativeState.desktop
          ? (nativeState.mode === "attached"
            ? (zh ? "\u9644\u7740" : "Attached")
            : (zh ? "\u6258\u7ba1" : "Managed"))
          : "Web";
        const pluginSync = entries.length
          ? (zh ? `${entries.length} \u9879 \u00b7 \u5df2\u540c\u6b65` : `${entries.length} items synced`)
          : (zh ? "\u7b49\u5f85\u6e05\u5355" : "Manifest pending");
        const pendingRestart = Boolean(document.querySelector("[data-dsh-restart-required='true'], [data-restart-required='true']"));
        return {
          nativeState,
          zh,
          phase,
          phaseMeta: phaseCopy[phase],
          version,
          port,
          mode,
          pluginSync,
          pluginCount: entries.length,
          bootRev: boot.rev ? String(boot.rev).slice(0, 12) : "-",
          pendingRestart,
        };
      };

      const updateHost = (host) => {
        const state = readRuntimeState();
        const copy = state.zh ? state.phaseMeta.zh : state.phaseMeta.en;
        host.dataset.dshRuntimePhase = state.phase;
        const summary = host.querySelector("[data-dsh-runtime-summary='true']");
        if (summary) summary.title = copy;
        setText(host.querySelector("[data-dsh-runtime-primary='true']"), `dsh ${state.version}`);
        setText(host.querySelector("[data-dsh-runtime-port='true']"), `:${state.port}`);
        setText(host.querySelector("[data-dsh-runtime-mode='true']"), state.mode);
        setText(
          host.querySelector("[data-dsh-runtime-plugins='true']"),
          state.pendingRestart
            ? (state.zh ? "\u63d2\u4ef6 \u00b7 \u5f85\u91cd\u542f" : "Plugins · restart")
            : (state.zh ? `\u63d2\u4ef6 ${state.pluginCount}` : `Plugins ${state.pluginCount}`),
        );
        const pluginSegment = host.querySelector("[data-dsh-runtime-segment='plugins']");
        if (pluginSegment) pluginSegment.dataset.dshRuntimePending = state.pendingRestart ? "true" : "false";

        const phaseLabel = host.querySelector("[data-dsh-runtime-phase-label='true']");
        setText(phaseLabel, copy);
        if (phaseLabel) phaseLabel.dataset.tone = state.phaseMeta.tone;
        setText(host.querySelector("[data-dsh-runtime-field='version']"), state.version);
        setText(host.querySelector("[data-dsh-runtime-field='service']"), `127.0.0.1:${state.port}`);
        setText(
          host.querySelector("[data-dsh-runtime-field='mode']"),
          state.zh
            ? (state.nativeState.desktop
              ? (state.nativeState.mode === "attached" ? "\u684c\u9762\u7aef \u00b7 \u9644\u7740\u73b0\u6709\u670d\u52a1" : "\u684c\u9762\u7aef \u00b7 \u6258\u7ba1\u670d\u52a1")
              : "Web \u672c\u5730\u754c\u9762")
            : (state.nativeState.desktop ? `Desktop · ${state.mode}` : "Local Web UI"),
        );
        setText(
          host.querySelector("[data-dsh-runtime-field='plugins']"),
          state.pendingRestart
            ? (state.zh ? `${state.pluginSync} \u00b7 \u5f85\u91cd\u542f` : `${state.pluginSync} · restart pending`)
            : state.pluginSync,
        );
        setText(host.querySelector("[data-dsh-runtime-field='revision']"), state.bootRev);
        const restart = host.querySelector("[data-dsh-runtime-restart='true']");
        if (restart) {
          restart.hidden = !state.nativeState.desktop || !state.nativeState.canRestart;
          restart.disabled = state.phase !== "ready" && state.phase !== "error";
          setText(restart, state.zh ? "\u91cd\u542f Harness" : "Restart Harness");
        }
        const note = host.querySelector("[data-dsh-runtime-note='true']");
        setText(
          note,
          state.nativeState.desktop
            ? (state.zh ? "\u4e0e\u684c\u9762\u83dc\u5355\u5171\u7528\u540c\u4e00\u5b89\u5168\u91cd\u542f\u6d41\u7a0b" : "Uses the same safe restart flow as the desktop menu")
            : (state.zh ? "\u684c\u9762\u7aef\u4f1a\u663e\u793a\u9644\u7740/\u6258\u7ba1\u6a21\u5f0f\u4e0e\u91cd\u542f\u5165\u53e3" : "Desktop shows mode and the restart action"),
        );
      };

      const createHost = (anchor) => {
        const existing = anchor.querySelector(":scope > [data-dsh-runtime-status='true']");
        if (existing) {
          updateHost(existing);
          return existing;
        }
        const zh = isChineseUi();
        const host = document.createElement("div");
        const panelId = `dsh-runtime-panel-${Math.random().toString(36).slice(2, 8)}`;
        host.dataset.dshRuntimeStatus = "true";
        host.innerHTML = `
          <button type="button" data-dsh-runtime-summary="true" aria-expanded="false" aria-controls="${panelId}" aria-label="${zh ? "\u67e5\u770b Harness \u8fd0\u884c\u72b6\u6001" : "View Harness runtime status"}">
            <span data-dsh-runtime-dot="true" aria-hidden="true"></span>
            <span data-dsh-runtime-segment="true" data-dsh-runtime-primary="true"></span>
            <span data-dsh-runtime-segment="port" data-dsh-runtime-port="true"></span>
            <span data-dsh-runtime-segment="mode" data-dsh-runtime-mode="true"></span>
            <span data-dsh-runtime-segment="plugins" data-dsh-runtime-plugins="true"></span>
            <span data-dsh-runtime-caret="true" aria-hidden="true">\u25be</span>
          </button>
          <section id="${panelId}" data-dsh-runtime-panel="true" role="dialog" aria-label="${zh ? "Harness \u8fd0\u884c\u72b6\u6001" : "Harness runtime status"}" hidden>
            <div data-dsh-runtime-panel-head="true">
              <strong data-dsh-runtime-panel-title="true">${zh ? "\u684c\u9762\u8fd0\u884c\u72b6\u6001" : "Desktop runtime"}</strong>
              <span data-dsh-runtime-phase-label="true" role="status" aria-live="polite"></span>
            </div>
            <div data-dsh-runtime-grid="true">
              <span data-dsh-runtime-key="true">DSH</span><span data-dsh-runtime-value="true" data-dsh-runtime-field="version"></span>
              <span data-dsh-runtime-key="true">${zh ? "\u670d\u52a1" : "Service"}</span><span data-dsh-runtime-value="true" data-dsh-runtime-field="service"></span>
              <span data-dsh-runtime-key="true">${zh ? "\u6a21\u5f0f" : "Mode"}</span><span data-dsh-runtime-value="true" data-dsh-runtime-field="mode"></span>
              <span data-dsh-runtime-key="true">${zh ? "\u63d2\u4ef6\u6e05\u5355" : "Plugins"}</span><span data-dsh-runtime-value="true" data-dsh-runtime-field="plugins"></span>
              <span data-dsh-runtime-key="true">${zh ? "\u524d\u7aef\u4fee\u8ba2" : "UI revision"}</span><span data-dsh-runtime-value="true" data-dsh-runtime-field="revision"></span>
            </div>
            <div data-dsh-runtime-actions="true">
              <span data-dsh-runtime-note="true"></span>
              <button type="button" data-dsh-runtime-restart="true"></button>
            </div>
          </section>`;
        anchor.appendChild(host);

        const summary = host.querySelector("[data-dsh-runtime-summary='true']");
        const panel = host.querySelector("[data-dsh-runtime-panel='true']");
        summary?.addEventListener("click", () => {
          const willOpen = panel.hidden;
          panel.hidden = !willOpen;
          summary.setAttribute("aria-expanded", String(willOpen));
        });
        host.querySelector("[data-dsh-runtime-restart='true']")?.addEventListener("click", () => {
          panel.hidden = true;
          summary?.setAttribute("aria-expanded", "false");
          window.location.assign("dsh-desktop://restart");
        });
        updateHost(host);
        return host;
      };

      let timer = null;
      const enhance = () => {
        const header = document.querySelector("header");
        const titleRow = header?.querySelector(":scope > div:first-child");
        const anchor = titleRow?.querySelector(":scope > div:first-child");
        if (!anchor) return;
        anchor.dataset.dshRuntimeAnchor = "true";
        createHost(anchor);
      };
      const schedule = () => {
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = null;
          enhance();
          document.querySelectorAll("[data-dsh-runtime-status='true']").forEach(updateHost);
        }, 24);
      };
      const closeOnOutside = (event) => {
        document.querySelectorAll("[data-dsh-runtime-status='true']").forEach((host) => {
          if (host.contains(event.target)) return;
          const panel = host.querySelector("[data-dsh-runtime-panel='true']");
          const summary = host.querySelector("[data-dsh-runtime-summary='true']");
          if (panel) panel.hidden = true;
          summary?.setAttribute("aria-expanded", "false");
        });
      };
      const closeOnEscape = (event) => {
        if (event.key !== "Escape") return;
        closeOnOutside({ target: document.body });
      };
      const onRuntimeStatus = () => schedule();
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
      document.addEventListener("pointerdown", closeOnOutside);
      document.addEventListener("keydown", closeOnEscape);
      window.addEventListener("dsh-desktop-status", onRuntimeStatus);
      schedule();

      return () => {
        observer.disconnect();
        if (timer !== null) window.clearTimeout(timer);
        document.removeEventListener("pointerdown", closeOnOutside);
        document.removeEventListener("keydown", closeOnEscape);
        window.removeEventListener("dsh-desktop-status", onRuntimeStatus);
        document.querySelectorAll("[data-dsh-runtime-status='true']").forEach((node) => node.remove());
        document.querySelectorAll("[data-dsh-runtime-anchor='true']").forEach((node) => delete node.dataset.dshRuntimeAnchor);
      };
    }

    function installSettingsEnhancements() {
      const groups = [
        {
          key: "core",
          order: 10,
          labelZh: "\u6838\u5fc3\u8bbe\u7f6e",
          labelEn: "CORE",
          subtitleZh: "\u57fa\u7840\u504f\u597d\u4e0e\u65b0\u4f1a\u8bdd\u9ed8\u8ba4\u503c",
          subtitleEn: "Preferences and new-session defaults",
          items: ["\u901a\u7528\u8bbe\u7f6e", "\u6a21\u578b", "Agent \u9884\u8bbe", "Agent \u5de5\u5177", "General Settings", "Models", "Agent Presets", "Agent Tools"],
        },
        {
          key: "plugins",
          order: 20,
          labelZh: "\u63d2\u4ef6\u8bbe\u7f6e",
          labelEn: "PLUGINS",
          subtitleZh: "\u5df2\u5b89\u88c5\u80fd\u529b\u3001\u914d\u7f6e\u4e0e\u6269\u5c55\u6765\u6e90",
          subtitleEn: "Installed capabilities and extension sources",
          items: ["\u63d2\u4ef6", "\u63d2\u4ef6\u5e02\u573a", "Plugins", "Plugin Market", "Marketplace"],
        },
        {
          key: "advanced",
          order: 30,
          labelZh: "\u9ad8\u7ea7\u8bbe\u7f6e",
          labelEn: "ADVANCED",
          subtitleZh: "\u8f93\u5165\u3001\u901a\u77e5\u4e0e\u4fa7\u8fb9\u663e\u793a",
          subtitleEn: "Input, notifications, and sidebar display",
          items: ["\u6587\u4ef6\u63d0\u53ca", "\u901a\u77e5", "\u4fa7\u8fb9\u5361\u7247", "File Mentions", "Notifications", "Sidebar Cards"],
        },
      ];

      const normalizedText = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim();
      const isChinese = (value) => /[\u3400-\u9fff]/.test(value || "");
      const classifyButton = (button) => {
        const text = normalizedText(button);
        return groups.find((group) => group.items.some((item) => text === item || text.includes(item))) || groups[2];
      };

      const updateSettingsHeading = (dialog) => {
        const activeButton = dialog.querySelector("[data-dsh-settings-nav-list='true'] > button[aria-current='true']")
          || dialog.querySelector("[data-dsh-settings-nav-list='true'] > button");
        const title = dialog.querySelector("[data-dsh-settings-title='true']");
        const subtitle = dialog.querySelector("[data-dsh-settings-subtitle='true']");
        const effect = dialog.querySelector("[data-dsh-settings-effect='true']");
        if (!activeButton || !title || !subtitle || !effect) return;

        const activeText = normalizedText(activeButton);
        const group = classifyButton(activeButton);
        const zh = isChinese(activeText);
        const agentTools = activeText === "Agent \u5de5\u5177" || activeText === "Agent Tools";
        title.textContent = activeText;
        subtitle.textContent = agentTools
          ? (zh ? "\u67e5\u770b\u5f53\u524d\u4f1a\u8bdd\u6700\u8fd1\u4e00\u6b21\u8bf7\u6c42\u53ef\u89c1\u7684\u5b8c\u6574\u5de5\u5177\u6e05\u5355" : "Tools visible to the selected session's latest request")
          : (zh ? group.subtitleZh : group.subtitleEn);
        effect.textContent = zh
          ? (agentTools ? "\u53ea\u8bfb \u00b7 \u6700\u8fd1\u8bf7\u6c42" : (group.key === "plugins" ? "\u63d2\u4ef6\u53d8\u66f4\u53ef\u80fd\u9700\u91cd\u542f" : "\u6309\u5404\u9879\u8bf4\u660e\u751f\u6548"))
          : (agentTools ? "Read only \u00b7 latest request" : (group.key === "plugins" ? "Plugin changes may require restart" : "Applies as described per item"));
        dialog.dataset.dshSettingsPage = agentTools ? "agent-tools" : group.key;
      };

      const enhanceDialog = (dialog) => {
        const nav = dialog.querySelector(":scope > nav");
        const content = Array.from(dialog.children).find((child) => child !== nav);
        const navList = nav?.querySelector(":scope > div:last-child");
        const header = content?.querySelector(":scope > div:first-child");
        const options = content?.querySelector(":scope > div:last-child");
        const buttons = navList ? Array.from(navList.children).filter((child) => child.tagName === "BUTTON") : [];
        if (!nav || !content || !navList || !header || !options || !buttons.length) return;

        dialog.dataset.dshSettingsCenter = "enhanced";
        nav.dataset.dshSettingsNav = "true";
        navList.dataset.dshSettingsNavList = "true";
        content.dataset.dshSettingsContent = "true";
        header.dataset.dshSettingsHeader = "true";
        options.dataset.dshSettingsOptions = "true";

        const zh = buttons.some((button) => isChinese(normalizedText(button)));
        const groupCounts = new Map();
        buttons.forEach((button) => {
          const group = classifyButton(button);
          const count = groupCounts.get(group.key) || 0;
          groupCounts.set(group.key, count + 1);
          button.dataset.dshSettingsGroup = group.key;
          button.style.setProperty("--dsh-settings-order", String(group.order + count + 1));
        });

        groups.forEach((group) => {
          if (navList.querySelector("[data-dsh-settings-group-label='" + group.key + "']")) return;
          const label = document.createElement("div");
          label.dataset.dshSettingsGroupLabel = group.key;
          label.style.setProperty("--dsh-settings-order", String(group.order));
          label.textContent = zh ? group.labelZh : group.labelEn;
          label.setAttribute("aria-hidden", "true");
          navList.appendChild(label);
        });

        let heading = header.querySelector("[data-dsh-settings-heading='true']");
        if (!heading) {
          heading = document.createElement("div");
          heading.dataset.dshSettingsHeading = "true";
          heading.innerHTML = "<strong data-dsh-settings-title='true'></strong><span data-dsh-settings-subtitle='true'></span>";
          header.insertBefore(heading, header.firstChild);
        }

        let meta = header.querySelector("[data-dsh-settings-meta='true']");
        if (!meta) {
          meta = document.createElement("div");
          meta.dataset.dshSettingsMeta = "true";
          meta.innerHTML = "<span>" + (zh ? "\u672c\u5730\u914d\u7f6e" : "LOCAL CONFIG") + "</span><span data-dsh-settings-effect='true'></span>";
          const closeButton = header.querySelector("button[aria-label='Close'], button[aria-label='\u5173\u95ed']") || header.lastElementChild;
          header.insertBefore(meta, closeButton);
        }

        Array.from(header.querySelectorAll("button")).forEach((button) => {
          const text = normalizedText(button);
          if (text.includes("\u6253\u5f00\u914d\u7f6e\u6587\u4ef6") || /open config/i.test(text)) {
            button.dataset.dshSettingsConfigAction = "true";
          }
        });
        const closeButton = header.querySelector("button[aria-label='Close'], button[aria-label='\u5173\u95ed']") || header.lastElementChild;
        if (closeButton?.tagName === "BUTTON") closeButton.dataset.dshSettingsClose = "true";
        updateSettingsHeading(dialog);
      };

      const cleanupDialog = (dialog) => {
        dialog.querySelectorAll("[data-dsh-settings-group-label], [data-dsh-settings-heading], [data-dsh-settings-meta]").forEach((node) => node.remove());
        dialog.querySelectorAll("[data-dsh-settings-group]").forEach((button) => {
          button.style.removeProperty("--dsh-settings-order");
          delete button.dataset.dshSettingsGroup;
        });
        delete dialog.dataset.dshSettingsCenter;
        delete dialog.dataset.dshSettingsPage;
        dialog.querySelectorAll("[data-dsh-settings-nav], [data-dsh-settings-nav-list], [data-dsh-settings-content], [data-dsh-settings-header], [data-dsh-settings-options], [data-dsh-settings-config-action], [data-dsh-settings-close]").forEach((node) => {
          Object.keys(node.dataset).filter((key) => key.startsWith("dshSettings")).forEach((key) => delete node.dataset[key]);
        });
      };

      let timer = null;
      const scheduleEnhanceSettings = () => {
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = null;
          document.querySelectorAll("[role='dialog'][aria-modal='true']:has(> nav)").forEach((dialog) => {
            enhanceDialog(dialog);
            updateSettingsHeading(dialog);
          });
        }, 16);
      };

      const observer = new MutationObserver(scheduleEnhanceSettings);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
      scheduleEnhanceSettings();

      return () => {
        observer.disconnect();
        if (timer !== null) window.clearTimeout(timer);
        document.querySelectorAll("[data-dsh-settings-center='enhanced']").forEach(cleanupDialog);
      };
    }

    function cleanDocLine(line) {
      return String(line || "").trim().replace(/^\/\*\*\s?/, "").replace(/^\*\s?/, "").replace(/\s?\*\/$/, "").trim();
    }

    function decodeToolKey(raw) {
      if (!raw) return "";
      if (raw.startsWith('"')) {
        try { return JSON.parse(raw); } catch { return raw.slice(1, -1); }
      }
      if (raw.startsWith("'")) return raw.slice(1, -1).replace(/\\'/g, "'");
      return raw;
    }

    function extractTypeScriptCodeTools(system) {
      const marker = system.lastIndexOf("## Writing code for run_code");
      const start = marker < 0 ? -1 : system.indexOf("interface ToolArgsMap {", marker);
      if (start < 0) return [];
      const end = system.indexOf("\n}", start);
      if (end < 0) return [];
      const tools = [];
      const lines = system.slice(start, end).split(/\r?\n/).slice(1);
      let comment = [];
      let inComment = false;
      for (const line of lines) {
        if (/^\s{2}\/\*\*/.test(line)) {
          inComment = true;
          comment = [];
        }
        if (inComment) {
          const cleaned = cleanDocLine(line);
          if (cleaned) comment.push(cleaned);
          if (line.includes("*/")) inComment = false;
          continue;
        }
        const match = line.match(/^\s{2}((?:"(?:[^"\\]|\\.)*")|(?:'(?:[^'\\]|\\.)*')|(?:[A-Za-z_$][\w$]*))\s*:/);
        if (!match) continue;
        const name = decodeToolKey(match[1]);
        if (!name || name === "run_code") continue;
        tools.push({ name, description: comment.join(" ") || "Code Mode SDK tool", parameters: null, origin: "code" });
        comment = [];
      }
      return tools;
    }

    function extractPythonCodeTools(system) {
      const marker = system.lastIndexOf("## Writing code for run_code");
      const start = marker < 0 ? -1 : system.indexOf("class Tools(Protocol):", marker);
      const end = start < 0 ? -1 : system.indexOf("\ntools: Tools", start);
      if (start < 0 || end < 0) return [];
      const tools = [];
      for (const line of system.slice(start, end).split(/\r?\n/).slice(1)) {
        const method = line.match(/^\s{4}async def ([A-Za-z_$][\w$]*)\s*\(/);
        const exotic = line.match(/^\s{4}# tools\[("(?:[^"\\]|\\.)*")\]\s*\(/);
        const name = method ? method[1] : (exotic ? decodeToolKey(exotic[1]) : "");
        if (!name || name === "run_code") continue;
        tools.push({ name, description: "Code Mode SDK tool", parameters: null, origin: "code" });
      }
      return tools;
    }

    function extractCodeModeTools(system) {
      if (typeof system !== "string" || !system.includes("## Writing code for run_code")) return [];
      const tools = extractTypeScriptCodeTools(system);
      return tools.length ? tools : extractPythonCodeTools(system);
    }

    function createAgentToolsStore(ctx) {
      const listeners = new Set();
      let listOff = null;
      let sessionOff = null;
      let boundSessionId = null;
      let cached = null;
      let runtimeStatus = "loading";
      let runtimeTools = Object.freeze([]);
      let runtimeRevision = null;
      let runtimeRequest = null;
      const currentBinding = () => {
        const state = ctx.sessions.list.getSnapshot();
        return state.current ? ctx.sessions.binding(state.current) : undefined;
      };
      const emit = () => {
        cached = null;
        listeners.forEach((listener) => listener());
      };
      const refreshRuntime = () => {
        if (runtimeRequest) return runtimeRequest;
        runtimeStatus = "loading";
        emit();
        runtimeRequest = fetch("/__maid-atelier-fix/agent-tools", { cache: "no-store" })
          .then((response) => {
            if (!response.ok) throw new Error(`agent tools endpoint returned ${response.status}`);
            return response.json();
          })
          .then((payload) => {
            const rows = Array.isArray(payload?.tools) ? payload.tools : [];
            runtimeTools = Object.freeze(rows
              .filter((tool) => tool && typeof tool.name === "string")
              .map((tool) => ({
                name: tool.name,
                description: typeof tool.description === "string" ? tool.description : "",
                parameters: tool.parameters || null,
                origin: "runtime",
              })));
            runtimeRevision = Number.isFinite(payload?.revision) ? payload.revision : null;
            runtimeStatus = "ready";
          })
          .catch(() => {
            runtimeStatus = "error";
          })
          .finally(() => {
            runtimeRequest = null;
            emit();
          });
        return runtimeRequest;
      };
      const bindSession = () => {
        const binding = currentBinding();
        const nextId = binding?.session.sessionId || null;
        if (nextId === boundSessionId) return;
        if (sessionOff) sessionOff();
        sessionOff = null;
        boundSessionId = nextId;
        if (binding) sessionOff = binding.session.subscribe(emit);
      };
      const getSnapshot = () => {
        if (cached) return cached;
        const list = ctx.sessions.list.getSnapshot();
        const sessionId = list.current || null;
        const binding = sessionId ? ctx.sessions.binding(sessionId) : undefined;
        const title = sessionId ? (list.byId[sessionId]?.title || sessionId) : "";
        const snapshot = binding?.session.getSnapshot();
        const trajectory = snapshot?.views.get("trajectory");
        const requests = trajectory?.requests || [];
        let latest = null;
        for (let index = requests.length - 1; index >= 0; index -= 1) {
          const request = requests[index];
          if (request?.purpose === "assistant" && request.prompt) {
            latest = request;
            break;
          }
        }
        const directTools = latest ? (latest.prompt.tools || []).map((tool) => ({ name: tool.name, description: tool.description || "", parameters: tool.parameters || null, origin: "direct" })) : [];
        const codeTools = latest ? extractCodeModeTools(latest.prompt.system || "") : [];
        const byName = new Map();
        runtimeTools.forEach((tool) => byName.set(tool.name, tool));
        [...directTools, ...codeTools].forEach((tool) => byName.set(tool.name, tool));
        const tools = Object.freeze(Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)));
        const mode = latest ? (codeTools.length || directTools.some((tool) => tool.name === "run_code") ? "code" : "native") : "none";
        const status = tools.length ? "ready" : (!binding ? "no-session" : "no-request");
        cached = Object.freeze({
          status,
          sessionId,
          title,
          mode,
          requestSeq: latest?.startSeq ?? null,
          runtimeStatus,
          runtimeRevision,
          runtimeCount: runtimeTools.length,
          visibleCount: directTools.length + codeTools.length,
          tools,
        });
        return cached;
      };
      const subscribe = (listener) => {
        listeners.add(listener);
        if (listeners.size === 1) {
          listOff = ctx.sessions.list.subscribe(() => { bindSession(); emit(); });
          bindSession();
          refreshRuntime();
        }
        return () => {
          listeners.delete(listener);
          if (listeners.size) return;
          if (listOff) listOff();
          if (sessionOff) sessionOff();
          listOff = null;
          sessionOff = null;
          boundSessionId = null;
        };
      };
      return { getSnapshot, subscribe, refresh: refreshRuntime };
    }

    function AgentToolsSection({ toolsStore }) {
      const snapshot = useSyncExternalStore(toolsStore.subscribe, toolsStore.getSnapshot, toolsStore.getSnapshot);
      const [query, setQuery] = useState("");
      const [expanded, setExpanded] = useState(null);
      const zh = /zh/i.test(document.documentElement.lang || navigator.language || "zh");
      const normalized = query.trim().toLocaleLowerCase();
      const filtered = useMemo(() => snapshot.tools.filter((tool) => !normalized || `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(normalized)), [normalized, snapshot.tools]);
      useEffect(() => {
        if (expanded && !filtered.some((tool) => tool.name === expanded)) setExpanded(null);
      }, [expanded, filtered]);
      const emptyText = snapshot.status === "no-session"
        ? (zh ? "\u5f53\u524d\u672a\u9009\u4e2d\u4f1a\u8bdd\u3002\u9009\u62e9\u4e00\u4e2a\u4f1a\u8bdd\u540e\u53ef\u67e5\u770b\u5176 Agent \u5de5\u5177\u3002" : "Select a session to inspect its Agent tools.")
        : snapshot.status === "no-request"
          ? (zh ? "\u5f53\u524d\u4f1a\u8bdd\u5c1a\u672a\u8bb0\u5f55\u6a21\u578b\u8bf7\u6c42\u3002\u53d1\u9001\u4e00\u6761\u6d88\u606f\u540e\u518d\u5237\u65b0\u3002" : "This session has no recorded model request yet. Send a message, then refresh.")
          : (zh ? "\u6ca1\u6709\u5339\u914d\u7684\u5de5\u5177\u3002" : "No matching tools.");
      return h("section", { "data-dsh-agent-tools": "true", "aria-label": zh ? "Agent \u5de5\u5177" : "Agent tools" },
        h("div", { "data-dsh-agent-tools-header": "true" },
          h("div", { "data-dsh-agent-tools-heading": "true" },
            h("h2", null, zh ? "Agent \u5de5\u5177" : "Agent tools"),
            h("p", null, zh ? "\u6700\u8fd1\u8bf7\u6c42\u53ef\u89c1\u5de5\u5177 + Harness \u8fd0\u884c\u65f6\u5df2\u6ce8\u518c\u5de5\u5177" : "Latest request-visible tools plus tools registered in the Harness runtime")
          ),
          h("button", { type: "button", "data-dsh-agent-tools-refresh": "true", onClick: toolsStore.refresh }, zh ? "\u5237\u65b0" : "Refresh")
        ),
        h("div", { "data-dsh-agent-tools-summary": "true" },
          h("span", { "data-dsh-agent-tools-dot": "true", "aria-hidden": "true" }),
          h("strong", null, snapshot.title || (zh ? "\u672a\u9009\u4e2d\u4f1a\u8bdd" : "No session selected")),
          snapshot.status === "ready" ? h("span", { "data-dsh-agent-tools-pill": "true" }, `${snapshot.tools.length} ${zh ? "\u4e2a\u5de5\u5177" : "tools"}`) : null,
          snapshot.visibleCount ? h("span", { "data-dsh-agent-tools-pill": "true" }, `${zh ? "\u6700\u8fd1\u8bf7\u6c42" : "Request"} ${snapshot.visibleCount}`) : null,
          snapshot.runtimeStatus === "ready" ? h("span", { "data-dsh-agent-tools-pill": "true" }, `${zh ? "\u8fd0\u884c\u65f6" : "Runtime"} ${snapshot.runtimeCount}`) : null,
          snapshot.status === "ready" ? h("span", { "data-dsh-agent-tools-pill": "true" }, snapshot.mode === "code" ? "Code Mode" : (zh ? "\u539f\u751f\u8c03\u7528" : "Native")) : null,
          snapshot.requestSeq !== null ? h("span", { "data-dsh-agent-tools-pill": "true" }, `seq ${snapshot.requestSeq}`) : null
        ),
        snapshot.status === "ready" ? h("label", { "data-dsh-agent-tools-search": "true" }, h("input", {
          type: "search", value: query, placeholder: zh ? "\u641c\u7d22\u5de5\u5177\u540d\u6216\u8bf4\u660e" : "Search tool name or description",
          "aria-label": zh ? "\u641c\u7d22 Agent \u5de5\u5177" : "Search Agent tools", onChange: (event) => setQuery(event.currentTarget.value),
        })) : null,
        snapshot.status !== "ready" || !filtered.length
          ? h("p", { "data-dsh-agent-tools-empty": "true" }, emptyText)
          : h("ul", { "data-dsh-agent-tools-list": "true" }, filtered.map((tool) => {
              const open = expanded === tool.name;
              const detailsId = `dsh-agent-tool-${encodeURIComponent(tool.name)}`;
              const description = tool.description || (zh ? "\u672a\u63d0\u4f9b\u5de5\u5177\u8bf4\u660e" : "No tool description provided");
              return h("li", { key: tool.name, "data-dsh-agent-tool-card": "true", "data-open": open ? "true" : undefined },
                h("button", { type: "button", "data-dsh-agent-tool-toggle": "true", "aria-expanded": open, "aria-controls": detailsId, onClick: () => setExpanded(open ? null : tool.name) },
                    h("span", { "data-dsh-agent-tool-title": "true" }, h("code", { title: tool.name }, tool.name), h("span", { "data-dsh-agent-tool-origin": "true" }, tool.origin === "code" ? "Code Mode" : tool.origin === "runtime" ? (zh ? "\u8fd0\u884c\u65f6" : "Runtime") : (zh ? "\u76f4\u63a5" : "Direct"))),
                  h("span", { "data-dsh-agent-tool-description": "true" }, description)
                ),
                open ? h("div", { id: detailsId, "data-dsh-agent-tool-details": "true" },
                  h("p", null, tool.origin === "code" ? (zh ? "\u53c2\u6570\u7c7b\u578b\u6765\u81ea\u672c\u6b21\u8bf7\u6c42\u7684 Code Mode SDK \u58f0\u660e\u3002" : "Argument types come from this request's Code Mode SDK declaration.") : tool.origin === "runtime" ? (zh ? "Harness \u8fd0\u884c\u65f6\u5df2\u6ce8\u518c\uff1b\u4e0b\u4e00\u6b21\u6a21\u578b\u8bf7\u6c42\u4f1a\u6309\u5f53\u524d Agent \u9884\u8bbe\u4e0e\u9650\u5236\u51b3\u5b9a\u662f\u5426\u53ef\u89c1\u3002" : "Registered in the Harness runtime; the next request applies the Agent preset and restrictions.") : (zh ? "\u4ee5\u4e0b\u4e3a\u53d1\u9001\u7ed9\u6a21\u578b\u7684 JSON Schema\u3002" : "JSON Schema sent to the model.")),
                  tool.parameters ? h("pre", null, JSON.stringify(tool.parameters, null, 2)) : null
                ) : null
              );
            }))
      );
    }

    function installAgentToolsSettings(ctx) {
      if (!ctx?.slots || !ctx?.sessions) return;
      const toolsStore = createAgentToolsStore(ctx);
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "agent-tools",
        order: 25,
        label: () => /zh/i.test(document.documentElement.lang || navigator.language || "zh") ? "Agent \u5de5\u5177" : "Agent Tools",
        inject: () => ({ toolsStore }),
      }, AgentToolsSection));
    }

    function apply(ctx) {
      if (typeof document === "undefined") return;
      if (document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]")) return;

      const style = document.createElement("style");
      style.dataset.plugin = "dsh-maid-atelier-fix";
      style.dataset.pluginCss = TAG_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
      const disposeResponsiveLayout = installResponsiveLayout();
      const disposeComposerEnhancements = installComposerEnhancements();
      installAgentToolsSettings(ctx);
      const disposeSettingsEnhancements = installSettingsEnhancements();
      const disposeDesktopStatusEnhancements = installDesktopStatusEnhancements();

      if (ctx && typeof ctx.effect === "function") {
        try {
          ctx.effect(() => () => {
            disposeDesktopStatusEnhancements();
            disposeSettingsEnhancements();
            disposeComposerEnhancements();
            disposeResponsiveLayout();
            style.remove();
          });
        } catch { /* no disposer */ }
      }
    }

    const inject = ["slots", "sessions"];
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
