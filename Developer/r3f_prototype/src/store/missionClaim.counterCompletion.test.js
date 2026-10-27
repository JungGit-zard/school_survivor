// @vitest-environment jsdom
// 회귀(2026-10-26 라이브 "미션보상 안받아짐"): 미션 완료는 카운터로 정의되고 UI도 카운터로 완료를
// 판정하지만, 런 체크포인트·저장 트랜잭션은 서버에 카운터만 올리고 active[id].completedAt은
// saveMissionProgress가 성공한 런 종료 때만 올린다. 일시정지-나가기·앱 종료로 끝난 런의 미션은
// 서버에 "카운터 충족 + completedAt 없음"으로 남고, claim 트랜잭션이 'not-completed'로 거절했다.
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('../lib/firebaseRanking.js',()=>({prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun:async()=>({status:'skipped'}),describeSubmission:()=>({status:'skipped'})}))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { applyCloudProgressSnapshot, buildCloudProgressSnapshot, _setFirebaseProgressClientForTests } from '../lib/firebaseProgress.js'

let remote, user
function seed(counters) {
  user = { uid: crypto.randomUUID() }
  applyCloudProgressSnapshot({ progress: { goldTotal: 10, weaponUnlockSchemaVersion: 2, records: {}, missions: { schemaVersion: 1, catalogVersion: 'missions_2026_08_15_v1', updatedAt: '', counters } } }, user)
  remote = buildCloudProgressSnapshot()
  // buildCloudProgressSnapshot은 메모리 형태(점 키)를 돌려준다. 서버에는 %2E 인코딩 키만 존재한다.
  remote.progress.missions.counters = { ...counters }
  useAuthStore.setState({ user, status: 'signedIn' })
  useGameStore.getState().hydrateMissionProgress()
}
beforeEach(() => {
  // isFirebaseProgressConfigured는 Auth 필수 키 4개 + DATABASE_URL을 모두 요구한다. 로컬 .env에
  // 기대면 .env가 없거나 키가 비어 있는 환경(CI·다른 작업 트리)에서 'unconfigured'로 깨진다.
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'qa-key')
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'qa.invalid')
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'qa-project')
  vi.stubEnv('VITE_FIREBASE_APP_ID', '1:0:web:qa')
  vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://qa.invalid')
  // RTDB처럼 첫 호출은 빈 로컬 캐시(null), 이후 서버 값으로 다시 돈다.
  _setFirebaseProgressClientForTests({ load: async () => structuredClone(remote), transaction: async (path, mutate) => {
    const sub = path.endsWith('/progress')
    mutate(null)
    const next = mutate(structuredClone(sub ? remote.progress : remote))
    if (next === undefined) return { committed: false, snapshot: { val: () => structuredClone(sub ? remote.progress : remote) } }
    if (sub) remote.progress = structuredClone(next); else remote = structuredClone(next)
    return { committed: true, snapshot: { val: () => structuredClone(sub ? remote.progress : remote) } }
  } })
})

it('claims a mission whose server counters meet the target even without a persisted completedAt', async () => {
  seed({ 'pickup%2EgoldCoin%2Ecount': 3 })
  expect(remote.progress.missions.active?.first_gold_coin).toBeUndefined()
  expect(useGameStore.getState().missionProgress.active.first_gold_coin.completedAt).toBeTruthy()

  const result = await useGameStore.getState().claimMissionReward('first_gold_coin')

  expect(result).toMatchObject({ ok: true, reason: 'claimed' })
  expect(remote.progress.goldTotal).toBe(15)
  expect(remote.progress.missions.claimLedger['first_gold_coin:missions_2026_08_15_v1'].reward).toEqual({ type: 'gold', amount: 5 })
  expect(remote.progress.missions.active.first_gold_coin).toMatchObject({ counter: 1, target: 1 })
  expect(remote.progress.missions.active.first_gold_coin.claimedAt).toBeTruthy()
  expect(useGameStore.getState().missionProgress.claimed.first_gold_coin).toBeTruthy()

  const again = await useGameStore.getState().claimMissionReward('first_gold_coin')
  expect(again).toMatchObject({ ok: false, reason: 'already-claimed' })
  expect(remote.progress.goldTotal).toBe(15)
})

it('still refuses a claim when the server counters are below the target', async () => {
  seed({ 'enemy%2EE01%2EkillCount': 9 })
  const result = await useGameStore.getState().claimMissionReward('first_e01_kills')
  expect(result).toMatchObject({ ok: false, reason: 'not-completed' })
  expect(remote.progress.goldTotal).toBe(10)
})

it('counts any-counter missions from whichever server counter meets the target', async () => {
  seed({ 'boss%2EB02%2EkillCount': 1 })
  const result = await useGameStore.getState().claimMissionReward('boss_hunter')
  expect(result).toMatchObject({ ok: true, reason: 'claimed' })
  expect(remote.progress.goldTotal).toBe(45)
})
