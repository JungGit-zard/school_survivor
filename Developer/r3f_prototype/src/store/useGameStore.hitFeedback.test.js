// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { SETTINGS_STORAGE_KEY } from '../lib/titleSettings.js'

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

  describe('vibration on hit', () => {
    let vibrate
    const setVibration = (on) =>
      globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ vibration: on }))

    beforeEach(() => {
      vibrate = vi.fn()
      vi.stubGlobal('navigator', { vibrate })
    })
    afterEach(() => {
      vi.unstubAllGlobals()
      globalThis.localStorage?.removeItem(SETTINGS_STORAGE_KEY)
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
