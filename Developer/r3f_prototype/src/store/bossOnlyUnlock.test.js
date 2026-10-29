// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('../lib/firebaseRanking.js', () => ({ prepareRankingSubmission: r => r, submitRun: async () => ({status:'skipped'}), describeSubmission: () => ({}), retryPendingRankings: async () => ({written:[], skipped:[], failed:[]}) }))
import { _setFirebaseProgressClientForTests, buildCloudProgressSnapshot, _resetFirebaseProgressForTests, applyCloudProgressSnapshot, readFirebasePlayerProgress, updateFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { useAuthStore } from './useAuthStore.js'
import { useGameStore } from './useGameStore.js'
import { getNextStageId, isStageUnlocked, isStageVisible, VISIBLE_STAGE_IDS } from '../lib/stageConfig.js'
// Release entry boundary (a8ddfe0c, 1fcfc848): only VISIBLE_STAGE_IDS can be entered through the store.
// Boss evidence for the next stage (incl. hidden ones) is still recorded, so iterate the enterable stages.
const ENTERABLE = [1,2,3,4,5,6,7,8,9].filter(n => isStageVisible(`stage${n}`))
const FINAL = Number(VISIBLE_STAGE_IDS.at(-1).slice(5))
let user
let sequence = 0
const records = () => readFirebasePlayerProgress().records
function enter(n) {
  if(n>1) updateFirebasePlayerProgress(p => {p.records[`stage${n-1}BossDefeats`]=1})
  useGameStore.getState().resetGame(`stage${n}`)
}
beforeEach(() => {
  user = {uid:`boss-only-synthetic-${++sequence}`}
  _resetFirebaseProgressForTests()
  applyCloudProgressSnapshot({progress:{records:{}}},user)
  let remote = buildCloudProgressSnapshot()
  _setFirebaseProgressClientForTests({
    load: async () => structuredClone(remote),
    transaction: async (_path, mutate) => {
      const next = mutate(structuredClone(remote))
      if (next === undefined) return {committed:false}
      remote = structuredClone(next)
      return {committed:true,snapshot:{val:() => structuredClone(remote)}}
    },
  })
  useAuthStore.setState({user,status:'signedIn'})
  useGameStore.getState().resetGame('stage1')
})
it.each(ENTERABLE)('stage %i last boss immediately unlocks next without clearing and survives death', n => {
  enter(n)
  const next=`stage${n+1}`
  expect(isStageUnlocked(next,records())).toBe(false)
  useGameStore.getState().spawnBoss()
  useGameStore.getState().spawnBoss()
  expect(useGameStore.getState().recordBossDefeat()).toBe(true)
  expect(isStageUnlocked(next,records())).toBe(false)
  expect(useGameStore.getState().recordBossDefeat()).toBe(true)
  expect(isStageUnlocked(next,records())).toBe(true)
  expect(records()[`stage${n}Clears`]).toBe(0)
  expect(useGameStore.getState().phase).toBe('playing')
  expect(useGameStore.getState().recordBossDefeat()).toBe(false)
  useGameStore.getState().killPlayer('test')
  expect(isStageUnlocked(next,records())).toBe(true)
  expect(records()[`stage${n}BossDefeats`]).toBe(1)
})
it.each(ENTERABLE)('stage %i no-boss escape/time does not unlock', n => {
  enter(n)
  useGameStore.setState({elapsedMs:240000})
  useGameStore.getState().damagePlayer(99999)
  expect(isStageUnlocked(`stage${n+1}`,records())).toBe(false)
  useGameStore.getState().resetGame(`stage${n}`)
  useGameStore.setState({elapsedMs:240000})
  useGameStore.getState().clearStage()
  expect(records()[`stage${n}Clears`]).toBe(1)
  expect(isStageUnlocked(`stage${n+1}`,records())).toBe(false)
})
it('historical escape clears never substitute for missing or zero boss evidence in all nine gates', () => {
  for(let n=1;n<10;n++) {
    expect(isStageUnlocked(`stage${n+1}`,{[`stage${n}Clears`]:999})).toBe(false)
    expect(isStageUnlocked(`stage${n+1}`,{[`stage${n}Clears`]:999,[`stage${n}BossDefeats`]:0})).toBe(false)
  }
  expect(isStageUnlocked('stage2',{bossKills:999,totalRuns:999})).toBe(false)
  expect(isStageUnlocked('stage1',{})).toBe(true)
  expect(isStageUnlocked('stage11',{stage10BossDefeats:1})).toBe(false)
})
it('enforces entry and next-stage gates at the store boundary', async () => {
  const key=useGameStore.getState().gameKey
  expect(useGameStore.getState().resetGame('stage10')).toBe(false)
  expect(useGameStore.getState().gameKey).toBe(key)
  useGameStore.getState().clearStage()
  expect(await useGameStore.getState().continueToNextStage()).toBe(false)
})
it('the final released stage is terminal and duplicate defeat cannot add evidence', () => {
  enter(FINAL)
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  expect(records()[`stage${FINAL}BossDefeats`]).toBe(1)
  expect(useGameStore.getState().recordBossDefeat()).toBe(false)
  expect(getNextStageId(`stage${FINAL}`)).toBe(null)
  expect(getNextStageId('stage10')).toBe(null)
})


it('rejects non-stage bosses and the actual Matilda death path excludes boss evidence', async () => {
  useGameStore.getState().spawnBoss()
  expect(useGameStore.getState().recordBossDefeat('B09')).toBe(false)
  expect(isStageUnlocked('stage2',records())).toBe(false)
  const {readFileSync}=await import('node:fs')
  const source=readFileSync('src/components/Enemy.jsx','utf8')
  expect(source).toMatch(/if \(isBossType\(type\) && !isMatilda\) \{\s*store.recordBossKill\(type\)\s*store.recordBossDefeat\(type\)/)
})
it('multiple no-boss clears and preserved historical clears never manufacture boss rights', () => {
  for(let i=0;i<3;i++) {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().clearStage()
    expect(isStageUnlocked('stage2',records())).toBe(false)
  }
  expect(records().stage1Clears).toBe(3)
  updateFirebasePlayerProgress(p => {p.records.stage1Clears++})
  expect(records().stage1Clears).toBe(4)
  expect(isStageUnlocked('stage2',records())).toBe(false)
})
it('actual Enemy call order records first bossKills but explicit flag0 blocks until the last living boss', async () => {
  useGameStore.getState().spawnBoss()
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossKill('B01')
  useGameStore.getState().recordBossDefeat('B01')
  expect(records().bossKills).toBe(1)
  expect(records().stage1BossDefeats).toBe(0)
  expect(isStageUnlocked('stage2',records())).toBe(false)
  useGameStore.getState().recordBossKill('B01')
  useGameStore.getState().recordBossDefeat('B01')
  expect(records().bossKills).toBe(2)
  expect(records().stage1BossDefeats).toBe(1)
  expect(isStageUnlocked('stage2',records())).toBe(true)
})
