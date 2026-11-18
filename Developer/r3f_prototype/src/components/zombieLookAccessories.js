// Worn accessories for zombie look variants (lib/zombieLooks.js): hair, caps, bags, scarves as boxes.
// One shared InstancedMesh pair (toon body + back-face outline) per render layer = 2 draw calls,
// whatever the number of types or looks. Matrices come from the zombie's own head/body part frames,
// so accessories follow the walk animation, the look's build and the Studio root scale.
import * as THREE from 'three'
import { getCachedBoxGeo, getToonGradient } from '../lib/toon.js'
import { accessoryBoxes } from '../lib/zombieLooks.js'

export const LOOK_ACC_PER_ZOMBIE = 8
const OUTLINE_THICKNESS = 0.045
const OUTLINE_STENCIL = 1
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const work = new THREE.Matrix4(); const color = new THREE.Color()

function mesh(geometry, material, capacity) {
  const x = new THREE.InstancedMesh(geometry, material, capacity)
  x.frustumCulled = false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < capacity; i += 1) x.setMatrixAt(i, ZERO)
  x.count = 0; x.visible = false
  return x
}

export function createLookAccessoryMeshes(zombieCapacity) {
  const capacity = zombieCapacity * LOOK_ACC_PER_ZOMBIE
  // Plain 12-triangle box: a crowd of 83 E19 wears ~300 accessory boxes (+ outlines); chamfers would add ~30k triangles.
  const geometry = getCachedBoxGeo(1, 1, 1)
  const toon = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient() })
  toon.stencilWrite = true; toon.stencilRef = OUTLINE_STENCIL; toon.stencilFunc = THREE.AlwaysStencilFunc; toon.stencilZPass = THREE.ReplaceStencilOp
  const line = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96, depthWrite: false })
  line.stencilWrite = true; line.stencilRef = OUTLINE_STENCIL; line.stencilFunc = THREE.NotEqualStencilFunc
  const body = mesh(geometry, toon, capacity); const out = mesh(geometry, line, capacity)
  body.setColorAt(0, color.setHex(0xffffff)); body.instanceColor.setUsage(THREE.DynamicDrawUsage)
  body.name = 'zombie-look-accessories'; out.name = 'zombie-look-accessories-outline'
  body.renderOrder = 2; out.renderOrder = 1
  return { body, out, capacity, count: 0 }
}

export function disposeLookAccessoryMeshes(acc) {
  // The box geometry is the shared toon.js cache; only the materials are ours.
  acc.body.material.dispose(); acc.out.material.dispose(); acc.body.dispose(); acc.out.dispose()
}

// Local matrices for one look on one part layout, built once per key (caller: layer + type + look).
const plans = new Map()
export function getLookAccessoryPlan(id, look, headHalf, bodyHalf) {
  let plan = plans.get(id)
  if (plan) return plan
  plan = []
  const frames = { head: { hx: headHalf[0], hy: headHalf[1], hz: headHalf[2] }, body: { bx: bodyHalf[0], by: bodyHalf[1], bz: bodyHalf[2] } }
  for (const item of look?.acc ?? []) {
    for (const box of accessoryBoxes(item.kind, frames)) {
      const local = new THREE.Matrix4().makeTranslation(box.pos[0], box.pos[1], box.pos[2]).multiply(new THREE.Matrix4().makeScale(box.size[0], box.size[1], box.size[2]))
      const outline = local.clone().multiply(new THREE.Matrix4().makeScale(...box.size.map((v) => (v + OUTLINE_THICKNESS) / v)))
      plan.push({ frame: box.frame === 'head' ? 0 : 1, local, outline, color: box.tone ? item.color2 : item.color })
    }
  }
  plans.set(id, plan)
  return plan
}

export function beginLookAccessories(acc) { acc.count = 0 }
// Writes one zombie's accessories. headFrame/bodyFrame = unscaled part frames (centre of the box).
export function writeLookAccessories(acc, plan, headFrame, bodyFrame, flashing) {
  for (let k = 0; k < plan.length; k += 1) {
    if (acc.count >= acc.capacity) return
    const item = plan[k]; const frame = item.frame === 0 ? headFrame : bodyFrame; const slot = acc.count++
    acc.body.setMatrixAt(slot, work.multiplyMatrices(frame, item.local))
    acc.body.setColorAt(slot, color.setHex(flashing ? 0xffffff : item.color))
    acc.out.setMatrixAt(slot, work.multiplyMatrices(frame, item.outline))
  }
}
export function endLookAccessories(acc) {
  const n = acc.count
  for (const x of [acc.body, acc.out]) {
    x.count = n; x.visible = n > 0
    if (!n) continue
    x.instanceMatrix.clearUpdateRanges(); x.instanceMatrix.addUpdateRange(0, n * 16); x.instanceMatrix.needsUpdate = true
  }
  if (n) { const c = acc.body.instanceColor; c.clearUpdateRanges(); c.addUpdateRange(0, n * 3); c.needsUpdate = true }
}
