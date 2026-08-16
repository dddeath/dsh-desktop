import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
    const h = document.querySelector(".wSkVaW_header");
    if (!h) return { headerFound: false };
    const after = getComputedStyle(h, "::after");
    return { headerFound: true, afterDisplay: after.display, afterHeight: after.height, afterBg: after.backgroundColor };
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
