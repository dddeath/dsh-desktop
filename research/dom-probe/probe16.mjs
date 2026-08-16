import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => document.querySelector("[class*='sidebarCol'] [class*='toggle']")?.click());
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const cs = (el) => el ? {
      bg: getComputedStyle(el).backgroundColor,
      bgImage: getComputedStyle(el).backgroundImage.slice(0, 60),
      border: getComputedStyle(el).border,
      radius: getComputedStyle(el).borderRadius,
      padding: getComputedStyle(el).padding,
      height: getComputedStyle(el).height,
      width: getComputedStyle(el).width,
      color: getComputedStyle(el).color,
      boxShadow: getComputedStyle(el).boxShadow.slice(0, 40),
    } : null;
    const cls = (el) => (el ? (el.className || "").toString().slice(0, 80) : null);
    const o = {};
    o.newSession = { cls: cls(document.querySelector("[class*='newSession']")), style: cs(document.querySelector("[class*='newSession']")) };
    o.brand = { cls: cls(document.querySelector("[class*='brand']")), style: cs(document.querySelector("[class*='brand']")) };
    o.settingsTrigger = { cls: cls(document.querySelector("[class*='trigger']")), style: cs(document.querySelector("[class*='trigger']")) };

    // groupSection (workspace folder) structure + active marker
    const groups = [...document.querySelectorAll("[class*='groupSection']")];
    o.groups = groups.map((g) => ({
      cls: cls(g),
      text: g.textContent.trim().slice(0, 25),
      aria: { current: g.getAttribute("aria-current"), selected: g.getAttribute("aria-selected"), expanded: g.getAttribute("aria-expanded") },
      style: cs(g),
      innerHTML: g.outerHTML.slice(0, 500),
    }));

    // tabs padding detail
    const tab = document.querySelector("[role='tab']");
    o.tab = tab ? { cls: cls(tab), padding: getComputedStyle(tab).padding, lineHeight: getComputedStyle(tab).lineHeight, height: getComputedStyle(tab).height, style: cs(tab) } : null;
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
