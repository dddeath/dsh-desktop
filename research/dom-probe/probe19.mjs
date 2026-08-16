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
    const cs = (el) => el ? {
      bg: getComputedStyle(el).backgroundColor,
      border: getComputedStyle(el).border,
      radius: getComputedStyle(el).borderRadius,
      color: getComputedStyle(el).color,
    } : null;
    const cls = (el) => (el ? (el.className || "").toString().slice(0, 70) : null);

    const o = {};
    // top bar backgrounds
    o.header = cs(document.querySelector(".wSkVaW_header"));
    o.titleRow = cs(document.querySelector(".wSkVaW_titleRow"));
    o.tablist = cs(document.querySelector("[role='tablist']"));

    // composer: find model selector + reasoning selector
    // candidate elements: buttons/divs whose text looks like a model or reasoning level
    const hits = [...document.querySelectorAll("button, [role='button'], [role='combobox'], [class*='select'], [class*='trigger'], [class*='picker']")]
      .filter((el) => /deepseek|v4|reasoning|推理|max|high|medium|low|thinking/i.test(el.textContent || ""))
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName, cls: cls(el), text: (el.textContent || "").trim().slice(0, 30),
        style: cs(el),
        parent: el.parentElement ? { cls: cls(el.parentElement), style: cs(el.parentElement) } : null,
        gp: el.parentElement?.parentElement ? { cls: cls(el.parentElement.parentElement), style: cs(el.parentElement.parentElement) } : null,
      }));
    o.selectorHits = hits;

    // composer root structure (input card)
    const card = document.querySelector("[class*='card']");
    o.composerCard = card ? { cls: cls(card), style: cs(card), html: card.outerHTML.slice(0, 1200) } : null;
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
