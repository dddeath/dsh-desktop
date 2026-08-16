const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const outputRoot = path.resolve(
  'E:/deepseek_harness/research/ui-audit/phase1-regression-pet-composer/acceptance',
)
const screenshotPath = path.join(outputRoot, '03-pet-composer-fixed.png')
const metricsPath = path.join(outputRoot, '03-pet-composer-fixed-metrics.json')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let activeWindow = null

app.commandLine.appendSwitch('lang', 'zh-CN')

async function waitForReady(win) {
  const deadline = Date.now() + 25000
  while (Date.now() < deadline) {
    const ready = await win.webContents.executeJavaScript(`Boolean(
      document.querySelector('[data-whale-girl]') &&
      document.querySelector("[data-composer-card='true']")
    )`).catch(() => false)
    if (ready) return
    await sleep(250)
  }
  throw new Error('Timed out waiting for the desktop pet and composer')
}

async function readStyles(win, forcedStatus = null) {
  return win.webContents.executeJavaScript(`(() => {
    const pet = document.querySelector('[data-whale-girl]')
    const card = document.querySelector("[data-composer-card='true']")
    const forcedStatus = ${JSON.stringify(forcedStatus)}
    if (forcedStatus) {
      card.dataset.dshComposerStatus = forcedStatus
      card.dataset.dshComposerStatusLabel = '\u667a\u80fd\u4f53\u8fd0\u884c\u4e2d'
    }
    const petStyle = getComputedStyle(pet)
    const before = getComputedStyle(card, '::before')
    const cardRect = card.getBoundingClientRect()
    return {
      pet: {
        inlineStyle: pet.getAttribute('style'),
        inlineOpacity025: /opacity:\\s*0\\.25/.test(pet.getAttribute('style') || ''),
        configuredOpacity: petStyle.getPropertyValue('--pet-opacity').trim(),
        computedOpacity: petStyle.opacity,
      },
      composer: {
        status: card.getAttribute('data-dsh-composer-status'),
        pseudoContent: before.content,
        pseudoDisplay: before.display,
        pseudoWidth: before.width,
        pseudoHeight: before.height,
        pseudoBackground: before.backgroundColor,
        rect: { x: cardRect.x, y: cardRect.y, width: cardRect.width, height: cardRect.height },
      },
    }
  })()`)
}

app.whenReady().then(async () => {
  fs.mkdirSync(outputRoot, { recursive: true })
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    show: false,
    backgroundColor: '#dce6f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      defaultEncoding: 'UTF-8',
    },
  })
  activeWindow = win
  await win.loadURL('http://127.0.0.1:3080/?acceptance=phase1-pet-composer-regression')
  await waitForReady(win)

  const idle = await readStyles(win)
  const running = await readStyles(win, 'running')
  const image = await win.capturePage()
  fs.writeFileSync(screenshotPath, image.toPNG())

  const result = {
    idle,
    running,
    assertions: {
      petUsesConfiguredOpacity: idle.pet.configuredOpacity === '1' && idle.pet.computedOpacity === '1',
      runningStateApplied: running.composer.status === 'running',
      runningPseudoSuppressed:
        running.composer.pseudoContent === 'none' && running.composer.pseudoDisplay === 'none',
      noRunningPseudoSurface:
        running.composer.pseudoBackground === 'rgba(0, 0, 0, 0)' &&
        running.composer.pseudoWidth === 'auto' &&
        running.composer.pseudoHeight === 'auto',
    },
    screenshotPath,
  }
  fs.writeFileSync(metricsPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result, null, 2))
  app.exit(Object.values(result.assertions).every(Boolean) ? 0 : 2)
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
