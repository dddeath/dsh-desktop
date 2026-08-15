// Dump the live DSH Web GUI DOM structure + computed styles for the regions
// the maid-atelier skin styles, so we can author precise override CSS.
import { chromium } from "playwright-core";

const URL = "http://127.0.0.1:3080/";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000); // let the SPA mount

  const report = await page.evaluate(() => {
    const out = {};
    out.bodyAttrs = Object.fromEntries([...document.body.attributes].map((a) => [a.name, a.value]));
    const cs = (el) => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor, color: s.color, border: s.border,
        borderColor: s.borderColor, borderWidth: s.borderWidth, borderRadius: s.borderRadius,
        padding: s.padding, fill: s.getPropertyValue("--dsw-specific-sidebar-fill").trim(),
      };
    };
    const cls = (el) => (typeof el.className === "string" ? el.className : el.getAttribute("class") ?? "");

    // header + tablist + tabs
    const tablist = document.querySelector("header [role='tablist']") ?? document.querySelector("[role='tablist']");
    out.tablist = null;
    if (tablist) {
      const header = tablist.closest("header");
      out.tablist = {
        headerHTML: header ? header.outerHTML.slice(0, 2500) : "(no <header> ancestor)",
        headerClass: header ? cls(header) : null,
        headerStyle: header ? cs(header) : null,
        tablistClass: cls(tablist),
        tabs: [...tablist.querySelectorAll("[role='tab'], button")].map((t) => ({
          text: t.textContent.trim(), cls: cls(t), role: t.getAttribute("role"),
          ariaSelected: t.getAttribute("aria-selected"), style: cs(t),
        })),
      };
    }

    // left sidebar column + its inner root
    const sidebarCol = document.querySelector(":is([data-pane='sidebar'], [class*='sidebarCol'])");
    out.sidebarCol = sidebarCol ? { cls: cls(sidebarCol), style: cs(sidebarCol), html: sidebarCol.outerHTML.slice(0, 1200) } : null;
    const sidebarRoot = sidebarCol?.querySelector(":scope > div");
    out.sidebarRoot = sidebarRoot ? { cls: cls(sidebarRoot), style: cs(sidebarRoot) } : null;

    // right details column
    const detailsCol = document.querySelector("[class*='detailsCol']");
    out.detailsCol = detailsCol ? { cls: cls(detailsCol), style: cs(detailsCol), html: detailsCol.outerHTML.slice(0, 2500) } : null;

    // frame (top bar region)
    const frame = document.querySelector("[class*='frame']");
    out.frame = frame ? { cls: cls(frame), style: cs(frame), html: frame.outerHTML.slice(0, 1200) } : null;

    // any element mentioning subagents (the empty-state text)
    const subagentEls = [...document.querySelectorAll("*")].filter((el) => /子代理|subagent/i.test(el.textContent ?? "") && el.children.length <= 2);
    out.subagentText = subagentEls.slice(0, 8).map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 80), style: cs(el) }));

    // center column / top bar above composer
    const centerCol = document.querySelector("[class*='centerCol']");
    out.centerCol = centerCol ? { cls: cls(centerCol), style: cs(centerCol) } : null;
    return out;
  });

  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
