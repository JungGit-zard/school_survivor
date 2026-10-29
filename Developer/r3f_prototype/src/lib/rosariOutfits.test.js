import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_ROSARI_OUTFIT_ID,
  ROSARI_BASE_COLORS,
  ROSARI_OUTFITS,
  ROSARI_OUTFIT_TORSO_NODE,
  applyRosariOutfit,
  getRosariGarmentSlot,
  resolveRosariOutfit,
} from './rosariOutfits.js'
import { resolvePlayerMeshGarmentColor } from './playerMeshOutfits.js'

// Mirrors the relevant node/material names of PLAYER_wholebody_refined_t_efe49b7c.glb.
function rosariFixture() {
  const root = new THREE.Group()
  const add = (parent, name, materialName, color = '#ffffff') => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshToonMaterial({ name: materialName, color }))
    mesh.name = name
    parent.add(mesh)
    return mesh
  }
  // Colors are the GLB's shipped baseColorFactor values converted to sRGB, so the
  // fixture also records the washed-out "before" state the base palette replaces.
  const torso = add(root, ROSARI_OUTFIT_TORSO_NODE, 'jacket.002', '#dc4b5d')
  const meshes = {
    torso,
    sleeve: add(root, 'left_upper_sleeve_continuous_to_white_cuff', 'jacket.001', '#dc4b5d'),
    cuff: add(root, 'left_white_cuff_band_at_wrist', 'shirt', '#fff2f1'),
    collar: add(root, 'white_collar_left_triangle', 'collar.001', '#f9ddea'),
    tie: add(root, 'yellow_tie_long_drop', 'tie.001', '#ffcc31'),
    skirt: add(root, 'reference_tapered_pleated_skirt_shell', 'skirt', '#255aa0'),
    lowerLeg: add(root, 'left_lower_leg_tapered_knee_to_sock', 'skin.005', '#ffe0c9'),
    upperLeg: add(root, 'right_upper_leg_tapered_thigh_to_knee', 'skin.008', '#ffe0c9'),
    sock: add(root, 'left_white_sock_six_ring_column', 'sock', '#fff4fb'),
    hand: add(root, 'left_simple_lowpoly_hand_mitten', 'skin.001', '#ffe0c9'),
    hair: add(root, 'continuous_fitted_reference_bob', 'hair', '#efafc5'),
    shoe: add(root, 'left_rounded_reference_shoe', 'roundedShoe', '#ffffff'),
    backpack: add(root, 'rounded_square_blue_backpack_body', 'backpack', '#1f59aa'),
    strap: add(root, 'left_fitted_continuous_backpack_strap', 'backpack.001', '#1f59aa'),
    backpackFlap: add(root, 'blue_backpack_top_flap', 'backpackLight', '#337bd0'),
    gold: add(root, 'small_gold_backpack_clasp', 'gold', '#ffc231'),
    face: add(root, 'coherent_head_skull_UV_image_face', 'faceSkin', '#ffffff'),
    underJaw: add(root, 'coherent_head_skull_UV_image_face', 'faceSkin_under_jaw_clean_solid', '#f7d9c6'),
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
  it('default outfit still adds nothing, but paints the vivid base palette over the GLB factors', () => {
    const { root, meshes } = rosariFixture()
    expect(applyRosariOutfit(root, 'default', makeMaterial)).toEqual([])
    expect(meshes.torso.children).toHaveLength(0)
    // The reason this task existed: these four masses shipped washed out next to v9.
    expect(hex(meshes.torso)).toBe('#d42020')
    expect(hex(meshes.sleeve)).toBe('#d42020')
    expect(hex(meshes.skirt)).toBe('#2d8cff')
    expect(hex(meshes.hair)).toBe('#ff8fb0')
    expect(hex(meshes.shoe)).toBe('#8090a8')
    // Bag: v9's relation, bright mass + dark narrow trim, resolved by material base name.
    expect(hex(meshes.backpack)).toBe('#38c8f0')
    expect(hex(meshes.strap)).toBe('#38c8f0')
    expect(hex(meshes.backpackFlap)).toBe('#1668a0')
    expect(hex(meshes.cuff)).toBe('#fff8ed')
    expect(hex(meshes.collar)).toBe('#fff8ed')
    // Socks stay on the shipped GLB factor: v9's socks_white dulled the sock against the
    // leg above it (value gap 0.141 -> 0.044) and the slate shoe already grounds the leg.
    expect(hex(meshes.sock)).toBe('#fff4fb')
  })

  it('leaves skin, face, tie and gold on their shipped GLB factors under every outfit', () => {
    for (const id of ROSARI_OUTFITS.map((outfit) => outfit.id)) {
      const { root, meshes } = rosariFixture()
      applyRosariOutfit(root, id, makeMaterial)
      expect(hex(meshes.hand), id).toBe('#ffe0c9')
      expect(hex(meshes.gold), id).toBe('#ffc231')
      expect(hex(meshes.face), id).toBe('#ffffff')
      expect(hex(meshes.underJaw), id).toBe('#f7d9c6')
      // The tie is a garment slot, so only 동복 may move it; the base palette never does.
      expect(hex(meshes.tie), id).toBe(resolveRosariOutfit(id).colors.tie ?? '#ffcc31')
    }
  })

  it('every base palette key names a real GLB material base name', () => {
    const { root } = rosariFixture()
    const present = new Set()
    root.traverse((node) => { if (node.isMesh) present.add(node.material.name.replace(/\.\d+$/, '')) })
    for (const key of Object.keys(ROSARI_BASE_COLORS)) expect(present, key).toContain(key)
  })

  it('winter recolors blazer, sleeves, shirt, tie, skirt and legs into tights; non-garments keep the base palette', () => {
    const { root, meshes } = rosariFixture()
    applyRosariOutfit(root, 'winter', makeMaterial)
    const winter = resolveRosariOutfit('winter').colors
    expect(hex(meshes.torso)).toBe(winter.blazer)
    expect(hex(meshes.sleeve)).toBe(winter.blazer)
    expect(hex(meshes.cuff)).toBe(winter.shirt)
    expect(hex(meshes.collar)).toBe(winter.collar)
    expect(hex(meshes.tie)).toBe(winter.tie)
    expect(hex(meshes.skirt)).toBe(winter.skirt)
    for (const key of ['lowerLeg', 'upperLeg', 'sock']) expect(hex(meshes[key])).toBe(winter.legwear)
    // 동복 names no hair/bag/shoe slot, so those show the base palette, not the GLB factors.
    expect(hex(meshes.hair)).toBe(ROSARI_BASE_COLORS.hair)
    expect(hex(meshes.backpack)).toBe(ROSARI_BASE_COLORS.backpack)
    expect(hex(meshes.strap)).toBe(ROSARI_BASE_COLORS.backpack)
    expect(hex(meshes.backpackFlap)).toBe(ROSARI_BASE_COLORS.backpackLight)
    expect(hex(meshes.shoe)).toBe(ROSARI_BASE_COLORS.roundedShoe)
    expect(hex(meshes.hand)).toBe('#ffe0c9')
  })

  // Regression guard. resolvePlayerMeshGarmentColor reads resolveRosariOutfit(id).colors[slot]
  // without short-circuiting on the id, so filling in default.colors would repaint the
  // gen-1 PlayerMesh blocks — the '단순' appearance and the title-screen player, which the
  // outfit contract (rosari_model_generations_outfit_contract_2026-10-28.md) keeps out of
  // scope and the title canon lock forbids touching. The base palette must stay separate.
  it('keeps default.colors empty so the base palette never reaches PlayerMesh', () => {
    expect(ROSARI_OUTFITS[0].colors).toEqual({})
    for (const slot of ['blazer', 'shirt', 'collar', 'tie', 'skirt', 'legwear']) {
      expect(resolvePlayerMeshGarmentColor(slot, 0x123456, 'default'), slot).toBe(0x123456)
    }
    expect(resolvePlayerMeshGarmentColor('blazer', 0x123456, undefined)).toBe(0x123456)
    expect(resolvePlayerMeshGarmentColor('blazer', 0x123456, 'winter')).toBe(0x8a2639)
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
