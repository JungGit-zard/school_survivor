// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createExpansionRig, collectExpansionLeaves, disposeExpansionRig } from './expansionRig.js'
import { applyStudioTuning, applySavedStudioPartTunings } from '../StudioTunedGroup.jsx'
import { createEnemyEntityPool } from '../../lib/enemyEntityPool.js'
import { createExpansionInstanceState, refreshExpansionInstanceTunings, updateExpansionInstances, disposeExpansionInstanceState } from './expansionInstances.js'

beforeAll(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect(){}}))
function poolFixture() {
 // Real typed-array pool, populated directly: visual contract only, not gameplay spawning.
 const pool=createEnemyEntityPool()
 pool.active[0]=1;pool.type[0]=17;pool.spawnTimer[0]=1200;pool.visualScale[0]=1.47;pool.hp[0]=24;pool.maxHp[0]=48;pool.posX[0]=2;pool.posZ[0]=3
 return pool
}
describe('bounded expansion instance renderer',()=>{
 it('retains complete canonical nondefault per-part materials, separates conflicts and preserves borrowed caches',()=>{
   const state=createExpansionInstanceState(2),pool=poolFixture(),reference=createExpansionRig('E19')
   const tunings={
     'zombie-e19':{color:'#aa8855',colorStrength:.23,saturation:.6,brightness:.8,emissiveIntensity:.67,outlineOpacity:.39,outlineColor:'#214263'},
     'zombie-e19::part::0.0.0':{color:'#ff3366',colorStrength:.8,emissiveIntensity:1.7,outlineOpacity:.22,outlineColor:'#536711'},
     'zombie-e19::part::0.1':{emissiveIntensity:.31,outlineOpacity:.71},
     'zombie-e20':{emissiveIntensity:.9,outlineOpacity:.56},
   }
   const borrowed=collectExpansionLeaves(reference).map(l=>[l.geometry,vi.fn(),l.material,vi.fn()])
   for(const [geo,g,mat,m]of borrowed){geo.addEventListener('dispose',g);mat.addEventListener('dispose',m)}
   applyStudioTuning(reference,tunings['zombie-e19']);applySavedStudioPartTunings(reference,'zombie-e19',tunings)
   refreshExpansionInstanceTunings(state,tunings)
   pool.active[1]=1;pool.type[1]=18;pool.spawnTimer[1]=1200;pool.visualScale[1]=1;pool.hp[1]=pool.maxHp[1]=10
   updateExpansionInstances(state,pool,{time:1})
   const fields=['type','opacity','transparent','depthWrite','depthTest','side','toneMapped','stencilWrite','stencilRef','stencilFunc','stencilZPass','emissiveIntensity','blending','alphaTest','colorWrite','fog']
   const expected=collectExpansionLeaves(reference)
   state.entries.get(17).forEach(({leaf,bucket},i)=>{
     const actual=bucket.mesh.material,canonical=expected[i].material
     expect(actual).toBe(leaf.material) // every property/hook, not a subset or color clone
     for(const f of fields)expect(actual[f],`${leaf.name}.${f}`).toEqual(canonical[f])
     for(const f of ['color','emissive'])if(canonical[f])expect(actual[f].toArray()).toEqual(canonical[f].toArray())
     expect(actual.gradientMap).toBe(canonical.gradientMap)
     expect(bucket.mesh.count).toBeGreaterThan(0)
   })
   const fill=state.entries.get(17).filter(e=>!e.leaf.userData.expansionOutline)
   expect(fill[0].bucket).not.toBe(fill.find(e=>e.leaf.material.emissiveIntensity!==fill[0].leaf.material.emissiveIntensity).bucket)
   pool.hitFlashTimer[0]=100;updateExpansionInstances(state,pool,{time:1})
   expect(state.entries.get(17).find(e=>!e.leaf.userData.expansionOutline).flashBucket.mesh.material.color.getHex()).toBe(0xffffff)
   const old=state.buckets.map(b=>b.mesh),disposed=old.map(m=>{const fn=vi.fn();m.addEventListener('dispose',fn);return fn})
   refreshExpansionInstanceTunings(state,{})
   expect(disposed.every(fn=>fn.mock.calls.length===1)).toBe(true)
   disposeExpansionInstanceState(state)
   for(const [geo,g,mat,m]of borrowed){expect(g).not.toHaveBeenCalled();expect(m).not.toHaveBeenCalled();geo.removeEventListener('dispose',g);mat.removeEventListener('dispose',m)}
   disposeExpansionRig(reference)
 })

 it('preserves non-color material flags and shader hooks across refresh without serializing materials',()=>{
   const state=createExpansionInstanceState(1)
   const tunings={'zombie-e19':{emissiveIntensity:.73,outlineOpacity:.43}}
   refreshExpansionInstanceTunings(state,tunings)
   const leaf=state.entries.get(17).find(e=>!e.leaf.userData.expansionOutline).leaf
   const material=leaf.material,hook=()=>{},cacheKey=()=> 'expansion-regression-shader'
   Object.assign(material,{opacity:.46,transparent:true,depthWrite:false,alphaTest:.13,toneMapped:false,side:THREE.DoubleSide,onBeforeCompile:hook,customProgramCacheKey:cacheKey})
   refreshExpansionInstanceTunings(state,tunings)
   const entry=state.entries.get(17).find(e=>e.leaf===leaf)
   expect(entry.bucket.mesh.material).toBe(material)
   expect(entry.bucket.mesh.material.opacity).toBe(.46)
   expect(entry.bucket.mesh.material.depthWrite).toBe(false)
   expect(entry.bucket.mesh.material.onBeforeCompile).toBe(hook)
   expect(entry.flashBucket.mesh.material.onBeforeCompile).toBe(hook)
   expect(entry.flashBucket.mesh.material.customProgramCacheKey).toBe(cacheKey)
   expect(entry.flashBucket.mesh.material.opacity).toBe(.46)
   disposeExpansionInstanceState(state)
 })
 it('renders code17 and code31 via real matrices, omits bosses and legacy codes, clears on slot reuse',()=>{
   const state=createExpansionInstanceState(150),pool=poolFixture()
   refreshExpansionInstanceTunings(state,{})
   const frame={time:1,cameraQuaternion:new THREE.Quaternion()}
   updateExpansionInstances(state,pool,frame)
   expect(state.buckets.reduce((n,b)=>n+b.mesh.count,0)).toBeGreaterThan(20)
   expect(state.health.count).toBe(1)
   const matrix=new THREE.Matrix4();state.buckets.find(b=>b.mesh.count).mesh.getMatrixAt(0,matrix)
   expect(matrix.elements.every(Number.isFinite)).toBe(true)
   pool.type[0]=31;updateExpansionInstances(state,pool,frame)
   expect(state.buckets.reduce((n,b)=>n+b.mesh.count,0)).toBeGreaterThan(20)
   for(const code of [1,16,32,36]){pool.type[0]=code;updateExpansionInstances(state,pool,frame);expect(state.buckets.every(b=>b.mesh.count===0)).toBe(true);expect(state.health.count).toBe(0)}
   pool.type[0]=17;pool.active[0]=0;updateExpansionInstances(state,pool,frame)
   expect(state.buckets.every(b=>b.mesh.count===0)).toBe(true)
   disposeExpansionInstanceState(state)
 })
 it('uses the same canonical part tuning on instance output and never leaves NaN matrices',()=>{
   const state=createExpansionInstanceState(150),pool=poolFixture()
   refreshExpansionInstanceTunings(state,{'zombie-e19::part::0.0.0.0':{scaleX:1.6,positionX:.3},'zombie-e19::group::0.0+0.1':{rotationZ:25}})
   updateExpansionInstances(state,pool,{time:2,cameraQuaternion:new THREE.Quaternion()})
   for(const b of state.buckets)for(let i=0;i<b.mesh.count*16;i++)expect(Number.isFinite(b.mesh.instanceMatrix.array[i])).toBe(true)
   const rig=state.rigs.get(17)
   expect(rig.children[0].children[0].children[0].children[0].userData.studioPartScaleMultiplier.x).toBeCloseTo(1.6)
   expect(state.buckets.length).toBeLessThanOrEqual([...state.leaves.values()].flat().length*2)
   expect(state.smoke.count).toBe(0)
   pool.spawnTimer[0]=100;updateExpansionInstances(state,pool,{time:2,cameraQuaternion:new THREE.Quaternion()})
   expect(state.buckets.every(b=>b.mesh.count===0)).toBe(true)
   expect(state.smoke.count).toBe(3)
   disposeExpansionInstanceState(state)
 })
})
