import { chromium } from "playwright-core";

const PORT = process.argv[2] ?? "3090";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);

  // Try to expand the sidebar (rail) and open a session.
  const expand = await page.evaluate(() => {
    // candidate expand toggles
    const btns = [...document.querySelectorAll("button")].filter((b) => {
      const a = (b.getAttribute("aria-label") || "").toLowerCase();
      const t = (b.textContent || "").trim();
      return a.includes("sidebar") || a.includes("展开") || a.includes("expand") || /^[\s]*<svg/i.test(b.innerHTML);
    });
    return btns.map((b) => ({ label: b.getAttribute("aria-label"), title: b.getAttribute("title"), cls: (b.className || "").toString().slice(0, 40) })).slice(0, 10);
  });
  console.log("EXPAND CANDIDATES:", JSON.stringify(expand));

  // Click the first session row if present; otherwise report sidebar text.
  const sessionInfo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("[class*='session'], [class*='row'], button")].filter((el) => {
      const t = (el.textContent || "").trim();
      return t.length > 2 && t.length < 80 && !/新会话|设置|settings|new session/i.test(t);
    });
    return rows.slice(0, 8).map((el) => ({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 40), text: (el.textContent || "").trim().slice(0, 40) }));
  });
  console.log("SESSION CANDIDATES:", JSON.stringify(sessionInfo));

  // dump current header/tabs/subagent state
  const state = await page.evaluate(() => {
    const bg = (el) => el ? getComputedStyle(el).backgroundColor : null;
    const color = (el) => el ? getComputedStyle(el).color : null;
    const header = document.querySelector("[class*='header']");
    const tl = document.querySelector("[role='tablist']");
    return {
      headerFound: !!header,
      headerCls: header ? header.className.toString().slice(0, 40) : null,
      headerBg: bg(header), headerColor: color(header),
      tablistFound: !!tl,
      tabs: tl ? [...tl.querySelectorAll("[role='tab']")].map((t) => ({ text: t.textContent.trim(), color: color(t), border: getComputedStyle(t).border, bg: bg(t) })) : [],
      subagentText: [...document.querySelectorAll("*")].filter((el) => /子代理/.test(el.textContent || "") && el.children.length <= 2).slice(0, 4).map((el) => ({ cls: (el.className || "").toString().slice(0, 40), text: (el.textContent || "").trim().slice(0, 40), color: color(el) })),
    };
  });
  console.log("STATE:", JSON.stringify(state, null, 2));
  console.log("LOGS:", JSON.stringify(logs));
} finally {
  await browser.close();
}
