// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import * as THREE from 'three'
import {EXPANSION_BOSSES,EXPANSION_ENEMIES} from '../../lib/expansionContent.js'
import {createExpansionAttackState,stepExpansionAttack,clearExpansionAttacks,expansionAttackContains} from '../../lib/expansionAttackRuntime.js'
import {B05_CHANT_TELEGRAPH,createExpansionTelegraphVisual,disposeExpansionTelegraphVisual,EXPANSION_TELEGRAPH_FILL,isB05ChantTelegraph} from './expansionTelegraphs.js'
import {syncExpansionTelegraphs} from './ExpansionHazardLayer.jsx'
import {TELEGRAPH_FEATHER} from '../../lib/telegraphStyle.js'
const args={x:1.31,z:-2.17,playerX:1.36,playerZ:-2.10,alive:true,playing:true,deltaMs:1,gameKey:0,hpRatio:1}
afterEach(clearExpansionAttacks)
function snapshot(type,index){clearExpansionAttacks();const state=createExpansionAttackState(type,`cue:${type}:${index}`);state.nextMs=0;state.patternIndex=index;stepExpansionAttack(state,args);expect(state.snapshot).toBeTruthy();return state.snapshot}
// Independent convex half-plane oracle; do not use gameplay's contains helper.
function inPolygon(p,x,z){let pos=false,neg=false;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);if(c>2e-5)pos=true;if(c< -2e-5)neg=true}return !(pos&&neg)}
// 2026-11-14 Terry "경고그래픽 굵은테두리 없애고 원형 색상만": the floor warning is ONE translucent fill
// in the warning colour. No edge band, no grayscale hatch, no white shrinking countdown.
function allMeshes(root){const found=[];root.traverse(n=>{if(n.isMesh)found.push(n)});return found}
// 2026-11-22 Terry "끝에 블러": a soft feather band (same fill material, vertex alpha 1→0) hugs the fill from OUTSIDE.
// The opaque core is still exactly the damage pieces; the feather only reaches widthUnits past their boundary.
const isFeather=m=>m.name===TELEGRAPH_FEATHER.name
function coreMeshes(root){return allMeshes(root).filter(m=>!isFeather(m))}
function distToPolygons(polygons,x,z){let best=Infinity;for(const p of polygons){if(inPolygon(p,x,z))return 0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=l2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l2)):0;best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz))}}return best}
function verifyFillOnly(root){
 const list=allMeshes(root).filter(m=>m.name!=='b10-stamp-decal')
 expect(list.length).toBeGreaterThan(0)
 for(const m of list){expect(m.material).toBe(root.userData.fillMat);expect(m.userData.warningCue).toBeUndefined()}
 expect(root.userData.edgeMat).toBeUndefined();expect(root.userData.hatchMat).toBeUndefined();expect(root.userData.shrinkMat).toBeUndefined();expect(root.userData.warningCues).toBeUndefined()
}
function verifyInside(root,polygons){root.updateMatrixWorld(true);const v=new THREE.Vector3();for(const mesh of coreMeshes(root)){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i+=3){const x=(a.getX(i)+a.getX(i+1)+a.getX(i+2))/3,z=(a.getZ(i)+a.getZ(i+1)+a.getZ(i+2))/3;v.set(x,0,z).applyMatrix4(mesh.matrixWorld);expect(polygons.some(p=>inPolygon(p,v.x,v.z)),'fill triangle centroid').toBe(true)}}
 const feathers=allMeshes(root).filter(isFeather);expect(feathers.length,'one soft edge band').toBe(1)
 for(const mesh of feathers){const a=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;for(let i=0;i<a.count;i++){v.set(a.getX(i),0,a.getZ(i)).applyMatrix4(mesh.matrixWorld);const d=distToPolygons(polygons,v.x,v.z);expect(d,'feather vertex within band').toBeLessThanOrEqual(TELEGRAPH_FEATHER.widthUnits+1e-4);if(c.getW(i)===1)expect(d,'full-alpha feather vertex sits on the fill boundary').toBeLessThan(1e-4)}}}
for(const b of Object.values(EXPANSION_BOSSES))for(let i=0;i<b.patterns.length;i++)it(`${b.patterns[i].id}: warning is a borderless fill clipped to the real damage pieces; opacity rises with windup only`,()=>{
 const s=snapshot(b.id,i),saved=JSON.stringify(s),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);const root=group.children[0]
 verifyFillOnly(root);verifyInside(root,s.safetyPolygons)
 const F=EXPANSION_TELEGRAPH_FILL,footprint=Array.from(root.children[0].geometry.attributes.position.array)
 // 2026-11-22 Terry: Stage 6 B05 교가 제창(b05_p2) 십자만 0에서 서서히 나타나고(가운데서 펼쳐짐) 타격 순간 한 번 번쩍인다.
 // 지오메트리(footprint)는 그대로 — 배율은 root에만 걸리고 windup 중반·타격 순간에는 정확히 1이다.
 const chant=isB05ChantTelegraph(s)
 expect(root.userData.fillMat.color.getHexString()).toBe(F.color.slice(1));expect(root.userData.fillMat.opacity).toBeCloseTo(chant?0:F.windupOpacity,6)
 expect(root.scale.x).toBeCloseTo(chant?B05_CHANT_TELEGRAPH.startScale:1,6)
 s.elapsedMs=s.windupMs/2;syncExpansionTelegraphs(group,cache,[s]);expect(group.children[0]).toBe(root);expect(root.userData.fillMat.opacity).toBeCloseTo(F.windupOpacity+F.windupOpacityGain/2,6);expect(root.scale.x).toBe(1)
 expect(Array.from(root.children[0].geometry.attributes.position.array)).toEqual(footprint)
 s.elapsedMs=s.windupMs;s.phase='active';syncExpansionTelegraphs(group,cache,[s]);const hit=group.children[0];verifyFillOnly(hit)
 expect(hit.userData.fillMat.opacity).toBeCloseTo(chant?F.activeOpacity+B05_CHANT_TELEGRAPH.impactFlashOpacity:F.activeOpacity,6);expect(hit.scale.x).toBe(1);expect(Array.from(hit.children[0].geometry.attributes.position.array)).toEqual(footprint)
 expect(JSON.stringify({...s,phase:'windup',elapsedMs:0})).toBe(saved)
 syncExpansionTelegraphs(group,cache,[])
})
it('draws no bridge across disconnected wall pieces, boundary or the annulus hole',()=>{
 const polygons=[[[6,-1],[7.5,-1],[7.5,0],[6,0]],[[-2,1],[-1,1],[-1,3],[-2,3]],[[1,1],[2,1],[1,2]]]
 const s={shape:'annulus',rangeUnits:4,widthUnits:.5,originXZ:[1.3,-2.7],safetyPolygons:polygons,phase:'windup',elapsedMs:0,windupMs:1600,key:'clip'}
 const group=new THREE.Group(),cache=new Map();for(const elapsedMs of [0,800,1600]){s.elapsedMs=elapsedMs;syncExpansionTelegraphs(group,cache,[s]);verifyFillOnly(group.children[0]);verifyInside(group,polygons)}
 const ray=new THREE.Raycaster(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0));group.updateMatrixWorld(true);expect(ray.intersectObjects(allMeshes(group),false)).toHaveLength(0)
 syncExpansionTelegraphs(group,cache,[])
})
it('uses gameplay elapsed only: pause freezes, progress clamps, footprint never mutates',()=>{
 const s=snapshot('B08',1),group=new THREE.Group(),cache=new Map(),before=JSON.stringify(s.safetyPolygons),F=EXPANSION_TELEGRAPH_FILL;syncExpansionTelegraphs(group,cache,[s]);const root=group.children[0],first=root.userData.fillMat.opacity
 stepExpansionAttack({snapshot:s,cancelled:false,gameKey:0,result:{}},{...args,playing:false,deltaMs:10000});syncExpansionTelegraphs(group,cache,[s]);expect(root.userData.fillMat.opacity).toBe(first)
 s.elapsedMs=s.windupMs+99999;syncExpansionTelegraphs(group,cache,[s]);expect(root.userData.fillMat.opacity).toBeCloseTo(F.windupOpacity+F.windupOpacityGain,6)
 s.elapsedMs=-10;syncExpansionTelegraphs(group,cache,[s]);expect(root.userData.fillMat.opacity).toBeCloseTo(F.windupOpacity,6)
 expect(JSON.stringify(s.safetyPolygons)).toBe(before);syncExpansionTelegraphs(group,cache,[])
})
it('disposes every buffer and the fill material exactly once on phase/reset/removal and creates fresh reentry',()=>{
 const s=snapshot('B06',1),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);const old=group.children[0],geometries=new Set(),materials=new Set();old.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);materials.add(n.material)}})
 expect(materials.size).toBe(1)
 const spies=[...geometries,...materials].map(o=>vi.spyOn(o,'dispose'))
 s.phase='active';syncExpansionTelegraphs(group,cache,[s]);spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));expect(group.children[0]).not.toBe(old)
 s.phase='recovery';syncExpansionTelegraphs(group,cache,[s]);expect(group.children).toHaveLength(0);expect(cache.size).toBe(0)
 s.phase='windup';syncExpansionTelegraphs(group,cache,[s]);verifyFillOnly(group.children[0]);syncExpansionTelegraphs(group,cache,[]);expect(cache.size).toBe(0);spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1))
})
it('covers every normal special warning with a borderless fill without altering source snapshots',()=>{
 for(const e of Object.values(EXPANSION_ENEMIES).filter(e=>e.behaviorId!=='chase')){
   const s=snapshot(e.id,0),saved=JSON.stringify(s),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);verifyFillOnly(group.children[0]);verifyInside(group,s.safetyPolygons);expect(JSON.stringify(s)).toBe(saved);syncExpansionTelegraphs(group,cache,[])
 }
})
it('retains buffers across 60 progress updates (opacity-only update, no vertex upload)',()=>{
 for(const [type,index]of [['B06',1],['B09',0],['B09',1]]){
   const s=snapshot(type,index),group=new THREE.Group(),cache=new Map();syncExpansionTelegraphs(group,cache,[s]);const root=group.children[0],all=allMeshes(root)
   const geometry=all.map(n=>n.geometry),versions=all.map(n=>n.geometry.attributes.position.version)
   for(let frame=1;frame<=60;frame++){s.elapsedMs=s.windupMs*frame/61;syncExpansionTelegraphs(group,cache,[s])}
   expect(group.children[0]).toBe(root);all.forEach((n,i)=>expect(n.geometry).toBe(geometry[i]));expect(all.map(n=>n.geometry.attributes.position.version)).toEqual(versions)
   syncExpansionTelegraphs(group,cache,[])
 }
})
it('does not invent an unclipped overlay for empty authoritative geometry or legacy authored-only visuals',()=>{
 for(const safetyPolygons of [[],undefined]){const root=createExpansionTelegraphVisual({shape:'disk',rangeUnits:1,phase:'windup',safetyPolygons});verifyFillOnly(root);disposeExpansionTelegraphVisual(root)}
 const s=snapshot('B09',0);const sample=[[-8,0],[0,0],[1.6,1.6]];const damage=sample.map(([x,z])=>expansionAttackContains(s,x,z,.192));const root=createExpansionTelegraphVisual(s);disposeExpansionTelegraphVisual(root);expect(sample.map(([x,z])=>expansionAttackContains(s,x,z,.192))).toEqual(damage)
})
