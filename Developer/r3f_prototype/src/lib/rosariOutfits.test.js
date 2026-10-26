import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_ROSARI_OUTFIT_ID,
  ROSARI_OUTFITS,
  ROSARI_OUTFIT_TORSO_NODE,
  applyRosariOutfit,
  getRosariGarmentSlot,
  resolveRosariOutfit,
} from './rosariOutfits.js'

// Mirrors the relevant node/material names of PLAYER_wholebody_refined_t_efe49b7c.glb.
function rosariFixture() {
  const root = new THREE.Group()
  const add = (parent, name, materialName, color = '#ffffff') => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshToonMaterial({ name: materialName, color }))
    mesh.name = name
    parent.add(mesh)
    return mesh
  }
  const torso = add(root, ROSARI_OUTFIT_TORSO_NODE, 'jacket.002', '#de4a5c')
  const meshes = {
    torso,
    sleeve: add(root, 'left_upper_sleeve_continuous_to_white_cuff', 'jacket.001', '#de4a5c'),
    cuff: add(root, 'left_white_cuff_band_at_wrist', 'shirt', '#fff0ef'),
    collar: add(root, 'white_collar_left_triangle', 'collar.001', '#f9dcec'),
    tie: add(root, 'yellow_tie_long_drop', 'tie.001', '#ffcc33'),
    skirt: add(root, 'reference_tapered_pleated_skirt_shell', 'skirt', '#2759a0'),
    lowerLeg: add(root, 'left_lower_leg_tapered_knee_to_sock', 'skin.005', '#ffe0c8'),
    upperLeg: add(root, 'right_upper_leg_tapered_thigh_to_knee', 'skin.008', '#ffe0c8'),
    sock: add(root, 'left_white_sock_six_ring_column', 'sock', '#fff6fa'),
    hand: add(root, 'left_simple_lowpoly_hand_mitten', 'skin.001', '#ffe0c8'),
    hair: add(root, 'continuous_fitted_reference_bob', 'hair', '#ee9ab8'),
    shoe: add(root, 'left_rounded_reference_shoe', 'roundedShoe', '#333333'),
    backpack: add(root, 'rounded_square_blue_backpack_body', 'backpack', '#1b3d8f'),
  }
  return { root, meshes }
}
const hex = (mesh) => `#${mesh.material.color.getHexString()}`
const makeMaterial = (color) => new THREE.MeshToonMaterial({ color })

describe('Rosari outfit config', () => {
  it('keeps the school uniform as the default and falls back to it for unknown ids', () => {
    expect(DEFAULT_ROSARI_OUTFIT_ID).toBe('default')
    expect(ROSARI_OUTFITS[0].id).toBe('default')
    expect(resolveRosariOutfit('nope').id).toBe('default')
    expect(resolveRosariOutfit(undefined).id).toBe('default')
    expect(resolveRosariOutfit('winter').label).toBe('동복')
  })

  it('has unique ids and labels for every outfit', () => {
    expect(new Set(ROSARI_OUTFITS.map((outfit) => outfit.id)).size).toBe(ROSARI_OUTFITS.length)
    expect(new Set(ROSARI_OUTFITS.map((outfit) => outfit.label)).size).toBe(ROSARI_OUTFITS.length)
  })

  it('maps GLB garments to slots and leaves skin, hair, shoes and bag alone', () => {
    expect(getRosariGarmentSlot(ROSARI_OUTFIT_TORSO_NODE, 'jacket.002')).toBe('blazer')
    expect(getRosariGarmentSlot('right_upper_sleeve_continuous_to_white_cuff', 'jacket.001')).toBe('blazer')
    expect(getRosariGarmentSlot('left_white_cuff_band_at_wrist', 'shirt.001')).toBe('shirt')
    expect(getRosariGarmentSlot('white_collar_right_triangle', 'collar.001')).toBe('collar')
    expect(getRosariGarmentSlot('yellow_tie_knot', 'tie')).toBe('tie')
    expect(getRosariGarmentSlot('reference_tapered_pleated_skirt_shell', 'skirt')).toBe('skirt')
    expect(getRosariGarmentSlot('left_lower_leg_tapered_knee_to_sock', 'skin.005')).toBe('legwear')
    expect(getRosariGarmentSlot('right_upper_leg_tapered_thigh_to_knee', 'skin.008')).toBe('legwear')
    expect(getRosariGarmentSlot('right_white_sock_six_ring_column', 'sock.001')).toBe('legwear')
    expect(getRosariGarmentSlot('left_simple_lowpoly_hand_mitten', 'skin.001')).toBeNull()
    expect(getRosariGarmentSlot('short_neck_visible_below_complete_skull', 'skin')).toBeNull()
    expect(getRosariGarmentSlot('continuous_fitted_reference_bob', 'hair')).toBeNull()
    expect(getRosariGarmentSlot('coherent_head_skull_UV_image_face', 'faceSkin')).toBeNull()
    expect(getRosariGarmentSlot('left_rounded_reference_shoe', 'roundedShoe')).toBeNull()
    expect(getRosariGarmentSlot('rounded_square_blue_backpack_body', 'backpack')).toBeNull()
  })
})

describe('applyRosariOutfit', () => {
  it('default outfit changes nothing and adds nothing', () => {
    const { root, meshes } = rosariFixture()
    const before = Object.fromEntries(Object.entries(meshes).map(([key, mesh]) => [key, hex(mesh)]))
    expect(applyRosariOutfit(root, 'default', makeMaterial)).toEqual([])
    expect(Object.fromEntries(Object.entries(meshes).map(([key, mesh]) => [key, hex(mesh)]))).toEqual(before)
    expect(meshes.torso.children).toHaveLength(0)
  })

  it('winter recolors blazer, sleeves, shirt, tie, skirt and legs into tights; skin, hair, shoes and bag keep their color', () => {
    const { root, meshes } = rosariFixture()
    const untouched = ['hand', 'hair', 'shoe', 'backpack'].map((key) => [key, hex(meshes[key])])
    applyRosariOutfit(root, 'winter', makeMaterial)
    const winter = resolveRosariOutfit('winter').colors
    expect(hex(meshes.torso)).toBe(winter.blazer)
    expect(hex(meshes.sleeve)).toBe(winter.blazer)
    expect(hex(meshes.cuff)).toBe(winter.shirt)
    expect(hex(meshes.collar)).toBe(winter.collar)
    expect(hex(meshes.tie)).toBe(winter.tie)
    expect(hex(meshes.skirt)).toBe(winter.skirt)
    for (const key of ['lowerLeg', 'upperLeg', 'sock']) expect(hex(meshes[key])).toBe(winter.legwear)
    for (const [key, color] of untouched) expect(hex(meshes[key])).toBe(color)
  })

  it('winter attaches low-poly owned accessories to the torso, inside the torso silhouette and in front of its face', () => {
    const { root, meshes } = rosariFixture()
    const added = applyRosariOutfit(root, 'winter', makeMaterial)
    expect(added.map((mesh) => mesh.name)).toEqual(['outfit_winter_shirtV', 'outfit_winter_lapels', 'outfit_winter_buttons'])
    let triangles = 0
    for (const mesh of added) {
      expect(mesh.parent).toBe(meshes.torso)
      expect(mesh.userData.ownedGeometry).toBe(true)
      expect(mesh.material).toBeInstanceOf(THREE.MeshToonMaterial)
      const position = mesh.geometry.attributes.position
      triangles += (mesh.geometry.index ? mesh.geometry.index.count : position.count) / 3
      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox
      // Torso exterior measured from the GLB: x -0.40..0.43, y 1.233..1.959, front z ≈ 0.322.
      expect(box.min.x).toBeGreaterThanOrEqual(-0.40)
      expect(box.max.x).toBeLessThanOrEqual(0.43)
      expect(box.min.y).toBeGreaterThanOrEqual(1.233)
      expect(box.max.y).toBeLessThanOrEqual(1.959)
      expect(box.min.z).toBeGreaterThanOrEqual(0.322)
      expect(box.max.z).toBeLessThan(0.36)
    }
    // Low-budget playbook: details are color + a handful of triangles, not surface density.
    expect(triangles).toBeLessThanOrEqual(120)
  })

  it('adds no accessories when the torso node is missing', () => {
    const root = new THREE.Group()
    expect(applyRosariOutfit(root, 'winter', makeMaterial)).toEqual([])
  })
})
