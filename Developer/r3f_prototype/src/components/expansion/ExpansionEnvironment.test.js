// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createExpansionEnvironment, animateExpansionEnvironment, disposeExpansionEnvironment } from './expansionEnvironment.js'
import { createExpansionTelegraphVisual, disposeExpansionTelegraphVisual, EXPANSION_PATTERN_SHAPES } from './expansionTelegraphs.js'
import { EXPANSION_STAGE_VISUALS } from '../../lib/expansionVisuals.js'
import { GRAPHICS_STUDIO_CATALOG } from '../../lib/graphicsStudioConfig.js'
import { getStageLightingProfile } from '../../lib/stageLightingProfile.js'

beforeAll(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect(){}}))
describe('five elaborate bounded expansion sets',()=>{
 for(const stageId of Object.keys(EXPANSION_STAGE_VISUALS)) it(`${stageId}: real volumetric art, clear arena and stable spectacle count`,()=>{
   const root=createExpansionEnvironment(stageId,{halfX:7.5,halfZ:19.2})
   expect(root.isGroup).toBe(true)
   expect(root.userData.staticPartCount).toBeGreaterThan(150)
   const landmark={stage6:'oculus',stage7:'reaction',stage8:'starlight',stage9:'great',stage10:'sky'}[stageId]
   // Landmarks are batched by geometry/material; ensure their added transforms
   // expand actual scenery bounds, not merely descriptor names or counts.
   const box=new THREE.Box3().setFromObject(root)
   expect(box.max.y,landmark).toBeGreaterThan(5)
   expect(box.min.z).toBeLessThan(-19.2)
   expect(box.max.x).toBeGreaterThan(7.5)
   expect(box.min.x).toBeLessThan(-7.5)
   expect(root.userData.decorationBounds.every(b=>b.minX>=7.5||b.maxX<=-7.5||b.minZ>=19.2||b.maxZ<=-19.2)).toBe(true)
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
