// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./Enemy.jsx', () => ({ ENEMY_SIZE_MULTIPLIER: 1, ENEMY_STATS: {} }))
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: vi.fn() }))
vi.mock('../lib/dialogueVoice.js', () => ({ playDialogueVoice: () => () => {}, stopDialogueVoice: () => {} }))
vi.mock('./Weapons/Starlink.jsx', () => ({ dispatchStarlinkCheatCrash: () => {} }))
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'

let root, container, initial
const guide = () => container.querySelector('[data-testid="stage4-hazard-guide"]')
const update = (patch = {}) => act(() => useGameStore.setState(patch))
const at = (elapsedMs) => act(() => {
  setRuntimeElapsedMs(elapsedMs)
  useGameStore.setState({ elapsedMs })
  vi.advanceTimersByTime(50)
})
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers(); resetRuntimeTime()
  initial = useGameStore.getState()
  useGameStore.setState({
    phase: 'playing', pauseSource: null, currentStageId: 'stage4', gameKey: 22, elapsedMs: 0,
    bossSpawned: false, bossDefeated: false, bossSpawnSec: 150,
    escapePortalActive: false, matildaSpawned: false, recentMilestone: null,
    studentDialogue: null, introDialogue: null, questToast: null,
    player: { ...initial.player, hp: 100, maxHp: 100 },
  })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  act(() => root.render(<HUD devCheatsVisible={false} />))
})
afterEach(() => {
  act(() => root.unmount()); container.remove()
  useGameStore.setState(initial, true)
  resetRuntimeTime(); vi.useRealTimers()
})

describe('HUD Stage4 guide integration priority', () => {
  it('preserves the existing controls, health, weapon and quest UI while adding a transparent guide', () => {
    expect(guide()).not.toBe(null)
    for (const testId of ['top-left-controls', 'bottom-right-pause', 'hud-hp-row', 'weapon-icon-bar']) {
      expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBe(null)
    }
    expect(container.querySelector('.hud-quest-bag-button')).not.toBe(null)
    expect(guide().style.pointerEvents).toBe('none')
  })
  it('yields to quest toast and paused inventory without changing either', () => {
    update({ questToast: '조사 안내' }); expect(guide()).toBe(null)
    expect(container.textContent).toContain('조사 안내')
    update({ questToast: null }); expect(guide()).not.toBe(null)
    update({ phase: 'paused', pauseSource: 'quest' }); expect(guide()).toBe(null)
    expect(container.querySelector('#quest-inventory-panel')).not.toBe(null)
  })
  it('yields to existing projectile, boss and Matilda warnings and returns after they end', () => {
    update({ bossDefeated: true })
    at(16000); expect(guide()).toBe(null)
    at(20000); expect(guide()).not.toBe(null)
    at(149000); expect(guide()).toBe(null)
    at(160000); expect(guide()).not.toBe(null)
    at(206000); expect(guide()).toBe(null)
    expect(container.querySelector('[data-testid="matilda-warning"]')).not.toBe(null)
  })
  it('uses bossDefeated, not boss time or an open portal, for unlock/escape guidance', () => {
    at(160000); expect(guide()).toBe(null)
    update({ bossDefeated: true }); expect(guide().textContent).toContain('닫혔어요')
    at(210000); update({ escapePortalActive: true })
    expect(guide()).toBe(null) // the existing portal-appearance banner has priority
    at(214000); expect(guide().textContent).toContain('해금과 탈출은 별개')
  })
  it('hides on other stages, invalid player state, pause and gameover', () => {
    update({ currentStageId: 'stage1' }); expect(guide()).toBe(null)
    update({ currentStageId: 'stage4', player: { ...initial.player, hp: 0 } }); expect(guide()).toBe(null)
    update({ player: { ...initial.player, hp: 100 }, phase: 'paused' }); expect(guide()).toBe(null)
    update({ phase: 'gameover' }); expect(guide()).toBe(null)
  })
})
