import {beforeEach,afterEach,it,expect,vi} from 'vitest'
vi.mock('./adminConfig.js',()=>({getAdminRankingSeasonConfig:()=>({})}))
vi.mock('./guestRankingIdentity.js',()=>({getRankingUser:async user=>user,getGuestRankingClient:vi.fn(),getGuestRankingNicknameForUid:()=>''}))
const api=await import(process.env.RANKING_USE_BASELINE ? './.ranking-delete-baseline.js' : './firebaseRanking.js')
let rows,mod,offline
// Fixed event fixtures below describe the same Sunday session. Freeze Date only:
// real async timers still run, and explicit boundary tests advance Date themselves.
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-18T14:58:00Z'));vi.stubEnv('VITE_FIREBASE_DATABASE_URL','https://synthetic.invalid');rows=new Map();offline=false;mod={ref:(_,path)=>path,get:vi.fn(async path=>({exists:()=>rows.has(path),val:()=>structuredClone(rows.get(path))})),runTransaction:vi.fn(async(path,mutate)=>{if(offline)throw Error('PERMISSION_DENIED');const value=mutate(structuredClone(rows.get(path)??null));if(value!==undefined)rows.set(path,structuredClone(value));return{committed:value!==undefined}}),remove:vi.fn(async path=>rows.delete(path))};api._setFirebaseRankingClientForTests({db:{},mod})})
afterEach(()=>{api._setFirebaseRankingClientForTests(null);vi.useRealTimers();vi.unstubAllEnvs();vi.restoreAllMocks()})
const user={uid:'synthetic-owner'},run={stageId:'stage1',score:203,timeMs:203000,cleared:false,lastPlayedAt:Date.parse('2026-10-18T14:58:00Z'),submittedAt:Date.parse('2026-10-18T14:58:00Z')}
it('preserves highest metrics and latest original event when failed requests are coalesced',async()=>{offline=true;await api.submitRun(user,run);await api.submitRun(user,{...run,score:1,timeMs:1000,lastPlayedAt:run.lastPlayedAt+1000});offline=false;const result=await api.retryPendingRankings(user);expect(result.written).toHaveLength(6);for(const v of rows.values())expect(v).toMatchObject({score:203,timeMs:203000,lastPlayedAt:run.lastPlayedAt+1000,submittedAt:run.submittedAt})})
it('keeps original daily and weekly paths when retries cross a KST Monday boundary',async()=>{offline=true;await api.submitRun(user,run);const monday=Date.parse('2026-10-18T15:01:00Z');await api.submitRun(user,{...run,score:1,timeMs:1000,submittedAt:monday,lastPlayedAt:monday});offline=false;await api.retryPendingRankings(user);expect(rows.size).toBe(10);for(const[path,value]of rows){if(path.includes('/2026-10-18/')||path.includes('/2026-10-12/'))expect(value.score).toBe(203);if(path.includes('/2026-10-19/'))expect(value.score).toBe(1)}})
it('retries only the provided UID and never transfers another account score',async()=>{offline=true;await api.submitRun(user,run);offline=false;const other={uid:'synthetic-other'};expect((await api.retryPendingRankings(other)).written).toHaveLength(0);await api.submitRun(other,{...run,score:1,timeMs:1000});expect([...rows.values()].every(row=>row.uid===other.uid&&row.score===1)).toBe(true);await api.retryPendingRankings(user);expect([...rows.values()].filter(row=>row.uid===other.uid).every(row=>row.score===1)).toBe(true)})
it('retains a request until the readback confirms the event and reports partial ACK honestly',async()=>{const get=mod.get.getMockImplementation();mod.get.mockImplementation(async path=>path.includes('/weekly/')?{exists:()=>false,val:()=>null}:get(path));const result=await api.submitRun(user,run);expect(result.written).toHaveLength(4);expect(result.failed).toHaveLength(2);expect(api.describeSubmission(result)).toMatchObject({status:'failed',partial:true,acknowledgedCount:4,failedCount:2});mod.get.mockImplementation(get);expect((await api.retryPendingRankings(user)).failed).toHaveLength(0)})
it('blocks a new submission after account deletion instead of recreating a ranking row',async()=>{await api.submitRun(user,run);await api.deleteRankingEntriesForUser(user);await api.submitRun(user,run);expect([...rows.values()].filter(row=>row.uid===user.uid)).toHaveLength(0)})
it('drains in-flight writes before deletion and resumes only after explicit failure recovery',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve});const original=mod.runTransaction.getMockImplementation()
 mod.runTransaction.mockImplementation(async(...args)=>{await gate;return original(...args)})
 const pending=api.submitRun(user,run);await vi.waitFor(()=>expect(mod.runTransaction).toHaveBeenCalledTimes(6))
 const deleting=api.deleteRankingEntriesForUser(user);expect(mod.remove).not.toHaveBeenCalled()
 expect((await api.submitRun(user,run)).reason).toBe('accountDeleting')
 release();await pending;await deleting;expect([...rows.values()]).toHaveLength(0)
 api.resumeRankingSubmissions(user);mod.runTransaction.mockImplementation(original)
 expect((await api.submitRun(user,run)).failed).toHaveLength(0)
})

it('uses the existing faster-time tie break for both pending and server best selection',async()=>{
 offline=true;await api.submitRun(user,{...run,timeMs:203900});await api.submitRun(user,{...run,timeMs:203100,lastPlayedAt:run.lastPlayedAt+1000});offline=false;await api.retryPendingRankings(user)
 await api.submitRun(user,{...run,timeMs:203990,lastPlayedAt:run.lastPlayedAt+2000})
 for(const value of rows.values())expect(value).toMatchObject({score:203,timeMs:203100,lastPlayedAt:run.lastPlayedAt+2000})
})

it('flushes older guest period requests even after a new period succeeds',async()=>{
 const guest={uid:'synthetic-existing-guest',isAnonymous:true}
 offline=true;await api.submitRun(guest,run)
 offline=false;const monday=Date.parse('2026-10-18T15:01:00Z');await api.submitRun(guest,{...run,score:1,timeMs:1000,submittedAt:monday,lastPlayedAt:monday})
 await api.retryPendingRankings(null)
 expect(rows.size).toBe(10)
 expect([...rows.entries()].filter(([path])=>path.includes('/2026-10-18/')).every(([,v])=>v.score===203)).toBe(true)
})
it('keeps a confirmed nickname when replaying an older failed payload',async()=>{
 const named={...user,displayName:'Old name'};offline=true;await api.submitRun(named,run);offline=false
 mod.update=vi.fn(async(path,patch)=>{rows.set(path,{...rows.get(path),...patch})})
 expect((await api.renameRankingEntriesForUser(named,'New name')).failed).toHaveLength(0)
 await api.retryPendingRankings(named)
 expect([...rows.values()].every(value=>value.displayName==='New name'&&value.score===203&&value.submittedAt===run.submittedAt)).toBe(true)
})

it('reports subscription read errors without emitting an empty successful board',async()=>{
 const received=vi.fn(),failed=vi.fn();mod.query=ref=>ref;mod.orderByChild=()=>null;mod.limitToLast=()=>null
 mod.onValue=vi.fn((_query,_received,onError)=>{onError(new Error('injected-read'));return vi.fn()})
 const unsubscribe=api.subscribeGlobalRanking('allTime',received,{onError:failed})
 await vi.waitFor(()=>expect(failed).toHaveBeenCalledTimes(1))
 expect(received).not.toHaveBeenCalled();unsubscribe()
})

it('deletes prior-period committed rows whose readback remains pending',async()=>{
 vi.useFakeTimers({toFake:['Date']})
 try {
  vi.setSystemTime(new Date('2026-10-18T14:58:00Z'))
  const get=mod.get.getMockImplementation();mod.get.mockRejectedValue(new Error('injected-readback'))
  expect((await api.submitRun(user,run)).failed).toHaveLength(6)
  vi.setSystemTime(new Date('2026-10-18T15:01:00Z'));mod.get.mockImplementation(get)
  await api.deleteRankingEntriesForUser(user)
  expect([...rows.values()].filter(value=>value.uid===user.uid)).toHaveLength(0)
 } finally { vi.useRealTimers() }
})
