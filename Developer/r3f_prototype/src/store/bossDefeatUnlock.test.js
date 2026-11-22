// @vitest-environment jsdom
// 계약 2026-10-24 §3 — 보스 사망만이 다음 스테이지 해금 증거다(Stage4 ← B03, Stage5 ← B04).
// 25066a57에서 들어온 테스트를 origin 정본 키 stage{N}BossDefeats(런 ledger 투영, f8a0ee89)로 옮겼다.
// 별도 bossB0xDefeats 키와 clear 기반 1회성 승계는 origin 정책("never fabricate or backfill boss
// history")과 충돌해 채택하지 않았다 — 아래 마지막 두 테스트가 그 결정을 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/firebaseRanking.js', () => ({
  prepareRankingSubmission: (run) => run,
  submitRun: async () => ({ status: 'skipped' }),
  describeSubmission: () => ({}),
  retryPendingRankings: async () => ({ written: [], skipped: [], failed: [] }),
}))

import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  applyCloudProgressSnapshot,
  buildCloudProgressSnapshot,
  hydrateCloudProgress,
  readFirebasePlayerProgress,
  updateFirebasePlayerProgress,
} from '../lib/firebaseProgress.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { isStageUnlocked } from '../lib/stageConfig.js'
import { useAuthStore } from './useAuthStore.js'
import { createFakeProgressDatabase } from '../../test/fakeProgressDatabase.js'
import { TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'
import { useGameStore } from './useGameStore.js'

let user
let db
let sequence = 0

beforeEach(() => {
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  user = { uid: `boss-defeat-record-${++sequence}` }
  _resetFirebaseProgressForTests()
  applyCloudProgressSnapshot({ progress: { records: {} } }, user)
  // 2026-11-19: rules-faithful path-aware fake. The stage result lands as one runLedger row + increments.
  db = createFakeProgressDatabase({ users: { [user.uid]: buildCloudProgressSnapshot() } })
  _setFirebaseProgressClientForTests(db)
  useAuthStore.setState({ user, status: 'signedIn' })
  useGameStore.getState().resetGame('stage1')
})

afterEach(() => vi.unstubAllEnvs())

// 잠긴 스테이지는 resetGame이 거부하므로, 진입 전 이전 스테이지들의 보스 증거만 심는다(bossOnlyUnlock.test.js와 같은 방식).
function enter(stageId) {
  const order = Number(stageId.replace('stage', ''))
  updateFirebasePlayerProgress((progress) => {
    for (let n = 1; n < order; n += 1) progress.records[`stage${n}BossDefeats`] = 1
  })
  useGameStore.getState().resetGame(stageId)
  expect(useGameStore.getState().currentStageId).toBe(stageId)
}

function killBoss(stageId, bossType) {
  enter(stageId)
  useGameStore.setState({ elapsedMs: 150_000 })
  useGameStore.getState().spawnBoss()
  return useGameStore.getState().recordBossDefeat(bossType)
}

describe('boss defeat unlock records (origin stage{N}BossDefeats)', () => {
  it('Stage3 보스 사망 즉시 Stage4 해금, 런은 계속 진행', () => {
    expect(isStageUnlocked('stage4', loadPlayerRecords())).toBe(false)

    expect(killBoss('stage3', 'B03')).toBe(true)

    // 런 종료를 기다리지 않는다 — 사망 시점에 이미 증거가 있다.
    expect(loadPlayerRecords().stage3BossDefeats).toBe(1)
    expect(isStageUnlocked('stage4', loadPlayerRecords())).toBe(true)
    expect(useGameStore.getState()).toMatchObject({ phase: 'playing', currentStageId: 'stage3', bossDefeated: true })
  })

  it('보스 사망 증거는 재로그인(원격 재하이드레이트) 뒤에도 살아남는다', async () => {
    killBoss('stage3', 'B03')
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    killBoss('stage4', 'B04')
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    // 증거는 progress.records가 아니라 런 ledger에만 저장된다(origin 와이어 계약).
    expect(db.get(`users/${user.uid}/progress/records`)).not.toHaveProperty('stage3BossDefeats')
    const rows = Object.values(db.get(`users/${user.uid}/runLedger`))
    expect(rows.filter(row => row.records.stage3BossDefeats === 1)).toHaveLength(1)
    expect(rows.filter(row => row.records.stage4BossDefeats === 1)).toHaveLength(1)

    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)

    const records = loadPlayerRecords()
    expect(records.stage3BossDefeats).toBe(1)
    expect(records.stage4BossDefeats).toBe(1)
    expect(isStageUnlocked('stage4', records)).toBe(true)
    expect(isStageUnlocked('stage5', records)).toBe(true)
  })

  it('Stage4 clear·포탈·시간만으로는 Stage5가 열리지 않고, B04 사망으로만 열린다', () => {
    enter('stage4')
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().activateEscapePortal()
    useGameStore.getState().clearStage()

    expect(readFirebasePlayerProgress().records.stage4Clears).toBe(1)
    expect(isStageUnlocked('stage5', loadPlayerRecords())).toBe(false)

    expect(killBoss('stage4', 'B04')).toBe(true)
    expect(loadPlayerRecords().stage4BossDefeats).toBe(1)
    expect(isStageUnlocked('stage5', loadPlayerRecords())).toBe(true)
  })

  it('기록 이전의 clear 이력은 보스 증거로 승계되지 않는다(origin: never backfill)', () => {
    _resetFirebaseProgressForTests()
    applyCloudProgressSnapshot({ progress: { records: { stage3Clears: 9, stage4Clears: 9, bossKills: 9 } } }, user)

    const records = loadPlayerRecords()
    expect(records.stage3BossDefeats).toBe(0)
    // Terry 2026-11-22: a Stage 3 escape opens Stage 4 (clear evidence, not boss evidence). Others stay boss-only.
    expect(isStageUnlocked('stage4', records)).toBe(true)
    expect(isStageUnlocked('stage5', records)).toBe(false)
    expect(buildCloudProgressSnapshot().progress.records).not.toHaveProperty('bossB03Defeats')
  })

  it('보스 패시브 해금도 stage{N}BossDefeats 증거를 대신하지 않는다', () => {
    _resetFirebaseProgressForTests()
    applyCloudProgressSnapshot({ progress: {
      records: { stage3Clears: 2, stage4Clears: 1 },
      bossPassiveUnlocks: { b03GymWhistle: true, b04ServingLadle: true },
    } }, user)

    const records = loadPlayerRecords()
    // stage4 opens from stage3Clears (Terry 2026-11-22), not from the passive; stage5 stays boss-only.
    expect(isStageUnlocked('stage4', records)).toBe(true)
    expect(isStageUnlocked('stage4', { ...records, stage3Clears: 0 })).toBe(false)
    expect(isStageUnlocked('stage5', records)).toBe(false)
  })
})
