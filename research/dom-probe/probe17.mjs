import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 150)));
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => document.querySelector("[class*='sidebarCol'] [class*='toggle']")?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll("[class*='sidebarCol'] [class*='sessionRow']")];
    rows.find((r) => /row/i.test(r.className))?.click();
  });
  await page.waitForTimeout(5000);

  const r = await page.evaluate(() => {
    const cs = (el) => el ? ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, border: getComputedStyle(el).border, radius: getComputedStyle(el).borderRadius, padding: getComputedStyle(el).padding }) : null;
    const o = {};
    o.header = cs(document.querySelector(".wSkVaW_header"));
    o.tabActive = cs(document.querySelector("[role='tab'][aria-selected='true']"));
    o.tabInactive = cs(document.querySelector("[role='tab']:not([aria-selected='true'])"));
    o.workspaceActive = cs(document.querySelector("[data-maid-workspace-active]"));
    o.settingsTrigger = cs(document.querySelector("[class*='trigger']"));
    o.brand = cs(document.querySelector("[class*='brand']"));
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
  console.log("LOGS:", JSON.stringify(logs));
} finally {
  await browser.close();
}
