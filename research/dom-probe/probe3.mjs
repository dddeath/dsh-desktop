import { chromium } from "playwright-core";

const PORT = process.argv[2] ?? "3080";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  const r = await page.evaluate(() => {
    const o = {};
    o.fixStylePresent = !!document.querySelector("style[data-plugin-css=\"dsh-maid-atelier-fix/overrides.css\"]");
    const bg = (el) => getComputedStyle(el).backgroundColor;
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const details = document.querySelector("[class*='detailsCol']");
    const empty = document.querySelector("[class*='empty']");
    o.sidebarBg = sidebar ? bg(sidebar) : null;
    o.detailsBg = details ? bg(details) : null;
    o.detailsPanelBg = document.querySelector("[data-slot='details'] > div") ? bg(document.querySelector("[data-slot='details'] > div")) : null;
    o.emptyColor = empty ? getComputedStyle(empty).color : null;
    o.darkTheme = document.body.hasAttribute("data-ds-dark-theme");
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
