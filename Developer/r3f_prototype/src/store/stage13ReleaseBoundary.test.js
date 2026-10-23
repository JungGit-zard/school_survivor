import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// In-memory record inputs only; use the real natural unlock rules, with no remote writes.
const account = vi.hoisted(() => ({ records: {} }))
vi.mock('../lib/playerRecords.js', async (original) => ({ ...(await original()), load: () => account.records }))
vi.mock('../lib/firebaseProgress.js', async (original) => ({ ...(await original()), isFirebaseProgressHydrated: () => true }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: vi.fn(async () => ({})) }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: vi.fn(async () => ({ uid: 'test-only' })) }))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { playerPos } from '../lib/refs.js'
import { buildCloudProgressSnapshot, _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { STAGE_CONFIGS, getNextStageId } from '../lib/stageConfig.js'

const initial = useGameStore.getState()
beforeEach(() => {
  account.records = {}
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T00:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  useAuthStore.setState({ user: null })
  useGameStore.setState(initial, true)
  _resetFirebaseProgressForTests()
})

describe('Stage1–4 release entry boundary', () => {
  it.each(['stage5','stage6','stage7','stage8','stage9','stage10'])('rejects unlocked %s before any runtime/progress mutation', async (stageId) => {
    account.records = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`stage${i + 1}BossDefeats`, 1]))
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

  it('retains all ten config definitions and ends the normal next path at Stage4', () => {
    expect(Object.keys(STAGE_CONFIGS)).toEqual(Array.from({ length: 10 }, (_, i) => `stage${i + 1}`))
    expect(getNextStageId('stage1')).toBe('stage2')
    expect(getNextStageId('stage2')).toBe('stage3')
    expect(getNextStageId('stage3')).toBe('stage4')
    for (let i = 4; i <= 10; i++) expect(getNextStageId(`stage${i}`)).toBeNull()
  })

  it.each(['stage4','stage5','stage6','stage7','stage8','stage9','stage10'])('%s terminal next does not flush, reset, submit, or change the completed run', async (stageId) => {
    useAuthStore.setState({ user: null })
    const flush = vi.fn(async () => true)
    const reset = vi.fn()
    useGameStore.setState({ currentStageId: stageId, phase: 'cleared', progressRunId: null,
      escapeResult: { stageId, totalScore: 123 }, flushProgressBeforeTransition: flush, resetGame: reset })
    const before = useGameStore.getState()
    const progress = buildCloudProgressSnapshot()
    expect(await before.continueToNextStage()).toBe(false)
    expect(flush).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    expect(useGameStore.getState()).toBe(before)
    expect(buildCloudProgressSnapshot()).toEqual(progress)
  })

  it.each(['stage2', 'stage3', 'stage4'])('keeps naturally locked %s start mutation-free', (stageId) => {
    const before = useGameStore.getState()
    const position = { ...playerPos }
    const progress = buildCloudProgressSnapshot()
    expect(before.resetGame(stageId)).toBe(false)
    expect(useGameStore.getState()).toBe(before)
    expect(playerPos).toEqual(position)
    expect(buildCloudProgressSnapshot()).toEqual(progress)
  })

  it.each([false, true])('Stage3 next reaches Stage4 only with natural boss evidence=%s', async (eligible) => {
    account.records = { stage3BossDefeats: eligible ? 1 : 0, stage3Clears: 7 }
    const flush = vi.fn(async () => true)
    const reset = vi.fn(() => true)
    useGameStore.setState({ currentStageId: 'stage3', phase: 'cleared', progressRunId: null,
      escapeResult: { stageId: 'stage3', totalScore: 123 }, flushProgressBeforeTransition: flush, resetGame: reset })
    const before = useGameStore.getState()
    expect(await before.continueToNextStage()).toBe(eligible)
    expect(flush).toHaveBeenCalledTimes(eligible ? 1 : 0)
    if (eligible) expect(reset).toHaveBeenCalledWith('stage4', { preserveQuestJourney: true, preserveContinuousScore: true })
    else expect(reset).not.toHaveBeenCalled()
    expect(useGameStore.getState()).toBe(before)
  })
})
