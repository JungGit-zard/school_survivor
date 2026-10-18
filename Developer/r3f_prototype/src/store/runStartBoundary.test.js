// @vitest-environment jsdom
import {expect,it,vi} from 'vitest'
vi.mock('../lib/firebaseRanking.js',()=>({prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun:async()=>({status:'skipped'}),describeSubmission:()=>({status:'skipped'})}))
vi.mock('../lib/guestRankingIdentity.js',()=>({getRankingUser:async user=>user}))
it('hydrates and retries title-only sign-in without inventing a gameplay run',async()=>{
 const P=await import('../lib/firebaseProgress.js'),{useAuthStore:A}=await import('./useAuthStore.js'),{useGameStore:G}=await import('./useGameStore.js')
 const user={uid:'synthetic-title-only'},initial={progress:{goldTotal:12,weaponUnlockSchemaVersion:2,records:{}}}
 let remote=structuredClone(initial)
 P._setFirebaseProgressClientForTests({load:async()=>structuredClone(remote),transaction:async(_path,mutate)=>{remote=structuredClone(mutate(structuredClone(remote)));return{committed:true,snapshot:{val:()=>structuredClone(remote)}}}})
 A.setState({user,status:'signedIn'})
 await P.hydrateCloudProgress(user)
 G.getState().reloadPersistentProgress()
 await G.getState().reconcileCloudProgress()
 expect(remote.progress.records.totalRuns??0).toBe(0)
 expect(remote.progress.goldTotal).toBe(12)
 G.getState().resetGame('stage1')
 await P.requestCloudProgressSave()
 expect(remote.progress.records.totalRuns).toBe(1)
})
