// @vitest-environment jsdom
// 2026-11-21 Terry 승인: Stage 5·6 클리어 미션(stage5_escape 50골드, stage6_escape 60골드).
// 실제 런 클리어 → 스테이지 종료 저장 → 규칙 충실 가짜 DB(database.rules.json 검증)에서 claim까지 한 번에 확인한다.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../lib/firebaseRanking.js',()=>({prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun:async()=>({status:'skipped'}),describeSubmission:()=>({status:'skipped'})}))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests, applyCloudProgressSnapshot, buildCloudProgressSnapshot, _setFirebaseProgressClientForTests, requestCloudProgressSave, claimFirebaseMissionReward, hydrateCloudProgress } from '../lib/firebaseProgress.js'
import { MISSION_BY_ID, MISSION_CATALOG_VERSION, getApprovedMissionRewardAllowlist } from '../lib/missionCatalog.js'
import { getCounterChanges } from '../lib/missionProgress.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'

let db, user
const remote = () => db.get(`users/${user.uid}`)

beforeEach(async()=>{
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  _resetFirebaseProgressForTests()
  user={uid:crypto.randomUUID()}
  db=createControllableProgressDatabase({})
  _setFirebaseProgressClientForTests(db)
  // Stage 5·6은 이전 스테이지 보스 처치로 열린다(ledgerSummary.bossDefeats의 stage4/5BossDefeats).
  applyCloudProgressSnapshot({progress:{goldTotal:10,weaponUnlockSchemaVersion:2,records:{}}}, user)
  db.root.users = { [user.uid]: { ...buildCloudProgressSnapshot(), ledgerSummary: { compactedBefore: 1, runs: 2, bossDefeats: { stage4BossDefeats: 1, stage5BossDefeats: 1 } } } }
  useAuthStore.setState({ user, status: 'signedIn' })
  _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
  await hydrateCloudProgress(user)
  useGameStore.getState().reloadPersistentProgress()
})
afterEach(()=>vi.unstubAllEnvs())

it('defines stage5_escape / stage6_escape like stage4_escape with 50 / 60 gold', () => {
  expect(MISSION_BY_ID.stage5_escape.completion).toEqual({ type: 'counter', counterKey: 'stage.stage5.clearCount', target: 1 })
  expect(MISSION_BY_ID.stage6_escape.completion).toEqual({ type: 'counter', counterKey: 'stage.stage6.clearCount', target: 1 })
  expect(getApprovedMissionRewardAllowlist().stage5_escape).toEqual({ type: 'gold', amount: 50 })
  expect(getApprovedMissionRewardAllowlist().stage6_escape).toEqual({ type: 'gold', amount: 60 })
  expect(getCounterChanges({ type: 'stage_cleared', stageId: 'stage5' })).toEqual([{ key: 'stage.stage5.clearCount', value: 1 }])
  expect(getCounterChanges({ type: 'stage_cleared', stageId: 'stage6' })).toEqual([{ key: 'stage.stage6.clearCount', value: 1 }])
})

it.each([
  ['stage5', 'stage5_escape', 50],
  ['stage6', 'stage6_escape', 60],
])('a %s clear counts and the %s claim is accepted by the rules (+%i gold)', async (stageId, missionId, amount) => {
  const mission = MISSION_BY_ID[missionId]
  const allowlist = getApprovedMissionRewardAllowlist()
  // 클리어 전에는 서버가 not-completed로 막는다.
  const early = await claimFirebaseMissionReward({ user, missionId, catalogVersion: MISSION_CATALOG_VERSION, rewardAllowlist: allowlist, completion: mission.completion })
  expect(early.ok).toBe(false)

  expect(useGameStore.getState().resetGame(stageId)).not.toBe(false)
  expect(useGameStore.getState().currentStageId).toBe(stageId)
  useGameStore.getState().clearStage()
  expect(await requestCloudProgressSave()).toBe(true)
  expect(remote().progress.missions.counters[`stage%2E${stageId}%2EclearCount`]).toBe(1)
  const goldBefore = remote().progress.goldTotal

  const claim = await claimFirebaseMissionReward({ user, missionId, catalogVersion: MISSION_CATALOG_VERSION, rewardAllowlist: allowlist, completion: mission.completion })
  expect(claim.ok).toBe(true)
  expect(remote().progress.goldTotal).toBe(goldBefore + amount)
  expect(remote().progress.missions.claimed[missionId]).toMatchObject({ reward: { type: 'gold', amount } })
  expect(remote().progress.missions.claimLedger[`${missionId}:${MISSION_CATALOG_VERSION}`]).toBeTruthy()

  // 두 번째 claim은 막힌다(중복 지급 없음).
  const again = await claimFirebaseMissionReward({ user, missionId, catalogVersion: MISSION_CATALOG_VERSION, rewardAllowlist: allowlist, completion: mission.completion })
  expect(again.ok).toBe(false)
  expect(remote().progress.goldTotal).toBe(goldBefore + amount)
})
