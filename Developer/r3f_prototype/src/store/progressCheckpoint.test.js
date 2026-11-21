// @vitest-environment jsdom
// 2026-11-19 rewrite. Until 3984b1b4 these tests asserted the in-run cloud checkpoint (start, every kill
// and every gold pickup written to the cloud mid-run). That cadence stuttered signed-in players and is
// gone by the owner's order: in-run numbers stay in memory (plus one one-stage device slot) and the
// stage result is written once when the stage ends. The same guarantees are now asserted at that
// boundary: nothing lost, nothing counted twice, failed writes recovered, no cross-account leaks.
// Uses the rules-faithful fake (database.rules.json) with an offline switch.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../lib/firebaseRanking.js',()=>({prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun:async()=>({status:'skipped'}),describeSubmission:()=>({status:'skipped'})}))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests, applyCloudProgressSnapshot, buildCloudProgressSnapshot, _setFirebaseProgressClientForTests, requestCloudProgressSave, setCloudProgressUser, claimFirebaseMissionReward, updateFirebasePlayerProgress, readFirebasePlayerProgress, hydrateCloudProgress } from '../lib/firebaseProgress.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'

let db, user
const remote = (uid = user.uid) => db.get(`users/${uid}`)
const progressWrites = () => db.writes.filter(write => write.kind === 'transaction' || Object.keys(write.values ?? {}).some(key => key.startsWith('progress') || key.startsWith('runLedger')))

function signIn(account, progress) {
  applyCloudProgressSnapshot({ progress }, account)
  db.root.users = { ...(db.root.users ?? {}), [account.uid]: buildCloudProgressSnapshot() }
  useAuthStore.setState({ user: account, status: 'signedIn' })
}

beforeEach(()=>{
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  localStorage.clear()
  _resetFirebaseProgressForTests()
  user={uid:crypto.randomUUID()}
  db=createControllableProgressDatabase({})
  _setFirebaseProgressClientForTests(db)
  signIn(user, {goldTotal:10,weaponUnlockSchemaVersion:2,records:{}})
})
afterEach(()=>vi.unstubAllEnvs())

it('keeps kills on the device during the stage and writes them once when the stage ends',async()=>{
  useGameStore.getState().resetGame('stage1')
  await requestCloudProgressSave()
  db.writes.length=0
  useGameStore.getState().recordKill()
  await requestCloudProgressSave()
  expect(progressWrites()).toEqual([])
  expect(remote().progress.records.totalKills??0).toBe(0)
  expect(useGameStore.getState().phase).toBe('playing')
  useGameStore.getState().damagePlayer(9999)
  await requestCloudProgressSave()
  expect(remote().progress.records).toMatchObject({totalRuns:1,totalKills:1})
  expect(Object.keys(remote().runLedger)).toHaveLength(1)
})

it('reconcile recovers a failed stage-end write without counting the run twice',async()=>{
  db.control.offline=true
  useGameStore.getState().resetGame('stage1')
  useGameStore.getState().recordKill()
  useGameStore.getState().damagePlayer(9999)
  expect(await requestCloudProgressSave()).toBe(false)
  expect(remote().progress.records.totalKills??0).toBe(0)
  db.control.offline=false
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote().progress.records).toMatchObject({totalRuns:1,totalKills:1})
  await useGameStore.getState().reconcileCloudProgress()
  expect(remote().progress.records).toMatchObject({totalRuns:1,totalKills:1})
})

it('transition flush recovers after both earlier paths failed, with remote readback',async()=>{
  db.control.offline=true
  useGameStore.getState().resetGame('stage1')
  useGameStore.getState().recordKill()
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  useGameStore.getState().clearStage()
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(false)
  expect(await useGameStore.getState().continueToNextStage()).toBe(false)
  expect(useGameStore.getState().currentStageId).toBe('stage1')
  db.control.offline=false
  expect(await useGameStore.getState().continueToNextStage()).toBe(true)
  await requestCloudProgressSave()
  // Stage 1 is recorded once; the Stage 2 run now in play is counted when it ends.
  expect(remote().progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  expect(useGameStore.getState().currentStageId).toBe('stage2')
})

it('retains a clear earned before hydration and applies it only to its original UID',async()=>{
  setCloudProgressUser(null);setCloudProgressUser(user)
  useGameStore.getState().resetGame('stage1');useGameStore.getState().recordKill();useGameStore.getState().clearStage()
  // The stage stays in the one-stage device slot until this account hydrates (here: the reconcile).
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote().progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote().progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  const other={uid:crypto.randomUUID()}
  signIn(other,{goldTotal:7,records:{},weaponUnlockSchemaVersion:2})
  _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
  await hydrateCloudProgress(other)
  useGameStore.getState().reloadPersistentProgress()
  expect(buildCloudProgressSnapshot().progress.records.stage1Clears).toBe(0)
  expect(buildCloudProgressSnapshot().progress.goldTotal).toBe(7)
})

it('applies an unacknowledged stage after A to B to A exactly once, without losing or doubling gold and kills',async()=>{
  db.control.offline=true
  useGameStore.getState().resetGame('stage1');useGameStore.getState().gainGold(5);useGameStore.getState().recordKill();useGameStore.getState().clearStage()
  expect(await requestCloudProgressSave()).toBe(false)
  const other={uid:crypto.randomUUID()}
  signIn(other,{goldTotal:7,records:{},weaponUnlockSchemaVersion:2})
  useGameStore.getState().resetGame('stage1');useGameStore.getState().recordKill();useGameStore.getState().recordKill();useGameStore.getState().gainGold(2);useGameStore.getState().clearStage()
  db.control.offline=false
  // A signs in again on this device: A's leftover stage is applied once at hydration.
  useAuthStore.setState({user,status:'signedIn'})
  _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
  await hydrateCloudProgress(user)
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote().progress.goldTotal).toBe(15)
  expect(remote().progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  expect(remote().progress.records.stage2Clears).toBe(0)
  _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
  await hydrateCloudProgress(user)
  expect(await useGameStore.getState().reconcileCloudProgress()).toBe(true)
  expect(remote().progress.goldTotal).toBe(15)
  expect(remote().progress.records).toMatchObject({stage1Clears:1,totalKills:1,totalRuns:1})
  // B's records never reached A.
  expect(remote(other.uid).progress.goldTotal).toBe(7)
})

it('adds in-flight pickup deltas to the server mission reward exactly once',async()=>{
  applyCloudProgressSnapshot({progress:{goldTotal:100,records:{},weaponUnlockSchemaVersion:2,missions:{active:{qa_mission:{counter:1,target:1,completedAt:new Date().toISOString()}}}}},user)
  db.root.users[user.uid]=buildCloudProgressSnapshot()
  db.control.holdWrites=true
  const claim=claimFirebaseMissionReward({user,missionId:'qa_mission',rewardAllowlist:{qa_mission:{type:'gold',amount:10}}})
  await vi.waitFor(()=>expect(db.control.heldWrites).toHaveLength(1))
  updateFirebasePlayerProgress(p=>{p.goldTotal+=5;p.records.totalKills+=1})
  db.control.holdWrites=false
  db.releaseWrite();expect((await claim).ok).toBe(true)
  expect(readFirebasePlayerProgress().goldTotal).toBe(115)
  await requestCloudProgressSave();await requestCloudProgressSave()
  expect(remote().progress.goldTotal).toBe(115)
  expect(remote().progress.records.totalKills).toBe(1)
})

it('credits milestone, quest, and dialogue gold in the run and to the account exactly once at stage end',async()=>{
  useGameStore.getState().resetGame('stage1')
  await requestCloudProgressSave()
  db.writes.length=0
  useGameStore.setState({goldTotal:10})
  useGameStore.getState().checkSurvivalMilestone(48000)
  expect(useGameStore.getState().goldTotal).toBe(11)
  useGameStore.setState({phase:'paused',pauseSource:'dialogue',studentDialogue:{reward:{type:'gold',amount:3}}})
  useGameStore.getState().closeStudentDialogue()
  expect(useGameStore.getState().goldTotal).toBe(14)
  expect(useGameStore.getState().startQuest('stage1-talk-book')).toBe(true)
  expect(useGameStore.getState().collectQuestItem('stage1-talk-book','stage1-desk-ne-01')).toBe(true)
  expect(useGameStore.getState().completeQuest('stage1-talk-book','user-classPresidentStudent-msl7serx-1')).toBe(true)
  expect(useGameStore.getState().goldTotal).toBe(16)
  // Mid-run: the account copy and the cloud are untouched.
  expect(readFirebasePlayerProgress().goldTotal).toBe(10)
  await requestCloudProgressSave()
  expect(progressWrites()).toEqual([])
  expect(remote().progress.goldTotal).toBe(10)
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
  expect(remote().progress.goldTotal).toBe(16)
  expect(remote().progress.records.totalGold).toBe(6)
  expect(readFirebasePlayerProgress().goldTotal).toBe(16)
})

it('writes each ended run exactly once and never rewrites an earlier run row',async()=>{
  for(let i=0;i<3;i++){
    useGameStore.getState().resetGame('stage1');useGameStore.getState().recordKill();useGameStore.getState().damagePlayer(9999)
    await requestCloudProgressSave()
  }
  useGameStore.getState().resetGame('stage1');await requestCloudProgressSave()
  expect(Object.keys(remote().runLedger)).toHaveLength(3)
  useGameStore.getState().recordKill();useGameStore.getState().damagePlayer(9999);await requestCloudProgressSave()
  expect(Object.keys(remote().runLedger)).toHaveLength(4)
  const rowWrites=db.writes.flatMap(write=>Object.keys(write.values??{}).filter(key=>key.startsWith('runLedger/')))
  expect(rowWrites).toHaveLength(4)
  expect(new Set(rowWrites).size).toBe(4)
  expect(db.writes.some(write=>write.kind==='transaction'&&!/\/progress$/.test(write.path))).toBe(false)
  expect(remote().progress.records).toMatchObject({totalRuns:4,totalKills:4})
})
