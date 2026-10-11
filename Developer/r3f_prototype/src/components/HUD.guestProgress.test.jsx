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
  it.each(['guest', 'signed-in'])('opens level-up choices after XP gain for %s without replacing account progress', (mode) => {
    if (mode === 'signed-in') setCloudProgressUser({ uid: 'waiting-for-remote-progress' })
    const before = getFirebaseProgressRuntimeSnapshot()
    act(() => root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />))
    act(() => useGameStore.getState().gainXp(useGameStore.getState().player.xpToNext))
    expect(useGameStore.getState().phase).toBe('levelup')
    expect(container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')).toHaveLength(4)
    const cards = container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')
    const animationEnd = new window.Event('webkitAnimationEnd', { bubbles: true })
    Object.defineProperty(animationEnd, 'animationName', { value: 'levelupCardPop' })
    act(() => cards[3].dispatchEvent(animationEnd))
    act(() => cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(useGameStore.getState().phase).toBe('playing')
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
    expect(before.progress).toBeNull()
  })

  it.each(['gameover', 'cleared'])('can evaluate the %s next-weapon preview without account progress', (phase) => {
    const before = getFirebaseProgressRuntimeSnapshot()
    expect(() => getNextUnlockPreview(phase, useGameStore.getState().weapons)).not.toThrow()
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
  })

  it('can evaluate an unhydrated account preview without reading or replacing remote progress', () => {
    setCloudProgressUser({ uid: 'waiting-for-remote-progress' })
    const before = getFirebaseProgressRuntimeSnapshot()
    expect(() => getNextUnlockPreview('gameover', useGameStore.getState().weapons)).not.toThrow()
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
  })
})
