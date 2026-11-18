import { _setFirebaseProgressClientForTests, buildCloudProgressSnapshot, getFirebaseProgressRuntimeSnapshot, updateFirebasePlayerProgress } from '../src/lib/firebaseProgress.js'
import { useAuthStore } from '../src/store/useAuthStore.js'
import { _setFirebaseRankingClientForTests } from '../src/lib/firebaseRanking.js'
import { createFakeProgressDatabase } from './fakeProgressDatabase.js'

// Synthetic prior-stage proof for tests of unrelated gameplay in later stages.
export function seedStageEntryForTests(stageId) {
  const previous = Number(stageId.slice(5)) - 1
  if (previous >= 1) updateFirebasePlayerProgress(p => {p.records[`stage${previous}BossDefeats`] = 1})
}

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
  // Path-aware fake RTDB that enforces database.rules.json on every write.
  const db=createFakeProgressDatabase({users:{[uid]:buildCloudProgressSnapshot()}})
  _setFirebaseProgressClientForTests(db)
  return db
}
