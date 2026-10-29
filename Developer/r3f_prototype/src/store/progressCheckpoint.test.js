// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('../lib/firebaseRanking.js',()=>({prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun:async()=>({status:'skipped'}),describeSubmission:()=>({status:'skipped'})}))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { applyCloudProgressSnapshot, buildCloudProgressSnapshot, _setFirebaseProgressClientForTests, requestCloudProgressSave, setCloudProgressUser, claimFirebaseMissionReward, updateFirebasePlayerProgress, readFirebasePlayerProgress } from '../lib/firebaseProgress.js'
let remote, failing, user
beforeEach(()=>{
  vi.stubEnv('VITE_FIREBASE_DATABASE_URL','https://qa.invalid')
  user={uid:crypto.randomUUID()}
  applyCloudProgressSnapshot({progress:{goldTotal:10,weaponUnlockSchemaVersion:2,records:{}}},user)
  remote=buildCloudProgressSnapshot(); failing=false
  useAuthStore.setState({user,status:'signedIn'})
  _setFirebaseProgressClientForTests({load:async()=>structuredClone(remote),transaction:async(_path,mutate)=>{
    if(failing)throw new Error('injected-offline')
    const next=mutate(structuredClone(remote));if(next===undefined)return{committed:false}
    remote=structuredClone(next);return{committed:true,snapshot:{val:()=>structuredClone(remote)}}
  }})
})
it('immediately persists start at zero and one kill before the run ends',async()=>{
  useGameStore.getState().resetGame('stage1')
  await requestCloudProgressSave()
  expect(remote.progress.records.totalRuns).toBe(1)
  expect(remote.progress.records.totalKills).toBe(0)
  useGameStore.getState().recordKill()
  await requestCloudProgressSave()
  expect(remote.progress.records.totalKills).toBe(1)
  expect(useGameStore.getState().phase).toBe('playing')
})
it('reconcile recovers failed immediate writes without counting the run twice',async()=>{
  failing=true
  useGameStore.getState().resetGame('stage1')
  useGameStore.getState().recordKill()
  expect(await requestCloudProgressSave()).toBe(false)
  expect(remote.progress.records.totalKills??0).toBe(0)
  failing=false
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote.progress.records).toMatchObject({totalRuns:1,totalKills:1})
  await useGameStore.getState().reconcileCloudProgress()
  expect(remote.progress.records).toMatchObject({totalRuns:1,totalKills:1})
})
it('transition flush recovers after both earlier paths failed, with remote readback',async()=>{
  failing=true
  useGameStore.getState().resetGame('stage1')
  useGameStore.getState().recordKill()
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  useGameStore.getState().clearStage()
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(false)
  expect(await useGameStore.getState().continueToNextStage()).toBe(false)
  expect(useGameStore.getState().currentStageId).toBe('stage1')
  failing=false
  expect(await useGameStore.getState().continueToNextStage()).toBe(true)
  await requestCloudProgressSave()
  expect(remote.progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:2})
  expect(useGameStore.getState().currentStageId).toBe('stage2')
})
it('retains a clear earned before hydration and applies it only to its original UID',async()=>{
  const initial=structuredClone(remote)
  setCloudProgressUser(null);setCloudProgressUser(user)
  useGameStore.getState().resetGame('stage1');useGameStore.getState().recordKill();useGameStore.getState().clearStage()
  applyCloudProgressSnapshot(initial,user)
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote.progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  const other={uid:crypto.randomUUID()}
  useAuthStore.setState({user:other});applyCloudProgressSnapshot({progress:{goldTotal:7,records:{},weaponUnlockSchemaVersion:2}},other)
  useGameStore.getState().reloadPersistentProgress()
  expect(buildCloudProgressSnapshot().progress.records.stage1Clears).toBe(0)
  expect(buildCloudProgressSnapshot().progress.goldTotal).toBe(7)
})

it('replays an unacknowledged run after A to B to A without losing or doubling gold and kills',async()=>{
  const initial=structuredClone(remote);failing=true
  useGameStore.getState().resetGame('stage1');useGameStore.getState().gainGold(5);useGameStore.getState().recordKill();useGameStore.getState().clearStage()
  expect(await requestCloudProgressSave()).toBe(false)
  const other={uid:crypto.randomUUID()}
  useAuthStore.setState({user:other});applyCloudProgressSnapshot({progress:{goldTotal:7,records:{},weaponUnlockSchemaVersion:2}},other)
  useGameStore.getState().resetGame('stage1');useGameStore.getState().recordKill();useGameStore.getState().recordKill();useGameStore.getState().gainGold(2);useGameStore.getState().clearStage()
  useAuthStore.setState({user});applyCloudProgressSnapshot(initial,user);failing=false
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote.progress.goldTotal).toBe(15)
  expect(remote.progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  expect(remote.progress.records.stage2Clears).toBe(0)
  const acknowledged=structuredClone(remote)
  applyCloudProgressSnapshot(acknowledged,user)
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote.progress.goldTotal).toBe(15)
  expect(remote.progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
})

it('adds in-flight pickup deltas to the server mission reward exactly once',async()=>{
  applyCloudProgressSnapshot({progress:{goldTotal:100,records:{},weaponUnlockSchemaVersion:2,missions:{active:{qa_mission:{counter:1,target:1,completedAt:new Date().toISOString()}}}}},user)
  remote=buildCloudProgressSnapshot()
  let release
  _setFirebaseProgressClientForTests({load:async()=>structuredClone(remote),transaction:async(path,mutate)=>{
    if(path.endsWith('/progress')){
      remote.progress=mutate(structuredClone(remote.progress))
      await new Promise(r=>{release=r})
      return{committed:true,snapshot:{val:()=>structuredClone(remote.progress)}}
    }
    remote=mutate(structuredClone(remote));return{committed:true,snapshot:{val:()=>structuredClone(remote)}}
  }})
  const claim=claimFirebaseMissionReward({user,missionId:'qa_mission',rewardAllowlist:{qa_mission:{type:'gold',amount:10}}})
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'))
  updateFirebasePlayerProgress(p=>{p.goldTotal+=5;p.records.totalKills+=1})
  release();expect((await claim).ok).toBe(true)
  expect(readFirebasePlayerProgress().goldTotal).toBe(115)
  await requestCloudProgressSave();await requestCloudProgressSave()
  expect(remote.progress.goldTotal).toBe(115)
  expect(remote.progress.records.totalKills).toBe(1)
})

it('credits milestone, quest, and dialogue gold exactly once through run checkpoints',async()=>{
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({goldTotal:10})
  useGameStore.getState().checkSurvivalMilestone(48000)
  expect(readFirebasePlayerProgress().goldTotal).toBe(11)
  useGameStore.setState({phase:'paused',pauseSource:'dialogue',studentDialogue:{reward:{type:'gold',amount:3}}})
  useGameStore.getState().closeStudentDialogue()
  expect(readFirebasePlayerProgress().goldTotal).toBe(14)
  expect(useGameStore.getState().startQuest('stage1-talk-book')).toBe(true)
  expect(useGameStore.getState().collectQuestItem('stage1-talk-book','stage1-desk-ne-01')).toBe(true)
  expect(useGameStore.getState().completeQuest('stage1-talk-book','user-classPresidentStudent-msl7serx-1')).toBe(true)
  await requestCloudProgressSave()
  expect(remote.progress.goldTotal).toBe(16)
  expect(remote.progress.records.totalGold).toBe(6)
})

it('stops rewriting ended runs once the ledger acknowledged them',async()=>{
  for(let i=0;i<3;i++){
    useGameStore.getState().resetGame('stage1');useGameStore.getState().recordKill();useGameStore.getState().damagePlayer(9999)
    await requestCloudProgressSave()
  }
  useGameStore.getState().resetGame('stage1');await requestCloudProgressSave()
  let rewritten=null
  _setFirebaseProgressClientForTests({load:async()=>structuredClone(remote),transaction:async(_path,mutate)=>{
    const current=structuredClone(remote),next=mutate(current)
    rewritten=Object.keys(next.runLedger).filter(id=>next.runLedger[id]!==current.runLedger?.[id])
    remote=structuredClone(next);return{committed:true,snapshot:{val:()=>structuredClone(remote)}}
  }})
  useGameStore.getState().recordKill();await requestCloudProgressSave()
  expect(Object.keys(remote.runLedger)).toHaveLength(4)
  expect(rewritten).toEqual([useGameStore.getState().progressRunId])
  expect(remote.progress.records).toMatchObject({totalRuns:4,totalKills:4})
})
