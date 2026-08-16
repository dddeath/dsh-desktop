import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 150)));
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);

  // --- dump sidebar clickable structure (rail state) ---
  const rail = await page.evaluate(() => {
    const sidebar = document.querySelector("[class*='sidebarCol']");
    if (!sidebar) return { found: false };
    const items = [...sidebar.querySelectorAll("button, [role='button']")].map((b) => ({
      text: (b.textContent || "").trim().slice(0, 30),
      aria: b.getAttribute("aria-label"),
      title: b.getAttribute("title"),
      cls: (b.className || "").toString().slice(0, 60),
    }));
    return { found: true, count: items.length, items: items.slice(0, 20) };
  });
  console.log("RAIL:", JSON.stringify(rail, null, 2));

  // --- try to expand sidebar + open first session ---
  const opened = await page.evaluate(() => {
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const toggle = sidebar?.querySelector("[class*='toggle']");
    if (toggle) toggle.click();
    return !!toggle;
  });
  await page.waitForTimeout(1500);
  const afterExpand = await page.evaluate(() => {
    const frame = document.querySelector("[class*='frame']");
    return { collapsed: frame?.getAttribute("data-sidebar-collapsed"), cols: frame?.style.gridTemplateColumns };
  });
  console.log("AFTER EXPAND:", JSON.stringify(afterExpand));

  const sessionClicked = await page.evaluate(() => {
    const sidebar = document.querySelector("[class*='sidebarCol']");
    // session rows: elements with data attributes or list rows; try known class fragments
    const candidates = [
      ...sidebar.querySelectorAll("[class*='session']"),
      ...sidebar.querySelectorAll("[class*='workspace'] [role='button']"),
    ];
    for (const c of candidates.slice(0, 30)) {
      const tag = (c.className || "").toString();
      if (/row|item|entry/i.test(tag) && c.closest("[class*='sessionList'], [class*='list'], [class*='workspace']")) {
        c.click();
        return tag.slice(0, 80);
      }
    }
    return null;
  });
  console.log("SESSION CLICK:", sessionClicked);
  await page.waitForTimeout(5000);

  // --- dump the active conversation top bar + tabs + sidebar entries ---
  const r = await page.evaluate(() => {
    const o = { darkTheme: document.body.hasAttribute("data-ds-dark-theme") };
    const cs = (el) => el ? {
      bg: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
      border: getComputedStyle(el).border,
      radius: getComputedStyle(el).borderRadius,
      z: getComputedStyle(el).zIndex,
      display: getComputedStyle(el).display,
      padding: getComputedStyle(el).padding,
    } : null;
    const cls = (el) => (el ? (el.className || "").toString().slice(0, 60) : null);

    // header (title bar)
    const header = document.querySelector("[class*='header']");
    o.header = header ? { cls: cls(header), style: cs(header), html: header.outerHTML.slice(0, 1800) } : null;

    // tabs
    const tl = document.querySelector("[role='tablist']");
    o.tabs = tl ? [...tl.querySelectorAll("[role='tab']")].map((t) => ({ text: t.textContent.trim(), style: cs(t), cls: cls(t) })) : null;

    // anything with session.log
    const sessionLog = [...document.querySelectorAll("*")].filter((el) => /session\.log/i.test(el.textContent || "") && el.children.length <= 2).slice(0, 3)
      .map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 30), style: cs(el) }));
    o.sessionLogEls = sessionLog;

    // 标准模式 element
    const preset = [...document.querySelectorAll("*")].filter((el) => (el.textContent || "").includes("标准模式") && el.children.length <= 4).slice(0, 3)
      .map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 30), style: cs(el) }));
    o.presetEls = preset;

    // sidebar: 新会话 / 设置 / workspace selector / 工作区 label
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const grab = (txt) => [...(sidebar ? sidebar.querySelectorAll("*") : [])].filter((el) => (el.textContent || "").includes(txt) && el.children.length <= 2)
      .slice(0, 2).map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 30), style: cs(el) }));
    o.newSessionEls = grab("新会话");
    o.settingsEls = grab("设置");
    o.workspaceEls = grab("工作区");
    o.brandEls = [...(sidebar ? sidebar.querySelectorAll("*") : [])].filter((el) => /Harness|harness/i.test(el.textContent || "") && el.children.length <= 3)
      .slice(0, 2).map((el) => ({ tag: el.tagName, cls: cls(el), text: el.textContent.trim().slice(0, 40), style: cs(el) }));

    return o;
  });
  console.log(JSON.stringify(r, null, 2));
  console.log("LOGS:", JSON.stringify(logs));
} finally {
  await browser.close();
}
