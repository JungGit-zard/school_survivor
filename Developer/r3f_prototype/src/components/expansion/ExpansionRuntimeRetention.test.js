// @vitest-environment jsdom
import {beforeAll,afterEach,expect,it,vi} from 'vitest'
import {blockFirebaseStudioRuntime,commitFirebaseStudioRuntime} from '../../lib/studioRuntimeState.js'
import {refreshExpansionInstanceFromRuntime} from './ExpansionZombieInstanceLayer.jsx'
import {createExpansionInstanceState,updateExpansionInstances,disposeExpansionInstanceState} from './expansionInstances.js'
import {createEnemyEntityPool} from '../../lib/enemyEntityPool.js'
beforeAll(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect(){}}))
afterEach(()=>blockFirebaseStudioRuntime())
it('renders initially offline, applies ready tuning, preserves it while blocked, and accepts a ready empty reset without local storage',()=>{
 const read=vi.spyOn(Storage.prototype,'getItem'),write=vi.spyOn(Storage.prototype,'setItem')
 const state=createExpansionInstanceState(1),pool=createEnemyEntityPool()
 pool.active[0]=1;pool.type[0]=17;pool.spawnTimer[0]=1200;pool.visualScale[0]=1;pool.hp[0]=pool.maxHp[0]=10
 const visible=()=>{updateExpansionInstances(state,pool,{time:.75});const e=state.entries.get(17).find(e=>!e.leaf.userData.expansionOutline);return {matrix:Array.from(e.bucket.mesh.instanceMatrix.array.slice(0,16)),color:e.bucket.mesh.material.color.toArray(),emissive:e.bucket.mesh.material.emissiveIntensity}}
 try{
   blockFirebaseStudioRuntime();refreshExpansionInstanceFromRuntime(state)
   expect(state.ready).toBe(true);expect(state.group.visible).toBe(true)
   const authored=visible();expect(state.buckets.some(b=>b.mesh.count>0)).toBe(true)
   commitFirebaseStudioRuntime({tunings:{'zombie-e19':{positionX:1.2,scale:1.4,color:'#e03366',colorStrength:.8,emissiveIntensity:.83},'zombie-e19::part::0.0.0':{positionZ:.3,emissiveIntensity:.83}}},{revision:4})
   refreshExpansionInstanceFromRuntime(state)
   const tuned=visible();expect(tuned).not.toEqual(authored);expect(tuned.emissive).toBe(.83)
   const batch=state.entries.get(17)[0].bucket.mesh
   blockFirebaseStudioRuntime();refreshExpansionInstanceFromRuntime(state);refreshExpansionInstanceFromRuntime(state)
   expect(visible()).toEqual(tuned);expect(state.group.visible).toBe(true)
   expect(state.entries.get(17)[0].bucket.mesh).toBe(batch)
   commitFirebaseStudioRuntime({tunings:{}},{revision:5});refreshExpansionInstanceFromRuntime(state)
   expect(visible()).toEqual(authored)
   blockFirebaseStudioRuntime();refreshExpansionInstanceFromRuntime(state)
   expect(visible()).toEqual(authored)
   expect(read).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled()
 }finally{disposeExpansionInstanceState(state);read.mockRestore();write.mockRestore()}
})
