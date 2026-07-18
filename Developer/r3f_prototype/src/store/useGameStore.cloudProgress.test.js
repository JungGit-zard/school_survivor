// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockProgress = createMockProgress()

function createMockProgress() {
  return {
    goldTotal: 0,
    records: {},
    weaponUnlocks: {},
    weaponPermanentUpgrades: {},
    passiveUpgrades: {},
    titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false },
  }
}

vi.mock('../lib/firebaseProgress.js', () => ({
  readFirebasePlayerProgress: vi.fn(() => mockProgress),
  updateFirebasePlayerProgress: vi.fn((mutator) => {
    const next = structuredClone(mockProgress)
    const result = mutator(next)
    mockProgress = result && typeof result === 'object' ? result : next
    return mockProgress
  }),
  recordPlayActivity: vi.fn(),
  requestCloudProgressSave: vi.fn(),
}))

const { useGameStore } = await import('./useGameStore.js')
const { recordPlayActivity, requestCloudProgressSave } = await import('../lib/firebaseProgress.js')

describe('useGameStore cloud progress integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockProgress = createMockProgress()
    useGameStore.setState({
      elapsedMs: 0,
      goldSession: 0,
      goldTotal: 0,
      runKills: 0,
      runLevelUps: 0,
      currentStageId: 'stage1',
      newlyUnlockedWeaponIds: [],
    })
  })

  it('requests a cloud save after total gold changes', () => {
    useGameStore.getState().gainGold(3)

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })

  it('requests a cloud save after milestone gold changes', () => {
    useGameStore.setState({ elapsedMs: 48_000 })

    useGameStore.getState().checkSurvivalMilestone()

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })

  it('requests a cloud save after spending gold', () => {
    useGameStore.setState({ goldTotal: 30 })

    expect(useGameStore.getState().spendGold(5)).toBe(true)

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })

  it('requests a cloud save after buying a passive upgrade', () => {
    useGameStore.setState({ goldTotal: 30 })

    expect(useGameStore.getState().purchasePassive('magnet').ok).toBe(true)

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })

  it('requests a cloud save after resetting passive upgrades', () => {
    useGameStore.getState().resetPassiveUpgrades()

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })

  it('requests a cloud save after a run result is written to Firebase runtime records', () => {
    useGameStore.setState({ elapsedMs: 10_000, runKills: 4, goldSession: 2 })
    useGameStore.getState()._onRunEnd('gameover')

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })

  it('records and saves a minimal activity record when a stage starts', () => {
    useGameStore.getState().resetGame('stage2')

    expect(recordPlayActivity).toHaveBeenCalledWith('stage2')
    expect(requestCloudProgressSave).toHaveBeenCalled()
  })
})
