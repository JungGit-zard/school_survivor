// @vitest-environment jsdom
// Outfit UI inside the HUD: escape result "new outfit" card, pause-menu outfit line, and the
// HP number rounding up (outfit damage multipliers leave fractional HP, R-9).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { _resetGuestOutfitUnlocksForTests } from '../lib/outfitUnlocks.js'
import { getLocale, setLocale } from '../lib/i18n.js'

let root, container, originalState, originalLocale
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  originalState = useGameStore.getState()
  originalLocale = getLocale()
  setLocale('ko')
  _resetFirebaseProgressForTests()
  _resetGuestOutfitUnlocksForTests()
  useAuthStore.setState({ user: null, status: 'signedOut' })
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ phase: 'playing', elapsedMs: 240_000 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  useGameStore.setState(originalState, true)
  _resetGuestOutfitUnlocksForTests()
  _seedHydratedFirebaseProgressForTests()
  setLocale(originalLocale)
  vi.unstubAllGlobals()
})

const render = () => act(() => root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />))

describe('escape result outfit unlock card', () => {
  it('shows a "new outfit" card once a guest Stage 1 escape unlocks the winter uniform', () => {
    act(() => useGameStore.getState().clearStage())
    render()
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual(['winter'])
    const card = container.querySelector('[data-testid="outfit-unlock-card"]')
    expect(card).not.toBeNull()
    expect(card.textContent).toContain('새 옷 획득: 동복')
    expect(card.textContent).toContain('받는 피해 -8%')
    expect(card.textContent).toContain('이동속도 -4%')
    expect(card.textContent).toContain('로자리 방 옷장에서 갈아입을 수 있어요')
  })

  it('renders in English and Japanese too', () => {
    act(() => useGameStore.getState().clearStage())
    setLocale('en')
    render()
    expect(container.querySelector('[data-testid="outfit-unlock-card"]').textContent).toContain('New outfit: Winter Uniform')
    act(() => setLocale('ja'))
    expect(container.querySelector('[data-testid="outfit-unlock-card"]').textContent).toContain('新しい服を入手：冬服')
  })

  it('shows no card when nothing new was unlocked', () => {
    act(() => useGameStore.getState().clearStage())
    act(() => useGameStore.setState({ newlyUnlockedOutfitIds: Object.freeze([]) }))
    render()
    expect(container.querySelector('[data-testid="escape-success-screen"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="outfit-unlock-card"]')).toBeNull()
  })
})

describe('pause menu outfit line', () => {
  it('shows the outfit this run uses and its upside / downside', () => {
    useGameStore.setState({ phase: 'paused', pauseSource: 'manual', runOutfitId: 'gym' })
    render()
    expect(container.querySelector('[data-testid="pause-outfit-line"]').textContent).toBe('입은 옷: 체육복 (이동속도 +6% / 최대 체력 -12)')
  })

  it('says "no effect" for the school uniform', () => {
    useGameStore.setState({ phase: 'paused', pauseSource: 'manual', runOutfitId: 'default' })
    render()
    expect(container.querySelector('[data-testid="pause-outfit-line"]').textContent).toBe('입은 옷: 학교 교복 (능력 없음)')
  })
})

describe('HP number', () => {
  it('rounds fractional HP up so a living player never reads 0', () => {
    const player = useGameStore.getState().player
    useGameStore.setState({ player: { ...player, hp: 0.36, maxHp: 100 } })
    render()
    expect(container.textContent).toContain('1/100')
    act(() => useGameStore.setState({ player: { ...player, hp: 92.64, maxHp: 100 } }))
    expect(container.textContent).toContain('93/100')
    expect(container.textContent).not.toContain('92.64')
  })
})
