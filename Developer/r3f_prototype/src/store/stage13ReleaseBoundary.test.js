import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Deliberately permit every unlock prerequisite: release visibility must remain
// a separate boundary even for an account that legitimately unlocked all stages.
// No historical Lobby/stage4 fixtures or boss-ledger writers are used or changed.
vi.mock('../lib/stageConfig.js', async (original) => ({ ...(await original()), isStageUnlocked: () => true }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: vi.fn(async () => ({})) }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: vi.fn(async () => ({ uid: 'test-only' })) }))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { playerPos } from '../lib/refs.js'
import { buildCloudProgressSnapshot, _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { STAGE_CONFIGS, getNextStageId } from '../lib/stageConfig.js'

const initial = useGameStore.getState()
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T00:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  useAuthStore.setState({ user: null })
  useGameStore.setState(initial, true)
  _resetFirebaseProgressForTests()
})

describe('Stage1–3 release entry boundary', () => {
  it.each(['stage4','stage5','stage6','stage7','stage8','stage9','stage10'])('rejects unlocked %s before any runtime/progress mutation', async (stageId) => {
    useAuthStore.setState({ user: null })
    useGameStore.setState({ phase: 'title', progressRunId: null })
    const before = useGameStore.getState()
    const position = { ...playerPos }
    const progress = buildCloudProgressSnapshot()
    expect(before.resetGame(stageId)).toBe(false)
    await Promise.resolve()
    expect(useGameStore.getState()).toBe(before)
    expect(playerPos).toEqual(position)
    expect(buildCloudProgressSnapshot()).toEqual(progress)
  })

  it('retains all ten config definitions and ends the normal next path at Stage3', () => {
    expect(Object.keys(STAGE_CONFIGS)).toEqual(Array.from({ length: 10 }, (_, i) => `stage${i + 1}`))
    expect(getNextStageId('stage1')).toBe('stage2')
    expect(getNextStageId('stage2')).toBe('stage3')
    for (let i = 3; i <= 10; i++) expect(getNextStageId(`stage${i}`)).toBeNull()
  })

  it('Stage3 terminal next does not flush, reset, submit, or change the completed run', async () => {
    useAuthStore.setState({ user: null })
    const flush = vi.fn(async () => true)
    const reset = vi.fn()
    useGameStore.setState({ currentStageId: 'stage3', phase: 'cleared', progressRunId: null,
      escapeResult: { stageId: 'stage3', totalScore: 123 }, flushProgressBeforeTransition: flush, resetGame: reset })
    const before = useGameStore.getState()
    const progress = buildCloudProgressSnapshot()
    expect(await before.continueToNextStage()).toBe(false)
    expect(flush).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    expect(useGameStore.getState()).toBe(before)
    expect(buildCloudProgressSnapshot()).toEqual(progress)
  })
})
