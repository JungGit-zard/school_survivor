// Fixed-pool renderer for E01-E06 and the running-zombie squad.  It deliberately
// consumes the simulation's typed-array slot as the GPU instance slot: no React
// entity mount, Map insertion order, or local Studio fallback is involved.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.png'
import { enemyPool, playerPos, screenBounds } from '../lib/refs.js'
import { getFirebaseStudioRuntimeState } from '../lib/studioRuntimeState.js'
import { GRAPHICS_STUDIO_TUNING_EVENT, getStudioZombieItemId, loadStudioTunings } from '../lib/graphicsStudioConfig.js'
import { composeStudioPartMultiplier, composeStudioPartOffset, composeStudioPartTransformCache, getStudioTransformProps } from './StudioTunedGroup.jsx'
import { getToonGradient } from '../lib/toon.js'
import { ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import { ENEMY_RENDER_FAR, POOLED_CHARGE_CUE_PARTS, POOLED_ENEMY_CAPACITY, SPAWN_REVEAL_MS, SPAWN_SMOKE_MS, applyPooledZombieStudioPartTunings, fillEnemyHealthBarLayout, fillVisibleChargeCueSlots, getPooledChargeCueY, getPooledEnemyAnimationTime, getPooledEnemyRenderTier, getSpawnSmokeOpacity, setSlotOpacity, shouldRenderPooledEnemyPart, updateHealthVisualState } from './PooledEnemyVisuals.js'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const m = new THREE.Matrix4(); const a = new THREE.Matrix4(); const e = new THREE.Euler('XYZ')
const p = new THREE.Vector3(); const s = new THREE.Vector3(); const q = new THREE.Quaternion(); const color = new THREE.Color()
const translate = new THREE.Matrix4(); const rotate = new THREE.Matrix4(); const inflate = new THREE.Matrix4(); const shadowRotation = new THREE.Euler(-Math.PI / 2, 0, 0)
const IDENTITY = new THREE.Matrix4()
const OUTLINE = 1
const RUN_TYPES = new Set([7, 8])
const SCREEN_RUNNER_TYPES = new Set([7, 8, 13, 14])
const TYPE_NAMES = ['', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', '', '', '', '', 'RZT', 'RZG']
// E07(type 15, 웃는얼굴 좀비)의 몸통은 셰이더 얼굴이라 이 박스 인스턴스 파이프라인에
// 들어오지 않는다 — ProceduralFaceZombieLayer가 그린다. 여기서는 파트를 0개만 찍어
// 다른 잡몹과 동일한 그림자·체력바·스폰 연기만 붙인다.
const NO_INSTANCED_PART_COUNT = 0
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
// Exact fixed-pool leaves for Stage2GuardChaseZombieMesh. These do not reuse
// the Stage 3 running-crew geometry: the fugitive needs coat/scarf/belt and
// the guard needs cap/brim/vest/badge at the same numeric child paths.
const RZT = [
  ['head','skin',[.52,.48,.46],[0,.84,0],[0,0,0],1.08], ['hair','hair',[.54,.14,.47],[0,.84,0],[0,.17,-.015],1.03], ['eyeL','eye',[.11,.10,.05],[0,.84,0],[-.12,.015,.25],1], ['eyeR','eye',[.11,.10,.05],[0,.84,0],[.12,.015,.25],1], ['mouth','mouth',[.18,.10,.05],[0,.84,0],[0,-.16,.25],1],
  ['body','coat',[.58,.68,.42],[0,.28,0],[0,0,0],1.08], ['scarf','scarf',[.60,.075,.44],[0,.28,0],[0,.25,.02],1], ['coatBelt','coatShadow',[.62,.06,.44],[0,.28,0],[0,-.10,.02],1],
  ['armL','coat',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05], ['handL','skin',[.18,.16,.18],[-.40,.52,0],[0,-.55,0],1.03], ['armR','coat',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05], ['handR','skin',[.18,.16,.18],[.40,.52,0],[0,-.55,0],1.03],
  ['legL','pants',[.22,.50,.26],[-.15,0,0],[0,-.25,0],1.05], ['shoeL','shoe',[.26,.12,.36],[-.15,0,0],[0,-.55,.06],1.03], ['legR','pants',[.22,.50,.26],[.15,0,0],[0,-.25,0],1.05], ['shoeR','shoe',[.26,.12,.36],[.15,0,0],[0,-.55,.06],1.03],
]
const RZG = [
  ['head','skin',[.52,.48,.46],[0,.84,0],[0,0,0],1.08], ['cap','cap',[.56,.12,.50],[0,.84,0],[0,.18,0],1.03], ['capBrim','cap',[.34,.055,.18],[0,.84,0],[0,.13,.28],1], ['eyeL','eye',[.11,.10,.05],[0,.84,0],[-.12,.015,.25],1], ['eyeR','eye',[.11,.10,.05],[0,.84,0],[.12,.015,.25],1], ['mouth','mouth',[.22,.075,.05],[0,.84,0],[0,-.15,.25],1],
  ['body','uniform',[.58,.58,.42],[0,.28,0],[0,0,0],1.08], ['vest','vest',[.61,.48,.055],[0,.28,0],[0,.01,.24],1], ['badge','badge',[.10,.13,.05],[0,.28,0],[-.14,.12,.285],1],
  ['armL','uniform',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05], ['handL','skin',[.18,.16,.18],[-.40,.52,0],[0,-.55,0],1.03], ['armR','uniform',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05], ['handR','skin',[.18,.16,.18],[.40,.52,0],[0,-.55,0],1.03],
  ['legL','pants',[.22,.50,.26],[-.15,0,0],[0,-.25,0],1.05], ['shoeL','shoe',[.26,.12,.36],[-.15,0,0],[0,-.55,.06],1.03], ['legR','pants',[.22,.50,.26],[.15,0,0],[0,-.25,0],1.05], ['shoeR','shoe',[.26,.12,.36],[.15,0,0],[0,-.55,.06],1.03],
]
const RZT_OFFSET = STANDARD.length + RUN.length
const RZG_OFFSET = RZT_OFFSET + RZT.length
const ALL_PARTS = STANDARD.concat(RUN, RZT, RZG)
const PART_STRIDE = 9
const PART_COUNT = ALL_PARTS.length
const partSlotScratch = new Int16Array(12)
function createDefaultStudioPartTransforms() {
  const transforms = new Float32Array(15 * PART_COUNT * PART_STRIDE)
  for (let type = 0; type < 15; type += 1) {
    for (let part = 0; part < PART_COUNT; part += 1) {
      const scaleOffset = (type * PART_COUNT + part) * PART_STRIDE + 6
      transforms[scaleOffset] = 1
      transforms[scaleOffset + 1] = 1
      transforms[scaleOffset + 2] = 1
    }
  }
  return transforms
}
// Bubble, tail and block-letter GO! parts from ChargeToonCue.  A fixed 16-slot
// pool bounds its draw cost even when every E05 enters warning together.
const CUE = POOLED_CHARGE_CUE_PARTS

function phase(pool, i) { return pool.state[i] === 2 ? 'warn' : pool.state[i] === 3 ? 'charge' : pool.state[i] === 4 ? 'stun' : 'normal' }
function setPartRotation(dst, key, time, type, state) {
  if (SCREEN_RUNNER_TYPES.has(type)) {
    const stride = Math.sin(time * 13.5); const pump = Math.sin(time * 13.5 + Math.PI)
    const chase = type === 13 || type === 14
    if (key === 'armL') return dst.set((chase ? -1.18 : -1.05) + pump * .5, 0, (chase ? -.20 : -.22) + Math.sin(time * 6.5) * .08)
    if (key === 'armR') return dst.set((chase ? -1.50 : -1.05) - pump * .5, 0, (chase ? .20 : .22) - Math.sin(time * 6.5) * .08)
    if (key === 'shortsL' || key === 'shoeL' || key === 'soleL') return dst.set(stride * .82, 0, 0)
    if (key === 'shortsR' || key === 'shoeR' || key === 'soleR') return dst.set(-stride * .82, 0, 0)
    if (key === 'legL') return dst.set(stride * .82, 0, 0)
    if (key === 'legR') return dst.set(-stride * .82, 0, 0)
    const torso = key === 'jersey' || key === 'body'
    return dst.set(key === 'head' ? -.08 : torso ? .36 : 0, 0, torso ? Math.sin(time * 7.2) * .055 : 0)
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
function makeCueMat() { const x = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, toneMapped: false }); return x }
function im(part, material) { const x = new THREE.InstancedMesh(new THREE.BoxGeometry(...part[2]), material, POOLED_ENEMY_CAPACITY); x.frustumCulled = false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i=0;i<POOLED_ENEMY_CAPACITY;i++) x.setMatrixAt(i,ZERO); x.count=0; return x }
export function installInstanceAlpha(geometry, material, count) { const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1); geometry.setAttribute('instanceAlpha', alpha); material.onBeforeCompile = (shader) => { shader.vertexShader = `attribute float instanceAlpha; varying float pooledInstanceAlpha;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\npooledInstanceAlpha = instanceAlpha;'); shader.fragmentShader = `varying float pooledInstanceAlpha;\n${shader.fragmentShader}`.replace('#include <output_fragment>', '#include <output_fragment>\ngl_FragColor.a *= pooledInstanceAlpha;') }; material.customProgramCacheKey = () => 'pooled-instance-alpha-v1'; return alpha }
function plane(material) { const geometry=new THREE.PlaneGeometry(1,1); const x = new THREE.InstancedMesh(geometry,material,POOLED_ENEMY_CAPACITY); x.frustumCulled=false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); x.userData.instanceAlpha=installInstanceAlpha(geometry,material,POOLED_ENEMY_CAPACITY); for(let i=0;i<POOLED_ENEMY_CAPACITY;i++) x.setMatrixAt(i,ZERO); x.count=0; return x }
function cueIM(def, material) { const geometry=def.radius?new THREE.SphereGeometry(def.radius,12,8):new THREE.BoxGeometry(...def.size); const x = new THREE.InstancedMesh(geometry, material, 16); x.frustumCulled=false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for(let i=0;i<16;i++)x.setMatrixAt(i,ZERO); x.count=0; return x }
function mark(meshes) { for (let i=0;i<meshes.length;i++) { const x=meshes[i]; x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; if (x.userData.instanceAlpha) x.userData.instanceAlpha.needsUpdate=true } }
function markOne(x) { x.instanceMatrix.needsUpdate=true; if(x.instanceColor)x.instanceColor.needsUpdate=true; if(x.userData.instanceAlpha)x.userData.instanceAlpha.needsUpdate=true }

export default function ZombieInstanceLayer({ resetKey }) {
  const { camera } = useThree(); const smokeTexture = useLoader(THREE.TextureLoader, spawnSmokeUrl)
  const studio = useRef({ revision: null, rootMatrices: [], rootScaleX: new Float32Array(15), rootScaleZ: new Float32Array(15), supported: new Uint8Array(15), partTransforms: createDefaultStudioPartTransforms() }); const cueOverflowRef = useRef(0); const cueIndicesRef = useRef(new Int16Array(16))
  const renderTiers = useRef(new Uint8Array(POOLED_ENEMY_CAPACITY))
  const partCounts = useRef(new Int16Array(PART_COUNT))
  const health = useRef({ generation:new Uint16Array(200), lastRatio:new Float32Array(200), trailRatio:new Float32Array(200), flash:new Float32Array(200), ratio:new Float32Array(200), visibleTrailRatio:new Float32Array(200) })
  const healthBarLayout = useRef(new Float32Array(3))
  const all = useMemo(() => {
    const body = ALL_PARTS.map(x=>im(x,makeMat(x[1]==='eye'))); const out=ALL_PARTS.map(x=>im(x,makeOutline()))
    const shadow=plane(new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3,depthTest:true,depthWrite:false}));
    const bars=[plane(new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.88,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xd72832,transparent:true,opacity:.95,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xffd23c,transparent:true,opacity:1,depthTest:false,depthWrite:false}))]
    smokeTexture.colorSpace=THREE.SRGBColorSpace; const smoke=plane(new THREE.MeshBasicMaterial({map:smokeTexture,transparent:true,depthTest:false,depthWrite:false,alphaTest:.01,toneMapped:false}))
    const cue=CUE.map(def=>cueIM(def,makeCueMat()))
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
    all.bars[0].userData.instanceAlpha.array.fill(1)
    all.bars[1].userData.instanceAlpha.array.fill(1)
    all.bars[2].userData.instanceAlpha.array.fill(0)
    all.bars[3].userData.instanceAlpha.array.fill(1)
    all.shadow.userData.instanceAlpha.array.fill(1)
    all.smoke.userData.instanceAlpha.array.fill(0)
    renderTiers.current.fill(0)
    partCounts.current.fill(0)
    for (let i = 0; i < all.body.length; i += 1) all.body[i].count = 0
    for (let i = 0; i < all.out.length; i += 1) all.out[i].count = 0
    for (let i = 0; i < all.bars.length; i += 1) all.bars[i].count = 0
    for (let i = 0; i < all.cue.length; i += 1) all.cue[i].count = 0
    all.shadow.count = 0
    all.smoke.count = 0
    mark(all.body); mark(all.out); mark(all.bars); mark(all.cue); markOne(all.shadow); markOne(all.smoke)
  }, [all, resetKey])
  useEffect(() => { const refresh=()=>{ const state=getFirebaseStudioRuntimeState(); if (!state?.datasets || !Number.isInteger(state.revision)) return; const tunings=loadStudioTunings(); const rootMatrices=[]; const rootScaleX=new Float32Array(15);const rootScaleZ=new Float32Array(15); const supported=new Uint8Array(15); const partTransforms=new Float32Array(15 * PART_COUNT * PART_STRIDE); for(const t of [1,2,3,4,5,6,7,8,13,14]){const id=TYPE_ITEM_IDS[t];const transform=getStudioTransformProps(tunings[id]);const root=new THREE.Matrix4();p.set(transform.position[0],transform.position[1],transform.position[2]);e.set(transform.rotation[0],transform.rotation[1],transform.rotation[2]);q.setFromEuler(e);s.set(transform.scale[0],transform.scale[1],transform.scale[2]);root.compose(p,q,s);rootMatrices[t]=root;rootScaleX[t]=transform.scale[0];rootScaleZ[t]=transform.scale[2];supported[t]=1;const base=t*PART_COUNT*PART_STRIDE;for(let part=0;part<PART_COUNT;part+=1){partTransforms[base+part*PART_STRIDE+6]=1;partTransforms[base+part*PART_STRIDE+7]=1;partTransforms[base+part*PART_STRIDE+8]=1}applyPooledZombieStudioPartTunings(partTransforms,t,PART_COUNT,id,tunings,getStudioTransformProps,composeStudioPartTransformCache,partSlotScratch)}
    studio.current={revision:state.revision,rootMatrices,rootScaleX,rootScaleZ,supported,partTransforms} }; refresh(); window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh); return()=>window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh) },[])
  useFrame((_,delta) => {
    const pool=enemyPool; if (!pool) return; const max=Math.min(199,Number.isInteger(pool.highestActive)?pool.highestActive:199); const tiers=renderTiers.current;const counts=partCounts.current;counts.fill(0)
    let bodyCount=0; let healthCount=0; let smokeCount=0
    for(let i=0;i<200;i++) {
      const active=i<=max&&pool.active[i]===1; if(!active){tiers[i]=0;continue}
      const timer=pool.spawnTimer[i]; const type=pool.type[i]; const tier=getPooledEnemyRenderTier(screenBounds,pool.posX[i],pool.posZ[i],playerPos.x,playerPos.z,tiers[i]); tiers[i]=tier
      if(!tier)continue
      const bodyVisible=timer>=SPAWN_REVEAL_MS&&((type>=1&&type<=8)||type===13||type===14||type===15); const smokeVisible=timer>=0&&timer<SPAWN_SMOKE_MS
      if(bodyVisible){const renderSlot=bodyCount++;const rootMatrix=studio.current.rootMatrices[type]||IDENTITY;const scale=(pool.visualScale[i]||1)*.333;const state=phase(pool,i);const time=getPooledEnemyAnimationTime(timer,tier);const pal=TYPE_PALETTES[type];const parts=type===13?RZT:type===14?RZG:RUN_TYPES.has(type)?RUN:STANDARD;const offset=type===13?RZT_OFFSET:type===14?RZG_OFFSET:RUN_TYPES.has(type)?STANDARD.length:0;const partCount=type===15?NO_INSTANCED_PART_COUNT:parts.length
        const screenRunnerLift=type===13||type===14?scale*.45:0;p.set(pool.posX[i],pool.posY[i]+screenRunnerLift,pool.posZ[i]);e.set(0,pool.yaw[i],0);q.setFromEuler(e);s.set(scale,scale,scale);m.compose(p,q,s);m.multiply(rootMatrix)
        p.set(pool.posX[i],.018,pool.posZ[i]);s.set(Math.max(.05,scale*(studio.current.rootScaleX[type]||1)*.62),Math.max(.05,scale*(studio.current.rootScaleZ[type]||1)*.34),1);q.setFromEuler(shadowRotation);a.compose(p,q,s);all.shadow.setMatrixAt(renderSlot,a)
        for(let j=0;j<partCount;j++){const part=parts[j];const slot=offset+j;if(!shouldRenderPooledEnemyPart(type,slot,tier)||(part[6]==='leader'&&type!==7))continue;const partRenderSlot=counts[slot]++;const partBase=type*PART_COUNT*PART_STRIDE+slot*PART_STRIDE;a.copy(m);translate.makeTranslation(composeStudioPartOffset(part[3][0],studio.current.partTransforms[partBase]),composeStudioPartOffset(part[3][1],studio.current.partTransforms[partBase+1]),composeStudioPartOffset(part[3][2],studio.current.partTransforms[partBase+2]));a.multiply(translate);setPartRotation(e,part[0],time,type,state);e.set(composeStudioPartOffset(e.x,studio.current.partTransforms[partBase+3]),composeStudioPartOffset(e.y,studio.current.partTransforms[partBase+4]),composeStudioPartOffset(e.z,studio.current.partTransforms[partBase+5]));rotate.makeRotationFromEuler(e);a.multiply(rotate);inflate.makeScale(composeStudioPartMultiplier(1,studio.current.partTransforms[partBase+6]),composeStudioPartMultiplier(1,studio.current.partTransforms[partBase+7]),composeStudioPartMultiplier(1,studio.current.partTransforms[partBase+8]));a.multiply(inflate);translate.makeTranslation(part[4][0],part[4][1],part[4][2]);a.multiply(translate);all.body[slot].setMatrixAt(partRenderSlot,a);const role=part[1];const run=type===7;const fugitive=type===13;const guard=type===14;const hex=pool.hitFlashTimer[i]>0?0xffffff:role==='skin'?pal.skin:role==='eye'?pal.eye:role==='foot'?0x1a1a1a:role==='hair'?0x35251c:role==='coat'?0xb48755:role==='scarf'?0xd8b057:role==='coatShadow'?0x76502d:role==='cap'?0x102c4a:role==='uniform'?0x173a5e:role==='vest'?0xe3bf3f:role==='badge'?0xf3d46b:role==='pants'?(fugitive?0x382d29:0x13263b):role==='trim'?(run?0x7d3fc6:0x1880bd):role==='stripe'?0xffffff:role==='jersey'?(run?0x5a2484:0xf0eee4):role==='shorts'?(run?0x22152f:0x1974aa):role==='shoe'?(fugitive?0x171717:guard?0x111317:run?0x6e35b8:0x1771a6):role==='sole'?0xf5f1e8:role==='bib'?0xb48755:role==='digit'?0x151515:role==='mouth'?(fugitive?0x381510:guard?0x35100f:0x151515):role==='medal'?0xf0b62d:pal.body;color.setHex(hex);all.body[slot].setColorAt(partRenderSlot,color);const outlineScale=1+(part[5]-1)*2;inflate.makeScale(outlineScale,outlineScale,outlineScale);a.multiply(inflate);all.out[slot].setMatrixAt(partRenderSlot,a)}
        if(tier!==ENEMY_RENDER_FAR){const healthSlot=healthCount++;const ratio=(pool.maxHp[i]>0?pool.hp[i]/pool.maxHp[i]:1);updateHealthVisualState(health.current,i,pool.generation[i],ratio,delta);const visibleTrailRatio=health.current.visibleTrailRatio[i];const currentRatio=health.current.ratio[i];const flash=health.current.flash[i];const layout=fillEnemyHealthBarLayout(healthBarLayout.current,pool.visualScale[i]);const w=layout[0];const h=layout[1];p.set(pool.posX[i],pool.posY[i]+layout[2],pool.posZ[i]);q.copy(camera.quaternion);s.set(w+.008,h+.008,1);a.compose(p,q,s);all.bars[0].setMatrixAt(healthSlot,a);s.set(w,h,1);a.compose(p,q,s);all.bars[1].setMatrixAt(healthSlot,a);s.set(w*visibleTrailRatio,h,1);p.x=pool.posX[i]-w*(1-visibleTrailRatio)/2;a.compose(p,q,s);all.bars[2].setMatrixAt(healthSlot,a);s.set(w*currentRatio,h,1);p.x=pool.posX[i]-w*(1-currentRatio)/2;a.compose(p,q,s);all.bars[3].setMatrixAt(healthSlot,a);setSlotOpacity(all.bars[2].userData.instanceAlpha,healthSlot,visibleTrailRatio-currentRatio>.006?.18+flash*.82:0)}
      }
      if(smokeVisible){const smokeSlot=smokeCount++;const t=timer/SPAWN_SMOKE_MS;const size=(pool.visualScale[i]||1)*.333*(1.7+(1-(1-t)*(1-t))*(3.1-1.7));p.set(pool.posX[i],pool.posY[i]+(pool.visualScale[i]||1)*.333*(1+t*.32),pool.posZ[i]);q.copy(camera.quaternion);s.set(size,size,1);a.compose(p,q,s);all.smoke.setMatrixAt(smokeSlot,a);setSlotOpacity(all.smoke.userData.instanceAlpha,smokeSlot,getSpawnSmokeOpacity(timer))}
    }
    const cueIndices=cueIndicesRef.current;cueOverflowRef.current=fillVisibleChargeCueSlots(pool,tiers,cueIndices);let cueCount=0
    for(let ci=0;ci<16;ci++){const enemyIndex=cueIndices[ci];if(enemyIndex<0)continue;const cueSlot=cueCount++;const pulse=1+Math.sin(pool.spawnTimer[enemyIndex]*.012)*.08;p.set(pool.posX[enemyIndex],getPooledChargeCueY(pool.posY[enemyIndex],pool.visualScale[enemyIndex]),pool.posZ[enemyIndex]);q.copy(camera.quaternion);s.set(pulse,pulse,pulse);m.compose(p,q,s);for(let part=0;part<CUE.length;part++){a.copy(m);const cuePart=CUE[part];translate.makeTranslation(cuePart.position[0],cuePart.position[1],cuePart.position[2]);a.multiply(translate);if(cuePart.rotation){e.set(cuePart.rotation[0],cuePart.rotation[1],cuePart.rotation[2]);rotate.makeRotationFromEuler(e);a.multiply(rotate)}all.cue[part].setMatrixAt(cueSlot,a);color.setHex(cuePart.color);all.cue[part].setColorAt(cueSlot,color)}}
    for(let i=0;i<all.body.length;i++){all.body[i].count=counts[i];all.out[i].count=counts[i]}for(let i=0;i<all.bars.length;i++)all.bars[i].count=healthCount;for(let i=0;i<all.cue.length;i++)all.cue[i].count=cueCount;all.shadow.count=bodyCount;all.smoke.count=smokeCount
    mark(all.body);mark(all.out);markOne(all.shadow);mark(all.bars);markOne(all.smoke);mark(all.cue)
  })
  return <>{<primitive object={all.shadow} renderOrder={1}/>} {ALL_PARTS.map((x,i)=><primitive key={`b${i}`} object={all.body[i]} renderOrder={2}/>)} {ALL_PARTS.map((x,i)=><primitive key={`o${i}`} object={all.out[i]} renderOrder={1}/>)} {all.bars.map((x,i)=><primitive key={`h${i}`} object={all.bars[i]} renderOrder={20+i}/>)} {all.cue.map((x,i)=><primitive key={`cue${i}`} object={all.cue[i]} renderOrder={30}/>)} <primitive object={all.smoke} renderOrder={100}/></>
}
