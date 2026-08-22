// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockProgress = createMockProgress()
let mockProgressUid = 'uid-a'

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

// 스토어의 모든 클라우드 저장 호출은 isFirebaseProgressHydrated() 게이트 뒤에 있다
// (useGameStore.js saveRuntimeProgress / recordRuntimePlayActivity). 하이드레이트된
// 실계정 상태를 흉내내야 저장 배선이 실제로 도는지 검증할 수 있으므로 true로 고정한다.
vi.mock('../lib/firebaseProgress.js', () => ({
  getFirebaseProgressRuntimeSnapshot: vi.fn(() => ({ uid: mockProgressUid })),
  isFirebaseProgressConfigured: vi.fn(() => true),
  isFirebaseProgressHydrated: vi.fn((user) => !user || user.uid === mockProgressUid),
  readFirebaseMissionProgress: vi.fn(() => ({ ok: false, reason: 'progress-not-hydrated' })),
  updateFirebaseMissionProgress: vi.fn(() => ({ ok: false, reason: 'progress-not-hydrated' })),
  saveFirebaseMissionProgress: vi.fn(async () => ({ ok: false, saved: false, reason: 'progress-not-hydrated' })),
  claimFirebaseMissionReward: vi.fn(async () => ({ ok: false, committed: false, reason: 'transaction-unavailable' })),
  consumeFirebaseProgressSaveWarning: vi.fn(() => null),
  readFirebasePlayerProgress: vi.fn(() => mockProgress),
  updateFirebasePlayerProgress: vi.fn((mutator) => {
    const next = structuredClone(mockProgress)
    const result = mutator(next)
    mockProgress = result && typeof result === 'object' ? result : next
    return mockProgress
  }),
  recordPlayActivity: vi.fn(),
  requestCloudProgressSave: vi.fn(async () => true),
}))

const { useGameStore } = await import('./useGameStore.js')
const { consumeFirebaseProgressSaveWarning, getFirebaseProgressRuntimeSnapshot, isFirebaseProgressConfigured, isFirebaseProgressHydrated, recordPlayActivity, requestCloudProgressSave } = await import('../lib/firebaseProgress.js')

describe('useGameStore cloud progress integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProgress = createMockProgress()
    mockProgressUid = 'uid-a'
    useGameStore.setState({
      elapsedMs: 0,
      goldSession: 0,
      goldTotal: 0,
      runKills: 0,
      runLevelUps: 0,
      currentStageId: 'stage1',
      newlyUnlockedWeaponIds: [],
      progressSaveWarning: null,
    })
    requestCloudProgressSave.mockReset()
    requestCloudProgressSave.mockResolvedValue(true)
    consumeFirebaseProgressSaveWarning.mockReturnValue(null)
    getFirebaseProgressRuntimeSnapshot.mockReturnValue({ uid: mockProgressUid })
    isFirebaseProgressConfigured.mockReturnValue(true)
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

  it('keeps play state quiet when a save request resolves as a no-op without a Firebase warning', async () => {
    requestCloudProgressSave.mockResolvedValueOnce(false)
    consumeFirebaseProgressSaveWarning.mockReturnValueOnce(null)

    useGameStore.getState().gainGold(3)
    await Promise.resolve()

    expect(useGameStore.getState().goldTotal).toBe(3)
    expect(useGameStore.getState().progressSaveWarning).toBeNull()
  })

  it('shows a dismissible warning only when Firebase reports a same-account transport failure', async () => {
    requestCloudProgressSave.mockResolvedValueOnce(false)
    consumeFirebaseProgressSaveWarning.mockReturnValueOnce('save-failed')

    useGameStore.getState().gainGold(3)
    await Promise.resolve()

    expect(useGameStore.getState().goldTotal).toBe(3)
    expect(useGameStore.getState().progressSaveWarning).toBe('save-failed')
    useGameStore.getState().dismissProgressSaveWarning()
    expect(useGameStore.getState().progressSaveWarning).toBeNull()
  })

  it('does not request or show a warning when Firebase is not configured', async () => {
    isFirebaseProgressConfigured.mockReturnValue(false)
    requestCloudProgressSave.mockResolvedValueOnce(false)

    useGameStore.getState().gainGold(3)
    await Promise.resolve()

    expect(requestCloudProgressSave).not.toHaveBeenCalled()
    expect(useGameStore.getState().progressSaveWarning).toBeNull()
  })

  it('shows the same warning when the save promise rejects', async () => {
    requestCloudProgressSave.mockRejectedValueOnce(new Error('offline'))

    useGameStore.getState().gainGold(3)
    await Promise.resolve()
    await Promise.resolve()

    expect(useGameStore.getState().goldTotal).toBe(3)
    expect(useGameStore.getState().progressSaveWarning).toBe('save-failed')
  })

  it('does not show account A save failure after the runtime switches to account B', async () => {
    let rejectSave
    isFirebaseProgressConfigured.mockReturnValue(true)
    getFirebaseProgressRuntimeSnapshot.mockReturnValue({ uid: 'uid-a' })
    requestCloudProgressSave.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))

    useGameStore.getState().gainGold(3)
    await vi.waitFor(() => expect(rejectSave).toBeTypeOf('function'))
    mockProgressUid = 'uid-b'
    getFirebaseProgressRuntimeSnapshot.mockReturnValue({ uid: mockProgressUid })
    rejectSave(new Error('offline'))
    await Promise.resolve()
    await Promise.resolve()

    expect(useGameStore.getState().progressSaveWarning).toBeNull()
  })

  it('consumes a pending Firebase warning when persistent progress reloads after login', () => {
    consumeFirebaseProgressSaveWarning.mockReturnValueOnce('save-failed')

    expect(useGameStore.getState().reloadPersistentProgress()).toBe(true)
    expect(useGameStore.getState().progressSaveWarning).toBe('save-failed')
  })

  it('records and saves a minimal activity record when a stage starts', () => {
    useGameStore.getState().resetGame('stage2')

    expect(recordPlayActivity).toHaveBeenCalledWith('stage2')
    expect(requestCloudProgressSave).toHaveBeenCalled()
  })
})
