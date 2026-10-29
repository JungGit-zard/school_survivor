// Wardrobe outfits: the single palette source for every player model that wears clothes.
//
// Scope: this module is pure data plus one apply function over an already-cloned scene of
// PLAYER_wholebody_refined_t_efe49b7c.glb. Two call sites use it, both per clone, never per frame:
//   - RosariRoom.jsx mountRosariModel      -> the room clone (/assets/rosari-room/<glb>)
//   - PlayerRosariModel.jsx                -> the gameplay/Studio-preview clone of the same
//                                             bytes (src/assets/models/<glb>), so the stage
//                                             shows exactly what the room wardrobe shows.
// playerV9Outfits.js imports this palette and remaps it onto the different v9 GLB.
//
// Still out of scope, and still forbidden here: Firebase/Graphics Studio tuning values,
// PlayerMesh (the procedural box model, which has no garment materials), and any model
// source other than the GLB whose node/material names are hard-coded below. This module
// must not read or write Studio state — it only recolors materials a caller already owns.
// The selected id is persisted as titleSettings.playerOutfit (see titleSettings.js
// loadPlayerOutfit/savePlayerOutfit); ids here must match PLAYER_OUTFIT_IDS and the RTDB rule.
//
// Color arrives in two layers, both applied here, base first:
//   1. ROSARI_BASE_COLORS — what the model looks like with no outfit on.
//   2. the selected outfit's `colors` — per-garment overrides on top of that base.
// An outfit also carries a few low-poly accessory meshes attached to the torso, so the
// silhouette budget stays inside the playbook (S-tier masses unchanged; details are
// color + <100 tris).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const DEFAULT_ROSARI_OUTFIT_ID = 'default'

// Layer 1: the base palette, keyed by GLB material base name (".00N" suffix stripped).
//
// Why this exists at all: the GLB's own baseColorFactor values are washed out next to the
// previous model, PLAYER_v9_final.glb, whose hues read as clearly as intended on a phone
// screen. Measured side by side (linear factor -> sRGB) the refined GLB ships jacket
// #dc4b5d against v9 #d42020, skirt #255aa0 against #2d8cff, hair #efafc5 against #ff8fb0,
// and pure-white #ffffff shoes where v9 had slate #8090a8. Both models render through the
// same 5-step toon ramp (lib/toon.js getToonGradient) with emissive black, so the
// comparison is apples to apples and the ramp is NOT the thing to adjust — it is shared
// with every zombie, boss and prop. The values below are v9's, adopted verbatim.
//
// Two layers instead of one GLB edit: the same ~366KB GLB is checked in twice, under
// src/assets/models/ and public/assets/rosari-room/, so patching baseColorFactor would
// mean two binary diffs nobody can review. Recoloring at clone time covers both call
// sites from one reviewable place and leaves the asset bytes untouched.
//
// This is deliberately keyed by material name rather than widened into GARMENT_BY_MATERIAL:
// hair, bag and shoes must stay out of the garment slots, because a slot is also what
// playerV9Outfits.js and playerMeshOutfits.js remap onto the older models.
//
// Untouched on purpose: skin.* (#ffe0c9), tie/tie.001 (#ffcc31) and gold (#ffc231) already
// match or beat v9, and faceSkin is a textured material whose factor does nothing.
export const ROSARI_BASE_COLORS = Object.freeze({
  jacket: '#d42020', // v9 jacket_red
  skirt: '#2d8cff', // v9 skirt_blue
  hair: '#ff8fb0', // v9 pink_hair
  shirt: '#fff8ed', // v9 shirt_white (the wrist cuff bands)
  // The GLB calls these nodes white_collar_*_triangle but ships them pale pink #f9ddea,
  // which is the weakest value step on the whole model: relative luminance 0.78 against
  // the 0.74 of the under-jaw skin right above it, and inner details get no ink line under
  // the stencil outline, so that 0.04 gap was the only thing separating them. v9 has no
  // collar material — its white collar is painted into the uniform-front decal — so shirt
  // white is the matching value. It lifts the collar to 0.95 and the gap to 0.21.
  collar: '#fff8ed',
  sock: '#f7e8e6', // v9 socks_white
  roundedShoe: '#8090a8', // v9 shoes_blue; pure white shoes were a second washed-out mass
  // v9's bag is bright pack_blue #38c8f0 everywhere (body, side rails, every strap, top lid
  // band) with dark pack_pocket_blue #1668a0 on the single small front-pocket panel. This
  // GLB splits the bag the same way by area: `backpack` covers the body
  // (rounded_square_blue_backpack_body, 28 tris) plus both shoulder straps
  // (backpack.001/.002, 36 tris each), while `backpackLight` is only the narrow
  // blue_backpack_top_flap (12 tris). So the mass takes v9's bright value and the narrow
  // trim takes the dark one, which keeps v9's light/dark relation even though it inverts
  // this GLB's own (the shipped `backpackLight` #337bd0 was lighter than `backpack`
  // #1f59aa). The material name stays as authored; only its value changes.
  backpack: '#38c8f0',
  backpackLight: '#1668a0',
})

// Garment slots resolved from the GLB's material base name (".00N" suffix stripped)
// or, for skin-material legs that become tights, from the mesh node name.
const GARMENT_BY_MATERIAL = Object.freeze({
  jacket: 'blazer',
  shirt: 'shirt',
  collar: 'collar',
  tie: 'tie',
  skirt: 'skirt',
  sock: 'legwear',
})
const LEGWEAR_NODE_PATTERN = /(upper_leg|lower_leg|sock)/

export const ROSARI_OUTFITS = Object.freeze([
  Object.freeze({
    id: DEFAULT_ROSARI_OUTFIT_ID,
    label: '학교 교복',
    note: '기본 교복이에요.',
    colors: Object.freeze({}),
    accessories: Object.freeze([]),
  }),
  Object.freeze({
    // 동복 1차: no approved 2D concept exists yet (Graphic_designer/rosari_winter_uniform_pass1.md).
    // Derived from the default uniform identity: same cut, heavier winter palette,
    // white shirt V under blazer lapels, navy tie, wine skirt matching the blazer, dark tights.
    id: 'winter',
    label: '동복',
    note: '동복 1차 시안이에요. 원화 확정 후 다듬을 예정이에요.',
    colors: Object.freeze({
      blazer: '#8a2639',
      shirt: '#fffaf4',
      collar: '#fffaf4',
      tie: '#23305e',
      skirt: '#5c1d2d',
      legwear: '#2c2733',
    }),
    accessories: Object.freeze(['shirtV', 'lapels', 'buttons']),
  }),
])

export function resolveRosariOutfit(id) {
  return ROSARI_OUTFITS.find((outfit) => outfit.id === id) || ROSARI_OUTFITS[0]
}

export function getRosariMaterialBaseName(name) {
  return String(name || '').replace(/\.\d+$/, '')
}

// Which garment slot a mesh/material pair belongs to, or null (skin, hair, face, shoes, bag).
export function getRosariGarmentSlot(meshName, materialName) {
  if (LEGWEAR_NODE_PATTERN.test(meshName || '')) return 'legwear'
  return GARMENT_BY_MATERIAL[getRosariMaterialBaseName(materialName)] || null
}

// Torso-space coordinates measured from the GLB: front face z≈0.322–0.326 for
// y 1.23–1.70, tapering to z 0.305 at the shoulder line y 1.959. Tie spans x ±0.067,
// y 1.395–1.93 at z ≤ 0.353, so the shirt V sits behind it and buttons sit below its tip.
const ACCESSORY_DEPTH = 0.012
const SHIRT_V_Z = 0.326
const LAPEL_Z = 0.33
const BUTTON_Z = 0.334

const nonIndexed = (geometry) => (geometry.index ? geometry.toNonIndexed() : geometry)

function extrudedTriangle(points, z) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: ACCESSORY_DEPTH, bevelEnabled: false, curveSegments: 1 })
  geometry.translate(0, 0, z)
  return geometry
}

function buildShirtV() {
  return extrudedTriangle([[-0.15, 1.935], [0.16, 1.935], [0.005, 1.47]], SHIRT_V_Z)
}

function buildLapels() {
  const left = extrudedTriangle([[-0.15, 1.935], [-0.005, 1.47], [-0.29, 1.79]], LAPEL_Z)
  const right = extrudedTriangle([[0.16, 1.935], [0.315, 1.79], [0.015, 1.47]], LAPEL_Z)
  const merged = mergeGeometries([nonIndexed(left), nonIndexed(right)])
  left.dispose(); right.dispose()
  return merged
}

function buildButtons() {
  const parts = [1.345, 1.275].map((y) => {
    const disc = new THREE.CylinderGeometry(0.022, 0.022, ACCESSORY_DEPTH, 8)
    disc.rotateX(Math.PI / 2)
    disc.translate(0.005, y, BUTTON_Z)
    return disc
  })
  const merged = mergeGeometries(parts.map(nonIndexed))
  for (const part of parts) part.dispose()
  return merged
}

const ACCESSORY_BUILDERS = Object.freeze({
  shirtV: { build: buildShirtV, slot: 'shirt' },
  lapels: { build: buildLapels, color: '#5e1627' },
  buttons: { build: buildButtons, color: '#e6b04a' },
})

export const ROSARI_OUTFIT_ACCESSORY_IDS = Object.freeze(Object.keys(ACCESSORY_BUILDERS))
export const ROSARI_OUTFIT_TORSO_NODE = 'simple_closed_lego_torso_exterior_one_piece'

// Recolor the clone's (already room-owned) materials and attach accessories to the torso.
// `makeMaterial(color)` must return a room-owned toon material so it gets the same stencil,
// outline and disposal path as the GLB surfaces. Returns the accessory meshes added.
//
// The base palette lands first and the outfit's garment colors overwrite it, so 동복 keeps
// owning blazer/shirt/collar/tie/skirt/legwear while hair, bag and shoes read their vivid
// base value under every outfit. Both call sites recolor material.color only, which is the
// whole story for this model: neither path carries emissive (the GLB has no emissiveFactor,
// so PlayerRosariModel's cloneMaterial copies black over toonMat's emissive, and the room's
// makeArchiveToonMaterial sets none), and nothing downstream caches the old value.
export function applyRosariOutfit(root, outfitId, makeMaterial) {
  const outfit = resolveRosariOutfit(outfitId)
  let torso = null
  root.traverse((node) => {
    if (node.name === ROSARI_OUTFIT_TORSO_NODE) torso = node
    if (!node.isMesh) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue
      const base = ROSARI_BASE_COLORS[getRosariMaterialBaseName(material.name)]
      if (base) material.color.set(base)
      const slot = getRosariGarmentSlot(node.name, material.name)
      const color = slot && outfit.colors[slot]
      if (color) material.color.set(color)
    }
  })
  const added = []
  if (!torso) return added
  for (const id of outfit.accessories) {
    const spec = ACCESSORY_BUILDERS[id]
    if (!spec) continue
    const color = spec.color || outfit.colors[spec.slot]
    const mesh = new THREE.Mesh(spec.build(), makeMaterial(color))
    mesh.name = `outfit_${outfit.id}_${id}`
    mesh.userData.ownedGeometry = true
    torso.add(mesh)
    added.push(mesh)
  }
  return added
}
