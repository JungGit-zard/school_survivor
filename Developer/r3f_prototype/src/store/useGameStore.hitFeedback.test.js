import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore.js'

describe('useGameStore player hit feedback', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('increments the player hit flash token when the player takes damage', () => {
    const before = useGameStore.getState().player.hitFlashToken

    useGameStore.getState().damagePlayer(1)

    const state = useGameStore.getState()
    expect(state.player.hp).toBe(state.player.maxHp - 1)
    expect(state.player.hitFlashToken).toBe(before + 1)
  })
})
