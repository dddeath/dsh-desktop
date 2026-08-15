import { chromium } from "playwright-core";

const PORT = process.argv[2] ?? "3080";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error") logs.push("console.error: " + m.text().slice(0, 300)); });
  page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 300)));
  page.on("requestfailed", (r) => { if (/plugins/.test(r.url())) logs.push("requestfailed: " + r.url().slice(0, 120)); });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);

  const r = await page.evaluate(() => {
    const bg = (el) => el ? getComputedStyle(el).backgroundColor : null;
    const sidebar = document.querySelector("[class*='sidebarCol']");
    return {
      framePresent: !!document.querySelector("[class*='frame']"),
      fixStylePresent: !!document.querySelector("style[data-plugin-css=\"dsh-maid-atelier-fix/overrides.css\"]"),
      skinStylePresent: !!document.querySelector("style[data-plugin=\"@dsh-external/dsh-client-ui-skin-maid-atelier\"]"),
      sidebarBg: bg(sidebar),
      detailsBg: bg(document.querySelector("[class*='detailsCol']")),
      emptyColor: document.querySelector("[class*='empty']") ? getComputedStyle(document.querySelector("[class*='empty']")).color : null,
      bodyTextLen: document.body.innerText.length,
    };
  });
  console.log(JSON.stringify({ page: r, logs }, null, 2));
} finally {
  await browser.close();
}
