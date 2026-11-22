// Knock-flight death renderer (2026-11-22, ported from the Sltera racer's run-over death). Pool + motion rules:
// lib/knockFlightDeath.js. Only kills whose impact chose KNOCK_FLIGHT_DEATH_STYLE land here (today: Sltera hits).
//
// Draw cost: the flying body is the box zombie (same layout as ZombieInstanceLayer STANDARD) baked into 5 merged
// colour groups + 1 merged outline hull, and the puffs are 1 icosahedron InstancedMesh: at most 7 draw calls while any
// flight or puff is live, whatever the number of deaths. Meshes stay visible with count 0 when idle (stage-entry
// compile prewarm sees them; 0 instances drawn). No per-frame allocation; the step pauses with the game.
// Toon shading + outline on the body (character policy); puffs are a cartoon VFX (no outline, like the racer).
import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getToonGradient } from '../lib/toon.js'
import {
  KNOCK_FLIGHT_CAPACITY, KNOCK_FLIGHT_PUFF_CAPACITY, KNOCK_FLIGHT_PUFF_RADIUS, drainKnockFlightPops,
  getKnockFlightPuffScale, knockFlightDeathPool, resetKnockFlightPool, stepKnockFlightPool,
} from '../lib/knockFlightDeath.js'
import { purifiedStudentPool, spawnPurifiedStudent } from '../lib/purifiedStudentPool.js'
import { useGameStore } from '../store/useGameStore.js'
import { markInstanceAttributePrefix } from './ZombieInstanceLayer.jsx'

// [group, size, pivot, offset, pivotRotation, outlineScale] in zombie model units. Flailing mid-air pose = the racer's
// flying pose (legs ±0.9, arms −1.35 ∓ 0.6, head tilt 0.3) on the STANDARD box layout. outlineScale 0 = no hull.
const FLAIL_PARTS = [
  ['skin', [0.52, 0.48, 0.46], [0, 0.82, 0], [0, 0, 0], [0, 0, 0.3], 1.08],
  ['eye', [0.10, 0.09, 0.06], [0, 0.82, 0], [-0.12, 0.04, 0.24], [0, 0, 0.3], 0],
  ['eye', [0.10, 0.09, 0.06], [0, 0.82, 0], [0.12, 0.04, 0.24], [0, 0, 0.3], 0],
  ['cloth', [0.56, 0.58, 0.40], [0, 0.28, 0], [0, 0, 0], [0, 0, 0], 1.09],
  ['cloth', [0.20, 0.50, 0.20], [-0.40, 0.52, 0], [0, -0.25, 0], [-1.95, 0, 0.12], 1.05],
  ['skin', [0.18, 0.16, 0.18], [-0.40, 0.52, 0], [0, -0.55, 0], [-1.95, 0, 0.12], 1.03],
  ['cloth', [0.20, 0.50, 0.20], [0.40, 0.52, 0], [0, -0.25, 0], [-0.75, 0, -0.12], 1.05],
  ['skin', [0.18, 0.16, 0.18], [0.40, 0.52, 0], [0, -0.55, 0], [-0.75, 0, -0.12], 1.03],
  ['legs', [0.22, 0.52, 0.26], [-0.15, 0, 0], [0, -0.26, 0], [0.9, 0, 0], 1.06],
  ['dark', [0.24, 0.12, 0.34], [-0.15, 0, 0], [0, -0.57, 0.05], [0.9, 0, 0], 1.03],
  ['legs', [0.22, 0.52, 0.26], [0.15, 0, 0], [0, -0.26, 0], [-0.9, 0, 0], 1.06],
  ['dark', [0.24, 0.12, 0.34], [0.15, 0, 0], [0, -0.57, 0.05], [-0.9, 0, 0], 1.03],
]
export const KNOCK_FLIGHT_BODY_GROUPS = ['skin', 'eye', 'cloth', 'legs', 'dark']
const SHOE_COLOR = 0x1a1a1a

function partMatrix(part, inflate) {
  const [, size, pivot, offset, rot] = part
  const m = new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2])
  m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ')))
  m.multiply(new THREE.Matrix4().makeTranslation(offset[0], offset[1], offset[2]))
  // Hull = the same box scaled about its own centre (ZombieInstanceLayer: 1 + (outlineScale − 1)·2).
  if (inflate) { const s = 1 + (part[5] - 1) * 2; m.multiply(new THREE.Matrix4().makeScale(s, s, s)) }
  return m
}
function boxFor(part, inflate) {
  const g = new THREE.BoxGeometry(part[1][0], part[1][1], part[1][2])
  g.applyMatrix4(partMatrix(part, inflate))
  return g
}
export function buildKnockFlightGeometries() {
  const groups = {}
  for (const key of KNOCK_FLIGHT_BODY_GROUPS) {
    const pieces = FLAIL_PARTS.filter((part) => part[0] === key).map((part) => boxFor(part, false))
    groups[key] = mergeGeometries(pieces)
    pieces.forEach((g) => g.dispose())
  }
  const hulls = FLAIL_PARTS.filter((part) => part[5] > 0).map((part) => boxFor(part, true))
  const outline = mergeGeometries(hulls)
  hulls.forEach((g) => g.dispose())
  return { groups, outline }
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const m = new THREE.Matrix4(); const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3()
const euler = new THREE.Euler(0, 0, 0, 'XYZ'); const color = new THREE.Color()

function makeIM(geometry, material, capacity, withColor) {
  const x = new THREE.InstancedMesh(geometry, material, capacity)
  x.frustumCulled = false
  x.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < capacity; i += 1) x.setMatrixAt(i, ZERO)
  if (withColor) { x.setColorAt(0, color.setHex(0xffffff)); x.instanceColor.setUsage(THREE.DynamicDrawUsage) }
  x.count = 0
  x.visible = true
  return x
}
function upload(x, count) {
  x.count = count
  x.visible = true
  markInstanceAttributePrefix(x.instanceMatrix, count, 16)
  if (x.instanceColor) markInstanceAttributePrefix(x.instanceColor, count, 3)
}
function toon(hex) { return new THREE.MeshToonMaterial({ color: hex, gradientMap: getToonGradient() }) }

export default function KnockFlightDeathLayer({ resetKey, pool = knockFlightDeathPool }) {
  const meshes = useMemo(() => {
    const { groups, outline } = buildKnockFlightGeometries()
    const body = {
      skin: makeIM(groups.skin, toon(0xffffff), KNOCK_FLIGHT_CAPACITY, true),
      // Eyes stay unlit (bright like the pooled zombies' emissive eyes).
      eye: makeIM(groups.eye, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), KNOCK_FLIGHT_CAPACITY, true),
      cloth: makeIM(groups.cloth, toon(0xffffff), KNOCK_FLIGHT_CAPACITY, true),
      legs: makeIM(groups.legs, toon(0xffffff), KNOCK_FLIGHT_CAPACITY, true),
      dark: makeIM(groups.dark, toon(SHOE_COLOR), KNOCK_FLIGHT_CAPACITY, false),
    }
    const out = makeIM(outline, new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96, depthWrite: false }), KNOCK_FLIGHT_CAPACITY, false)
    const puffMaterial = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient(), emissive: 0xffffff, emissiveIntensity: 0.18 })
    const puff = makeIM(new THREE.IcosahedronGeometry(KNOCK_FLIGHT_PUFF_RADIUS, 0), puffMaterial, KNOCK_FLIGHT_PUFF_CAPACITY, true)
    body.skin.name = 'knock-flight-skin'; out.name = 'knock-flight-outline'; puff.name = 'knock-flight-puffs'
    return { body, out, puff, all: [...Object.values(body), out, puff] }
  }, [])
  useEffect(() => () => { for (const x of meshes.all) { x.geometry.dispose(); x.material.dispose(); x.dispose() } }, [meshes])
  useLayoutEffect(() => {
    resetKnockFlightPool(pool)
    for (const x of meshes.all) upload(x, 0)
  }, [meshes, pool, resetKey])

  useFrame((_, delta) => {
    if (useGameStore.getState().phase !== 'playing') return // the flight freezes with the game (pause / level-up)
    stepKnockFlightPool(pool, delta)
    // After the pop the zombie is "purified" like every other kill: the sitting student appears at the burst spot.
    drainKnockFlightPops(pool, (x, z, scale, palette) => { spawnPurifiedStudent(purifiedStudentPool, x, 0, z, scale, palette) })
    const { body, out, puff } = meshes
    let n = 0
    for (let i = 0; i < pool.capacity; i += 1) {
      if (!pool.active[i]) continue
      const k = pool.scale[i]
      pos.set(pool.x[i], pool.y[i], pool.z[i]); euler.set(pool.rx[i], pool.ry[i], pool.rz[i]); quat.setFromEuler(euler); scl.set(k, k, k)
      m.compose(pos, quat, scl)
      body.skin.setMatrixAt(n, m); body.eye.setMatrixAt(n, m); body.cloth.setMatrixAt(n, m); body.legs.setMatrixAt(n, m); body.dark.setMatrixAt(n, m); out.setMatrixAt(n, m)
      body.skin.setColorAt(n, color.setHex(pool.skin[i]))
      body.eye.setColorAt(n, color.setHex(pool.eye[i]))
      body.cloth.setColorAt(n, color.setHex(pool.body[i]))
      body.legs.setColorAt(n, color.setHex(pool.legs[i]))
      n += 1
    }
    for (const key of KNOCK_FLIGHT_BODY_GROUPS) upload(body[key], n)
    upload(out, n)
    let p = 0
    for (let i = 0; i < pool.puffCapacity; i += 1) {
      if (!pool.puffActive[i]) continue
      const s = getKnockFlightPuffScale(pool.puffAge[i], pool.puffLife[i], pool.puffSize[i])
      pos.set(pool.puffX[i], pool.puffY[i], pool.puffZ[i]); euler.set(pool.puffAge[i] * 3, pool.puffAge[i] * 2, 0); quat.setFromEuler(euler); scl.set(s, s, s)
      m.compose(pos, quat, scl)
      puff.setMatrixAt(p, m)
      puff.setColorAt(p, color.setHex(pool.puffColor[i]))
      p += 1
    }
    upload(puff, p)
  })

  return (
    <>
      <primitive object={meshes.out} renderOrder={1} />
      {KNOCK_FLIGHT_BODY_GROUPS.map((key) => <primitive key={`kf-${key}`} object={meshes.body[key]} renderOrder={2} />)}
      <primitive object={meshes.puff} renderOrder={3} />
    </>
  )
}
