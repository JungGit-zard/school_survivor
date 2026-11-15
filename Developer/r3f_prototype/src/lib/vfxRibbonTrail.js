// Terry 2026-11-15 pick: paper plane "리본 꼬리 (drei <Trail> 방식)" — port of the trial S.trail 'ribbon'
// (a drei Trail / MeshLine-style strip; drei is MIT). One BufferGeometry holds a ribbon for every pool slot,
// so all paper planes share ONE draw call. No outline: three flat bands (white head, cream, orange tail).
//
// History: each slot keeps RIBBON_POINTS positions; a new point is recorded every RIBBON_SPACING units the
// plane travels and point 0 always sits on the plane. Inactive slots collapse to zero-area quads.
import * as THREE from 'three'

export const RIBBON_POINTS = 14
export const RIBBON_SPACING = 0.09

const RIBBON_VS = 'attribute float alpha; varying float vA; void main(){ vA=alpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
const RIBBON_FS = 'varying float vA; void main(){ if (vA < 0.05) discard; vec3 c = vA>0.66? vec3(1.0): (vA>0.33? vec3(1.0,0.93,0.6): vec3(1.0,0.75,0.35)); gl_FragColor=vec4(c, 1.0); }'

export function createRibbonTrail(capacity = 64) {
  const N = RIBBON_POINTS
  const vertsPerSlot = N * 2
  const positions = new Float32Array(capacity * vertsPerSlot * 3)
  const alpha = new Float32Array(capacity * vertsPerSlot)
  const index = []
  for (let slot = 0; slot < capacity; slot += 1) {
    const base = slot * vertsPerSlot
    for (let i = 0; i < N; i += 1) {
      // Trial: alpha i/(N-1) with the head at the high end. Point 0 here is the head.
      const a = (N - 1 - i) / (N - 1)
      alpha[base + i * 2] = a
      alpha[base + i * 2 + 1] = a
    }
    for (let i = 0; i < N - 1; i += 1) {
      const a = base + i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  const positionAttr = new THREE.BufferAttribute(positions, 3)
  positionAttr.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', positionAttr)
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1))
  geometry.setIndex(index)
  const material = new THREE.ShaderMaterial({
    vertexShader: RIBBON_VS,
    fragmentShader: RIBBON_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.name = 'paper-plane-ribbon-trail'

  const histX = new Float32Array(capacity * N)
  const histY = new Float32Array(capacity * N)
  const histZ = new Float32Array(capacity * N)
  const live = new Uint8Array(capacity)
  const lastAge = new Float32Array(capacity)

  function resetSlot(slot, x, y, z) {
    const h = slot * N
    for (let i = 0; i < N; i += 1) { histX[h + i] = x; histY[h + i] = y; histZ[h + i] = z }
  }

  function collapseSlot(slot) {
    const o = slot * vertsPerSlot * 3
    positions.fill(0, o, o + vertsPerSlot * 3)
  }

  // Follow one slot this frame. ageMs lets a reused slot (new plane) restart its history.
  function update(slot, x, y, z, ageMs) {
    if (slot < 0 || slot >= capacity) return
    const h = slot * N
    if (!live[slot] || ageMs < lastAge[slot]) resetSlot(slot, x, y, z)
    live[slot] = 1
    lastAge[slot] = ageMs
    const dx = x - histX[h + 1]
    const dz = z - histZ[h + 1]
    if (dx * dx + dz * dz >= RIBBON_SPACING * RIBBON_SPACING) {
      for (let i = N - 1; i > 0; i -= 1) {
        histX[h + i] = histX[h + i - 1]; histY[h + i] = histY[h + i - 1]; histZ[h + i] = histZ[h + i - 1]
      }
    }
    histX[h] = x; histY[h] = y; histZ[h] = z
    const o = slot * vertsPerSlot * 3
    for (let i = 0; i < N; i += 1) {
      const a = (N - 1 - i) / (N - 1)
      const w = 0.02 + 0.12 * a
      // Perpendicular in XZ from the neighbouring points.
      const i0 = Math.max(0, i - 1)
      const i1 = Math.min(N - 1, i + 1)
      let tx = histX[h + i0] - histX[h + i1]
      let tz = histZ[h + i0] - histZ[h + i1]
      const len = Math.hypot(tx, tz)
      if (len > 1e-5) { tx /= len; tz /= len } else { tx = 1; tz = 0 }
      const px = -tz * w
      const pz = tx * w
      const k = o + i * 6
      positions[k] = histX[h + i] + px; positions[k + 1] = histY[h + i]; positions[k + 2] = histZ[h + i] + pz
      positions[k + 3] = histX[h + i] - px; positions[k + 4] = histY[h + i]; positions[k + 5] = histZ[h + i] - pz
    }
  }

  function release(slot) {
    if (slot < 0 || slot >= capacity || !live[slot]) return
    live[slot] = 0
    collapseSlot(slot)
  }

  function commit() {
    positionAttr.needsUpdate = true
  }

  function clear() {
    live.fill(0)
    positions.fill(0)
    positionAttr.needsUpdate = true
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
  }

  return { mesh, capacity, update, release, commit, clear, dispose }
}
