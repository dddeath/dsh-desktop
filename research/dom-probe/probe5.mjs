import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3090/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);

  const r = await page.evaluate(() => {
    const gv = (el, prop) => el ? getComputedStyle(el).getPropertyValue(prop).trim() : null;
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const o = {
      darkTheme: document.body.hasAttribute("data-ds-dark-theme"),
      bodyVar: gv(document.body, "--dsw-specific-sidebar-fill"),
      sidebarColVar: gv(sidebar, "--dsw-specific-sidebar-fill"),
      sidebarRootVar: gv(sidebar?.querySelector(":scope > div"), "--dsw-specific-sidebar-fill"),
      sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
      sidebarInlineStyle: sidebar?.getAttribute("style"),
      bodyInlineStyleHasVar: (document.body.getAttribute("style") || "").includes("sidebar-fill"),
    };
    // walk ancestors of sidebarCol looking for inline style or --dsw-specific-sidebar-fill
    o.ancestors = [];
    let el = sidebar;
    for (let i = 0; i < 6 && el; i++) {
      o.ancestors.push({ cls: (el.className || "").toString().slice(0, 40), inline: (el.getAttribute("style") || "").slice(0, 60) });
      el = el.parentElement;
    }
    // any stylesheet rule targeting sidebar-fill?
    o.sidebarFillRules = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const walk = (rs) => { for (const rule of rs) {
        if (rule.cssRules) walk(rule.cssRules);
        else if (rule.style && rule.style.getPropertyValue("--dsw-specific-sidebar-fill")) {
          o.sidebarFillRules.push(`${rule.selectorText} => ${rule.style.getPropertyValue("--dsw-specific-sidebar-fill")}`);
        }
      } };
      walk(rules);
    }
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
