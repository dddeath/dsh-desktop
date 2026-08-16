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
    const cs = (el) => el ? ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }) : null;
    const o = {};
    o.fixPresent = !!document.querySelector("style[data-plugin-css=\"dsh-maid-atelier-fix/overrides.css\"]");
    o.header = cs(document.querySelector(".wSkVaW_header"));
    o.crumbCurrent = cs(document.querySelector(".wSkVaW_crumbCurrent"));
    o.sessionLogButton = cs(document.querySelector("[class*='sessionLogButton']"));
    o.tabActive = cs(document.querySelector("[role='tab'][aria-selected='true']"));
    o.tabInactive = cs(document.querySelector("[role='tab']:not([aria-selected='true'])"));
    o.sectionHeader = cs(document.querySelector("[class*='sectionHeader']"));
    const sel = document.querySelector("[class*='sessionRow'][aria-selected='true']");
    const unsel = document.querySelector("[class*='sessionRow']:not([aria-selected='true'])");
    o.selectedSessionRow = cs(sel);
    o.unselectedSessionRow = cs(unsel);
    // 标准模式 label (preset label in header)
    const label = document.querySelector("[class*='header'] [class*='label']");
    o.presetLabel = label ? { cls: label.className.slice(0, 40), text: label.textContent.trim().slice(0, 20), ...cs(label) } : null;
    // settings trigger + brand + new session
    o.settingsTrigger = cs(document.querySelector("[class*='trigger']"));
    o.brand = cs(document.querySelector("[class*='brand']"));
    o.newSession = cs(document.querySelector("[class*='newSession']"));
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
  console.log("LOGS:", JSON.stringify(logs));
} finally {
  await browser.close();
}
