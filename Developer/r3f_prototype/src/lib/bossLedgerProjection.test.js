// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests, applyCloudProgressSnapshot,
  buildCloudProgressSnapshot, readFirebasePlayerProgress, commitFirebaseStageResult,
  requestCloudProgressSave, setCloudProgressUser, hydrateCloudProgress,
} from './firebaseProgress.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'
import { load as loadPlayerRecords } from './playerRecords.js'
import { isStageUnlocked } from './stageConfig.js'
const user = { uid: 'synthetic-ledger-owner' }
const row = (stageId='stage1', records={bossKills:1}) => ({stageId, records, gold:0, best:{}, missionCounters:{}})
const seed = (runLedger={}, records={}) => applyCloudProgressSnapshot({progress:{records},runLedger},user)
const proof = n => readFirebasePlayerProgress().records[`stage${n}BossDefeats`]
beforeEach(() => { _resetFirebaseProgressForTests(); for (const [k,v] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(k,v); localStorage.clear() })
afterEach(() => vi.unstubAllEnvs())
it.each([1,2,3,4,5,6,7,8,9,10])('projects exact legacy stage %i per-run proof without changing wire or original stats', n => {
  const ledger={oldRun:row(`stage${n}`,{bossKills:1,[`stage${n}Clears`]:0})}
  seed(ledger,{bossKills:7,totalKills:23,goldTotal:0})
  expect(proof(n)).toBe(1)
  expect(loadPlayerRecords()[`stage${n}BossDefeats`]).toBe(1)
  if(n<10) expect(isStageUnlocked(`stage${n+1}`,readFirebasePlayerProgress().records)).toBe(true)
  const wire=buildCloudProgressSnapshot()
  for(let i=1;i<=10;i++) expect(wire.progress.records).not.toHaveProperty(`stage${i}BossDefeats`)
  expect(wire.progress.records.bossKills).toBe(7)
  expect(wire.progress.records.totalKills).toBe(23)
  seed(ledger,{bossKills:7,totalKills:23})
  expect(proof(n)).toBe(1)
})
it('clear999 and global boss999 without per-run proof unlock nothing', () => {
  seed({},Object.fromEntries([['bossKills',999],...Array.from({length:10},(_,i)=>[`stage${i+1}Clears`,999])]))
  // Only exception (Terry 2026-11-22): stage3Clears opens stage4.
  for(let n=1;n<10;n++) expect(isStageUnlocked(`stage${n+1}`,readFirebasePlayerProgress().records)).toBe(n === 3)
})
it.each([0,-1,'1',0.5,null,undefined,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid legacy per-run boss count %s', bad => {
  seed({invalid:row('stage1',{bossKills:bad})}); expect(proof(1)).toBe(0)
})
it.each(['stage0','stage11','stage01','Stage1','stage1 ',1,null])('rejects non-exact stage ID %s', stage => {
  seed({invalid:row(stage)}); expect(proof(1)).toBe(0)
})
it.each([0,-1,'1',0.5,null,undefined,NaN,Infinity])('present new flag %s blocks legacy fallback', flag => {
  seed({current:row('stage1',{bossKills:9,stage1BossDefeats:flag})}); expect(proof(1)).toBe(0)
})
// 2026-11-19: the in-run checkpoint API (recordFirebaseRunCheckpoint) is gone. A stage's boss proof is
// written once, as its runLedger row, when the stage ends (commitFirebaseStageResult). Rows are never
// rewritten, so the old "a later checkpoint can lower a pending flag" case no longer exists.
const stage = (runKey, stageId='stage1', records={bossKills:1,stage1BossDefeats:1}) => ({runKey, stageId, records:{totalRuns:1,...records}, best:{}, gold:0, at:1000})
const seedNode = (runLedger={}) => {
  seed(runLedger)
  const db=createControllableProgressDatabase({users:{[user.uid]:{...buildCloudProgressSnapshot(), runLedger}}})
  _setFirebaseProgressClientForTests(db)
  return db
}
it('counts unique proven run IDs once, never double-counts a recorded run, and keeps read projections detached', async () => {
  seedNode({same:row(),other:row()})
  expect(proof(1)).toBe(2)
  // A run the server already holds is never recorded again.
  expect(await commitFirebaseStageResult(stage('same'),user)).toBe(false)
  expect(proof(1)).toBe(2)
  expect(await commitFirebaseStageResult(stage('third'),user)).toBe(true)
  expect(proof(1)).toBe(3)
  const view=readFirebasePlayerProgress(); view.records.stage1BossDefeats=999
  expect(proof(1)).toBe(3)
})
it('stage-end boss proof is one runLedger row (never a progress record) and survives reload', async () => {
  const db=seedNode()
  expect(await commitFirebaseStageResult(stage('current'),user)).toBe(true)
  expect(proof(1)).toBe(1)
  const node=db.get(`users/${user.uid}`)
  expect(node.runLedger.current.records.stage1BossDefeats).toBe(1)
  expect(node.progress.records).not.toHaveProperty('stage1BossDefeats')
  expect(db.writes.filter(write=>JSON.stringify(write).includes('runLedger/current'))).toHaveLength(1)
  setCloudProgressUser(null); await hydrateCloudProgress(user)
  expect(proof(1)).toBe(1)
  expect(await requestCloudProgressSave(user)).toBe(true)
  expect(proof(1)).toBe(1)
  expect(db.writes.filter(write=>JSON.stringify(write).includes('runLedger/current'))).toHaveLength(1)
})
it('never leaks boss proof across UID changes or a stale stage-result completion', async () => {
  const db=seedNode()
  db.control.holdWrites=true
  const writing=commitFirebaseStageResult(stage('a'),user)
  await vi.waitFor(()=>expect(db.control.heldWrites.length).toBe(1))
  setCloudProgressUser({uid:'synthetic-other'})
  applyCloudProgressSnapshot({progress:{records:{}}},{uid:'synthetic-other'})
  db.control.holdWrites=false
  while(db.releaseWrite()) await Promise.resolve()
  await writing
  expect(proof(1)).toBe(0)
})
// REAL REGRESSION (2026-11-19, kept failing on purpose): a stage whose result write is rejected once
// loses its boss proof for good. firebaseProgress.js commitFirebaseStageResult marks the run recorded
// before the write, never retries the row on failure, and the fallback progress transaction then
// clears the device slot (the only other copy). Stage unlock via boss proof must survive a failed save.
it('a rejected stage-result write keeps the boss proof for retry; after reconnect and reload the next stage stays unlocked', async () => {
  const db=seedNode()
  db.control.offline=true
  expect(await commitFirebaseStageResult(stage('a'),user)).toBe(false)
  expect(proof(1)).toBe(1)
  db.control.offline=false
  expect(await requestCloudProgressSave(user)).toBe(true)
  setCloudProgressUser(null); await hydrateCloudProgress(user)
  expect(proof(1)).toBe(1)
  expect(isStageUnlocked('stage2',readFirebasePlayerProgress().records)).toBe(true)
})
