// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/firebaseProgress.js', () => ({
  requestCloudProgressSave: vi.fn(),
}))

const { useGameStore } = await import('./useGameStore.js')
const { requestCloudProgressSave } = await import('../lib/firebaseProgress.js')

describe('useGameStore cloud progress integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
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

  it('requests a cloud save after a run result is written to local records', () => {
    useGameStore.setState({ elapsedMs: 10_000, runKills: 4, goldSession: 2 })
    useGameStore.getState()._onRunEnd('gameover')

    expect(requestCloudProgressSave).toHaveBeenCalled()
  })
})
