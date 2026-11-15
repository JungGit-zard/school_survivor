import * as THREE from 'three'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'

// KayKit Furniture Bits stand-ins for procedural stage props (2026-11-14, Terry: "교체할 수 있는 소품은 모조리 교체해").
// Visual only: placement types, colliders (stageObjectColliders.js) and sight obstacles are untouched. Every
// `fit.size` below is the existing collider footprint (or the old visual box where the collider is only a
// footprint), so what is drawn stays inside what blocks.
//
// A recipe = parts. A part = one KayKit node fitted once into prop-local space (`fit`), drawn at one or
// more `slots` per placement. Each part becomes one fill + one outline InstancedMesh for the whole stage.
// Part order is part of the Studio contract (part keys are numeric child paths); append, never reorder.
const HALF_PI = Math.PI / 2

function deskIslandChairSlots(variant) {
  const rows = variant === 'short' ? [0] : [-0.85, 0.85]
  const slots = []
  // Teachers sit on the outer (±X) sides facing the island; chairs are tucked half under the top.
  for (const side of [-1, 1]) {
    for (const z of rows) slots.push({ position: [side * 0.96, 0, z], rotation: [0, side > 0 ? -HALF_PI : HALF_PI, 0] })
  }
  return slots
}

export const KAYKIT_PROP_RECIPES = Object.freeze({
  classroomDesk: {
    itemId: 'stage-object-kaykit-classroom-desk',
    label: 'Classroom Desk (KayKit)',
    variants: CLASSROOM_DESK_VARIANTS,
    parts: [{ node: 'table_small', fit: { size: [1.76, 0.86, 1.04] } }],
  },
  classroomChair: {
    itemId: 'stage-object-kaykit-classroom-chair',
    label: 'Classroom Chair (KayKit)',
    variants: CLASSROOM_CHAIR_VARIANTS,
    // Old chair: 1.02 wide, back top 1.40, z -0.41..0.45 (back on -Z, like chair_A_wood).
    parts: [{ node: 'chair_A_wood', fit: { size: [1.02, 1.4, 0.9], center: [0, 0.02] } }],
  },
  kitchenPrepTable: {
    itemId: 'stage-object-kaykit-kitchen-prep-table',
    label: 'Kitchen Prep Table (KayKit)',
    parts: [{ node: 'table_medium_long', fit: { size: [2.16, 0.94, 1.02] } }],
  },
  kitchenShelfCart: {
    itemId: 'stage-object-kaykit-kitchen-shelf-cart',
    label: 'Kitchen Shelf Cart (KayKit)',
    // Collider 1.04 x 1.20 x 0.52: three shelf_B_large stacked into a shelving unit.
    parts: [{
      node: 'shelf_B_large',
      fit: { size: [1.04, 0.4, 0.52] },
      slots: () => [0, 0.4, 0.8].map((y) => ({ position: [0, y, 0] })),
    }],
  },
  staffroomDeskIsland: {
    itemId: 'stage-object-kaykit-staffroom-desk-island',
    label: 'Staff Room Desk Island (KayKit)',
    // Collider 2.0 x 0.84 x 3.4 (long) / 2.2 (short). table_medium_long runs along X, so it is turned 90°.
    parts: [
      { node: 'table_medium_long', fit: { rotationY: HALF_PI, size: [2.0, 0.76, 3.4] }, variantFit: { short: { rotationY: HALF_PI, size: [2.0, 0.76, 2.2] } } },
      { node: 'chair_A', fit: { scale: 0.85 }, slots: deskIslandChairSlots },
    ],
  },
  staffroomViceDesk: {
    itemId: 'stage-object-kaykit-staffroom-vice-desk',
    label: "Vice Principal's Desk (KayKit)",
    // Collider 3.2 x 0.84 x 1.4; the chair sits behind (-Z) exactly where the old swivel chair was.
    parts: [
      { node: 'table_medium', fit: { size: [3.2, 0.81, 1.4] } },
      { node: 'chair_B', fit: { scale: 0.95 }, slots: () => [{ position: [0, 0, -1.05], rotation: [0, 0.25, 0] }] },
    ],
  },
  staffroomClutter: {
    itemId: 'stage-object-kaykit-staffroom-clutter',
    label: 'Staff Room Clutter (KayKit)',
    // Pass-through floor clutter: papers = flat books, binders = an upright book set + one flat book.
    parts: [
      {
        node: 'book_single',
        fit: { scale: 0.7 },
        slots: (variant) => (variant === 'binders'
          ? [{ position: [0.32, 0, -0.18], rotation: [0, 0.7, HALF_PI] }]
          : [
            { position: [-0.2, 0, 0.05], rotation: [0, 0.4, HALF_PI] },
            { position: [0.18, 0, -0.12], rotation: [0, -0.3, HALF_PI] },
          ]),
      },
      {
        node: 'book_set',
        fit: { scale: 0.8 },
        slots: (variant) => (variant === 'binders' ? [{ position: [-0.15, 0, 0.05], rotation: [0, 0.2, 0] }] : []),
      },
    ],
  },
  staffroomBoard: {
    itemId: 'stage-object-kaykit-staffroom-board',
    label: 'Staff Room Notice Board (KayKit)',
    // West-wall boards (Stage5StaffroomDecor): 2.0 wide x 1.1 tall, picture face turned to +X.
    parts: [{ node: 'pictureframe_large_B', fit: { rotationY: HALF_PI, size: [0.08, 1.1, 2.0], center: [0.04, 0] } }],
  },
})

export const KAYKIT_STAGE_OBJECT_TYPES = Object.freeze([
  'classroomDesk', 'classroomChair', 'kitchenPrepTable', 'kitchenShelfCart', 'staffroomDeskIsland', 'staffroomViceDesk', 'staffroomClutter',
])

// Lying-flat books need a lift: a book rotated 90° about Z stands on its spine edge otherwise.
// Slots with rotation.z = ±90° are raised by half the book thickness inside partSlotMatrix().
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _e = new THREE.Euler()

export function getKaykitPartFit(part, variant) {
  return part.variantFit?.[variant] ?? part.fit
}

function normalizeUniformScale(scale) {
  if (Array.isArray(scale)) return (scale[0] + scale[1] + scale[2]) / 3
  return Number.isFinite(scale) ? scale : 1
}

export function getKaykitPlacementMatrix(placement = {}, recipe = {}) {
  const rotation = Array.isArray(placement.rotation) ? placement.rotation : [0, placement.rotation ?? 0, 0]
  const matrix = new THREE.Matrix4().compose(
    _p.fromArray(placement.position ?? [0, 0, 0]),
    _q.setFromEuler(_e.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0)),
    _s.setScalar(normalizeUniformScale(placement.scale)),
  )
  const variant = recipe.variants?.[placement.props?.variant ?? placement.variant]
    ?? recipe.variants?.upright
  if (variant) {
    const modelRotation = variant.modelRotation ?? [0, 0, 0]
    matrix.multiply(new THREE.Matrix4().compose(
      _p.fromArray(variant.modelPosition ?? [0, 0, 0]),
      _q.setFromEuler(_e.set(...modelRotation)),
      _s.setScalar(1),
    ))
  }
  return matrix
}

function slotMatrix(slot = {}, fitHeight = 0) {
  const rotation = slot.rotation ?? [0, 0, 0]
  const position = [...(slot.position ?? [0, 0, 0])]
  // A part laid on its side (±90° about Z) rests on the floor with half its fitted width under it.
  if (Math.abs(Math.abs(rotation[2] ?? 0) - HALF_PI) < 1e-3) position[1] += fitHeight
  return new THREE.Matrix4().compose(_p.fromArray(position), _q.setFromEuler(_e.set(...rotation)), _s.setScalar(1))
}

// placements -> [{ key, node, fit, matrices }] (one entry per part x fit; matrices = one per drawn copy).
// `getHalfWidth(node, fit)` (optional) returns the fitted half width used to rest lying parts on the floor.
export function buildKaykitPropInstances(kind, placements = [], getHalfWidth = () => 0) {
  const recipe = KAYKIT_PROP_RECIPES[kind]
  if (!recipe) return []
  const out = new Map()
  for (const placement of placements) {
    const variant = placement.props?.variant ?? placement.variant
    const base = getKaykitPlacementMatrix(placement, recipe)
    recipe.parts.forEach((part, index) => {
      const fit = getKaykitPartFit(part, variant)
      const key = `${index}:${part.node}:${JSON.stringify(fit)}`
      if (!out.has(key)) out.set(key, { key, partIndex: index, node: part.node, fit, matrices: [] })
      const slots = part.slots ? part.slots(variant) : [{}]
      for (const slot of slots) out.get(key).matrices.push(base.clone().multiply(slotMatrix(slot, getHalfWidth(part.node, fit))))
    })
  }
  return [...out.values()]
}
