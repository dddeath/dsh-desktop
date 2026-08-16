import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  // expand sidebar + open first session
  await page.evaluate(() => {
    document.querySelector("[class*='sidebarCol'] [class*='toggle']")?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll("[class*='sidebarCol'] [class*='sessionRow'], [class*='sidebarCol'] [class*='session']")];
    const row = rows.find((r) => /row|item/i.test(r.className));
    row?.click();
  });
  await page.waitForTimeout(5000);

  const r = await page.evaluate(() => {
    const o = {};
    const cs = (el) => el ? {
      bg: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
      border: getComputedStyle(el).border,
      radius: getComputedStyle(el).borderRadius,
      display: getComputedStyle(el).display,
    } : null;
    const cls = (el) => (el ? (el.className || "").toString().slice(0, 70) : null);

    // top bar (conversation header)
    const header = document.querySelector(".wSkVaW_header");
    o.topHeader = header ? {
      cls: cls(header), style: cs(header),
      children: [...header.children].map((c) => ({ cls: cls(c), style: cs(c), html: c.outerHTML.slice(0, 500) })),
    } : null;

    // crumbs (对话标题)
    const crumbs = header?.querySelector(".wSkVaW_crumbs");
    o.crumbs = crumbs ? { cls: cls(crumbs), style: cs(crumbs), html: crumbs.outerHTML.slice(0, 600) } : null;

    // preset selector (标准模式) — button-ish in header or sidebar
    const preset = [...document.querySelectorAll("button, [role='button']")].filter((b) => (b.textContent || "").includes("标准模式"))
      .map((b) => ({ cls: cls(b), text: b.textContent.trim().slice(0, 30), style: cs(b) }));
    o.presetButtons = preset.slice(0, 4);

    // header utilities (session.log export button lives here)
    const utils = header?.querySelector(".wSkVaW_headerUtilities");
    o.headerUtilities = utils ? { cls: cls(utils), style: cs(utils), html: utils.outerHTML.slice(0, 700) } : null;

    // sidebar pieces
    const sidebar = document.querySelector("[class*='sidebarCol']");
    const s = (sel) => { const el = sidebar?.querySelector(sel); return el ? { cls: cls(el), style: cs(el), html: el.outerHTML.slice(0, 300) } : null; };
    o.sidebarBrand = s(".hHd-Xa_brand");
    o.newSession = s(".hHd-Xa_newSession");
    o.settingsTrigger = s(".VOzbGW_trigger");
    o.sectionHeader = s(".qDHVXG_sectionHeader");
    o.workspaceRows = [...(sidebar?.querySelectorAll("[class*='workspaceRow'], [class*='workspace'] [role='button'], [class*='workspaceEntry']") ?? [])].slice(0, 4)
      .map((el) => ({ cls: cls(el), style: cs(el), text: el.textContent.trim().slice(0, 40) }));

    return o;
  });
  console.log(JSON.stringify(r, null, 2));
} finally {
  await browser.close();
}
