// Fixed-pool renderer for E01-E06 and the running-zombie squad.  It deliberately
// consumes the simulation's typed-array slot as the GPU instance slot: no React
// entity mount, Map insertion order, or local Studio fallback is involved.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.png'
import { enemyPool } from '../lib/refs.js'
import { getFirebaseStudioRuntimeState } from '../lib/studioRuntimeState.js'
import { GRAPHICS_STUDIO_TUNING_EVENT, getStudioZombieItemId, loadStudioTunings } from '../lib/graphicsStudioConfig.js'
import { getStudioTransformProps } from './StudioTunedGroup.jsx'
import { getToonGradient } from '../lib/toon.js'
import { ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import { POOLED_ENEMY_CAPACITY, SPAWN_REVEAL_MS, SPAWN_SMOKE_MS, applyCachedPartTransform, e01PartSlotsForNumericPath, fillChargeCueSlots, fillEnemyHealthBarLayout, getPooledChargeCueY, getSpawnSmokeOpacity, setSlotOpacity, updateHealthVisualState } from './PooledEnemyVisuals.js'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const m = new THREE.Matrix4(); const a = new THREE.Matrix4(); const e = new THREE.Euler('XYZ')
const p = new THREE.Vector3(); const s = new THREE.Vector3(); const q = new THREE.Quaternion(); const color = new THREE.Color()
const translate = new THREE.Matrix4(); const rotate = new THREE.Matrix4(); const inflate = new THREE.Matrix4(); const shadowRotation = new THREE.Euler(-Math.PI / 2, 0, 0)
const IDENTITY = new THREE.Matrix4()
const OUTLINE = 1
const RUN_TYPES = new Set([7, 8])
const TYPE_NAMES = ['', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC']
const TYPE_ITEM_IDS = TYPE_NAMES.map((type) => type ? getStudioZombieItemId(type) : '')
const TYPE_PALETTES = TYPE_NAMES.map((type) => ZOMBIE_PALETTE[type] || ZOMBIE_PALETTE.E01)

const STANDARD = [
  ['head','skin',[.52,.48,.46],[0,.82,0],[0,0,0],1.08], ['eyeL','eye',[.10,.09,.06],[0,.82,0],[-.12,.04,.24],1], ['eyeR','eye',[.10,.09,.06],[0,.82,0],[.12,.04,.24],1],
  ['body','body',[.56,.58,.40],[0,.28,0],[0,0,0],1.09], ['armL','body',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05], ['handL','skin',[.18,.16,.18],[-.40,.52,0],[0,-.55,0],1.03],
  ['armR','body',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05], ['handR','skin',[.18,.16,.18],[.40,.52,0],[0,-.55,0],1.03], ['legL','body',[.22,.52,.26],[-.15,0,0],[0,-.26,0],1.06], ['footL','foot',[.24,.12,.34],[-.15,0,0],[0,-.57,.05],1.03], ['legR','body',[.22,.52,.26],[.15,0,0],[0,-.26,0],1.06], ['footR','foot',[.24,.12,.34],[.15,0,0],[0,-.57,.05],1.03],
]
// The run squad keeps every readable silhouette element from RunZombieMesh.  Medal
// parts are leader-only; crew matrices are zeroed instead of creating a second tree.
const RUN = [
  ['head','skin',[.52,.48,.46],[0,.84,0],[0,0,0],1.08], ['headband','trim',[.54,.10,.48],[0,.84,0],[0,.11,.01],1.04], ['headbandStripe','stripe',[.54,.035,.49],[0,.84,0],[0,.14,.015],1], ['eyeL','eye',[.11,.10,.05],[0,.84,0],[-.12,.015,.25],1], ['eyeR','eye',[.11,.10,.05],[0,.84,0],[.12,.015,.25],1], ['mouth','mouth',[.20,.10,.05],[0,.84,0],[0,-.15,.25],1],
  ['jersey','jersey',[.58,.56,.40],[0,.29,0],[0,0,0],1.08], ['jerseyStripe','stripe',[.62,.055,.42],[0,.29,0],[0,.19,0],1], ['bib','bib',[.22,.18,.035],[0,.29,0],[0,.03,.292],1], ['bibDigits','digit',[.025,.095,.02],[0,.29,0],[0,.03,.316],1],
  ['armL','jersey',[.20,.47,.20],[-.40,.54,0],[0,-.24,0],1.05], ['wristL','trim',[.21,.08,.21],[-.40,.54,0],[0,-.45,0],1.03], ['armR','jersey',[.20,.47,.20],[.40,.54,0],[0,-.24,0],1.05], ['wristR','trim',[.21,.08,.21],[.40,.54,0],[0,-.45,0],1.03], ['shortsL','shorts',[.22,.46,.25],[-.16,0,0],[0,-.23,0],1.05], ['shoeL','shoe',[.28,.13,.38],[-.16,0,0],[0,-.53,.08],1.04], ['soleL','sole',[.30,.045,.40],[-.16,0,0],[0,-.61,.08],1], ['shortsR','shorts',[.22,.46,.25],[.16,0,0],[0,-.23,0],1.05], ['shoeR','shoe',[.28,.13,.38],[.16,0,0],[0,-.53,.08],1.04], ['soleR','sole',[.30,.045,.40],[.16,0,0],[0,-.61,.08],1], ['medal','medal',[.13,.13,.045],[0,.29,0],[0,-.02,.315],1.02,'leader'],
]
const ALL_PARTS = STANDARD.concat(RUN)
const PART_STRIDE = 9
const PART_COUNT = ALL_PARTS.length
const partSlotScratch = new Int16Array(12)
// Bubble, tail and block-letter GO! parts from ChargeToonCue.  A fixed 16-slot
// pool bounds its draw cost even when every E05 enters warning together.
const CUE = [
  [[.52,.30,.04],[0,0,0],0xfff4d8], [[.16,.12,.04],[-.18,-.18,0],0xfff4d8],
  [[.035,.15,.045],[-.13,.02,.05],0x241426], [[.11,.035,.045],[-.08,.10,.05],0x241426], [[.11,.035,.045],[-.08,-.08,.05],0x241426], [[.10,.035,.045],[-.075,.01,.05],0x241426],
  [[.035,.15,.045],[.12,.02,.05],0x241426], [[.11,.035,.045],[.12,.10,.05],0x241426], [[.11,.035,.045],[.12,-.08,.05],0x241426], [[.035,.15,.045],[.22,.02,.05],0x241426],
  [[.035,.16,.045],[.34,.02,.05],0xff392e], [[.045,.045,.045],[.34,-.12,.05],0xff392e],
]

function phase(pool, i) { return pool.state[i] === 2 ? 'warn' : pool.state[i] === 3 ? 'charge' : pool.state[i] === 4 ? 'stun' : 'normal' }
function setPartRotation(dst, key, time, type, state) {
  if (RUN_TYPES.has(type)) {
    const stride = Math.sin(time * 13.5); const pump = Math.sin(time * 13.5 + Math.PI)
    if (key === 'armL') return dst.set(-1.05 + pump * .5, 0, -.22 + Math.sin(time * 6.5) * .08)
    if (key === 'armR') return dst.set(-1.05 - pump * .5, 0, .22 - Math.sin(time * 6.5) * .08)
    if (key === 'shortsL' || key === 'shoeL' || key === 'soleL') return dst.set(stride * .82, 0, 0)
    if (key === 'shortsR' || key === 'shoeR' || key === 'soleR') return dst.set(-stride * .82, 0, 0)
    return dst.set(key === 'head' ? -.08 : key === 'jersey' ? .36 : 0, 0, key === 'jersey' ? Math.sin(time * 7.2) * .055 : 0)
  }
  const walk = state === 'stun' ? 0 : Math.sin(time * (type === 2 ? 9 : type === 3 ? 5 : 7)) * (state === 'charge' ? .55 : .38)
  if (key === 'legL' || key === 'footL') return dst.set(walk, 0, 0)
  if (key === 'legR' || key === 'footR') return dst.set(-walk, 0, 0)
  if (key === 'armL' || key === 'handL') return dst.set(-1.15 + Math.sin(time * 2.8) * .06, 0, .12)
  if (key === 'armR' || key === 'handR') return dst.set(-1.15 + Math.sin(time * 2.8 + Math.PI) * .06, 0, -.12)
  if (key === 'head') return dst.set(0, 0, Math.sin(time * 1.6) * .07)
  return dst.set(state === 'charge' ? .45 : 0, 0, 0)
}
function makeMat(eye = false) { const x = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient(), emissive: 0, emissiveIntensity: eye ? .9 : .12 }); x.stencilWrite = true; x.stencilRef = OUTLINE; x.stencilFunc = THREE.AlwaysStencilFunc; x.stencilZPass = THREE.ReplaceStencilOp; return x }
function makeOutline() { const x = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: .96, depthWrite: false }); x.stencilWrite = true; x.stencilRef = OUTLINE; x.stencilFunc = THREE.NotEqualStencilFunc; return x }
function im(part, material) { const x = new THREE.InstancedMesh(new THREE.BoxGeometry(...part[2]), material, POOLED_ENEMY_CAPACITY); x.frustumCulled = false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i=0;i<POOLED_ENEMY_CAPACITY;i++) x.setMatrixAt(i,ZERO); return x }
export function installInstanceAlpha(geometry, material, count) { const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1); geometry.setAttribute('instanceAlpha', alpha); material.onBeforeCompile = (shader) => { shader.vertexShader = `attribute float instanceAlpha; varying float pooledInstanceAlpha;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\npooledInstanceAlpha = instanceAlpha;'); shader.fragmentShader = `varying float pooledInstanceAlpha;\n${shader.fragmentShader}`.replace('#include <output_fragment>', '#include <output_fragment>\ngl_FragColor.a *= pooledInstanceAlpha;') }; material.customProgramCacheKey = () => 'pooled-instance-alpha-v1'; return alpha }
function plane(material) { const geometry=new THREE.PlaneGeometry(1,1); const x = new THREE.InstancedMesh(geometry,material,POOLED_ENEMY_CAPACITY); x.frustumCulled=false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); x.userData.instanceAlpha=installInstanceAlpha(geometry,material,POOLED_ENEMY_CAPACITY); for(let i=0;i<POOLED_ENEMY_CAPACITY;i++) x.setMatrixAt(i,ZERO); return x }
function cueIM(def, material) { const x = new THREE.InstancedMesh(new THREE.BoxGeometry(...def[0]), material, 16); x.frustumCulled=false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for(let i=0;i<16;i++)x.setMatrixAt(i,ZERO); return x }
function mark(meshes) { for (let i=0;i<meshes.length;i++) { const x=meshes[i]; x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; if (x.userData.instanceAlpha) x.userData.instanceAlpha.needsUpdate=true } }
function markOne(x) { x.instanceMatrix.needsUpdate=true; if(x.instanceColor)x.instanceColor.needsUpdate=true; if(x.userData.instanceAlpha)x.userData.instanceAlpha.needsUpdate=true }

export default function ZombieInstanceLayer({ resetKey }) {
  const { camera } = useThree(); const smokeTexture = useLoader(THREE.TextureLoader, spawnSmokeUrl)
  const studio = useRef({ revision: null, rootMatrices: [], rootScaleX: new Float32Array(9), rootScaleZ: new Float32Array(9), supported: new Uint8Array(9), partTransforms: new Float32Array(9 * PART_COUNT * PART_STRIDE) }); const cueOverflowRef = useRef(0); const cueIndicesRef = useRef(new Int16Array(16))
  const health = useRef({ generation:new Uint16Array(200), lastRatio:new Float32Array(200), trailRatio:new Float32Array(200), flash:new Float32Array(200), ratio:new Float32Array(200), visibleTrailRatio:new Float32Array(200) })
  const healthBarLayout = useRef(new Float32Array(3))
  const all = useMemo(() => {
    const body = [...STANDARD,...RUN].map(x=>im(x,makeMat(x[1]==='eye'))); const out=[...STANDARD,...RUN].map(x=>im(x,makeOutline()))
    const shadow=plane(new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3,depthTest:true,depthWrite:false}));
    const bars=[plane(new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.88,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xd72832,transparent:true,opacity:.95,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xffd23c,transparent:true,opacity:1,depthTest:false,depthWrite:false}))]
    smokeTexture.colorSpace=THREE.SRGBColorSpace; const smoke=plane(new THREE.MeshBasicMaterial({map:smokeTexture,transparent:true,depthTest:false,depthWrite:false,alphaTest:.01,toneMapped:false}))
    const cue=CUE.map(def=>cueIM(def,makeMat(false)))
    return {body,out,shadow,bars,smoke,cue}
  }, [smokeTexture])
  useEffect(() => () => {
    const dispose = (mesh) => { mesh.geometry.dispose(); mesh.material.dispose() }
    for (let i=0;i<all.body.length;i++) dispose(all.body[i])
    for (let i=0;i<all.out.length;i++) dispose(all.out[i])
    for (let i=0;i<all.bars.length;i++) dispose(all.bars[i])
    for (let i=0;i<all.cue.length;i++) dispose(all.cue[i])
    dispose(all.shadow); dispose(all.smoke)
  }, [all])
  useLayoutEffect(() => {
    // A keyed Physics reset must never show old instance matrices for even one
    // frame.  The meshes themselves stay allocated and are repopulated by the
    // next pool frame, so no GPU buffer is recreated.
    for (let i = 0; i < all.body.length; i += 1) for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.body[i].setMatrixAt(slot, ZERO)
    for (let i = 0; i < all.out.length; i += 1) for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.out[i].setMatrixAt(slot, ZERO)
    for (let i = 0; i < all.bars.length; i += 1) for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.bars[i].setMatrixAt(slot, ZERO)
    for (let i = 0; i < all.cue.length; i += 1) for (let slot = 0; slot < 16; slot += 1) all.cue[i].setMatrixAt(slot, ZERO)
    for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) { all.shadow.setMatrixAt(slot, ZERO); all.smoke.setMatrixAt(slot, ZERO) }
    // Matrix zeroing alone hides the old run, but stale alpha/health trail
    // state can bleed into a recycled slot before its next full visual update.
    health.current.generation.fill(0)
    health.current.lastRatio.fill(0)
    health.current.trailRatio.fill(0)
    health.current.flash.fill(0)
    health.current.ratio.fill(0)
    health.current.visibleTrailRatio.fill(0)
    // The normal bars and blob shadow have no per-frame alpha write.  Restore
    // their steady-state defaults here; only the delayed trail and smoke start
    // transparent until their frame-path explicitly activates them.
    all.bars[0].userData.instanceAlpha.fill(1)
    all.bars[1].userData.instanceAlpha.fill(1)
    all.bars[2].userData.instanceAlpha.fill(0)
    all.bars[3].userData.instanceAlpha.fill(1)
    all.shadow.userData.instanceAlpha.fill(1)
    all.smoke.userData.instanceAlpha.fill(0)
    mark(all.body); mark(all.out); mark(all.bars); mark(all.cue); markOne(all.shadow); markOne(all.smoke)
  }, [all, resetKey])
  useEffect(() => { const refresh=()=>{ const state=getFirebaseStudioRuntimeState(); if (!state?.datasets || !Number.isInteger(state.revision)) return; const tunings=loadStudioTunings(); const rootMatrices=[]; const rootScaleX=new Float32Array(9);const rootScaleZ=new Float32Array(9); const supported=new Uint8Array(9); const partTransforms=new Float32Array(9 * PART_COUNT * PART_STRIDE); for(let t=1;t<=8;t++){const id=TYPE_ITEM_IDS[t];const transform=getStudioTransformProps(tunings[id]);const root=new THREE.Matrix4();p.set(transform.position[0],transform.position[1],transform.position[2]);e.set(transform.rotation[0],transform.rotation[1],transform.rotation[2]);q.setFromEuler(e);s.set(transform.scale[0],transform.scale[1],transform.scale[2]);root.compose(p,q,s);rootMatrices[t]=root;rootScaleX[t]=transform.scale[0];rootScaleZ[t]=transform.scale[2];supported[t]=1;const base=t*PART_COUNT*PART_STRIDE;for(let part=0;part<PART_COUNT;part+=1){partTransforms[base+part*PART_STRIDE+6]=1;partTransforms[base+part*PART_STRIDE+7]=1;partTransforms[base+part*PART_STRIDE+8]=1}}
    const keys=Object.keys(tunings).sort(); for(let keyIndex=0;keyIndex<keys.length;keyIndex+=1){const savedKey=keys[keyIndex];const marker='zombie-e01::';if(!savedKey.startsWith(marker))continue;const kind=savedKey.startsWith('zombie-e01::group::')?'group::':'part::';const suffix=savedKey.slice(('zombie-e01::'+kind).length);const selected=suffix.split('+');const transform=getStudioTransformProps(tunings[savedKey]);for(let selectedIndex=0;selectedIndex<selected.length;selectedIndex+=1){const count=e01PartSlotsForNumericPath(selected[selectedIndex],partSlotScratch);applyCachedPartTransform(partTransforms,1*PART_COUNT*PART_STRIDE,partSlotScratch,count,transform)}} studio.current={revision:state.revision,rootMatrices,rootScaleX,rootScaleZ,supported,partTransforms} }; refresh(); window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh); return()=>window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh) },[])
  useFrame((_,delta) => {
    const pool=enemyPool; if (!pool) return; const max=Math.min(199,Number.isInteger(pool.highestActive)?pool.highestActive:199)
    for(let i=0;i<200;i++) { const active=i<=max&&pool.active[i]===1; const timer=active?pool.spawnTimer[i]:-1; const bodyVisible=active&&timer>=SPAWN_REVEAL_MS; const smokeVisible=active&&timer>=0&&timer<SPAWN_SMOKE_MS; const type=pool.type[i]; const rootMatrix=studio.current.rootMatrices[type] || IDENTITY;
      if (!bodyVisible || type<1 || type>8) { for(let meshIndex=0;meshIndex<all.body.length;meshIndex++)all.body[meshIndex].setMatrixAt(i,ZERO);for(let meshIndex=0;meshIndex<all.out.length;meshIndex++)all.out[meshIndex].setMatrixAt(i,ZERO);all.shadow.setMatrixAt(i,ZERO);for(let meshIndex=0;meshIndex<all.bars.length;meshIndex++)all.bars[meshIndex].setMatrixAt(i,ZERO) }
      else { const scale=(pool.visualScale[i]||1)*.333; const state=phase(pool,i); const time=timer*.001; const pal=TYPE_PALETTES[type]; const parts=(type===7||type===8)?RUN:STANDARD; const offset=(type===7||type===8)?STANDARD.length:0;
         p.set(pool.posX[i],pool.posY[i],pool.posZ[i]); e.set(0,pool.yaw[i],0);q.setFromEuler(e);s.set(scale,scale,scale);m.compose(p,q,s);m.multiply(rootMatrix)
         p.set(pool.posX[i],.018,pool.posZ[i]);s.set(Math.max(.05,scale*(studio.current.rootScaleX[type]||1)*.62),Math.max(.05,scale*(studio.current.rootScaleZ[type]||1)*.34),1);q.setFromEuler(shadowRotation);a.compose(p,q,s);all.shadow.setMatrixAt(i,a)
         for(let j=0;j<ALL_PARTS.length;j++){all.body[j].setMatrixAt(i,ZERO);all.out[j].setMatrixAt(i,ZERO)}
         for(let j=0;j<parts.length;j++){const part=parts[j];const slot=offset+j;if(part[6]==='leader'&&type!==7)continue;const partBase=type*PART_COUNT*PART_STRIDE+slot*PART_STRIDE; a.copy(m);translate.makeTranslation(part[3][0]+studio.current.partTransforms[partBase],part[3][1]+studio.current.partTransforms[partBase+1],part[3][2]+studio.current.partTransforms[partBase+2]);a.multiply(translate);setPartRotation(e,part[0],time,type,state);e.x+=studio.current.partTransforms[partBase+3];e.y+=studio.current.partTransforms[partBase+4];e.z+=studio.current.partTransforms[partBase+5];rotate.makeRotationFromEuler(e);a.multiply(rotate);inflate.makeScale(studio.current.partTransforms[partBase+6],studio.current.partTransforms[partBase+7],studio.current.partTransforms[partBase+8]);a.multiply(inflate);translate.makeTranslation(part[4][0],part[4][1],part[4][2]);a.multiply(translate);all.body[slot].setMatrixAt(i,a);const role=part[1];const run=type===7;const hex=pool.hitFlashTimer[i]>0?0xffffff:role==='skin'?pal.skin:role==='eye'?pal.eye:role==='foot'?0x1a1a1a:role==='trim'?(run?0x7d3fc6:0x1880bd):role==='stripe'?0xffffff:role==='jersey'?(run?0x5a2484:0xf0eee4):role==='shorts'?(run?0x22152f:0x1974aa):role==='shoe'?(run?0x6e35b8:0x1771a6):role==='sole'?0xf5f1e8:role==='bib'?0xf7f3df:role==='digit'||role==='mouth'?0x151515:role==='medal'?0xf0b62d:pal.body;color.setHex(hex);all.body[slot].setColorAt(i,color);const outlineScale=1+(part[5]-1)*2;inflate.makeScale(outlineScale,outlineScale,outlineScale);a.multiply(inflate);all.out[slot].setMatrixAt(i,a)}
         const ratio=(pool.maxHp[i]>0?pool.hp[i]/pool.maxHp[i]:1);updateHealthVisualState(health.current,i,pool.generation[i],ratio,delta);const visibleTrailRatio=health.current.visibleTrailRatio[i];const currentRatio=health.current.ratio[i];const flash=health.current.flash[i];const layout=fillEnemyHealthBarLayout(healthBarLayout.current,pool.visualScale[i]);const w=layout[0];const h=layout[1];p.set(pool.posX[i],pool.posY[i]+layout[2],pool.posZ[i]);q.copy(camera.quaternion);s.set(w+.008,h+.008,1);a.compose(p,q,s);all.bars[0].setMatrixAt(i,a);s.set(w,h,1);a.compose(p,q,s);all.bars[1].setMatrixAt(i,a);s.set(w*visibleTrailRatio,h,1);p.x=pool.posX[i]-w*(1-visibleTrailRatio)/2;a.compose(p,q,s);all.bars[2].setMatrixAt(i,a);s.set(w*currentRatio,h,1);p.x=pool.posX[i]-w*(1-currentRatio)/2;a.compose(p,q,s);all.bars[3].setMatrixAt(i,a);setSlotOpacity(all.bars[2].userData.instanceAlpha,i,visibleTrailRatio-currentRatio>.006?.18+flash*.82:0)
      }
       if(smokeVisible){const t=timer/SPAWN_SMOKE_MS;const size=(pool.visualScale[i]||1)*.333*(1.7+(1-(1-t)*(1-t))*(3.1-1.7));p.set(pool.posX[i],pool.posY[i]+(pool.visualScale[i]||1)*.333*(1+t*.32),pool.posZ[i]);q.copy(camera.quaternion);s.set(size,size,1);a.compose(p,q,s);all.smoke.setMatrixAt(i,a);setSlotOpacity(all.smoke.userData.instanceAlpha,i,getSpawnSmokeOpacity(timer))}else { all.smoke.setMatrixAt(i,ZERO);setSlotOpacity(all.smoke.userData.instanceAlpha,i,0) }
    }
    const cueIndices=cueIndicesRef.current; cueOverflowRef.current=fillChargeCueSlots(pool,cueIndices)
    for(let ci=0;ci<16;ci++) {
      const enemyIndex=cueIndices[ci]
      if (enemyIndex < 0) { for(let meshIndex=0;meshIndex<all.cue.length;meshIndex++)all.cue[meshIndex].setMatrixAt(ci,ZERO); continue }
      const pulse=1+Math.sin(pool.spawnTimer[enemyIndex]*.012)*.08
      p.set(pool.posX[enemyIndex],getPooledChargeCueY(pool.posY[enemyIndex], pool.visualScale[enemyIndex]),pool.posZ[enemyIndex]); q.copy(camera.quaternion); s.set(pulse,pulse,pulse);m.compose(p,q,s)
       for(let part=0;part<CUE.length;part++){a.copy(m);translate.makeTranslation(CUE[part][1][0],CUE[part][1][1],CUE[part][1][2]);a.multiply(translate);all.cue[part].setMatrixAt(ci,a);color.setHex(CUE[part][2]);all.cue[part].setColorAt(ci,color)}
    }
    mark(all.body); mark(all.out); markOne(all.shadow); mark(all.bars); markOne(all.smoke); mark(all.cue)
  })
  return <>{<primitive object={all.shadow} renderOrder={1}/>} {[...STANDARD,...RUN].map((x,i)=><primitive key={`b${i}`} object={all.body[i]} renderOrder={2}/>)} {[...STANDARD,...RUN].map((x,i)=><primitive key={`o${i}`} object={all.out[i]} renderOrder={1}/>)} {all.bars.map((x,i)=><primitive key={`h${i}`} object={x} renderOrder={20+i}/>)} {all.cue.map((x,i)=><primitive key={`cue${i}`} object={x} renderOrder={30}/>)} <primitive object={all.smoke} renderOrder={100}/></>
}
