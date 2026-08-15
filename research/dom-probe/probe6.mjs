import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3090/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);

  const r = await page.evaluate(() => {
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const matches = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const walk = (rs) => { for (const rule of rs) {
        if (rule.cssRules) { walk(rule.cssRules); continue; }
        if (!rule.selectorText) continue;
        let sel = rule.selectorText;
        try {
          if (sidebar.matches(sel)) {
            const decl = rule.style;
            if (decl.background || decl.backgroundColor || decl.getPropertyValue("--dsw-specific-sidebar-fill")) {
              matches.push({
                sel: sel.slice(0, 90),
                background: decl.background || "",
                bgColor: decl.backgroundColor || "",
                fillVar: decl.getPropertyValue("--dsw-specific-sidebar-fill"),
                important: decl.getPropertyPriority("background") || decl.getPropertyPriority("background-color"),
              });
            }
          }
        } catch { /* invalid selector in this sheet */ }
      } };
      walk(rules);
    }
    return matches;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
