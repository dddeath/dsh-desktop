import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => document.querySelector("[class*='sidebarCol'] [class*='toggle']")?.click());
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const cs = (el) => el ? getComputedStyle(el).color : null;
    const cls = (el) => (el ? (el.className || "").toString().slice(0, 80) : null);
    const o = {};
    // unselected workspace group (deepseek_memory) — dump its text-bearing descendants
    const groups = [...document.querySelectorAll("[class*='groupSection']")];
    const unsel = groups.find((g) => !g.querySelector("[data-maid-workspace-active]"));
    o.unselGroup = unsel ? {
      html: unsel.outerHTML.slice(0, 900),
      walk: [...unsel.querySelectorAll("*")].filter((el) => el.children.length === 0 && (el.textContent || "").trim()).slice(0, 8)
        .map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 25), color: cs(el) })),
    } : null;
    // active group folder name too, for comparison
    const act = groups.find((g) => g.querySelector("[data-maid-workspace-active]"));
    o.activeGroup = act ? [...act.querySelectorAll("*")].filter((el) => el.children.length === 0 && (el.textContent || "").trim()).slice(0, 6)
      .map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 25), color: cs(el) })) : null;
    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
