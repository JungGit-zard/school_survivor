// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createExpansionEnvironment, animateExpansionEnvironment, disposeExpansionEnvironment, SCHOOLYARD_GATE_OPEN_SLIDE } from './expansionEnvironment.js'
import { createExpansionTelegraphVisual, disposeExpansionTelegraphVisual, EXPANSION_PATTERN_SHAPES } from './expansionTelegraphs.js'
import { EXPANSION_STAGE_VISUALS } from '../../lib/expansionVisuals.js'
import { GRAPHICS_STUDIO_CATALOG } from '../../lib/graphicsStudioConfig.js'
import { getStageLightingProfile } from '../../lib/stageLightingProfile.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { EXPANSION_STAGES } from '../../lib/expansionContent.js'
import { EXPANSION_VISUALS } from '../../lib/expansionVisuals.js'

beforeAll(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect(){}}))
describe('five elaborate bounded expansion sets',()=>{
 for(const stageId of Object.keys(EXPANSION_STAGE_VISUALS)) it(`${stageId}: real volumetric art, clear arena and stable spectacle count`,()=>{
   // Stage 6 운동장 is laid out on its real 12×20 bounds (spec C-3-7); the drafts keep the shared fixture.
   const {halfX,halfZ}=stageId==='stage6'?getStageBounds('stage6'):{halfX:7.5,halfZ:19.2}
   const root=createExpansionEnvironment(stageId,{halfX,halfZ})
   expect(root.isGroup).toBe(true)
   expect(root.userData.staticPartCount).toBeGreaterThan(150)
   const landmark={stage6:'school-facade',stage7:'reaction',stage8:'starlight',stage9:'great',stage10:'sky'}[stageId]
   // Landmarks are batched by geometry/material; ensure their added transforms
   // expand actual scenery bounds, not merely descriptor names or counts.
   const box=new THREE.Box3().setFromObject(root)
   expect(box.max.y,landmark).toBeGreaterThan(5)
   expect(box.min.z).toBeLessThan(-halfZ)
   expect(box.max.x).toBeGreaterThan(halfX)
   expect(box.min.x).toBeLessThan(-halfX)
   expect(root.userData.decorationBounds.every(b=>b.minX>=halfX||b.maxX<=-halfX||b.minZ>=halfZ||b.maxZ<=-halfZ)).toBe(true)
   const before=[];root.traverse(n=>before.push(n.uuid))
   expect(root.userData.spectacle.children.length).toBe(EXPANSION_STAGE_VISUALS[stageId].spectacleCount)
   for(let frame=0;frame<240;frame++)animateExpansionEnvironment(root,frame/60)
   const after=[];root.traverse(n=>after.push(n.uuid))
   expect(after).toEqual(before)
   root.updateMatrixWorld(true)
   root.traverse(n=>expect(n.matrixWorld.elements.every(Number.isFinite)).toBe(true))
   expect(GRAPHICS_STUDIO_CATALOG.find(i=>i.id===`stage-floor-${stageId}`)?.stageId).toBe(stageId)
   expect(getStageLightingProfile(stageId)).toHaveLength(3)
   expect(getStageLightingProfile(stageId).every(light=>light.castShadow===false)).toBe(true)
   const objects=before.length;animateExpansionEnvironment(root,100,true)
   expect(root.userData.spectacle.visible).toBe(false)
   expect(objects).toBe(after.length)
   disposeExpansionEnvironment(root)
 })
 it('stage6 schoolyard: outdoor ground, top landmarks, visible goals at the collider spots and a sliding gate',()=>{
   const {halfX,halfZ}=getStageBounds('stage6')
   const root=createExpansionEnvironment('stage6',{halfX,halfZ})
   expect(root.name).toBe('stage6-schoolyard-environment')
   expect(EXPANSION_STAGE_VISUALS.stage6).toMatchObject({theme:'schoolyard',label:'운동장 최후의 조회',floor:'#D8B57A',canvasBackground:'#7DBF68',spectacleCount:10})
   expect(EXPANSION_STAGE_VISUALS.stage6.ambient).toEqual({intensity:.6,color:'#FFF4DC',rimColor:'#FFF0C8'})
   const names=new Set();root.traverse(n=>names.add(n.name))
   const batchNames=[...names].join('\n')
   // Static parts are batched by shape/colour; the record names are counted instead.
   expect(root.userData.staticPartCount).toBeGreaterThan(150)
   expect(batchNames).not.toMatch(/library|bookcase|oculus/)
   // Goals are the only in-arena visuals and sit exactly on the solid obstacles.
   const obstacles=EXPANSION_STAGES.stage6.layout.obstacles
   expect(root.userData.obstacleVisualIds).toEqual(obstacles.map(o=>o.id))
   expect(root.userData.obstacleVisualIds).toEqual(['exp_s6_goal_north','exp_s6_goal_south'])
   // The hand-built goal frames (schoolyardProps.js) fill each collider rectangle and never spill out of it.
   const goals=root.getObjectByName('schoolyard-prop-goals-solid')
   expect(goals?.isMesh).toBe(true)
   const pos=goals.geometry.attributes.position,v=new THREE.Vector3()
   for(const o of obstacles) {
     const inside=new THREE.Box3()
     for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);if(Math.abs(v.z-o.zUnits)<=o.halfZUnits+1e-6)inside.expandByPoint(v)}
     expect(inside.isEmpty(),o.id).toBe(false)
     expect(inside.min.x).toBeCloseTo(o.xUnits-o.halfXUnits,1)
     expect(inside.max.x).toBeCloseTo(o.xUnits+o.halfXUnits,1)
     expect(inside.max.y).toBeGreaterThan(1.3)
   }
   // Gate leaves slide ±2.6u over 1s once the escape portal opens; reduced motion snaps open.
   const [left,right]=root.userData.gateLeaves
   animateExpansionEnvironment(root,0,false,{gateOpen:false})
   animateExpansionEnvironment(root,.5,false,{gateOpen:true})
   expect(left.position.x).toBeCloseTo(-SCHOOLYARD_GATE_OPEN_SLIDE*.5,6)
   animateExpansionEnvironment(root,2,false,{gateOpen:true})
   expect(right.position.x).toBeCloseTo(SCHOOLYARD_GATE_OPEN_SLIDE,6)
   animateExpansionEnvironment(root,2.1,false,{gateOpen:false})
   expect(left.position.x).toBe(0)
   animateExpansionEnvironment(root,2.2,true,{gateOpen:true})
   expect(left.position.x).toBeCloseTo(-SCHOOLYARD_GATE_OPEN_SLIDE,6)
   expect(getStageLightingProfile('stage6').map(l=>l.color)).toEqual(['#FFF3D6','#FFFFFF','#FFE9B8'])
   disposeExpansionEnvironment(root)
 })
 it('stage6 roster: 운동장 labels and silhouettes replace the library set',()=>{
   expect(EXPANSION_VISUALS.B05.label).toBe('교장 선생님 좀비')
   expect([EXPANSION_VISUALS.E19.label,EXPANSION_VISUALS.E20.label,EXPANSION_VISUALS.E21.label]).toEqual(['조회 줄서기 좀비','국민체조 좀비','계주 바통 좀비'])
   expect([EXPANSION_VISUALS.E19.typeCode,EXPANSION_VISUALS.E20.typeCode,EXPANSION_VISUALS.E21.typeCode,EXPANSION_VISUALS.B05.typeCode]).toEqual([17,18,19,32])
   const gearNames=(id)=>EXPANSION_VISUALS[id].rig.find(g=>g.name==='gear').children.map(c=>c.name)
   expect(gearNames('B05')).toContain('gear-mic')
   expect(gearNames('B05')).toHaveLength(10)
   for(const id of ['E19','E20','E21'])expect(gearNames(id),id).toHaveLength(3)
   const arm=(id,side)=>EXPANSION_VISUALS[id].rig.find(g=>g.name===side).rotation
   expect(arm('E19','armL')).toEqual([-1.45,0,-.05])
   expect(arm('E20','armR')).toEqual([0,0,1.45])
   expect(EXPANSION_VISUALS.E21.rig.find(g=>g.name==='body').rotation).toEqual([.25,0,0])
   expect(arm('B05','armR')).toEqual([-1.9,0,.3])
 })
 it('exports real event-driven warnings with bounded finite dimensions, never runs gameplay clocks',()=>{
   expect(Object.keys(EXPANSION_PATTERN_SHAPES).length).toBeGreaterThanOrEqual(5)
   for(const shape of ['circle','ring','line','cross','fan'])for(const phase of ['telegraph','active']){
     const visual=createExpansionTelegraphVisual({shape,phase,x:2,z:-3,yaw:1,radius:1.5,length:4,width:.6,progress:.5})
     expect(visual?.children.length).toBeGreaterThan(0)
     expect(visual.position.toArray()).toEqual([2,.035,-3])
     visual.updateMatrixWorld(true);visual.traverse(n=>expect(n.matrixWorld.elements.every(Number.isFinite)).toBe(true))
     disposeExpansionTelegraphVisual(visual)
   }
   expect(createExpansionTelegraphVisual({shape:'unknown'})).toBe(null)
   expect(createExpansionTelegraphVisual({shape:'circle',radius:NaN})).toBe(null)
   expect(createExpansionTelegraphVisual({shape:'line',x:Infinity,length:2,width:1})).toBe(null)
 })
})
