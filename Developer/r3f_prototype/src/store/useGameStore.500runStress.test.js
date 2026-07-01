// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { UPGRADE_EFFECTS } from '../lib/upgrades.js'
import { joystickDir } from '../lib/refs.js'
import { load as loadPlayerRecords, _resetForTests as resetPlayerRecords } from '../lib/playerRecords.js'
import { _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'
import { _resetForTests as resetPassiveUpgrades } from '../lib/passiveUpgrades.js'
import { useGameStore } from './useGameStore.js'

const DIRECTIONS = [
  { x: 0, z: 0, active: false },
  { x: 0, z: -1, active: true },
  { x: 1, z: -1, active: true },
  { x: 1, z: 0, active: true },
  { x: 1, z: 1, active: true },
  { x: 0, z: 1, active: true },
  { x: -1, z: 1, active: true },
  { x: -1, z: 0, active: true },
  { x: -1, z: -1, active: true },
]

function applyDirection(direction) {
  const length = Math.hypot(direction.x, direction.z) || 1
  joystickDir.x = direction.active ? direction.x / length : 0
  joystickDir.z = direction.active ? direction.z / length : 0
  joystickDir.active = direction.active
}

describe('500 internal gameplay stress runs', () => {
  beforeEach(() => {
    localStorage.clear()
    resetPlayerRecords()
    resetWeaponUnlocks()
    resetPassiveUpgrades()
    useGameStore.getState().resetGame('stage1')
  })

  it('survives 500 runs across directions, stages, rewards, damage, and upgrades', () => {
    const upgradeKeys = Object.keys(UPGRADE_EFFECTS)
    const seenDirections = new Set()
    const seenStages = new Set()
    const seenUpgrades = new Set()

    for (let run = 0; run < 500; run += 1) {
      const stageId = run % 2 === 0 ? 'stage1' : 'stage2'
      const directionIndex = run % DIRECTIONS.length
      const direction = DIRECTIONS[directionIndex]

      useGameStore.getState().resetGame(stageId)
      applyDirection(direction)
      seenDirections.add(directionIndex)
      seenStages.add(stageId)

      const store = useGameStore.getState()
      store.tickTime(48_000 + (run % 5) * 24_000)
      store.checkSurvivalMilestone()
      store.gainGold((run % 4) + 1)

      for (let kill = 0; kill < (run % 6); kill += 1) {
        useGameStore.getState().recordKill()
      }

      useGameStore.getState().gainXp(12 + (run % 9))
      while (useGameStore.getState().phase === 'levelup') {
        const key = upgradeKeys[(run + seenUpgrades.size) % upgradeKeys.length]
        seenUpgrades.add(key)
        useGameStore.getState().applyUpgrade(key)
      }

      if (run % 3 === 0) {
        useGameStore.getState().clearStage()
      } else {
        useGameStore.getState().damagePlayer(9999)
      }

      const state = useGameStore.getState()
      expect(['gameover', 'cleared']).toContain(state.phase)
      expect(Number.isFinite(state.goldTotal)).toBe(true)
      expect(state.goldTotal).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(state.goldSession)).toBe(true)
      expect(state.player.hp).toBeGreaterThanOrEqual(0)
      expect(Math.hypot(joystickDir.x, joystickDir.z)).toBeLessThanOrEqual(1.000001)
    }

    const records = loadPlayerRecords()
    expect(seenDirections.size).toBe(DIRECTIONS.length)
    expect(seenStages).toEqual(new Set(['stage1', 'stage2']))
    expect(seenUpgrades.size).toBe(upgradeKeys.length)
    expect(records.totalRuns).toBe(500)
    expect(records.totalGold).toBeGreaterThan(0)
    expect(records.bestSurvivalSeconds).toBeGreaterThanOrEqual(48)
  })
})
