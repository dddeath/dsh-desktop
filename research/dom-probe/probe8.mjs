import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);

  const r = await page.evaluate(() => {
    const o = { darkTheme: document.body.hasAttribute("data-ds-dark-theme") };
    const bg = (el) => el ? getComputedStyle(el).backgroundColor : null;
    const color = (el) => el ? getComputedStyle(el).color : null;
    const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };

    // 1) top-trim chrome
    const trim = document.querySelector("[data-skin-chrome='top-trim']");
    o.topTrim = trim ? { rect: rect(trim), z: getComputedStyle(trim).zIndex, display: getComputedStyle(trim).display } : null;

    // 2) elements with 标准模式 / 对话 title
    const findText = (txt) => [...document.querySelectorAll("*")].filter((el) => el.children.length <= 3 && (el.textContent || "").includes(txt));
    const mode = findText("标准模式").slice(0, 3).map((el) => ({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 50), text: el.textContent.trim().slice(0, 30), color: color(el), bg: bg(el) }));
    o.modeEls = mode;

    // title / crumb bar (session header)
    const crumb = document.querySelector("[class*='crumb'], [class*='header']");
    o.headerEls = [];
    const headers = [...document.querySelectorAll("header, [class*='titlebar'], [class*='crumb']")].slice(0, 6);
    o.headerEls = headers.map((el) => ({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 50), rect: rect(el), bg: bg(el), color: color(el) }));

    // 3) tabs
    const tl = document.querySelector("[role='tablist']");
    o.tablist = null;
    if (tl) {
      o.tablist = {
        cls: (tl.className || "").toString().slice(0, 50), bg: bg(tl),
        tabs: [...tl.querySelectorAll("[role='tab']")].map((t) => ({ text: t.textContent.trim(), bg: bg(t), color: color(t), border: getComputedStyle(t).border, radius: getComputedStyle(t).borderRadius })),
      };
    }

    // 4) details panel + close button
    const details = document.querySelector("[class*='detailsCol']");
    o.detailsCol = details ? { rect: rect(details), bg: bg(details), inline: (details.getAttribute("style") || "").slice(0, 80) } : null;
    const closeBtn = document.querySelector("[class*='close'], [aria-label*='关闭'], [aria-label*='Close']");
    o.closeBtn = closeBtn ? { cls: (closeBtn.className || "").toString().slice(0, 50), rect: rect(closeBtn), color: color(closeBtn), bg: bg(closeBtn), z: getComputedStyle(closeBtn).zIndex, parentZ: getComputedStyle(closeBtn.parentElement).zIndex } : null;

    // 5) subagent text
    const sub = findText("子代理").slice(0, 5).map((el) => ({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 60), text: el.textContent.trim().slice(0, 50), color: color(el), bg: bg(el) }));
    o.subagentEls = sub;

    // 6) any [class*='empty']
    const empties = [...document.querySelectorAll("[class*='empty']")].map((el) => ({ cls: (el.className || "").toString().slice(0, 50), text: el.textContent.trim().slice(0, 30), color: color(el) }));
    o.empties = empties;

    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
