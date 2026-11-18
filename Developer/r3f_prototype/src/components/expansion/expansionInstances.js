import * as THREE from 'three'
import { EXPANSION_VISUALS, isExpansionNormalCode } from '../../lib/expansionVisuals.js'
import { applySavedStudioPartTunings, applyStudioTuning, getStudioTransformProps } from '../StudioTunedGroup.jsx'
import { createExpansionRig, collectExpansionLeaves, animateExpansionRig, disposeExpansionRig } from './expansionRig.js'
import { getToonGradient } from '../../lib/toon.js'
import { ZOMBIE_LOOKS } from '../../lib/zombieLooks.js'
import { beginLookAccessories, createLookAccessoryMeshes, disposeLookAccessoryMeshes, endLookAccessories, getLookAccessoryPlan, writeLookAccessories } from '../zombieLookAccessories.js'

// Look variants (lib/zombieLooks.js, E19/E21 in Stage 6): per-instance colour multipliers on the existing
// batches (white = untouched, so every other type renders exactly as before), the look's build as a
// non-uniform root scale, and worn accessories in one shared instanced pair.
const LOOKS_BY_CODE=new Map(Object.values(EXPANSION_VISUALS).filter(d=>!d.boss&&ZOMBIE_LOOKS[d.id]).map(d=>[d.typeCode,ZOMBIE_LOOKS[d.id]]))
const LOOK_FIELD_BY_LEAF={coat:'shirt',sleeveL:'shirt',sleeveR:'shirt',trouserL:'pants',trouserR:'pants','head-shell':'skin',handL:'skin',handR:'skin','gear-cap':'cap','gear-cap-brim':'cap'}
const WHITE=new THREE.Color(1,1,1)

// Complete canonical material batches; bounded by twice the authored leaf count.
// Rebuilt on tuning refresh only. Batch cleanup never disposes borrowed resources.
const phaseOf=state=>state===2?'warn':state===3?'charge':state===4?'stun':'normal'
function dynamicMesh(geometry,material,capacity) {
 const mesh=new THREE.InstancedMesh(geometry,material,capacity)
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false
 return mesh
}
export function createExpansionInstanceState(capacity=200) {
 const rigs=new Map(),leaves=new Map(),buckets=[],entries=new Map(),group=new THREE.Group()
 for(const def of Object.values(EXPANSION_VISUALS).filter(d=>!d.boss)) {
   const rig=createExpansionRig(def.id)
   rigs.set(def.typeCode,rig);leaves.set(def.typeCode,collectExpansionLeaves(rig))
 }
 const shadow=dynamicMesh(new THREE.CircleGeometry(1,12),new THREE.MeshBasicMaterial({color:'#111524',transparent:true,opacity:.22,depthWrite:false}),capacity)
 const healthBack=dynamicMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#191824',depthTest:false}),capacity)
 const health=dynamicMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#80d7a3',depthTest:false}),capacity)
 healthBack.renderOrder=10;health.renderOrder=11
 const smoke=dynamicMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshToonMaterial({color:'#c7d6cb',gradientMap:getToonGradient(),transparent:true,opacity:.48,depthWrite:false}),capacity*3)
 const acc=createLookAccessoryMeshes(capacity);group.add(acc.body,acc.out)
 const lookFrames=new Map()
 for(const code of LOOKS_BY_CODE.keys()) {
   const list=leaves.get(code),head=list.find(l=>l.name==='head-shell'),coat=list.find(l=>l.name==='coat')
   lookFrames.set(code,{head:head.parent,body:coat.parent,headHalf:head.scale.toArray().map(v=>v/2),bodyHalf:coat.scale.toArray().map(v=>v/2)})
 }
 return {capacity,rigs,leaves,entries,buckets,group,shadow,healthBack,health,smoke,acc,lookFrames,ready:false,
   scratch:{headFrame:new THREE.Matrix4(),bodyFrame:new THREE.Matrix4(),parent:new THREE.Matrix4(),matrix:new THREE.Matrix4(),p:new THREE.Vector3(),q:new THREE.Quaternion(),s:new THREE.Vector3(),e:new THREE.Euler(),color:new THREE.Color(),up:new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0))}}
}
function clearBatches(state) {
 for(const b of state.buckets){state.group.remove(b.mesh);b.mesh.dispose();if(b.ownsMaterial)b.mesh.material.dispose()}
 state.buckets.length=0;state.entries.clear()
}
function rebuildMaterialBatches(state) {
 clearBatches(state)
 const specs=new Map()
 for(const [code,list]of state.leaves) {
   const counts=new Map(),entries=[]
   for(const leaf of list) {
     const material=leaf.material
     // Borrow the exact canonical material object, including shader hooks/maps,
     // transparency, emissive and stencil state. Never serialize or approximate it.
     const key=`${leaf.geometry.uuid}:${material.uuid}:${leaf.renderOrder}`
     let spec=specs.get(key)
     if(!spec){spec={key,leaf,max:0};specs.set(key,spec)}
     counts.set(key,(counts.get(key)??0)+1);entries.push({leaf,spec})
   }
   for(const [key,n]of counts)specs.get(key).max=Math.max(specs.get(key).max,n)
   state.entries.set(code,entries)
 }
 for(const spec of specs.values()) {
   const {leaf,max,key}=spec
   function batch(material,ownsMaterial=false){
     const mesh=dynamicMesh(leaf.geometry,material,state.capacity*max);mesh.renderOrder=leaf.renderOrder
     mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(state.capacity*max*3).fill(1),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
     const bucket={key,mesh,count:0,ownsMaterial};state.buckets.push(bucket);state.group.add(mesh);return bucket
   }
   spec.bucket=batch(leaf.material)
   if(!leaf.userData.expansionOutline){
     const flash=leaf.material.clone();flash.color.set('#ffffff')
     flash.onBeforeCompile=leaf.material.onBeforeCompile;flash.customProgramCacheKey=leaf.material.customProgramCacheKey
     spec.flashBucket=batch(flash,true)
   }
 }
 for(const entries of state.entries.values())for(const entry of entries){entry.bucket=entry.spec.bucket;entry.flashBucket=entry.spec.flashBucket;delete entry.spec}
 // Look colour = target colour / the leaf's (Studio-tuned) colour, per channel; null = keep the leaf colour.
 for(const [code,looks]of LOOKS_BY_CODE)for(const entry of state.entries.get(code)) {
   const field=LOOK_FIELD_BY_LEAF[entry.leaf.name],base=entry.leaf.material.color
   entry.lookMul=looks.map(look=>{
     const hex=field?look[field]:null
     if(hex==null)return null
     const c=new THREE.Color(hex);c.r/=Math.max(base.r,1e-3);c.g/=Math.max(base.g,1e-3);c.b/=Math.max(base.b,1e-3);return c
   })
 }
}
export function refreshExpansionInstanceTunings(state,tunings={}) {
 for(const [code,root]of state.rigs) {
   const def=Object.values(EXPANSION_VISUALS).find(d=>d.typeCode===code)
   const t=getStudioTransformProps(tunings[def.studioItemId])
   root.position.fromArray(t.position);root.rotation.fromArray(t.rotation);root.scale.fromArray(t.scale)
   // Canonical E01 pipeline, not a second packed transform implementation.
   applyStudioTuning(root,tunings[def.studioItemId])
   applySavedStudioPartTunings(root,def.studioItemId,tunings)
 }
 rebuildMaterialBatches(state)
 state.ready=true
}
function upload(mesh) {
 if(!mesh.count)return
 mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,mesh.count*16);mesh.instanceMatrix.needsUpdate=true
 if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,mesh.count*3);mesh.instanceColor.needsUpdate=true}
}
export function updateExpansionInstances(state,pool,{time=0,cameraQuaternion,reducedMotion=false,isVisible=null}={}) {
 for(const b of state.buckets){b.count=0;b.mesh.count=0}
 for(const mesh of [state.shadow,state.healthBack,state.health,state.smoke])mesh.count=0
 beginLookAccessories(state.acc)
 if(!state.ready||!pool){endLookAccessories(state.acc);return}
 const {p,q,s,e,matrix,parent,color,up,headFrame,bodyFrame}=state.scratch
 const limit=Math.min(state.capacity,pool.active.length)
 for(let i=0;i<limit;i++) {
   const code=pool.type[i]
   if(!pool.active[i]||!isExpansionNormalCode(code))continue
   const x=pool.posX[i],y=pool.posY[i],z=pool.posZ[i]
   if(!Number.isFinite(x+y+z)||(isVisible&&!isVisible(x,z)))continue
   const timer=pool.spawnTimer[i],scale=(pool.visualScale[i]||1)*.333
   if(timer<300) {
     const progress=Math.max(0,timer/300)
     for(let k=0;k<3;k++) {
       p.set(x+Math.sin(k*2.1)*scale*.5,y+scale*(.5+progress*.7),z+Math.cos(k*2.1)*scale*.4)
       s.setScalar(scale*(.35+progress*.5));matrix.compose(p,up,s);state.smoke.setMatrixAt(state.smoke.count++,matrix)
     }
     continue
   }
   const root=state.rigs.get(code)
   animateExpansionRig(root,time+i*.31,phaseOf(pool.state[i]),reducedMotion)
   root.updateMatrixWorld(true)
   const looks=LOOKS_BY_CODE.get(code),lookIndex=looks&&pool.look?pool.look[i]:0,look=lookIndex?looks[lookIndex]:null
   const flashing=pool.hitFlashTimer[i]>0
   p.set(x,y,z);e.set(0,pool.yaw[i]||0,0);q.setFromEuler(e);s.set(scale*(look?.scale?.[0]??1),scale*(look?.scale?.[1]??1),scale*(look?.scale?.[0]??1));parent.compose(p,q,s)
   for(const {leaf,bucket,flashBucket,lookMul}of state.entries.get(code)) {
     const target=flashing&&flashBucket?flashBucket:bucket
     const slot=target.count++
     matrix.multiplyMatrices(parent,leaf.matrixWorld);target.mesh.setMatrixAt(slot,matrix)
     target.mesh.setColorAt(slot,(!flashing&&lookMul?.[lookIndex])||WHITE)
   }
   if(look?.acc.length) {
     const frames=state.lookFrames.get(code)
     headFrame.multiplyMatrices(parent,frames.head.matrixWorld);bodyFrame.multiplyMatrices(parent,frames.body.matrixWorld)
     writeLookAccessories(state.acc,getLookAccessoryPlan(code*32+lookIndex,look,frames.headHalf,frames.bodyHalf),headFrame,bodyFrame,flashing)
   }
   p.set(x,.019,z);s.set(scale*.64,scale*.39,1);matrix.compose(p,up,s);state.shadow.setMatrixAt(state.shadow.count++,matrix)
   const bar=state.health.count,ratio=Math.max(0,Math.min(1,pool.maxHp[i]>0?pool.hp[i]/pool.maxHp[i]:1))
   p.set(x,y+scale*1.65,z);s.set(scale*.95,scale*.13,1);matrix.compose(p,cameraQuaternion??q,s);state.healthBack.setMatrixAt(bar,matrix);state.healthBack.count++
   // Offset along camera's local X so the HP fill is left-anchored.
   const offset=(ratio-1)*scale*.95*.5
   const cx=cameraQuaternion?.x??0,cy=cameraQuaternion?.y??0,cz=cameraQuaternion?.z??0,cw=cameraQuaternion?.w??1
   p.x+=offset*(1-2*(cy*cy+cz*cz));p.y+=offset*2*(cx*cy+cw*cz);p.z+=offset*2*(cx*cz-cw*cy)
   s.x*=ratio;matrix.compose(p,cameraQuaternion??q,s);state.health.setMatrixAt(bar,matrix);state.health.count++
 }
 for(const b of state.buckets){b.mesh.count=b.count;upload(b.mesh)}
 endLookAccessories(state.acc)
 for(const mesh of [state.shadow,state.healthBack,state.health,state.smoke])upload(mesh)
}
export function disposeExpansionInstanceState(state) {
 clearBatches(state)
 disposeLookAccessoryMeshes(state.acc)
 for(const rig of state.rigs.values())disposeExpansionRig(rig)
 for(const mesh of [state.shadow,state.healthBack,state.health,state.smoke]){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose()}
}
