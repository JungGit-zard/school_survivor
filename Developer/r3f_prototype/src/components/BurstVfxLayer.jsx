// Terry 2026-11-15 VFX picks — one pooled layer for every one-shot effect Terry chose on the trial page
// (per-weapon hits, Chibiko pencil hit, kill puff, pickup, heal, level-up, heart burst, shark explosion,
// starlink impact, onigiri twinkle trail). Port of trial_src.js S.* build() functions, without any outline.
//
// Performance (phones): every effect piece type is ONE InstancedMesh with a fixed capacity, built once.
// Gameplay code queues bursts with spawnVfxBurst() (typed-array ring buffer, no allocation); this layer drains
// the queue, advances every live burst and rewrites only the used front of each instance buffer per frame.
// Idle cost: each InstancedMesh draws 0 instances. Meshes stay visible (count 0) so the stage-entry
// compileAsync prewarm (traverseVisible) compiles their programs before the run starts.
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { markInstanceUpload } from '../lib/templateInstanceLayer.js'
import {
  VFX_TEXTURES,
  createBinbunStarMaterial,
  createReeboMaterial,
  createVfxSpriteMaterial,
  vfxEase as ease,
  vfxPop as pop,
} from '../lib/vfxShaders.js'
import { VFX_BURST, VFX_BURST_KIND_COUNT, clearVfxBursts, drainVfxBursts, spawnVfxBurst } from '../lib/vfxBursts.js'

const LEVEL_UP_COLORS = { core: 0xffffff, mid: 0x9ff0ff, edge: 0x3aa0ff }

// Piece layers in draw order (renderOrder = index + 20, after the floor/decals and below HUD-like sprites).
// ground: quad lies flat on the floor (trial quad(mat, true)); otherwise it faces the camera.
export const BURST_PIECE_LAYERS = Object.freeze([
  { key: 'chibikoRing', cap: 24, ground: true, make: () => createVfxSpriteMaterial('kenney_circle_02', { mode: 'toon', color: 0xffe36a, billboard: false }) },
  { key: 'pickupRing', cap: 24, ground: true, make: () => createReeboMaterial('ring', { core: 0xffffff, mid: 0xffe36a, edge: 0xe0a020, u: { r0: 0.15, r1: 0.85, w0: 0.25, w1: 0, breakup: 0.3 }, billboard: false }) },
  { key: 'healMagic', cap: 4, ground: true, make: () => createVfxSpriteMaterial('kenney_magic_03', { mode: 'toon', color: 0x9ff0ff, billboard: false }) },
  { key: 'healCircle', cap: 4, ground: true, make: () => createVfxSpriteMaterial('kenney_circle_03', { mode: 'toon', color: 0xffffff, billboard: false }) },
  { key: 'levelRing', cap: 8, ground: true, make: () => createReeboMaterial('ring', { ...LEVEL_UP_COLORS, u: { r0: 0.1, r1: 0.9, w0: 0.25, w1: 0, breakup: 0.3 }, billboard: false }) },
  { key: 'fireRing', cap: 12, ground: true, make: () => createReeboMaterial('ring', { u: { r0: 0.1, r1: 0.9, w0: 0.3, w1: 0, breakup: 0.45 }, billboard: false }) },
  { key: 'killPuff', cap: 120, make: () => createVfxSpriteMaterial('reebo_puff', { mode: 'asis' }) },
  { key: 'fireBlob', cap: 12, make: () => createReeboMaterial('blob', { u: { s0: 0.25, s1: 0.85, distort: 0.45, ns: 1.4, e0: 0, e1: 0.95, drift: 0.35, cool: 1.2 } }) },
  { key: 'fireRays', cap: 12, make: () => createReeboMaterial('rays', { u: { count: 15, fill: 0.7, rw: 0.05 } }) },
  { key: 'sharkExplosion', cap: 8, make: () => createVfxSpriteMaterial('codemanu_explosion', { mode: 'asis' }) },
  { key: 'heart', cap: 36, make: () => createVfxSpriteMaterial('adfx_heart', { mode: 'asis' }) },
  { key: 'levelPillar', cap: 4, make: () => createReeboMaterial('pillar', { ...LEVEL_UP_COLORS, u: { width: 0.4, rise: 0.22, scrollS: 1.6, streaks: 0.5 } }) },
  { key: 'healStar', cap: 16, make: () => createVfxSpriteMaterial('kenney_star_07', { mode: 'toon', color: 0xfff6b0 }) },
  { key: 'pickupTwinkle', cap: 24, make: () => createVfxSpriteMaterial('reebo_twinkle', { mode: 'toon', color: 0xffffff }) },
  { key: 'onigiriTwinkle', cap: 96, make: () => createVfxSpriteMaterial('reebo_twinkle', { mode: 'toon', color: 0xfff27a }) },
  { key: 'pencilDot', cap: 48, make: () => createVfxSpriteMaterial('kenney_circle_05', { mode: 'toon', color: 0xffffff }) },
  { key: 'pencilStar', cap: 48, make: () => createVfxSpriteMaterial('kenney_star_07', { mode: 'toon', color: 0xfff27a }) },
  { key: 'lanternStar', cap: 64, make: () => createVfxSpriteMaterial('kenney_star_07', { mode: 'soft', color: 0xffe840 }) },
  { key: 'reeboFlash', cap: 32, make: () => createReeboMaterial('flash', { u: { peak: 0.2, core: 0.35, crossAmt: 1, crossW: 0.09 } }) },
  { key: 'reeboRays', cap: 32, make: () => createReeboMaterial('rays', { u: { count: 11, fill: 0.75, rw: 0.06 } }) },
  { key: 'binbunStar', cap: 32, make: () => createBinbunStarMaterial() },
  { key: 'codemanuImpact', cap: 48, make: () => createVfxSpriteMaterial('codemanu_impact_white', { mode: 'asis' }) },
  { key: 'pixelSpark', cap: 48, make: () => createVfxSpriteMaterial('px_hit_spark_48', { mode: 'asis', pixel: true }) },
  { key: 'chibikoStar', cap: 48, make: () => createVfxSpriteMaterial('kenney_star_06', { mode: 'toon', color: 0xfff6b0 }) },
])

const frameOf = (key, p) => {
  const frames = VFX_TEXTURES[key].frames
  return Math.min(frames - 1, Math.floor(p * frames))
}

// Kind table. life = seconds (trial `life`), cap = simultaneous bursts kept (oldest replaced),
// follow = sits on the player each frame. write(e, p, put) emits the pieces of one burst at progress p.
// put(layerKey, x, y, z, sx, sy, rotZ, d0, d1, d2) — d0 progress/decay, d1 opacity, d2 frame/toon threshold.
// 상어 미사일 폭발 그림 배율(2026-11-22 Terry: 이전 크기의 70%). 피해 반경과 무관한 그림 전용 값.
export const SHARK_EXPLOSION_VISUAL_SCALE = 0.7
export const BURST_KINDS = Object.freeze({
  [VFX_BURST.HIT_PENCIL]: { life: 0.22, cap: 48, write(e, p, put) {
    const dot = 0.55 * pop(Math.min(1, p * 1.8))
    put('pencilDot', e.x, e.y, e.z, dot, dot, 0, p, 1, 0.4 + 0.5 * p)
    const s = 0.6 + 0.6 * ease(p * 1.6)
    put('pencilStar', e.x, e.y, e.z, s, s, 0, p, p < 0.8 ? 1 : (1 - p) / 0.2, 0.3 + 0.5 * p)
  } },
  [VFX_BURST.HIT_REEBO]: { life: 0.3, cap: 32, write(e, p, put) {
    put('reeboFlash', e.x, e.y, e.z, 0.9, 0.9, 0, p, 1, 0)
    put('reeboRays', e.x, e.y, e.z, 1.1, 1.1, 0, p, 1, 0)
  } },
  [VFX_BURST.HIT_BINBUN]: { life: 0.25, cap: 32, write(e, p, put) {
    const s = 0.4 + 0.6 * ease(p * 2)
    put('binbunStar', e.x, e.y, e.z, s, s, 0, 1 - 0.75 * p, 1 - p * p, 0)
  } },
  [VFX_BURST.HIT_CODEMANU]: { life: 0.35, cap: 48, write(e, p, put) {
    put('codemanuImpact', e.x, e.y, e.z, 1.1, 1.1, 0, p, 1, frameOf('codemanu_impact_white', p))
  } },
  [VFX_BURST.HIT_LANTERN]: { life: 0.22, cap: 64, write(e, p, put) {
    const s = 0.4 + 0.5 * ease(p * 1.6)
    put('lanternStar', e.x, e.y, e.z, s, s, 0, p, 1 - p, 0)
  } },
  [VFX_BURST.HIT_PIXEL]: { life: 0.45, cap: 48, write(e, p, put) {
    put('pixelSpark', e.x, e.y, e.z, 0.9, 0.9, 0, p, 1, frameOf('px_hit_spark_48', p))
  } },
  [VFX_BURST.HIT_CHIBIKO]: { life: 0.35, cap: 16, write(e, p, put) {
    const r = 0.4 + 0.6 * ease(p)
    put('chibikoRing', e.x, 0.05, e.z, r, r, 0, p, 1 - p, 0.5)
    const spread = 0.25 * ease(p)
    const baseY = Math.max(0.3, e.y - 0.15) + 0.35 * p
    const s = 0.32 * pop(p)
    for (let i = 0; i < 3; i += 1) {
      const a = i * 2.1
      put('chibikoStar', e.x + Math.cos(a) * spread, baseY, e.z + Math.sin(a) * spread, s, s, 0, p, 1, 0.45)
    }
  } },
  [VFX_BURST.KILL_PUFF]: { life: 0.45, cap: 24, write(e, p, put) {
    const d = (0.15 + 0.45 * ease(p)) * e.s
    const s = 0.42 * (1 - p * 0.8) * e.s
    const y = e.y + (0.35 + 0.25 * p) * e.s
    const o = p < 0.7 ? 1 : (1 - p) / 0.3
    for (let i = 0; i < 5; i += 1) {
      const a = i / 5 * Math.PI * 2 + 0.3
      put('killPuff', e.x + Math.cos(a) * d, y, e.z + Math.sin(a) * d, s, s, 0, p, o, 0)
    }
  } },
  [VFX_BURST.PICKUP]: { life: 0.35, cap: 24, write(e, p, put) {
    put('pickupRing', e.x, 0.05, e.z, 1, 1, 0, p, 1, 0)
    const s = 0.4 * pop(p)
    put('pickupTwinkle', e.x, 0.35 + 0.3 * p, e.z, s, s, 0, p, 1, 0.5)
  } },
  [VFX_BURST.HEAL]: { life: 0.8, cap: 4, follow: true, write(e, p, put) {
    const m = 1.6 + 0.4 * ease(p)
    put('healMagic', e.x, 0.05, e.z, m, m, p * 2, p, p < 0.7 ? 1 : (1 - p) / 0.3, 0.5)
    const c = 0.5 + 2.0 * ease(p)
    put('healCircle', e.x, 0.06, e.z, c, c, 0, p, 1 - p, 0.5)
    const s = 0.38 * pop(p)
    for (let i = 0; i < 4; i += 1) {
      const a = i * Math.PI / 2 + 0.4 + p * 2
      put('healStar', e.x + Math.cos(a) * 0.55, 0.2 + 1.4 * p, e.z + Math.sin(a) * 0.55, s, s, 0, p, 1, 0.45)
    }
  } },
  [VFX_BURST.LEVEL_UP]: { life: 0.8, cap: 4, follow: true, write(e, p, put) {
    put('levelRing', e.x, 0.05, e.z, 2.2, 2.2, 0, Math.min(1, p * 1.4), 1, 0)
    // Terry's pick is "빛기둥 + 링 2개": the second ring trails the first.
    if (p >= 0.18) put('levelRing', e.x, 0.055, e.z, 1.5, 1.5, 0, Math.min(1, (p - 0.18) * 1.4), 1, 0)
    put('levelPillar', e.x, 1.05, e.z, 1.2, 2.2, 0, p, 1, 0)
  } },
  [VFX_BURST.HEART_BURST]: { life: 0.55, cap: 6, write(e, p, put) {
    const frame = frameOf('adfx_heart', p)
    const center = 0.75 * e.s
    put('heart', e.x, 0.55 * Math.min(1.4, e.s / 1.6) + 0.1, e.z, center, center, 0, p, 1, frame)
    const d = (0.15 + 0.55 * ease(p)) * e.s
    const small = 0.35 * e.s
    for (let i = 0; i < 5; i += 1) {
      const a = i / 5 * Math.PI * 2 + 0.3
      put('heart', e.x + Math.cos(a) * d, 0.45 + 0.25 * p, e.z + Math.sin(a) * d, small, small, 0, p, 1, frame)
    }
  } },
  [VFX_BURST.SHARK_EXPLOSION]: { life: 0.6, cap: 8, write(e, p, put) {
    // 2026-11-22 Terry "상어미사일 폭발효과 크기 지금의 70퍼센트로": 그림만 0.7배(높이도 같이 내려 바닥에 붙은 채 작아진다).
    // e.s = 실제 피해 반경(그대로) — 피해·반경은 SharkMissile.jsx applyRadialDamage가 정하고 여기서는 바꾸지 않는다.
    const k = (e.s / 1.6) * SHARK_EXPLOSION_VISUAL_SCALE
    put('sharkExplosion', e.x, 0.8 * k, e.z, 2.8 * k, 2.8 * k, 0, p, 1, frameOf('codemanu_explosion', p))
  } },
  [VFX_BURST.STARLINK_IMPACT]: { life: 0.6, cap: 12, write(e, p, put) {
    const k = e.s / 1.6
    put('fireRing', e.x, 0.05, e.z, 3.4 * k, 3.4 * k, 0, Math.min(1, p * 1.2), 1, 0)
    put('fireBlob', e.x, 0.7 * k, e.z, 2.4 * k, 2.4 * k, 0, p, 1, 0)
    put('fireRays', e.x, 0.7 * k, e.z, 3 * k, 3 * k, 0, Math.min(1, p * 1.5), 1, 0)
  } },
  [VFX_BURST.ONIGIRI_TWINKLE]: { life: 0.3, cap: 96, write(e, p, put) {
    const s = 0.28 * (1 - p * 0.8)
    put('onigiriTwinkle', e.x, e.y + Math.sin(e.seed * 2.3) * 0.1, e.z, s, s, 0, p, p < 0.7 ? 1 : (1 - p) / 0.3, 0.5)
  } },
})

function createPieceLayer(def, index) {
  const material = def.make()
  const geometry = new THREE.PlaneGeometry(1, 1)
  const data = new THREE.InstancedBufferAttribute(new Float32Array(def.cap * 4), 4)
  data.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('iData', data)
  const mesh = new THREE.InstancedMesh(geometry, material, def.cap)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.count = 0
  mesh.frustumCulled = false
  mesh.renderOrder = 20 + index
  mesh.name = `vfx-burst-${def.key}`
  mesh.userData.studioNonFocusable = true
  mesh.userData.studioNonTunable = true
  return { key: def.key, cap: def.cap, ground: !!def.ground, mesh, material, geometry, matrix: mesh.instanceMatrix.array, data: data.array, dataAttr: data, n: 0, lastN: 0 }
}

function createKindPool(cap) {
  return { cap, head: 0, active: new Uint8Array(cap), t0: new Float32Array(cap), x: new Float32Array(cap), y: new Float32Array(cap), z: new Float32Array(cap), s: new Float32Array(cap), seed: new Float32Array(cap) }
}

// Creates the whole layer state (no React). Exposed for tests and the Graphics Studio-free preview page.
export function createBurstVfxSystem() {
  const layers = BURST_PIECE_LAYERS.map(createPieceLayer)
  const byKey = {}
  for (const layer of layers) byKey[layer.key] = layer
  const pools = new Array(VFX_BURST_KIND_COUNT).fill(null)
  for (const [kind, def] of Object.entries(BURST_KINDS)) pools[kind] = createKindPool(def.cap)
  const reeboMaterials = layers.map((l) => l.material).filter((m) => m.uniforms.uTime)
  const group = new THREE.Group()
  group.name = 'burst-vfx-layer'
  for (const layer of layers) group.add(layer.mesh)

  const state = { time: 0, seedCounter: 0 }
  const effect = { x: 0, y: 0, z: 0, s: 1, seed: 0 }

  // put(): write one instance into the named piece layer (column-major instance matrix + iData).
  const put = (key, x, y, z, sx, sy, rotZ, d0, d1, d2) => {
    const layer = byKey[key]
    if (!layer || layer.n >= layer.cap) return
    const o = layer.n * 16
    const te = layer.matrix
    if (layer.ground) {
      // T * Rx(-PI/2) * Rz(rotZ) * S(sx, sy, 1)
      const c = Math.cos(rotZ)
      const s = Math.sin(rotZ)
      te[o] = c * sx; te[o + 1] = 0; te[o + 2] = -s * sx; te[o + 3] = 0
      te[o + 4] = -s * sy; te[o + 5] = 0; te[o + 6] = -c * sy; te[o + 7] = 0
      te[o + 8] = 0; te[o + 9] = 1; te[o + 10] = 0; te[o + 11] = 0
    } else {
      te[o] = sx; te[o + 1] = 0; te[o + 2] = 0; te[o + 3] = 0
      te[o + 4] = 0; te[o + 5] = sy; te[o + 6] = 0; te[o + 7] = 0
      te[o + 8] = 0; te[o + 9] = 0; te[o + 10] = 1; te[o + 11] = 0
    }
    te[o + 12] = x; te[o + 13] = y; te[o + 14] = z; te[o + 15] = 1
    const d = layer.data
    const k = layer.n * 4
    d[k] = d0; d[k + 1] = d1; d[k + 2] = d2; d[k + 3] = effect.seed
    layer.n += 1
  }

  const spawn = (kind, x, y, z, scale) => {
    const pool = pools[kind]
    if (!pool) return
    const slot = pool.head
    pool.head = (slot + 1) % pool.cap
    pool.active[slot] = 1
    pool.t0[slot] = state.time
    pool.x[slot] = x; pool.y[slot] = y; pool.z[slot] = z; pool.s[slot] = scale
    state.seedCounter = (state.seedCounter + 1) % 997
    pool.seed[slot] = (state.seedCounter * 7.31) % 10
  }

  function step(delta) {
    state.time += Math.min(0.1, Math.max(0, delta))
    drainVfxBursts(spawn)
    for (const layer of layers) layer.n = 0
    for (let kind = 1; kind < VFX_BURST_KIND_COUNT; kind += 1) {
      const pool = pools[kind]
      if (!pool) continue
      const def = BURST_KINDS[kind]
      for (let i = 0; i < pool.cap; i += 1) {
        if (!pool.active[i]) continue
        const p = (state.time - pool.t0[i]) / def.life
        if (p >= 1) { pool.active[i] = 0; continue }
        effect.x = def.follow ? playerPos.x : pool.x[i]
        effect.y = pool.y[i]
        effect.z = def.follow ? playerPos.z : pool.z[i]
        effect.s = pool.s[i]
        effect.seed = pool.seed[i]
        def.write(effect, p, put)
      }
    }
    for (const material of reeboMaterials) material.uniforms.uTime.value = state.time
    for (const layer of layers) {
      if (layer.n === 0 && layer.lastN === 0) continue
      layer.mesh.count = layer.n
      markInstanceUpload(layer.mesh.instanceMatrix, layer.n, 16)
      markInstanceUpload(layer.dataAttr, layer.n, 4)
      layer.lastN = layer.n
    }
  }

  function reset() {
    clearVfxBursts()
    for (const pool of pools) if (pool) pool.active.fill(0)
    for (const layer of layers) { layer.n = 0; layer.lastN = 0; layer.mesh.count = 0 }
  }

  function dispose() {
    for (const layer of layers) { layer.geometry.dispose(); layer.material.dispose() }
  }

  function activeCount(kind) {
    const pool = pools[kind]
    if (!pool) return 0
    let n = 0
    for (let i = 0; i < pool.cap; i += 1) n += pool.active[i]
    return n
  }

  return { group, layers, step, reset, dispose, activeCount }
}

export default function BurstVfxLayer() {
  const system = useMemo(() => createBurstVfxSystem(), [])
  const gameKey = useGameStore((s) => s.gameKey)

  useEffect(() => () => system.dispose(), [system])
  useEffect(() => { system.reset() }, [system, gameKey])

  // Level-up moment: the player's level rises within the same run.
  useEffect(() => useGameStore.subscribe((state, prev) => {
    if (state.gameKey !== prev.gameKey) return
    if ((state.player?.level ?? 0) > (prev.player?.level ?? 0)) {
      spawnVfxBurst(VFX_BURST.LEVEL_UP, playerPos.x, 0, playerPos.z, 1)
    }
  }), [])

  // Effects freeze with the game (pause / level-up modal) and resume with it, like the gameplay they mark.
  useFrame((_, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    system.step(delta)
  })

  return <primitive object={system.group} />
}
