import { chromium } from "playwright-core";

const PORT = process.argv[2] ?? "3090";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);

  const r = await page.evaluate(() => {
    const o = { darkTheme: document.body.hasAttribute("data-ds-dark-theme") };
    const bg = (el) => el ? getComputedStyle(el).backgroundColor : null;
    const color = (el) => el ? getComputedStyle(el).color : null;
    o.topTrimDisplay = (document.querySelector("[data-skin-chrome='top-trim']") ? getComputedStyle(document.querySelector("[data-skin-chrome='top-trim']")).display : null);
    o.sidebarBg = bg(document.querySelector("[class*='sidebarCol']"));
    o.detailsBg = bg(document.querySelector("[class*='detailsCol']"));
    o.emptyColor = color(document.querySelector("[class*='empty']"));
    o.labelTertiary = getComputedStyle(document.body).getPropertyValue("--dsw-alias-label-tertiary").trim();
    return o;
  });
  console.log(JSON.stringify({ page: r, logs }, null, 2));
} finally {
  await browser.close();
}
