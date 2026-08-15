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
    // synthetic elements to verify selector matching
    const mk = (cls) => { const d = document.createElement("div"); d.className = cls; d.textContent = "测试"; document.body.appendChild(d); return d; };
    const emptyEl = mk("subagentEmpty");           // camelCase (better-sidebar)
    const hintEl = mk("subagentEmptyHint");
    const lowerEl = mk("something-empty");         // lowercase
    const statusEl = mk("x"); statusEl.setAttribute("role", "status");
    const fixPresent = !!document.querySelector("style[data-plugin-css=\"dsh-maid-atelier-fix/overrides.css\"]");
    const out = {
      fixPresent,
      topTrimDisplay: getComputedStyle(document.querySelector("[data-skin-chrome='top-trim']")).display,
      emptyElColor: getComputedStyle(emptyEl).color,
      hintElColor: getComputedStyle(hintEl).color,
      lowerElColor: getComputedStyle(lowerEl).color,
      statusElColor: getComputedStyle(statusEl).color,
    };
    emptyEl.remove(); hintEl.remove(); lowerEl.remove(); statusEl.remove();
    return out;
  });
  console.log(JSON.stringify({ page: r, logs }, null, 2));
} finally {
  await browser.close();
}
