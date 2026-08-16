const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const outputRoot = path.resolve(
  'E:/deepseek_harness/research/ui-audit/phase2/implementation-maid-atelier-fix-runtime-clarity-sidebar-sync/modified',
)
const screenshotPath = path.join(outputRoot, '03-right-sidebar-over-50-sync-acceptance.png')
const metricsPath = path.join(outputRoot, '03-right-sidebar-over-50-sync-metrics.json')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let activeWindow = null

app.commandLine.appendSwitch('lang', 'zh-CN')

async function geometry(win) {
  return win.webContents.executeJavaScript(`(() => {
    const read = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        inlineStyle: element.getAttribute('style'),
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      band: document.body?.getAttribute('data-dsh-responsive-band') || null,
      rootMarginRight: getComputedStyle(document.getElementById('root')).marginRight,
      sidebarVariable: getComputedStyle(document.documentElement)
        .getPropertyValue('--dsh-sidebar-width').trim(),
      panel: read("[class*='_panel']:has(> [class*='_panelBody'])"),
      resize: read("[class*='_panelResize']"),
      center: read("[class*='_centerCol']"),
    }
  })()`)
}

async function waitForReady(win) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const ready = await win.webContents.executeJavaScript(`Boolean(
      document.querySelector("[class*='_panel']:has(> [class*='_panelBody'])") &&
      document.querySelector("[class*='_panelResize']")
    )`).catch(() => false)
    if (ready) return
    await sleep(250)
  }
  const diagnostic = await win.webContents.executeJavaScript(`(() => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: (document.body?.innerText || '').slice(0, 1200),
    buttons: Array.from(document.querySelectorAll('button')).slice(0, 30)
      .map((node) => ({ text: (node.textContent || '').trim(), aria: node.getAttribute('aria-label'), className: node.className })),
    statusCount: document.querySelectorAll("[data-dsh-runtime-status='true']").length,
    toggleCount: document.querySelectorAll("button[class*='_toggleButton'][aria-label]").length,
  }))()`)
  throw new Error(`Timed out waiting for the DSH UI: ${JSON.stringify(diagnostic)}`)
}

async function ensureRightPanelOpen(win) {
  await win.webContents.executeJavaScript(`(() => {
    const panel = document.querySelector("[class*='_panel']:has(> [class*='_panelBody'])")
    if (panel && /panelHidden/.test(panel.className)) {
      const buttons = Array.from(document.querySelectorAll("button[class*='_toggleButton'][aria-label]"))
      buttons.at(-1)?.click()
    }
  })()`)
  await sleep(1200)
}

async function assertPlainRuntimeText(win) {
  return win.webContents.executeJavaScript(`(() => {
    const summary = document.querySelector("[data-dsh-runtime-summary='true']")
    if (summary?.getAttribute('aria-expanded') !== 'true') summary?.click()
    const panel = document.querySelector("[data-dsh-runtime-panel='true']")
    const textNodes = Array.from(document.querySelectorAll(
      "[data-dsh-runtime-status='true'] :is(button, span, strong)",
    )).filter((node) => (node.textContent || '').trim())
    const styles = textNodes.map((node) => {
      const style = getComputedStyle(node)
      return {
        textShadow: style.textShadow,
        filter: style.filter,
        textStroke: style.webkitTextStroke || '',
        opacity: style.opacity,
      }
    })
    const panelStyle = panel ? getComputedStyle(panel) : null
    return {
      count: styles.length,
      allPlain: styles.every((item) =>
        item.textShadow === 'none' &&
        item.filter === 'none' &&
        item.opacity === '1' &&
        (item.textStroke === '' || item.textStroke.startsWith('0px'))
      ),
      unique: [...new Set(styles.map((item) => JSON.stringify(item)))],
      panelBackground: panelStyle?.backgroundColor || null,
      panelBackdropFilter: panelStyle?.backdropFilter || null,
      panelIsolation: panelStyle?.isolation || null,
    }
  })()`)
}

async function dragSidebarPastHalf(win, before) {
  if (!before.resize) throw new Error('Right sidebar resize handle was not found')
  const fromX = Math.round(before.resize.x + before.resize.width / 2)
  const y = Math.round(Math.min(before.viewport.height - 80, Math.max(160, before.resize.height * 0.55)))
  const toX = Math.round(before.viewport.width * 0.38)
  win.webContents.debugger.attach('1.3')
  await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: fromX, y, button: 'none', buttons: 0,
  })
  await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: fromX, y, button: 'left', buttons: 1, clickCount: 1,
  })
  const steps = 18
  let previousX = fromX
  for (let index = 1; index <= steps; index += 1) {
    const x = Math.round(fromX + ((toX - fromX) * index) / steps)
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x, y, button: 'left', buttons: 1,
      deltaX: x - previousX, deltaY: 0,
    })
    previousX = x
    await sleep(14)
  }
  await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: toX, y, button: 'left', buttons: 0, clickCount: 1,
  })
  win.webContents.debugger.detach()
  await sleep(500)
}

app.whenReady().then(async () => {
  fs.mkdirSync(outputRoot, { recursive: true })
  const win = new BrowserWindow({
    width: 2048,
    height: 1200,
    show: false,
    backgroundColor: '#f5f7fb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      defaultEncoding: 'UTF-8',
    },
  })
  activeWindow = win
  await win.loadURL('http://127.0.0.1:3080/?acceptance=runtime-clarity-sidebar-sync-wide')
  await waitForReady(win)
  await ensureRightPanelOpen(win)
  const before = await geometry(win)
  const plainText = await assertPlainRuntimeText(win)
  await dragSidebarPastHalf(win, before)
  const after = await geometry(win)
  const image = await win.capturePage()
  fs.writeFileSync(screenshotPath, image.toPNG())

  const panelRatio = after.panel.width / after.viewport.width
  const variableWidth = Number.parseFloat(after.sidebarVariable)
  const rootMarginWidth = Number.parseFloat(after.rootMarginRight)
  const result = {
    before,
    after,
    plainText,
    assertions: {
      responsiveBandWide: after.band === 'wide',
      panelPastHalfViewport: panelRatio > 0.5,
      panelMatchesSidebarVariable: Math.abs(after.panel.width - variableWidth) < 2,
      panelBoundaryTracksDragTarget:
        Math.abs(after.panel.x - (after.viewport.width * 0.38)) < 3,
      panelExpandedByDragDelta:
        (after.panel.width - before.panel.width) > (after.viewport.width * 0.35),
      noPanelMaxWidthCap: after.panel.maxWidth === 'none',
      centerCanShrinkContinuously: after.center.minWidth === '0px',
    },
    panelRatioPercent: Math.round(panelRatio * 1000) / 10,
    screenshotPath,
  }
  fs.writeFileSync(metricsPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result, null, 2))
  const passed = Object.values(result.assertions).every(Boolean)
  app.exit(passed ? 0 : 2)
}).catch((error) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  const detail = error?.stack || String(error)
  fs.writeFileSync(path.join(outputRoot, 'electron-acceptance-error.log'), `${detail}\n`, 'utf8')
  if (activeWindow && !activeWindow.isDestroyed()) {
    activeWindow.capturePage()
      .then((image) => fs.writeFileSync(path.join(outputRoot, 'electron-acceptance-error.png'), image.toPNG()))
      .catch(() => {})
  }
  console.error(detail)
  app.exit(1)
})
