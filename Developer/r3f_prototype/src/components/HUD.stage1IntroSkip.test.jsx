// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./Enemy.jsx', () => ({ ENEMY_SIZE_MULTIPLIER: 1, ENEMY_STATS: {} }))
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: vi.fn() }))
vi.mock('../lib/dialogueVoice.js', () => ({ playDialogueVoice: () => () => {}, stopDialogueVoice: () => {} }))
vi.mock('./Weapons/Starlink.jsx', () => ({ dispatchStarlinkCheatCrash: () => {} }))
import HUD from './HUD.jsx'
import { useGameStore, STAGE1_INTRO_IDS } from '../store/useGameStore.js'

let root, container, initial
const skipButton = () => container.querySelector('[data-testid="stage-intro-skip"]')
const pick = (s) => ({ phase: s.phase, pauseSource: s.pauseSource, introDialogue: s.introDialogue })

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  initial = useGameStore.getState()
  useGameStore.setState({ studentDialogue: null, questToast: null, phase: 'paused', pauseSource: 'intro', introDialogue: { index: 0 } })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  act(() => root.render(<HUD devCheatsVisible={false} />))
})
afterEach(() => {
  act(() => root.unmount()); container.remove()
  useGameStore.setState(initial, true)
})

describe('Stage 1 intro skip', () => {
  it('shows a 44px Skip button in the intro overlay top-right', () => {
    const btn = skipButton()
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('건너뛰기')
    expect(btn.style.position).toBe('absolute')
    expect(btn.style.top).toBe('var(--hud-safe-top)')
    expect(btn.style.getPropertyValue('--hud-safe-top')).toContain('safe-area-inset-top')
    expect(btn.style.right).toBe('var(--hud-safe-right)')
    expect(btn.style.getPropertyValue('--hud-safe-right')).toContain('safe-area-inset-right')
    expect(btn.style.minHeight).toBe('44px')
    expect(btn.closest('[data-testid="stage-intro-catcher"]')).not.toBeNull()
  })

  it('one click on Skip ends the intro with the same state as tapping through the last card', () => {
    act(() => { skipButton().dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })) })
    // pointerdown on Skip must not also advance a card
    expect(useGameStore.getState().introDialogue).toEqual({ index: 0 })
    act(() => { skipButton().click() })
    const skipped = pick(useGameStore.getState())
    expect(skipped).toEqual({ phase: 'playing', pauseSource: null, introDialogue: null })
    expect(container.querySelector('[data-testid="stage-intro-catcher"]')).toBeNull()

    // tap-through path still works and lands on the identical state
    act(() => useGameStore.setState({ phase: 'paused', pauseSource: 'intro', introDialogue: { index: 0 } }))
    for (let i = 0; i < STAGE1_INTRO_IDS.length; i += 1) {
      act(() => { container.querySelector('[data-testid="stage-intro-catcher"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })) })
    }
    expect(pick(useGameStore.getState())).toEqual(skipped)
  })
})
