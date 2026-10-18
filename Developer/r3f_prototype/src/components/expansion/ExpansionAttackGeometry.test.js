// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest'
import * as THREE from 'three'
import {EXPANSION_BOSSES,EXPANSION_ENEMIES} from '../../lib/expansionContent.js'
import {createExpansionAttackState,stepExpansionAttack,expansionAttackSnapshots,expansionAttackContains,clearExpansionAttacks} from '../../lib/expansionAttackRuntime.js'
import {createExpansionTelegraphVisual,disposeExpansionTelegraphVisual,EXPANSION_PATTERN_SHAPES} from './expansionTelegraphs.js'
import {syncExpansionTelegraphs} from './ExpansionHazardLayer.jsx'
const args={x:1.31,z:-2.17,playerX:2.1,playerZ:-1.1,alive:true,playing:true,deltaMs:1,gameKey:0,hpRatio:1}
function snapshot(type,index=0){clearExpansionAttacks();const state=createExpansionAttackState(type,`${type}:${index}`);state.patternIndex=index;state.nextMs=0;stepExpansionAttack(state,{...args,playerX:args.x+.05,playerZ:args.z+.07});return state.snapshot}
afterEach(clearExpansionAttacks)
describe('authoritative snapshot damage / rendered triangle coverage',()=>{
 const cases=Object.values(EXPANSION_BOSSES).flatMap(b=>b.patterns.map((p,i)=>[b.id,i,p.id]))
 for(const [type,index,id]of cases)it(`${id}: nonempty warning/active fill matches actual damage shape`,()=>{
   const s=snapshot(type,index);expect(s).toBeTruthy();expect(EXPANSION_PATTERN_SHAPES[id]).toBe(s.shape)
   verifyCoverage(s)
 })
 for(const e of Object.values(EXPANSION_ENEMIES).filter(e=>e.behaviorId!=='chase'))it(`${e.id} ${e.behaviorId}: normal attack has identical footprint`,()=>verifyCoverage(snapshot(e.id)))
 it('updates the same mutable map snapshots across phases and removes recovery/deleted attacks',()=>{
   const s=snapshot('B06',1),group=new THREE.Group(),cache=new Map()
   syncExpansionTelegraphs(group,cache,expansionAttackSnapshots);expect(group.children.length).toBe(1)
   expect(group.children[0].children.length).toBe(6)
   s.phase='active';syncExpansionTelegraphs(group,cache,expansionAttackSnapshots)
   expect(group.children[0].userData.fillMat.opacity).toBe(.30)
   s.phase='recovery';syncExpansionTelegraphs(group,cache,expansionAttackSnapshots);expect(group.children.length).toBe(0)
   s.phase='windup';syncExpansionTelegraphs(group,cache,expansionAttackSnapshots);expect(group.children.length).toBe(1)
   expansionAttackSnapshots.clear();syncExpansionTelegraphs(group,cache,expansionAttackSnapshots);expect(cache.size).toBe(0)
 })
})
function verifyCoverage(s){
 expect(s).toBeTruthy()
 for(const phase of ['windup','active']){
   const root=createExpansionTelegraphVisual({...s,phase});expect(root?.children.length).toBeGreaterThan(0)
   root.updateMatrixWorld(true)
   const fills=[];root.traverse(n=>{if(n.isMesh&&n.material===root.userData.fillMat)fills.push(n)})
   expect(fills.length).toBeGreaterThan(0);expect(root.userData.fillMat.opacity).toBeGreaterThan(0)
   const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),origin=new THREE.Vector3()
   let inside=0,outside=0
   const extent=s.rangeUnits+Math.max(0,...(s.offsetsUnits??[]).flat().map(Math.abs))+2
   for(let ix=-15;ix<=15;ix++)for(let iz=-15;iz<=15;iz++){
     const x=s.originXZ[0]+(ix+.137)*extent/14,z=s.originXZ[1]+(iz+.271)*extent/14
     const expected=expansionAttackContains(s,x,z,0)
     // Ignore polygonal circle tessellation/triangle boundary epsilon only.
     if([[.04,0],[-.04,0],[0,.04],[0,-.04]].some(([dx,dz])=>expansionAttackContains(s,x+dx,z+dz,0)!==expected))continue
     origin.set(x,20,z);ray.set(origin,down)
     expect(ray.intersectObjects(fills,false).length>0,`${s.patternId} ${phase} at ${x},${z}`).toBe(expected)
     expected?inside++:outside++
   }
   expect(inside).toBeGreaterThan(0);expect(outside).toBeGreaterThan(0)
   disposeExpansionTelegraphVisual(root)
 }
}
