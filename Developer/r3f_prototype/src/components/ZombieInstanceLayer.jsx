/**
 * ZombieInstanceLayer — renders ALL standard zombies (E01-E06) as InstancedMeshes.
 *
 * Instead of 76 enemies × 12 ZBlock × 2 meshes = 1,824 draw calls,
 * this renders 12 body IMs + 12 outline IMs = 24 draw calls total.
 *
 * B01 boss and Matilda are excluded — they continue using React mesh components.
 *
 * Architecture:
 *   Enemy.jsx writes { pos, yaw, type, phase, wt, vs, hitFlash } to zombieVisualRegistry.
 *   ZombieInstanceLayer reads the registry every frame and updates InstancedMesh matrices.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { zombieVisualRegistry } from '../lib/zombieVisualRegistry.js'
import { getToonGradient } from '../lib/toon.js'
import { ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import { GRAPHICS_STUDIO_TUNING_EVENT, loadStudioTunings } from '../lib/graphicsStudioConfig.js'
import { getStudioTransformProps } from './StudioTunedGroup.jsx'

const OUTLINE_STENCIL_REF = 1  // matches toon.js OUTLINE_STENCIL_REF

// ── Part definitions (one entry per box in a standard zombie) ──────────────
// grp = pivot group name (determines which animation applies)
// col = color role: 'body' | 'skin' | 'eye' | 'foot'
// sz  = BoxGeometry size
// gOff = pivot group position (parent translate)
// lOff = local offset inside the pivot group
// os   = outline scale factor (for inflated BackSide hull)
const PARTS = [
  // HEAD pivot (0, 0.82, 0) — animates rotation.z
  { key:'head',  grp:'head', col:'skin', sz:[0.52,0.48,0.46], gOff:[0,0.82,0],     lOff:[0,0,0],              os:1.08 },
  { key:'eyeL',  grp:'head', col:'eye',  sz:[0.10,0.09,0.06], gOff:[0,0.82,0],     lOff:[-0.12,0.04,0.24],    os:1.0  },
  { key:'eyeR',  grp:'head', col:'eye',  sz:[0.10,0.09,0.06], gOff:[0,0.82,0],     lOff:[ 0.12,0.04,0.24],    os:1.0  },
  // BODY pivot (0, 0.28, 0) — animates rotation.x (tilt) + scale (warn)
  { key:'body',  grp:'body', col:'body', sz:[0.56,0.58,0.40], gOff:[0,0.28,0],     lOff:[0,0,0],              os:1.09 },
  // ARML pivot (-0.40, 0.52, 0) base rot (-1.15, 0, 0.12) — animates rotation.x
  { key:'armL',  grp:'armL', col:'body', sz:[0.20,0.50,0.20], gOff:[-0.40,0.52,0], lOff:[0,-0.25,0],          os:1.05 },
  { key:'handL', grp:'armL', col:'skin', sz:[0.18,0.16,0.18], gOff:[-0.40,0.52,0], lOff:[0,-0.55,0],          os:1.03 },
  // ARMR pivot (0.40, 0.52, 0) base rot (-1.15, 0, -0.12) — animates rotation.x
  { key:'armR',  grp:'armR', col:'body', sz:[0.20,0.50,0.20], gOff:[ 0.40,0.52,0], lOff:[0,-0.25,0],          os:1.05 },
  { key:'handR', grp:'armR', col:'skin', sz:[0.18,0.16,0.18], gOff:[ 0.40,0.52,0], lOff:[0,-0.55,0],          os:1.03 },
  // LEGL pivot (-0.15, 0, 0) — animates rotation.x
  { key:'legL',  grp:'legL', col:'body', sz:[0.22,0.52,0.26], gOff:[-0.15,0,0],    lOff:[0,-0.26,0],          os:1.06 },
  { key:'footL', grp:'legL', col:'foot', sz:[0.24,0.12,0.34], gOff:[-0.15,0,0],    lOff:[0,-0.57,0.05],       os:1.03 },
  // LEGR pivot (0.15, 0, 0) — animates rotation.x
  { key:'legR',  grp:'legR', col:'body', sz:[0.22,0.52,0.26], gOff:[ 0.15,0,0],    lOff:[0,-0.26,0],          os:1.06 },
  { key:'footR', grp:'legR', col:'foot', sz:[0.24,0.12,0.34], gOff:[ 0.15,0,0],    lOff:[0,-0.57,0.05],       os:1.03 },
]
const N_PARTS = PARTS.length  // 12

const MAX_ENEMIES = 110  // upper bound for InstancedMesh count
const INFLAT = 2         // OUTLINE_THICKNESS_MULT (from toon.js)
const ZOMBIE_SHADOW_Y = 0.018
const ZOMBIE_SHADOW_WIDTH = 0.62
const ZOMBIE_SHADOW_DEPTH = 0.34
const ZOMBIE_SHADOW_OPACITY = 0.3

// ── Pre-allocated scratch matrices ────────────────────────────────────────
const _tmp  = new THREE.Matrix4()
const _euler = new THREE.Euler('XYZ')
const _col  = new THREE.Color()
const _ZERO = Object.freeze(new THREE.Matrix4().makeScale(0, 0, 0))
const _shadowPosition = new THREE.Vector3()
const _shadowRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
const _shadowScale = new THREE.Vector3()

// ── Pivot group animation rotations ────────────────────────────────────────
function setPivotEuler(dst, grp, t, type, phase) {
  const freq = type === 'E02' ? 9 : type === 'E03' ? 5 : 7
  const amp  = phase === 'charge' ? 0.55 : 0.38
  const sw   = phase === 'stun' ? 0 : Math.sin(t * freq) * amp
  const AB   = -1.15
  switch (grp) {
    case 'head': dst.set(0, 0, Math.sin(t * 1.6) * 0.07); break
    case 'body': dst.set(phase === 'charge' ? 0.45 : 0, 0, 0); break
    case 'armL': dst.set(AB + Math.sin(t * 2.8) * 0.06,           0,  0.12); break
    case 'armR': dst.set(AB + Math.sin(t * 2.8 + Math.PI) * 0.06, 0, -0.12); break
    case 'legL': dst.set(sw,  0, 0); break
    case 'legR': dst.set(-sw, 0, 0); break
    default:     dst.set(0, 0, 0); break
  }
}

// Build the world matrix for one body part of one enemy into dst.
function buildPartMatrix(part, e, dst, outlineInflate = 1, studioTransform = null) {

  // Enemy root: T(pos) × Ry(yaw) × S(vs)
  dst.makeTranslation(e.x, e.y, e.z)
  _euler.set(0, e.yaw, 0)
  _tmp.makeRotationFromEuler(_euler)
  dst.multiply(_tmp)
  if (studioTransform) {
    _euler.set(...studioTransform.rotation)
    _tmp.makeRotationFromEuler(_euler)
    dst.multiply(_tmp)
  }
  const studioScale = studioTransform?.scale ?? [1, 1, 1]
  _tmp.makeScale(e.vs * studioScale[0], e.vs * studioScale[1], e.vs * studioScale[2])
  dst.multiply(_tmp)

  // Pivot: T(gOff) × R(pivotEuler) [× S(warn) for body in warn phase]
  _tmp.makeTranslation(...part.gOff)
  dst.multiply(_tmp)
  setPivotEuler(_euler, part.grp, e.wt, e.type, e.phase)
  _tmp.makeRotationFromEuler(_euler)
  dst.multiply(_tmp)
  if (part.grp === 'body' && e.phase === 'warn') {
    const ws = Math.floor(e.wt * 14) % 2 ? 1.06 : 0.96
    _tmp.makeScale(ws, ws, ws)
    dst.multiply(_tmp)
  }

  // Local: T(lOff) [× S(outline)]
  _tmp.makeTranslation(...part.lOff)
  dst.multiply(_tmp)
  if (outlineInflate !== 1) {
    _tmp.makeScale(outlineInflate, outlineInflate, outlineInflate)
    dst.multiply(_tmp)
  }
}

function buildShadowMatrix(e, dst, studioTransform = null) {
  const studioScale = studioTransform?.scale ?? [1, 1, 1]
  _shadowPosition.set(e.x, ZOMBIE_SHADOW_Y, e.z)
  _shadowScale.set(
    Math.max(0.05, e.vs * studioScale[0] * ZOMBIE_SHADOW_WIDTH),
    Math.max(0.05, e.vs * studioScale[2] * ZOMBIE_SHADOW_DEPTH),
    1
  )
  dst.compose(_shadowPosition, _shadowRotation, _shadowScale)
}

function loadZombieStudioTransforms() {
  const tunings = loadStudioTunings()
  return Object.fromEntries(['E01', 'E02', 'E03', 'E04', 'E05', 'E06'].map((type) => [
    type,
    getStudioTransformProps(tunings[`zombie-${type.toLowerCase()}`]),
  ]))
}

// Resolve the display color for a part given enemy type and hit flash.
function partColor(part, e) {
  if (e.hitFlash) return 0xffffff
  const pal = ZOMBIE_PALETTE[e.type] ?? ZOMBIE_PALETTE.E01
  switch (part.col) {
    case 'skin': return pal.skin
    case 'eye':  return pal.eye
    case 'foot': return 0x1a1a1a
    default:     return pal.body
  }
}

// ── Material factories (stencil mirrors toon.js) ───────────────────────────
function makeBodyMat(emissiveIntensity) {
  // White base — per-instance color via setColorAt() tints it.
  // emissive는 0(검정)으로 고정: 흰색 emissive를 쓰면 인스턴스 색 위에
  // 흰색이 덧씌워져 좀비 색감이 하얗게 바래는 버그가 발생한다.
  const m = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: getToonGradient(),
    emissive: 0x000000,
    emissiveIntensity,
  })
  m.stencilWrite = true
  m.stencilRef   = OUTLINE_STENCIL_REF
  m.stencilFunc  = THREE.AlwaysStencilFunc
  m.stencilZPass = THREE.ReplaceStencilOp
  return m
}

function makeOutlineMat() {
  const m = new THREE.MeshBasicMaterial({
    color: 0x050209, side: THREE.BackSide,
    transparent: true, opacity: 0.96, depthWrite: false,
  })
  m.stencilWrite = true
  m.stencilRef   = OUTLINE_STENCIL_REF
  m.stencilFunc  = THREE.NotEqualStencilFunc
  m.stencilZPass = THREE.KeepStencilOp
  m.stencilFail  = THREE.KeepStencilOp
  m.stencilZFail = THREE.KeepStencilOp
  return m
}

// ── InstancedMesh factory ─────────────────────────────────────────────────
function makeIM(part, material, count) {
  const geo = new THREE.BoxGeometry(...part.sz)
  const im  = new THREE.InstancedMesh(geo, material, count)
  im.frustumCulled = false  // we zero-scale hidden instances ourselves
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  if (im.instanceColor) im.instanceColor.setUsage(THREE.DynamicDrawUsage)
  // Pre-hide all slots
  for (let i = 0; i < count; i++) im.setMatrixAt(i, _ZERO)
  im.instanceMatrix.needsUpdate = true
  return im
}

// ── Component ─────────────────────────────────────────────────────────────
function makeShadowIM(count) {
  const geo = new THREE.CircleGeometry(1, 28)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: ZOMBIE_SHADOW_OPACITY,
    depthTest: true,
    depthWrite: false,
  })
  const im = new THREE.InstancedMesh(geo, mat, count)
  im.frustumCulled = false
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < count; i++) im.setMatrixAt(i, _ZERO)
  im.instanceMatrix.needsUpdate = true
  return im
}

export default function ZombieInstanceLayer() {
  const dstRef = useRef(new THREE.Matrix4())
  const prevSlotCountRef = useRef(0)
  const zombieTransformsRef = useRef(loadZombieStudioTransforms())

  // One InstancedMesh per body part (body rendering) + per part (outline)
  const { bodyIMs, outIMs, shadowIM } = useMemo(() => {
    const normalMat = makeBodyMat(0.12)  // body / skin / foot parts
    const em        = makeBodyMat(0.9)   // eye parts (high emissive glow)
    const outMat    = makeOutlineMat()

    const bIMs = PARTS.map(p => makeIM(p, p.col === 'eye' ? em : normalMat, MAX_ENEMIES))
    const oIMs = PARTS.map(p => makeIM(p, outMat, MAX_ENEMIES))

    return { bodyIMs: bIMs, outIMs: oIMs, shadowIM: makeShadowIM(MAX_ENEMIES) }
  }, [])

  useEffect(() => {
    const update = () => {
      zombieTransformsRef.current = loadZombieStudioTransforms()
    }
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    }
  }, [])

  useFrame(() => {
    const reg = zombieVisualRegistry.entries

    // Slot tracking: we use a simple counter approach.
    // Each enemy gets a stable slot index via the registry's insertion order.
    // We assign slots in iteration order and zero only slots that stopped being used.
    let slot = 0
    const dst = dstRef.current

    for (const e of reg.values()) {
      if (slot >= MAX_ENEMIES) break
      const studioTransform = zombieTransformsRef.current[e.type]

      buildShadowMatrix(e, dst, studioTransform)
      shadowIM.setMatrixAt(slot, dst)

      for (let pi = 0; pi < N_PARTS; pi++) {
        const part = PARTS[pi]
        buildPartMatrix(part, e, dst, 1, studioTransform)
        bodyIMs[pi].setMatrixAt(slot, dst)
        _col.setHex(partColor(part, e))
        bodyIMs[pi].setColorAt(slot, _col)

        // Outline: same matrix but inflated
        const os = 1 + (part.os - 1) * INFLAT
        buildPartMatrix(part, e, dst, os, studioTransform)
        outIMs[pi].setMatrixAt(slot, dst)
      }

      slot++
    }

    // Zero-scale slots that were visible last frame but are no longer used.
    for (let s = slot; s < prevSlotCountRef.current; s++) {
      shadowIM.setMatrixAt(s, _ZERO)
      for (let pi = 0; pi < N_PARTS; pi++) {
        bodyIMs[pi].setMatrixAt(s, _ZERO)
        outIMs[pi].setMatrixAt(s, _ZERO)
      }
    }
    prevSlotCountRef.current = slot

    // Mark all IMs dirty
    shadowIM.instanceMatrix.needsUpdate = true
    for (let pi = 0; pi < N_PARTS; pi++) {
      bodyIMs[pi].instanceMatrix.needsUpdate = true
      if (bodyIMs[pi].instanceColor) bodyIMs[pi].instanceColor.needsUpdate = true
      outIMs[pi].instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <primitive object={shadowIM} renderOrder={1} />
      {PARTS.map((p, i) => (
        <primitive key={`body-${p.key}`} object={bodyIMs[i]} renderOrder={2} />
      ))}
      {PARTS.map((p, i) => (
        <primitive key={`out-${p.key}`} object={outIMs[i]} renderOrder={1} />
      ))}
    </>
  )
}
