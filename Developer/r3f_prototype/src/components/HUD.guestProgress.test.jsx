// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD, { getNextUnlockPreview } from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
  getFirebaseProgressRuntimeSnapshot,
  setCloudProgressUser,
} from '../lib/firebaseProgress.js'

let root, container
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  _resetFirebaseProgressForTests()
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ phase: 'playing' })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  _seedHydratedFirebaseProgressForTests()
  useGameStore.getState().resetGame('stage1')
  vi.unstubAllGlobals()
})

describe('guest gameplay without account progress', () => {
  it('opens level-up choices after XP gain without hydrating or replacing account progress', () => {
    const before = getFirebaseProgressRuntimeSnapshot()
    act(() => root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />))
    act(() => useGameStore.getState().gainXp(useGameStore.getState().player.xpToNext))
    expect(useGameStore.getState().phase).toBe('levelup')
    expect(container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')).toHaveLength(4)
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
    expect(before.progress).toBeNull()
  })

  it.each(['gameover', 'cleared'])('can evaluate the %s next-weapon preview without account progress', (phase) => {
    const before = getFirebaseProgressRuntimeSnapshot()
    expect(() => getNextUnlockPreview(phase, useGameStore.getState().weapons)).not.toThrow()
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
  })

  it('does not treat a signed-in but unhydrated account as a guest', () => {
    setCloudProgressUser({ uid: 'waiting-for-remote-progress' })
    expect(() => getNextUnlockPreview('gameover', useGameStore.getState().weapons)).toThrow(/Firebase player progress is unavailable/)
  })
})
