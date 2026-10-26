// Rosari room wardrobe outfits.
//
// Scope: ONLY the isolated Rosari room clone of
// /assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb. This never touches the
// Graphics Studio / game / title player (PlayerMesh, StudioTunedGroup, Firebase tuning).
// The selected id is persisted as titleSettings.playerOutfit (see titleSettings.js
// loadPlayerOutfit/savePlayerOutfit); ids here must match PLAYER_OUTFIT_IDS and the RTDB rule.
//
// An outfit is data: per-garment color overrides on the room clone's fresh toon materials,
// plus a few low-poly accessory meshes attached to the torso so the silhouette budget
// stays inside the playbook (S-tier masses unchanged; details are color + <100 tris).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const DEFAULT_ROSARI_OUTFIT_ID = 'default'

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
export function applyRosariOutfit(root, outfitId, makeMaterial) {
  const outfit = resolveRosariOutfit(outfitId)
  let torso = null
  root.traverse((node) => {
    if (node.name === ROSARI_OUTFIT_TORSO_NODE) torso = node
    if (!node.isMesh) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      const slot = material && getRosariGarmentSlot(node.name, material.name)
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
