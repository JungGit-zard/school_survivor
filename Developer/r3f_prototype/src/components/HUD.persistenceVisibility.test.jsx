// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory stores only: never import the real progress/auth stores or SDK clients.
vi.mock('../store/useGameStore.js', async () => {
  const { create } = await import('zustand')
  return { useGameStore: create(() => ({})), STAGE1_INTRO_IDS: [] }
})
vi.mock('../store/useAuthStore.js', async () => {
  const { create } = await import('zustand')
  return { useAuthStore: create(() => ({ user: { uid: 'offline-hud-user' } })) }
})
vi.mock('./Enemy.jsx', () => ({ ENEMY_SIZE_MULTIPLIER: 1, ENEMY_STATS: {} }))
vi.mock('./Weapons/Starlink.jsx', () => ({ dispatchStarlinkCheatCrash: vi.fn() }))
vi.mock('./MissionTracker.jsx', () => ({ default: () => null }))
vi.mock('../lib/weaponUnlocks.js', () => ({ isUnlocked: () => false }))
vi.mock('../lib/adminConfig.js', () => ({
  getAdminOperationsConfig: () => ({ cheatMenuButtonVisible: false }),
  getAdminRankingSeasonConfig: () => ({}),
  getAdminBalanceConfig: () => ({}),
}))
vi.mock('../lib/graphicsStudioConfig.js', () => ({
  DEFAULT_STUDIO_TUNING: {}, GRAPHICS_STUDIO_TUNING_EVENT: 'offline-studio-tuning',
  loadStudioTunings: () => ({}),
}))
vi.mock('../lib/dialogueVoice.js', () => ({ playDialogueVoice: vi.fn(), stopDialogueVoice: vi.fn() }))
vi.mock('../lib/playtestLogger.js', () => ({ buildPlaytestSummary: vi.fn(), sendPlaytestSummaryToAssistant: vi.fn() }))
// Fail closed if a future dependency introduces a Firebase SDK import.
vi.mock('firebase/app', () => { throw new Error('Firebase SDK forbidden in offline HUD regression') })
vi.mock('firebase/auth', () => { throw new Error('Firebase Auth forbidden in offline HUD regression') })
vi.mock('firebase/database', () => { throw new Error('Firebase database forbidden in offline HUD regression') })

import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { setLocale, t } from '../lib/i18n.js'

let root, container, previousLocale
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden in offline HUD regression') }))
  previousLocale = document.documentElement.lang
  setLocale('ko')
  useGameStore.setState({
    phase: 'playing', currentStageId: 'stage1', elapsedMs: 12000,
    player: { hp: 80, maxHp: 100, level: 3, xp: 1, xpToNext: 4 },
    weapons: { pencilThrow: { active: true, level: 1 } },
    goldSession: 2, goldTotal: 7, continuousScoreBase: 0,
    questProgress: {}, newQuestItemIds: [], bossPassiveUnlocks: {}, missionProgress: {},
    newlyUnlockedWeaponIds: [], pendingGuaranteedUpgradeChoiceKeys: [],
    levelUpAcquireExposureKeys: [], levelUpWeaponCycleIds: [], levelUpOwnedWeaponCycleIds: [],
    togglePause: vi.fn(), closeQuestInventory: vi.fn(), reconcileCloudProgress: vi.fn(),
  }, true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  setLocale(previousLocale || 'ko')
  vi.unstubAllGlobals()
})

describe('gameplay persistence messages stay hidden', () => {
  it.each([
    ['pending', null],
    ['error', 'offline-save-failure'],
    ['saved', null],
  ])('keeps normal HUD without save messages for %s', (progressSaveState, progressSaveWarning) => {
    useGameStore.setState({ progressSaveState, progressSaveWarning })
    act(() => root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />))

    // Positive controls prevent a blank HUD from satisfying the negative assertions.
    expect(container.querySelector('[data-testid="hud-hp-row"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="weapon-icon-bar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="live-score"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="bottom-right-pause"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="player-level-label"]')?.textContent).toBe('Lv.3')
    for (const key of ['persistence.saving', 'persistence.saveFailed', 'persistence.retry', 'persistence.saved']) {
      expect(container.textContent).not.toContain(t(key))
    }
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(useGameStore.getState().progressSaveState).toBe(progressSaveState)
    expect(useGameStore.getState().progressSaveWarning).toBe(progressSaveWarning)
    expect(useGameStore.getState().reconcileCloudProgress).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
