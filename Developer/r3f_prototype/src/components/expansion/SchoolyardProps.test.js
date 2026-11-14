// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createExpansionEnvironment, animateExpansionEnvironment, disposeExpansionEnvironment, SCHOOLYARD_STATIC_BATCH_ORDER } from './expansionEnvironment.js'
import { SCHOOLYARD_PROP_IDS, SCHOOLYARD_PROP_TRIANGLE_BUDGET } from './schoolyardProps.js'
import { getStageBounds } from '../../lib/stageConfig.js'

beforeAll(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect(){}}))

describe('stage6 hand-built schoolyard props',()=>{
 it('builds all six props within their triangle budgets, outside the arena, without moving Studio part slots',()=>{
   const {halfX,halfZ}=getStageBounds('stage6')
   const root=createExpansionEnvironment('stage6',{halfX,halfZ})
   // Root slots 0-2 are unchanged; the props are appended as slot 3.
   expect(root.children.map(c=>c.name)).toEqual(['authored-static-volumes','stage6-gate-doors','schoolyard-bounded-spectacle','schoolyard-hand-built-props'])
   // Pre-existing static batches keep their child index (retired ones stay as empty groups).
   const slots=root.children[0].children.map(c=>c.name.replace(/^schoolyard-/,'').replace(/-retired/,''))
   const expected=SCHOOLYARD_STATIC_BATCH_ORDER.flatMap(k=>k.endsWith(':flat')?[`${k}-solid`]:[`${k}-solid`,`${k}-outline`])
   expect(slots.slice(0,expected.length)).toEqual(expected)
   const props=root.userData.schoolyardProps
   expect(props.children.map(c=>c.name)).toEqual(['schoolyard-prop-goals','schoolyard-prop-podium','schoolyard-prop-flagpoles','schoolyard-prop-pa-horns','schoolyard-prop-jungle-gym','schoolyard-prop-grandstand'])
   for(const id of SCHOOLYARD_PROP_IDS) {
     const tris=props.userData.propTriangles[id]
     expect(tris.solid,id).toBeGreaterThanOrEqual(100)
     expect(tris.solid,id).toBeLessThanOrEqual(SCHOOLYARD_PROP_TRIANGLE_BUDGET[id])
     expect(tris.outline,id).toBeGreaterThan(0)
     expect(tris.outline,id).toBeLessThanOrEqual(SCHOOLYARD_PROP_TRIANGLE_BUDGET[id])
   }
   // Draw-call ceiling: one solid + one outline per prop, plus the goal net and the waving flags.
   let meshes=0;props.traverse(n=>{if(n.isMesh)meshes++})
   expect(meshes).toBe(SCHOOLYARD_PROP_IDS.length*2+2)
   // Everything except the goals stays beyond the playable edges (visual only, never in the arena).
   props.updateMatrixWorld(true)
   const v=new THREE.Vector3()
   for(const prop of props.children.slice(1))prop.traverse(mesh=>{
     if(!mesh.isMesh)return
     const pos=mesh.geometry.attributes.position;let inside=0
     for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);if(Math.abs(v.x)<halfX-1e-6&&Math.abs(v.z)<halfZ-1e-6)inside++}
     expect(inside,mesh.name).toBe(0)
   })
   // Flags wave through a shader uniform; reduced motion freezes it.
   const uniforms=props.userData.flagUniforms
   animateExpansionEnvironment(root,2.5)
   expect(uniforms.uFlagTime.value).toBe(2.5)
   animateExpansionEnvironment(root,9,true)
   expect(uniforms.uFlagTime.value).toBe(2.5)
   // Studio isolates materials with clone(); the shader patches must survive it.
   const flags=root.getObjectByName('schoolyard-prop-flags')
   const clone=flags.material.clone()
   expect(clone.onBeforeCompile).toBe(flags.material.onBeforeCompile)
   expect(clone.customProgramCacheKey()).toBe('schoolyard-flag-wave-v1')
   clone.dispose()
   disposeExpansionEnvironment(root)
 })
})
