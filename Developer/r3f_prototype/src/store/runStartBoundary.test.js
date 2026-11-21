// @vitest-environment jsdom
// 2026-11-19 rewrite: a run is recorded once, when its stage ends (owner order after the signed-in
// stutter incident). Title-only sign-in must not invent a run, and starting a stage must not write
// run totals to the cloud before the stage ends.
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
vi.mock('../lib/firebaseRanking.js',()=>({prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun:async()=>({status:'skipped'}),describeSubmission:()=>({status:'skipped'})}))
vi.mock('../lib/guestRankingIdentity.js',()=>({getRankingUser:async user=>user}))
import { createFakeProgressDatabase } from '../../test/fakeProgressDatabase.js'
import { TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'
beforeEach(()=>{ for (const [key,value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key,value); localStorage.clear() })
afterEach(()=>vi.unstubAllEnvs())
it('hydrates and retries title-only sign-in without inventing a gameplay run; the run lands once at stage end',async()=>{
 const P=await import('../lib/firebaseProgress.js'),{useAuthStore:A}=await import('./useAuthStore.js'),{useGameStore:G}=await import('./useGameStore.js')
 const user={uid:'synthetic-title-only'}
 P._resetFirebaseProgressForTests()
 // A rules-valid existing account node (built by the game's own serializer), then a fresh sign-in.
 P.applyCloudProgressSnapshot({progress:{goldTotal:12,weaponUnlockSchemaVersion:2,records:{}}},user)
 const db=createFakeProgressDatabase({users:{[user.uid]:P.buildCloudProgressSnapshot()}})
 P._resetFirebaseProgressForTests()
 P._setFirebaseProgressClientForTests(db)
 A.setState({user,status:'signedIn'})
 await P.hydrateCloudProgress(user)
 G.getState().reloadPersistentProgress()
 await G.getState().reconcileCloudProgress()
 const remote=()=>db.get(`users/${user.uid}`)
 expect(remote().progress.records?.totalRuns??0).toBe(0)
 expect(remote().progress.goldTotal).toBe(12)
 G.getState().resetGame('stage1')
 await P.requestCloudProgressSave()
 // Stage start: no run counted in the cloud yet, and no run row.
 expect(remote().progress.records?.totalRuns??0).toBe(0)
 expect(remote().runLedger).toBeUndefined()
 expect(await G.getState().flushProgressBeforeTransition()).toBe(true)
 expect(remote().progress.records.totalRuns).toBe(1)
 expect(Object.keys(remote().runLedger)).toHaveLength(1)
 expect(remote().progress.goldTotal).toBe(12)
})
