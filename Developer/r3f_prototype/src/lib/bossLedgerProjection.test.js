// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests, applyCloudProgressSnapshot,
  buildCloudProgressSnapshot, readFirebasePlayerProgress, recordFirebaseRunCheckpoint,
  requestCloudProgressSave, setCloudProgressUser, hydrateCloudProgress,
} from './firebaseProgress.js'
import { load as loadPlayerRecords } from './playerRecords.js'
import { isStageUnlocked } from './stageConfig.js'
const user = { uid: 'synthetic-ledger-owner' }
const row = (stageId='stage1', records={bossKills:1}) => ({stageId, records, gold:0, best:{}, missionCounters:{}})
const seed = (runLedger={}, records={}) => applyCloudProgressSnapshot({progress:{records},runLedger},user)
const proof = n => readFirebasePlayerProgress().records[`stage${n}BossDefeats`]
beforeEach(() => { _resetFirebaseProgressForTests(); vi.stubEnv('VITE_FIREBASE_DATABASE_URL','https://test.invalid') })
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
  for(let n=1;n<10;n++) expect(isStageUnlocked(`stage${n+1}`,readFirebasePlayerProgress().records)).toBe(false)
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
it('counts unique proven run IDs, pending overrides baseline, and keeps read projections detached', () => {
  seed({same:row(),other:row()})
  recordFirebaseRunCheckpoint('same',{stageId:'stage1',records:{bossKills:1,stage1BossDefeats:1},best:{}})
  expect(proof(1)).toBe(2)
  const view=readFirebasePlayerProgress(); view.records.stage1BossDefeats=999
  expect(proof(1)).toBe(2)
  recordFirebaseRunCheckpoint('same',{stageId:'stage1',records:{bossKills:1,stage1BossDefeats:0},best:{}})
  expect(proof(1)).toBe(1)
})
it('ledger-only final flag changes runtime identity and survives transaction retry, stale ACK, reload', async () => {
  seed()
  let remote=buildCloudProgressSnapshot(), release, calls=0
  _setFirebaseProgressClientForTests({
    load:async()=>structuredClone(remote),
    transaction:async(_path,mutate)=>{
      calls++
      const next=mutate(structuredClone(remote)); expect(mutate(structuredClone(remote))).toEqual(next)
      if(calls===1) await new Promise(resolve=>{release=resolve})
      remote=structuredClone(next); return {committed:true,snapshot:{val:()=>structuredClone(remote)}}
    },
  })
  recordFirebaseRunCheckpoint('current',{stageId:'stage1',records:{bossKills:1,stage1BossDefeats:0},best:{}})
  const saving=requestCloudProgressSave(user)
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'))
  const wire=buildCloudProgressSnapshot().progress.records
  expect(recordFirebaseRunCheckpoint('current',{stageId:'stage1',records:{bossKills:1,stage1BossDefeats:1},best:{}})).toBe(true)
  expect(buildCloudProgressSnapshot().progress.records).toEqual(wire)
  expect(proof(1)).toBe(1)
  release(); expect(await saving).toBe(true); expect(calls).toBe(2)
  expect(remote.runLedger.current.records.stage1BossDefeats).toBe(1)
  expect(remote.progress.records).not.toHaveProperty('stage1BossDefeats')
  setCloudProgressUser(null); await hydrateCloudProgress(user)
  expect(proof(1)).toBe(1)
  expect(await requestCloudProgressSave(user)).toBe(true)
  expect(proof(1)).toBe(1)
})
it('failed save retains pending proof for retry and never leaks evidence across UID changes or stale completion', async () => {
  seed(); let release
  _setFirebaseProgressClientForTests({transaction:async()=>{throw Error('synthetic offline')}})
  recordFirebaseRunCheckpoint('a',{stageId:'stage1',records:{stage1BossDefeats:1},best:{}})
  expect(await requestCloudProgressSave(user)).toBe(false); expect(proof(1)).toBe(1)
  let remote=buildCloudProgressSnapshot()
  _setFirebaseProgressClientForTests({transaction:async(_path,mutate)=>{const next=mutate(remote); await new Promise(r=>{release=r}); return {committed:true,snapshot:{val:()=>next}}}})
  const saving=requestCloudProgressSave(user)
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'))
  setCloudProgressUser({uid:'synthetic-other'})
  applyCloudProgressSnapshot({progress:{records:{}}},{uid:'synthetic-other'})
  release(); await saving
  expect(proof(1)).toBe(0)
  recordFirebaseRunCheckpoint('b',{stageId:'stage2',records:{stage2BossDefeats:1},best:{}})
  expect(proof(1)).toBe(0); expect(proof(2)).toBe(1)
})
