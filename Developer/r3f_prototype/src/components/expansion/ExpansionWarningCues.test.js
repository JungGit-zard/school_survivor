// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import * as THREE from 'three'
import {EXPANSION_BOSSES,EXPANSION_ENEMIES} from '../../lib/expansionContent.js'
import {createExpansionAttackState,stepExpansionAttack,clearExpansionAttacks,expansionAttackContains} from '../../lib/expansionAttackRuntime.js'
import {createExpansionTelegraphVisual,disposeExpansionTelegraphVisual} from './expansionTelegraphs.js'
import {syncExpansionTelegraphs} from './ExpansionHazardLayer.jsx'
const args={x:1.31,z:-2.17,playerX:1.36,playerZ:-2.10,alive:true,playing:true,deltaMs:1,gameKey:0,hpRatio:1}
afterEach(clearExpansionAttacks)
function snapshot(type,index){clearExpansionAttacks();const state=createExpansionAttackState(type,`cue:${type}:${index}`);state.nextMs=0;state.patternIndex=index;stepExpansionAttack(state,args);expect(state.snapshot).toBeTruthy();return state.snapshot}
function meshes(root,kind){const found=[];root.traverse(n=>{if(n.isMesh&&n.userData.warningCue===kind)found.push(n)});return found}
// Independent convex half-plane oracle; do not use gameplay's contains helper.
function inPolygon(p,x,z){let pos=false,neg=false;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);if(c>2e-5)pos=true;if(c< -2e-5)neg=true}return !(pos&&neg)}
function verifyClipped(root,polygons){root.updateMatrixWorld(true);const v=new THREE.Vector3();for(const kind of ['hatch','shrink'])for(const mesh of meshes(root,kind)){const a=mesh.geometry.attributes.position;expect(a.count).toBeGreaterThan(0);for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);expect(polygons.some(p=>inPolygon(p,v.x,v.z)),`${kind} vertex ${v.x},${v.z}`).toBe(true)}for(let i=0;i<a.count;i+=3){const x=(a.getX(i)+a.getX(i+1)+a.getX(i+2))/3,z=(a.getZ(i)+a.getZ(i+1)+a.getZ(i+2))/3;v.set(x,0,z).applyMatrix4(mesh.matrixWorld);expect(polygons.some(p=>inPolygon(p,v.x,v.z)),`${kind} triangle centroid`).toBe(true)}}}
function vertices(root,kind){return meshes(root,kind).flatMap(m=>Array.from(m.geometry.attributes.position.array))}
function triangleArea(root,kind){let sum=0;for(const m of meshes(root,kind)){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i+=3)sum+=Math.abs((a.getX(i+1)-a.getX(i))*(a.getZ(i+2)-a.getZ(i))-(a.getZ(i+1)-a.getZ(i))*(a.getX(i+2)-a.getX(i)))/2}return sum}
for(const b of Object.values(EXPANSION_BOSSES))for(let i=0;i<b.patterns.length;i++)it(`${b.patterns[i].id}: warning has real clipped grayscale hatch and shrinking geometry; active has neither`,()=>{
 const s=snapshot(b.id,i),saved=JSON.stringify(s),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);const root=group.children[0]
 expect(meshes(root,'hatch').length).toBeGreaterThan(0);expect(meshes(root,'shrink').length).toBeGreaterThan(0)
 for(const kind of ['hatch','shrink'])for(const mesh of meshes(root,kind)){const c=mesh.material.color;expect(c.r).toBe(c.g);expect(c.g).toBe(c.b);expect(mesh.material.opacity).toBeGreaterThan(.5)}
 verifyClipped(root,s.safetyPolygons);const footprint=Array.from(root.children[0].geometry.attributes.position.array),hatch=vertices(root,'hatch'),start=triangleArea(root,'shrink')
 expect(start).toBeGreaterThan(0);s.elapsedMs=s.windupMs/2;syncExpansionTelegraphs(group,cache,[s]);expect(group.children[0]).toBe(root);expect(triangleArea(root,'shrink')).toBeLessThan(start*.4);verifyClipped(root,s.safetyPolygons)
 expect(vertices(root,'hatch')).toEqual(hatch);expect(Array.from(root.children[0].geometry.attributes.position.array)).toEqual(footprint)
 s.elapsedMs=s.windupMs;s.phase='active';syncExpansionTelegraphs(group,cache,[s]);expect(meshes(group,'hatch')).toHaveLength(0);expect(meshes(group,'shrink')).toHaveLength(0)
 expect(Array.from(group.children[0].children[0].geometry.attributes.position.array)).toEqual(footprint)
 expect(JSON.stringify({...s,phase:'windup',elapsedMs:0})).toBe(saved)
 syncExpansionTelegraphs(group,cache,[])
})
it('clips hatch and countdown to disconnected wall pieces, boundary and annulus hole without bridging safe gaps',()=>{
 const polygons=[[[6,-1],[7.5,-1],[7.5,0],[6,0]],[[-2,1],[-1,1],[-1,3],[-2,3]],[[1,1],[2,1],[1,2]]]
 const s={shape:'annulus',rangeUnits:4,widthUnits:.5,originXZ:[1.3,-2.7],safetyPolygons:polygons,phase:'windup',elapsedMs:0,windupMs:1600,key:'clip'}
 const group=new THREE.Group(),cache=new Map();for(const elapsedMs of [0,400,800,1200,1599,1600]){s.elapsedMs=elapsedMs;syncExpansionTelegraphs(group,cache,[s]);expect(meshes(group,'hatch').length).toBeGreaterThan(0);verifyClipped(group,polygons)}
 const ray=new THREE.Raycaster(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0));group.updateMatrixWorld(true);expect(ray.intersectObjects([...meshes(group,'hatch'),...meshes(group,'shrink')],false)).toHaveLength(0)
 syncExpansionTelegraphs(group,cache,[])
})
it('uses gameplay elapsed only: pause freezes, progress clamps, no footprint mutation, no last-frame flash or reused-buffer bounds',()=>{
 const s=snapshot('B08',1),group=new THREE.Group(),cache=new Map(),before=JSON.stringify(s.safetyPolygons);syncExpansionTelegraphs(group,cache,[s]);const root=group.children[0],first=vertices(root,'shrink'),mesh=meshes(root,'shrink')[0],geometry=mesh.geometry
 geometry.computeBoundingSphere();const initialSphere=geometry.boundingSphere.clone()
 stepExpansionAttack({snapshot:s,cancelled:false,gameKey:0,result:{}},{...args,playing:false,deltaMs:10000});syncExpansionTelegraphs(group,cache,[s]);expect(vertices(root,'shrink')).toEqual(first)
 s.elapsedMs=s.windupMs*.75;syncExpansionTelegraphs(group,cache,[s]);expect(mesh.geometry).toBe(geometry);expect(mesh.frustumCulled).toBe(false);expect(initialSphere.radius).toBeGreaterThan(0)
 s.elapsedMs=s.windupMs+99999;syncExpansionTelegraphs(group,cache,[s]);expect(triangleArea(root,'shrink')).toBe(0)
 s.elapsedMs=-10;syncExpansionTelegraphs(group,cache,[s]);expect(vertices(root,'shrink')).toEqual(first)
 expect(JSON.stringify(s.safetyPolygons)).toBe(before);syncExpansionTelegraphs(group,cache,[])
})
it('disposes all added buffers and shared cue materials exactly once on phase/reset/removal and creates fresh reentry',()=>{
 const s=snapshot('B06',1),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);const old=group.children[0],geometries=new Set(),materials=new Set();old.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);materials.add(n.material)}})
 const spies=[...geometries,...materials].map(o=>vi.spyOn(o,'dispose'))
 s.phase='active';syncExpansionTelegraphs(group,cache,[s]);spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));expect(group.children[0]).not.toBe(old)
 s.phase='recovery';syncExpansionTelegraphs(group,cache,[s]);expect(group.children).toHaveLength(0);expect(cache.size).toBe(0)
 s.phase='windup';syncExpansionTelegraphs(group,cache,[s]);expect(meshes(group,'hatch').length).toBeGreaterThan(0);syncExpansionTelegraphs(group,cache,[]);expect(cache.size).toBe(0);spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1))
})
it('covers every normal special warning without altering source snapshots',()=>{
 for(const e of Object.values(EXPANSION_ENEMIES).filter(e=>e.behaviorId!=='chase')){
   const s=snapshot(e.id,0),saved=JSON.stringify(s),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);expect(meshes(group,'hatch').length,e.id).toBeGreaterThan(0);expect(triangleArea(group,'shrink'),e.id).toBeGreaterThan(0);verifyClipped(group,s.safetyPolygons);expect(JSON.stringify(s)).toBe(saved);syncExpansionTelegraphs(group,cache,[])
 }
})
it('retains buffers across 60 progress updates and does no upload at frozen gameplay time; records CPU geometry cost, not GPU acceptance',()=>{
 const receipts=[]
 for(const [type,index]of [['B06',1],['B09',0],['B09',1]]){
   const s=snapshot(type,index),group=new THREE.Group(),cache=new Map(),t=performance.now();syncExpansionTelegraphs(group,cache,[s]);const startupMs=performance.now()-t,root=group.children[0],all=[];root.traverse(n=>{if(n.isMesh)all.push(n)})
   const geometry=all.map(n=>n.geometry),arrays=all.map(n=>n.geometry.attributes.position.array),t1=performance.now()
   for(let frame=1;frame<=60;frame++){s.elapsedMs=s.windupMs*frame/61;syncExpansionTelegraphs(group,cache,[s])}
   const update60Ms=performance.now()-t1
   all.forEach((n,i)=>{expect(n.geometry).toBe(geometry[i]);expect(n.geometry.attributes.position.array).toBe(arrays[i])})
   const versions=all.map(n=>n.geometry.attributes.position.version);for(let frame=0;frame<60;frame++)syncExpansionTelegraphs(group,cache,[s]);expect(all.map(n=>n.geometry.attributes.position.version)).toEqual(versions)
   receipts.push({pattern:s.patternId,polygons:s.safetyPolygons.length,meshes:all.length,warningVertices:[...meshes(root,'hatch'),...meshes(root,'shrink')].reduce((sum,n)=>sum+n.geometry.attributes.position.count,0),startupMs,update60Ms})
   syncExpansionTelegraphs(group,cache,[])
 }
 console.log('WARNING_CUE_CPU_FIXTURE',JSON.stringify(receipts))
})
it('does not invent an unclipped overlay for empty authoritative geometry or legacy authored-only visuals',()=>{
 for(const safetyPolygons of [[],undefined]){const root=createExpansionTelegraphVisual({shape:'disk',rangeUnits:1,phase:'windup',safetyPolygons});expect(meshes(root,'hatch')).toHaveLength(0);expect(meshes(root,'shrink')).toHaveLength(0);disposeExpansionTelegraphVisual(root)}
 const s=snapshot('B09',0);const sample=[[-8,0],[0,0],[1.6,1.6]];const damage=sample.map(([x,z])=>expansionAttackContains(s,x,z,.192));const root=createExpansionTelegraphVisual(s);disposeExpansionTelegraphVisual(root);expect(sample.map(([x,z])=>expansionAttackContains(s,x,z,.192))).toEqual(damage)
})
