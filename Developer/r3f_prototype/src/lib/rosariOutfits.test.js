import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_ROSARI_OUTFIT_ID,
  ROSARI_BASE_COLORS,
  ROSARI_OUTFITS,
  ROSARI_OUTFIT_ACCESSORY_IDS,
  ROSARI_OUTFIT_HAIR_NODE,
  ROSARI_OUTFIT_IDS,
  ROSARI_OUTFIT_TORSO_NODE,
  applyRosariOutfit,
  getRosariGarmentSlot,
  isRosariOutfitSupportedOn,
  resolveRosariOutfit,
  resolveRosariOutfitForModel,
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

// ── S6 임시안 4벌 (raincoat, gym, apron, grad) ────────────────────────────────────────────
describe('S6 placeholder outfits', () => {
  const NEW_IDS = ['raincoat', 'gym', 'apron', 'grad']
  // removable_hair_pivot is the bob's parent in the GLB; the bob mesh space is the pivot space.
  function fixtureWithHairPivot() {
    const fixture = rosariFixture()
    const pivot = new THREE.Group()
    pivot.name = ROSARI_OUTFIT_HAIR_NODE
    pivot.add(fixture.meshes.hair)
    fixture.root.add(pivot)
    const knot = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshToonMaterial({ name: 'tie' }))
    knot.name = 'yellow_tie_knot'
    fixture.root.add(knot)
    return { ...fixture, pivot, knot }
  }
  const triangleCount = (mesh) => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3

  it('uses exactly the eight ids of the outfit plan, in unlock order', () => {
    expect(ROSARI_OUTFIT_IDS).toEqual(['default', 'winter', 'raincoat', 'gym', 'apron', 'grad', 'prefect', 'sportsDay'])
    expect(ROSARI_OUTFITS.map((outfit) => outfit.label)).toEqual(['학교 교복', '동복', '비옷', '체육복', '급식 당번복', '졸업', '선도부 교복', '운동회 반티'])
    for (const id of [...NEW_IDS, 'prefect', 'sportsDay']) expect(resolveRosariOutfit(id).note, id).toContain('임시안')
  })

  it('every outfit only names garment slots the wardrobe knows (plus the v9-only buttons decal)', () => {
    const slots = new Set(['blazer', 'shirt', 'collar', 'tie', 'skirt', 'legwear', 'buttons'])
    for (const outfit of ROSARI_OUTFITS) {
      for (const [slot, color] of Object.entries(outfit.colors)) {
        expect(slots, `${outfit.id}.${slot}`).toContain(slot)
        expect(color, `${outfit.id}.${slot}`).toMatch(/^#[0-9a-f]{6}$/)
      }
      for (const accessory of outfit.accessories) expect(ROSARI_OUTFIT_ACCESSORY_IDS, `${outfit.id}.${accessory}`).toContain(accessory)
    }
  })

  it.each([
    ['raincoat', ['outfit_raincoat_hood'], ['hair']],
    ['gym', ['outfit_gym_zipper'], ['torso']],
    ['apron', ['outfit_apron_headScarf', 'outfit_apron_apronBib'], ['hair', 'torso']],
    ['grad', ['outfit_grad_capCrown', 'outfit_grad_capBoard', 'outfit_grad_capTassel'], ['hair', 'hair', 'hair']],
    // The fixture carries only the left hand, so the right glove is skipped here (it attaches in the GLB).
    ['prefect', ['outfit_prefect_prefectArmband', 'outfit_prefect_gloveLeft'], ['sleeve', 'hand']],
    ['sportsDay', ['outfit_sportsDay_headband'], ['hair']],
  ])('%s attaches its low-poly details (<=100 tris) to the torso, hair pivot, sleeve or hand', (id, names, parents) => {
    const { root, meshes, pivot } = fixtureWithHairPivot()
    const added = applyRosariOutfit(root, id, makeMaterial)
    expect(added.map((mesh) => mesh.name)).toEqual(names)
    let triangles = 0
    added.forEach((mesh, i) => {
      expect(mesh.parent, mesh.name).toBe({ hair: pivot, sleeve: meshes.sleeve, hand: meshes.hand }[parents[i]] ?? meshes.torso)
      expect(mesh.userData.ownedGeometry).toBe(true)
      expect(mesh.material).toBeInstanceOf(THREE.MeshToonMaterial)
      expect(mesh.position.lengthSq()).toBe(0)
      triangles += triangleCount(mesh)
    })
    expect(triangles).toBeLessThanOrEqual(100)
  })

  it('torso details stay on the torso front and never hang below the hem (leg-swing clipping)', () => {
    for (const id of ['gym', 'apron']) {
      const { root, meshes } = fixtureWithHairPivot()
      for (const mesh of applyRosariOutfit(root, id, makeMaterial).filter((m) => m.parent === meshes.torso)) {
        mesh.geometry.computeBoundingBox()
        const box = mesh.geometry.boundingBox
        expect(box.min.y, mesh.name).toBeGreaterThanOrEqual(1.233)
        expect(box.max.y, mesh.name).toBeLessThanOrEqual(1.85)
        expect(box.min.z, mesh.name).toBeGreaterThanOrEqual(0.322)
        expect(box.max.z, mesh.name).toBeLessThan(0.36)
        // the bib is widest at the hem, below where the backpack straps end (y 1.409)
        expect(Math.max(-box.min.x, box.max.x), mesh.name).toBeLessThanOrEqual(0.301)
      }
    }
  })

  it('head shells face outward, so toon shading and the culled inside read correctly', () => {
    for (const id of ['raincoat', 'apron']) {
      const { root, pivot } = fixtureWithHairPivot()
      const shell = applyRosariOutfit(root, id, makeMaterial).find((mesh) => mesh.parent === pivot)
      const position = shell.geometry.attributes.position
      const index = shell.geometry.index.array
      const v = (k) => new THREE.Vector3().fromBufferAttribute(position, k)
      for (let t = 0; t < index.length; t += 3) {
        const [a, b, c] = [v(index[t]), v(index[t + 1]), v(index[t + 2])]
        const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a))
        const centroid = a.clone().add(b).add(c).divideScalar(3)
        const outward = new THREE.Vector3(centroid.x - 0.0125, 0.0001, centroid.z + 0.002)
        expect(normal.dot(outward), `${id} triangle ${t / 3}`).toBeGreaterThan(0)
      }
    }
  })

  it('gym hides the whole tie, apron hides only the long drop under the bib, others hide nothing', () => {
    const visibleAfter = (id) => {
      const { root, meshes, knot } = fixtureWithHairPivot()
      applyRosariOutfit(root, id, makeMaterial)
      return { knot: knot.visible, drop: meshes.tie.visible, skirt: meshes.skirt.visible, hair: meshes.hair.visible }
    }
    expect(visibleAfter('gym')).toEqual({ knot: false, drop: false, skirt: true, hair: true })
    expect(visibleAfter('apron')).toEqual({ knot: true, drop: false, skirt: true, hair: true })
    expect(visibleAfter('sportsDay')).toEqual({ knot: false, drop: false, skirt: true, hair: true })
    for (const id of ['default', 'winter', 'raincoat', 'grad', 'prefect']) {
      expect(visibleAfter(id), id).toEqual({ knot: true, drop: true, skirt: true, hair: true })
    }
  })

  it('keeps the bob, skin and face on their base colors; the head is covered, never recolored', () => {
    for (const id of NEW_IDS) {
      const { root, meshes } = fixtureWithHairPivot()
      applyRosariOutfit(root, id, makeMaterial)
      expect(hex(meshes.hair), id).toBe(ROSARI_BASE_COLORS.hair)
      expect(hex(meshes.hand), id).toBe('#ffe0c9')
      expect(hex(meshes.face), id).toBe('#ffffff')
    }
  })

  it('skips head details (but keeps torso ones) when the hair pivot is missing', () => {
    expect(applyRosariOutfit(rosariFixture().root, 'apron', makeMaterial).map((mesh) => mesh.name)).toEqual(['outfit_apron_apronBib'])
    expect(applyRosariOutfit(rosariFixture().root, 'grad', makeMaterial)).toEqual([])
  })

  it('declares which player models can render each look; everything else wears the default', () => {
    const matrix = Object.fromEntries(ROSARI_OUTFIT_IDS.map((id) => [id, ['rosari', 'v9', 'legacy'].filter((model) => isRosariOutfitSupportedOn(id, model))]))
    expect(matrix).toEqual({
      default: ['rosari', 'v9', 'legacy'],
      winter: ['rosari', 'v9', 'legacy'],
      raincoat: ['rosari', 'v9'],
      gym: ['rosari', 'v9'],
      apron: ['rosari'],
      grad: ['rosari'],
      prefect: ['rosari', 'v9'],
      sportsDay: ['rosari', 'v9'],
    })
    expect(resolveRosariOutfitForModel('apron', 'v9').id).toBe('default')
    expect(resolveRosariOutfitForModel('gym', 'legacy').id).toBe('default')
    expect(resolveRosariOutfitForModel('gym', 'v9').id).toBe('gym')
    expect(resolveRosariOutfitForModel('nope', 'rosari').id).toBe('default')
  })

  it('the legacy block player (also the title player) keeps its original colors for every S6 outfit', () => {
    for (const id of NEW_IDS) {
      for (const slot of ['blazer', 'shirt', 'collar', 'tie', 'skirt', 'legwear']) {
        expect(resolvePlayerMeshGarmentColor(slot, 0x123456, id), `${id}.${slot}`).toBe(0x123456)
      }
    }
  })

  // The design doc's real risk for hoods/scarves (§9-2): a cover sized to the bob's bounding box
  // can still let the curved bob poke through. Check every shipped bob vertex instead.
  it('hood, head scarf and cap crown enclose every bob vertex they span, and leave the face window open', () => {
    const glb = readFileSync(path.join(process.cwd(), 'src/assets/models/PLAYER_wholebody_refined_t_efe49b7c.glb'))
    const jsonLength = glb.readUInt32LE(12)
    const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength))
    const binStart = 20 + jsonLength + 8
    const vertices = (nodeName, materialName) => {
      const nodeEntry = gltf.nodes.find((entry) => entry.name === nodeName)
      const out = []
      for (const primitive of gltf.meshes[nodeEntry.mesh].primitives) {
        if (materialName && gltf.materials[primitive.material].name !== materialName) continue
        const accessor = gltf.accessors[primitive.attributes.POSITION]
        const view = gltf.bufferViews[accessor.bufferView]
        const start = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0)
        const stride = view.byteStride || 12
        for (let i = 0; i < accessor.count; i += 1) {
          out.push(new THREE.Vector3(glb.readFloatLE(start + i * stride), glb.readFloatLE(start + i * stride + 4), glb.readFloatLE(start + i * stride + 8)))
        }
      }
      return out
    }
    // The bob and the face share the hair pivot's space (both identity under head_neck_pivot).
    const bob = vertices('continuous_fitted_reference_bob')
    const faceFront = vertices('coherent_head_skull_UV_image_face', 'faceSkin').filter((point) => point.z > 0.25)
    expect(bob.length).toBeGreaterThan(1000)
    const ray = new THREE.Raycaster()
    const shells = [['raincoat', 'outfit_raincoat_hood'], ['apron', 'outfit_apron_headScarf'], ['grad', 'outfit_grad_capCrown']]
    for (const [id, name] of shells) {
      const { root } = fixtureWithHairPivot()
      const shell = applyRosariOutfit(root, id, (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })).find((mesh) => mesh.name === name)
      shell.updateMatrixWorld(true)
      shell.geometry.computeBoundingBox()
      const { min, max } = shell.geometry.boundingBox
      const castFromAxis = (point) => {
        const direction = new THREE.Vector3(point.x - 0.0125, 0, point.z + 0.002)
        const distance = direction.length()
        ray.set(new THREE.Vector3(0.0125, point.y, -0.002), direction.normalize())
        return { distance, hit: ray.intersectObject(shell, false)[0] }
      }
      let covered = 0
      for (const point of bob) {
        if (point.y < min.y || point.y > max.y) continue
        const { distance, hit } = castFromAxis(point)
        if (!hit) continue // inside the open face window
        expect(hit.distance, `${name}: bob vertex ${point.toArray().map((n) => n.toFixed(3))} pokes through`).toBeGreaterThan(distance + 0.005)
        covered += 1
      }
      expect(covered, name).toBeGreaterThan(400)
      for (const point of faceFront) {
        if (point.y < min.y || point.y > max.y) continue
        const { distance, hit } = castFromAxis(point)
        expect(!hit || hit.distance > distance, `${name} covers the face at ${point.toArray().map((n) => n.toFixed(3))}`).toBe(true)
      }
    }
  })
})
