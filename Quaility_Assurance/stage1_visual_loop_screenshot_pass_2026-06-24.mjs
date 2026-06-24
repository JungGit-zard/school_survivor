import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const appRoot = path.join(projectRoot, 'Developer', 'r3f_prototype')
const require = createRequire(path.join(appRoot, 'package.json'))
const { chromium } = require('@playwright/test')

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:5192/'
const screenshotDir = path.join(projectRoot, 'Quaility_Assurance', 'screenshots')
const stamp = '2026-06-24'

const shot = (name) => path.join(screenshotDir, `stage1-visual-loop-${name}-${stamp}.png`)
const logs = []
const errors = []

const launchArgs = (process.env.QA_CHROMIUM_ARGS || '')
  .split(' ')
  .map((arg) => arg.trim())
  .filter(Boolean)
const browser = await chromium.launch({ headless: true, args: launchArgs })
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
const page = await context.newPage()
page.on('console', (msg) => {
  logs.push({ type: msg.type(), text: msg.text() })
})
page.on('pageerror', (err) => {
  errors.push({ message: err.message, stack: err.stack })
})

async function safeScreenshot(name) {
  const file = shot(name)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function stageSnapshot(label) {
  const file = await safeScreenshot(label)
  const text = await page.locator('body').innerText().catch(() => '')
  return { label, file, text: text.slice(0, 1000), url: page.url() }
}

const results = []
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.evaluate(() => localStorage.setItem('school_survivor:nickname', 'QA시각검증'))
  results.push(await stageSnapshot('00-title'))

  await page.getByRole('button', { name: '게임 시작' }).click()
  const nick = page.getByRole('textbox', { name: '유저 닉네임' })
  if (await nick.isVisible().catch(() => false)) {
    await nick.fill('QA시각검증')
    await page.getByRole('button', { name: '저장하고 시작' }).click()
  }

  await page.waitForTimeout(7000)
  results.push(await stageSnapshot('01-initial-player-e01-floor-pencil'))

  // 치트성 시간 점프: QA 시각 캡처용. 런타임 코드는 수정하지 않는다.
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/useGameStore.js')
    const s = useGameStore.getState()
    const weapons = { ...s.weapons }
    for (const key of Object.keys(weapons)) {
      weapons[key] = { ...weapons[key], active: true, level: Math.max(1, weapons[key].level ?? 1) }
    }
    useGameStore.setState({
      phase: 'playing',
      elapsedMs: 119_500,
      weapons,
      player: { ...s.player, hp: s.player.maxHp, invulnerable: false },
    })
  }).catch((error) => errors.push({ message: `store jump 120s failed: ${error.message}`, stack: error.stack }))
  await page.waitForTimeout(10_000)
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/useGameStore.js')
    const s = useGameStore.getState()
    if (s.phase === 'levelup') {
      useGameStore.setState({ phase: 'playing', pendingLevelUps: 0 })
    }
  }).catch((error) => errors.push({ message: `dismiss levelup before E05 shot failed: ${error.message}`, stack: error.stack }))
  await page.waitForTimeout(1500)
  results.push(await stageSnapshot('02-e05-charge-weapons-pickups'))

  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/useGameStore.js')
    const s = useGameStore.getState()
    useGameStore.setState({
      phase: 'playing',
      elapsedMs: 191_500,
      bossSpawned: false,
      player: { ...s.player, hp: s.player.maxHp, invulnerable: false },
    })
  }).catch((error) => errors.push({ message: `store jump 192s failed: ${error.message}`, stack: error.stack }))
  await page.waitForTimeout(10_000)
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/useGameStore.js')
    const s = useGameStore.getState()
    if (s.phase === 'levelup') {
      useGameStore.setState({ phase: 'playing', pendingLevelUps: 0 })
    }
  }).catch((error) => errors.push({ message: `dismiss levelup before B01 shot failed: ${error.message}`, stack: error.stack }))
  await page.waitForTimeout(1500)
  results.push(await stageSnapshot('03-b01-boss-loop'))
} finally {
  await browser.close()
}

console.log(JSON.stringify({ baseUrl, results, errors, logs }, null, 2))
