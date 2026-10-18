import {beforeEach,it,expect,vi} from 'vitest'
const ranking=vi.hoisted(()=>({submit:vi.fn()}))
vi.mock('../lib/firebaseRanking.js',async original=>({...await original(),submitRun:ranking.submit,retryPendingRankings:async user=>{ const call=ranking.submit.mock.calls[0]; if (!call || call[0].uid!==user.uid) return {written:[],skipped:[],failed:[]}; return ranking.submit(user,call[1]) }}))
vi.mock('../lib/guestRankingIdentity.js',()=>({getRankingUser:async user=>user??{uid:'synthetic-guest',isAnonymous:true}}))
import {useGameStore as G} from './useGameStore.js'
import {useAuthStore as A} from './useAuthStore.js'
const failure={written:[],skipped:[],failed:['synthetic-bucket'],failureKind:'rejected'}
beforeEach(()=>{ranking.submit.mockReset().mockResolvedValue(failure);A.setState({user:{uid:'synthetic-origin'}})})
it('retains the exact original event time when retrying a rejected request',async()=>{
 await G.getState().submitRunToRanking(A.getState().user,{stageId:'stage1',score:203,timeMs:203000,lastPlayedAt:123456,submittedAt:123456})
 const original = ranking.submit.mock.calls[0][1]
 await G.getState().retryRankingSubmission()
 expect(ranking.submit.mock.calls.at(-1)[1]).toMatchObject({lastPlayedAt:123456,submittedAt:123456})
})
it('never retries the previous account gameplay using a newly signed-in identity',async()=>{
 await G.getState().submitRunToRanking(A.getState().user,{stageId:'stage1',score:203,timeMs:203000,lastPlayedAt:123456})
 ranking.submit.mockClear();A.setState({user:{uid:'synthetic-other'}})
 expect(await G.getState().retryRankingSubmission()).toBe(false)
 expect(ranking.submit).not.toHaveBeenCalled()
})
