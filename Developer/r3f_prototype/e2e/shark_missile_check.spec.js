import { test, expect } from '@playwright/test'
import path from 'node:path'

test.setTimeout(30_000)

test('shark missile fires and damages clustered enemies in the running game', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5178', { waitUntil: 'networkidle' })
  await page.screenshot({
    path: path.resolve(process.cwd(), '..', '..', 'Quaility_Assurance', 'playwright_shark_title_2026-06-14.png'),
    fullPage: true,
  })

  await page.locator('button').filter({ hasText: '모든 무기 해금' }).first().click()
  await page.locator('button').filter({ hasText: '게임 시작' }).first().click()
  await page.waitForSelector('canvas', { timeout: 15_000 })
  await page.waitForTimeout(1000)

  const setup = await page.evaluate(async () => {
    const sharkModuleSource = await fetch('/src/components/Weapons/SharkMissile.jsx').then((response) => response.text())
    const storePath = sharkModuleSource.match(/from "(\/src\/store\/useGameStore\.js[^"]*)"/)?.[1]
      ?? '/src/store/useGameStore.js'
    const { useGameStore } = await import(storePath)
    const { enemyBodies, playerPos } = await import('/src/lib/refs.js')
    const { WEAPON_CATALOG } = await import('/src/lib/weaponCatalog.js')

    window.__sharkHits = 0
    window.__sharkHitEvents = []
    window.__sharkMissileDebug = []
    window.__sharkLastDamage = null
    window.__sharkLastImpact = null
    window.__sharkTargetTranslations = 0

    playerPos.set(0, 0, 0)

    const makeTarget = (id, x, z) => ({
      _enemyDead: false,
      _enemyId: id,
      _enemyHit: (damage, impact) => {
        window.__sharkHits += 1
        window.__sharkHitEvents.push({ damage, impact })
        window.__sharkLastDamage = damage
        window.__sharkLastImpact = impact
      },
      translation: () => {
        window.__sharkTargetTranslations += 1
        return { x, y: 0, z }
      },
    })

    enemyBodies.clear()
    for (let i = 0; i < 30; i += 1) {
      const angle = (Math.PI * 2 * i) / 30
      const r = 0.42 + (i % 3) * 0.1
      enemyBodies.set(
        `pw-shark-${i}`,
        makeTarget(`pw-shark-${i}`, Math.sin(angle) * r, 4.0 + Math.cos(angle) * r),
      )
    }

    const state = useGameStore.getState()
    const disabledWeapons = Object.fromEntries(
      Object.entries(state.weapons).map(([id, weapon]) => [id, { ...weapon, active: false }]),
    )
    useGameStore.setState({
      phase: 'playing',
      player: { ...state.player, level: 8, xp: 0 },
      weapons: {
        ...disabledWeapons,
        sharkMissile: {
          ...state.weapons.sharkMissile,
          ...WEAPON_CATALOG.sharkMissile.base,
          active: true,
          level: 1,
        },
      },
    })

    return {
      phase: useGameStore.getState().phase,
      sharkActive: useGameStore.getState().weapons.sharkMissile.active,
      sharkDamage: useGameStore.getState().weapons.sharkMissile.damage,
      fakeEnemyCount: enemyBodies.size,
    }
  })

  expect(setup).toMatchObject({
    phase: 'playing',
    sharkActive: true,
    sharkDamage: 30,
  })
  expect(setup.fakeEnemyCount).toBeGreaterThanOrEqual(3)

  await page.waitForFunction(() => (
    window.__sharkMissileDebug?.some((event) => event.type === 'explode')
  ), null, { timeout: 10_000 })
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.resolve(process.cwd(), '..', '..', 'Quaility_Assurance', 'playwright_shark_game_verified_2026-06-14.png'),
    fullPage: true,
  })

  const result = await page.evaluate(() => ({
    hits: window.__sharkHits,
    events: window.__sharkHitEvents,
    damage: window.__sharkLastDamage,
    impact: window.__sharkLastImpact,
    debug: window.__sharkMissileDebug,
    translations: window.__sharkTargetTranslations,
    canvasCount: document.querySelectorAll('canvas').length,
  }))

  expect(result.canvasCount).toBe(1)
  expect(result.translations).toBeGreaterThan(0)
  expect(result.hits).toBeGreaterThan(0)
  expect(result.debug.some((event) => event.type === 'launch')).toBe(true)
  expect(result.debug.some((event) => event.type === 'explode')).toBe(true)
  const sharkEvent = result.events.find((event) => event.damage === 30 && event.impact?.knockback === 3.6)
  expect(sharkEvent).toBeTruthy()
  expect(sharkEvent.impact).toMatchObject({
    knockback: 3.6,
    knockbackMs: 150,
  })
  expect(errors).toEqual([])
})
