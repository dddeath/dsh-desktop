import { chromium } from "playwright-core";

const DRAFT = `
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_header,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='titleRow'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='crumbs'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='tabs'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='headerUtilities'] {
  background-color: #eef2fa !important;
  color: #172347 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) .wSkVaW_crumbCurrent,
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sessionLogButton'] {
  color: #172347 !important;
}
body[data-dsh-maid-atelier] [role='tab'] {
  background-color: transparent !important;
  color: #172347 !important;
}
body[data-dsh-maid-atelier] [role='tab'][aria-selected='true'] {
  background-color: #dbe3f4 !important;
  border-color: var(--dsw-alias-border-l3);
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sectionHeader'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='sectionLabel'] {
  color: #172347 !important;
}
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='workspace'] [role='button'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [class*='groupSection'] {
  color: #172347 !important;
}
/* selected rows: navy pill + white text */
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [aria-current='true'],
body[data-dsh-maid-atelier]:not([data-ds-dark-theme]) [aria-selected='true'] {
  background-color: #33487f !important;
  color: #ffffff !important;
}
`;

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

  const r = await page.evaluate((css) => {
    const cs = (el) => el ? ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }) : null;
    const o = {};
    // current active session row + workspace entries before injection
    const rows = [...document.querySelectorAll("[class*='sidebarCol'] [class*='sessionRow'], [class*='sidebarCol'] [class*='groupSection'], [class*='sidebarCol'] [class*='workspace']")];
    o.rows = rows.slice(0, 8).map((el) => ({
      cls: (el.className || "").toString().slice(0, 60),
      ariaCurrent: el.getAttribute("aria-current"),
      ariaSelected: el.getAttribute("aria-selected"),
      text: el.textContent.trim().slice(0, 30),
      before: cs(el),
    }));

    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const after = (sel) => cs(document.querySelector(sel));
    o.after = {
      header: after(".wSkVaW_header"),
      crumbCurrent: after(".wSkVaW_crumbCurrent"),
      tabActive: after("[role='tab'][aria-selected='true']"),
      tabInactive: after("[role='tab']:not([aria-selected='true'])"),
      sectionHeader: after("[class*='sectionHeader']"),
    };
    return o;
  }, DRAFT);
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
