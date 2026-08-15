import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  const r = await page.evaluate(() => {
    const o = {};
    o.bodyAttrs = Object.fromEntries([...document.body.attributes].map((a) => [a.name, a.value]));
    const bg = (el) => getComputedStyle(el).backgroundColor;
    const txt = (el) => getComputedStyle(el).color;
    const brd = (el) => getComputedStyle(el).border;

    const tl = document.querySelector("div[role='tablist'], [role='tablist']");
    o.tablistFound = !!tl;
    if (tl) {
      o.tablist = {
        cls: tl.className, bg: bg(tl), border: brd(tl),
        tabs: [...tl.querySelectorAll("[role='tab']")].map((t) => ({
          text: t.textContent.trim(), sel: t.getAttribute("aria-selected"),
          bg: bg(t), color: txt(t), border: brd(t), radius: getComputedStyle(t).borderRadius,
        })),
      };
      // ancestor chain
      o.ancestors = [];
      let el = tl;
      for (let i = 0; i < 6 && el; i++) {
        o.ancestors.push({ cls: (el.className || "").toString().slice(0, 60), tag: el.tagName, bg: bg(el) });
        el = el.parentElement;
      }
    }

    // empty-state text (details panel or subagent)
    const empty = document.querySelector("[class*='empty']") || [...document.querySelectorAll("div")].find((d) => /子代理|详情/.test(d.textContent) && d.children.length === 0);
    o.empty = empty ? { cls: empty.className, text: empty.textContent.trim().slice(0, 40), color: txt(empty), bg: bg(empty) } : null;

    // any subagent panel text
    const sub = [...document.querySelectorAll("*")].filter((el) => /子代理/.test(el.textContent ?? "") && el.children.length <= 1);
    o.subagentHits = sub.slice(0, 5).map((el) => ({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 50), text: el.textContent.trim().slice(0, 40), color: txt(el) }));

    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
