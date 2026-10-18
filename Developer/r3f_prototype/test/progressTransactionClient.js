import { _setFirebaseProgressClientForTests, buildCloudProgressSnapshot, getFirebaseProgressRuntimeSnapshot } from '../src/lib/firebaseProgress.js'
import { useAuthStore } from '../src/store/useAuthStore.js'
import { _setFirebaseRankingClientForTests } from '../src/lib/firebaseRanking.js'

export function installProgressTransactionTestClient() {
  const rankings = new Map()
  _setFirebaseRankingClientForTests({db:{},mod:{
    ref:(_db,path)=>path,
    get:async path=>({exists:()=>rankings.has(path),val:()=>structuredClone(rankings.get(path))}),
    runTransaction:async(path,mutate)=>{
      const next=mutate(rankings.get(path)??null)
      if(next!==undefined)rankings.set(path,structuredClone(next))
      return{committed:next!==undefined,snapshot:{val:()=>structuredClone(rankings.get(path)??null)}}
    },
  }})
  const uid=getFirebaseProgressRuntimeSnapshot().uid
  useAuthStore.setState({user:{uid},status:'signedIn'})
  let remote=buildCloudProgressSnapshot()
  _setFirebaseProgressClientForTests({
    load:async()=>structuredClone(remote),
    transaction:async(_path,mutate)=>{
      const next=mutate(structuredClone(remote))
      if(next===undefined)return{committed:false}
      remote=structuredClone(next)
      return{committed:true,snapshot:{val:()=>structuredClone(remote)}}
    },
  })
}
