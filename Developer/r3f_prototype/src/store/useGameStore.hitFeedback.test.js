// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { saveTitleSettings } from '../lib/titleSettings.js'
import { _seedHydratedFirebaseProgressForTests, _setFirebaseProgressClientForTests } from '../lib/firebaseProgress.js'
import { EnemyEntityPool, MAX_ENEMIES } from '../lib/enemyEntityPool.js'
import { ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime } from '../lib/enemySimulation.js'

describe('useGameStore player hit feedback', () => {
  beforeEach(() => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()
  })

  it('increments the player hit flash token when the player takes damage', () => {
    const before = useGameStore.getState().player.hitFlashToken

    useGameStore.getState().damagePlayer(1)

    const state = useGameStore.getState()
    expect(state.player.hp).toBe(state.player.maxHp - 1)
    expect(state.player.hitFlashToken).toBe(before + 1)
  })

  it('allows an explicit guaranteed hit to bypass the normal invulnerability window', () => {
    useGameStore.setState((state) => ({
      phase: 'playing',
      player: { ...state.player, hp: 40, invulnerable: true },
    }))

    useGameStore.getState().damagePlayer(12, { ignoreInvulnerability: true })

    expect(useGameStore.getState().player.hp).toBe(28)
  })

  // E90 숙제 당번(피해 0)이 넉백 중 몸에 닿으면 enemySimulation이 값 0 접촉 이벤트를 낸다(Enemies.jsx → damagePlayer).
  it('treats a zero, negative or NaN amount as no hit (no flash, no i-frames, hp untouched)', () => {
    for (const amount of [0, -5, NaN, undefined]) {
      useGameStore.getState().resetGame()
      const before = useGameStore.getState().player
      const landed = useGameStore.getState().damagePlayer(amount, { source: 'zombieContact' })
      const after = useGameStore.getState().player
      expect(landed).toBe(false)
      expect(after.hp).toBe(before.hp)
      expect(after.invulnerable).toBe(false)
      expect(after.hitFlashToken).toBe(before.hitFlashToken)
    }
  })

  it('E90 (no attack) knocked back onto the player emits a 0-value contact, which must not count as a hit', () => {
    const pool = new EnemyEntityPool(MAX_ENEMIES)
    const runtime = createEnemySimulationRuntime()
    const h = pool.spawn({ type: 'E90', x: 0.05, y: 0, z: 0, hp: 16, maxHp: 16, visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1 })
    const values = []
    pool.knockbackTimer[h.index] = 100
    pool.knockbackX[h.index] = 0
    pool.knockbackZ[h.index] = 0
    runtime.step(pool, {
      delta: 1 / 60, playerX: 0, playerZ: 0, halfX: 9, halfZ: 16, elapsedSec: 80, activeProjectileCount: 0, stageId: 'stage1',
      onContact: (_i, _g, _x, _y, _z, value) => values.push(value),
    })
    expect(values).toEqual([0])
    const before = useGameStore.getState().player
    expect(useGameStore.getState().damagePlayer(values[0], { source: 'zombieContact' })).toBe(false)
    expect(useGameStore.getState().player.hitFlashToken).toBe(before.hitFlashToken)
  })

  it('a zero-damage hit does not feed or wake the Inucon guard', () => {
    useGameStore.setState((state) => ({ weapons: { ...state.weapons, inucon: { active: true, level: 1 } } }))
    const landed = useGameStore.getState().damagePlayer(0, { source: 'zombieContact' })
    expect(landed).toBe(false)
    expect(useGameStore.getState().player.invulnerable).toBe(false)
  })

  describe('vibration on hit', () => {
    let vibrate
    const setVibration = (on) => saveTitleSettings({ vibration: on })

    beforeEach(() => {
      vibrate = vi.fn()
      vi.stubGlobal('navigator', { vibrate })
    })
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('vibrates when the player is hit and the setting is on', () => {
      setVibration(true)
      useGameStore.getState().damagePlayer(1)
      expect(vibrate).toHaveBeenCalledWith(18)
    })

    it('does not vibrate when the setting is off', () => {
      setVibration(false)
      useGameStore.getState().damagePlayer(1)
      expect(vibrate).not.toHaveBeenCalled()
    })
  })
})
