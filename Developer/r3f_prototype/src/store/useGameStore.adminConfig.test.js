// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { resetAdminConfig, saveAdminConfig } from '../lib/adminConfig.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { useGameStore } from './useGameStore.js'

describe('useGameStore admin balance integration', () => {
  beforeEach(() => {
    _resetFirebaseProgressForTests()
    _seedHydratedFirebaseProgressForTests()
    resetAdminConfig()
    useGameStore.getState().resetGame()
  })

  it('applies admin HP and speed settings when a new run starts', () => {
    saveAdminConfig({
      balance: {
        player: {
          maxHpBonus: 40,
          speedMultiplier: 1.2,
        },
      },
    })

    useGameStore.getState().resetGame()

    const { player } = useGameStore.getState()
    expect(player.maxHp).toBe(140)
    expect(player.hp).toBe(140)
    expect(player.speed).toBeCloseTo(3.6)
    expect(player.baseSpeed).toBeCloseTo(3.6)
  })
})
