import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3090/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);

  // Inject a test override and report the resulting sidebar background.
  const css = `
    body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sidebarCol'] { background-color: #e7ecf7 !important; }
    body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [data-slot='sidebar'] > div { background-color: #e7ecf7 !important; }
    body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sidebarCol'] [class*='root'] { background-color: #e7ecf7 !important; }
  `;
  const r = await page.evaluate((css) => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const root = sidebar?.querySelector("[class*='root']");
    return {
      sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
      rootBg: root ? getComputedStyle(root).backgroundColor : null,
      sidebarInline: sidebar?.getAttribute("style"),
    };
  }, css);
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
