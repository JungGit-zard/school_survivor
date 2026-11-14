import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  applyPlayerV9Outfit,
  getPlayerV9GarmentSlot,
  PLAYER_V9_DECAL_RULES,
  recolorPlayerV9DecalPixels,
  resolvePlayerOutfitId,
  resolvePlayerV9OutfitId,
  resolvePlayerV9DecalTargets,
} from './playerV9Outfits.js'
import { resolveRosariOutfit } from './rosariOutfits.js'
import { clonePlayerV9Scene } from '../components/PlayerV9Model.jsx'

const WINTER = resolveRosariOutfit('winter').colors

// Mesh/material names exactly as authored in PLAYER_v9_final.glb.
const V9_SURFACES = [
  ['Torso_short_school_jacket', 'jacket_red'],
  ['Arm_L_continuous_sleeve', 'jacket_red'],
  ['Arm_L_cuff', 'shirt_white'],
  ['Skirt_simple_closed_A_line', 'skirt_blue'],
  ['Leg_L_sock', 'socks_white'],
  ['Leg_R_sock', 'socks_white'],
  ['Leg_L_thigh', 'face_skin'],
  ['Leg_R_thigh', 'face_skin'],
  ['Neck_short', 'face_skin'],
  ['Hand_L', 'hand_skin'],
  ['Hair_bob_back', 'pink_hair'],
  ['Head_skin_broad_short_chin', 'Face_skin_plain'],
  ['Shoe_L', 'shoes_blue'],
  ['Shoe_sole_L', 'shoe_sole_blue'],
  ['Backpack_main_rectangular', 'pack_blue'],
  ['Backpack_front_pocket', 'pack_pocket_blue'],
  ['Decal_source_uniform_front', 'Surface_source_uniform_front'],
]

function buildV9LikeScene() {
  const root = new THREE.Group()
  for (const [meshName, materialName] of V9_SURFACES) {
    const material = new THREE.MeshStandardMaterial({ color: 0x8899aa })
    material.name = materialName
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
    mesh.name = meshName
    root.add(mesh)
  }
  return root
}

function snapshotMaterials(root) {
  const out = []
  root.traverse((node) => {
    if (!node.isMesh) return
    const m = node.material
    out.push([node.name, m.name, m.color.getHex(), m.map?.uuid ?? null, m.emissiveMap?.uuid ?? null, m.stencilRef, m.version])
  })
  return out
}

beforeEach(() => {
  // toonMat's gradient factory needs only fillRect; no 2D getImageData => decals are skipped.
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) })
})
afterEach(() => vi.unstubAllGlobals())

describe('v9 player outfit (동복)', () => {
  it('resolves titleSettings.playerOutfit with absent/unknown => default', () => {
    expect(resolvePlayerOutfitId('winter')).toBe('winter')
    expect(resolvePlayerOutfitId('default')).toBe('default')
    expect(resolvePlayerOutfitId(undefined)).toBe('default')
    expect(resolvePlayerOutfitId('summer')).toBe('default')
  })

  it('maps only garments; hair, face, skin, hands, shoes and bag are untouched slots', () => {
    expect(getPlayerV9GarmentSlot('Torso_short_school_jacket', 'jacket_red')).toBe('blazer')
    expect(getPlayerV9GarmentSlot('Leg_L_thigh', 'face_skin')).toBe('legwear')
    expect(getPlayerV9GarmentSlot('Neck_short', 'face_skin')).toBeNull()
    for (const name of ['hand_skin', 'pink_hair', 'Face_skin_plain', 'shoes_blue', 'shoe_sole_blue', 'pack_blue', 'pack_pocket_blue']) {
      expect(getPlayerV9GarmentSlot('X', name)).toBeNull()
    }
  })

  it('winter recolors blazer, cuffs, skirt and tights with the shared room palette', () => {
    const root = buildV9LikeScene()
    const before = new Map(snapshotMaterials(root).map((row) => [row[0], row[2]]))
    applyPlayerV9Outfit(root, 'winter')
    const hex = (name) => `#${root.getObjectByName(name).material.color.getHexString()}`
    expect(hex('Torso_short_school_jacket')).toBe(WINTER.blazer)
    expect(hex('Arm_L_continuous_sleeve')).toBe(WINTER.blazer)
    expect(hex('Arm_L_cuff')).toBe(WINTER.shirt)
    expect(hex('Skirt_simple_closed_A_line')).toBe(WINTER.skirt)
    for (const leg of ['Leg_L_sock', 'Leg_R_sock', 'Leg_L_thigh', 'Leg_R_thigh']) expect(hex(leg)).toBe(WINTER.legwear)
    for (const name of ['Neck_short', 'Hand_L', 'Hair_bob_back', 'Head_skin_broad_short_chin', 'Shoe_L', 'Shoe_sole_L', 'Backpack_main_rectangular', 'Backpack_front_pocket', 'Decal_source_uniform_front']) {
      expect(root.getObjectByName(name).material.color.getHex()).toBe(before.get(name))
    }
  })

  it('default outfit leaves a cloned v9 scene byte-for-byte identical to the pre-outfit clone', () => {
    const source = buildV9LikeScene()
    const plain = snapshotMaterials(clonePlayerV9Scene(source, true))
    const defaulted = snapshotMaterials(clonePlayerV9Scene(source, true, 'default'))
    const unknown = snapshotMaterials(clonePlayerV9Scene(source, true, 'nope'))
    // uuids differ per clone, so compare everything except them; colors/versions must match exactly.
    const strip = (rows) => rows.map(([n, m, c, map, em, s, v]) => [n, m, c, map === null, em === null, s, v])
    expect(strip(defaulted)).toEqual(strip(plain))
    expect(strip(unknown)).toEqual(strip(plain))
    expect(applyPlayerV9Outfit(buildV9LikeScene(), 'default')).toEqual([])
  })

  it('winter on the real clone path recolors per-clone materials and never the source GLB materials', () => {
    const source = buildV9LikeScene()
    const sourceColors = snapshotMaterials(source).map((row) => row[2])
    const winter = clonePlayerV9Scene(source, false, 'winter')
    expect(`#${winter.getObjectByName('Torso_short_school_jacket').material.color.getHexString()}`).toBe(WINTER.blazer)
    expect(snapshotMaterials(source).map((row) => row[2])).toEqual(sourceColors)
    const outline = winter.getObjectByName('Torso_short_school_jacket_outline')
    expect(outline.userData.studioRenderOutline).toBe(true)
    expect(outline.material.color.getHex()).not.toBe(winter.getObjectByName('Torso_short_school_jacket').material.color.getHex())
  })

  it('decal remap: tie -> navy, lapels -> blazer, buttons -> gold, shirt white and alpha kept', () => {
    const texel = (r, g, b, a = 255) => [r, g, b, a]
    const data = new Uint8ClampedArray([
      ...texel(212, 32, 32), ...texel(246, 184, 26), ...texel(255, 210, 50),
      ...texel(250, 247, 240), ...texel(255, 248, 241), ...texel(212, 32, 32, 0),
    ])
    const targets = resolvePlayerV9DecalTargets(PLAYER_V9_DECAL_RULES.Surface_source_uniform_front, 'winter')
    expect(recolorPlayerV9DecalPixels(data, targets)).toBe(3)
    const rgbHex = (i) => `#${[0, 1, 2].map((k) => data[i * 4 + k].toString(16).padStart(2, '0')).join('')}`
    expect(rgbHex(0)).toBe(WINTER.blazer)
    expect(rgbHex(1)).toBe(WINTER.tie)
    expect(rgbHex(2)).toBe('#e6b04a')
    expect(Array.from(data.slice(12, 20))).toEqual([250, 247, 240, 255, 255, 248, 241, 255])
    expect(Array.from(data.slice(20, 24))).toEqual([212, 32, 32, 0])
    expect(resolvePlayerV9DecalTargets(PLAYER_V9_DECAL_RULES.Surface_source_uniform_front, 'default')).toEqual([])
  })

  it('swaps decal maps through a shared cached texture without mutating the GLB texture source', () => {
    const pixels = { data: new Uint8ClampedArray([246, 184, 26, 255]) }
    const ctx = { fillRect() {}, drawImage() {}, getImageData: () => pixels, putImageData: vi.fn() }
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) })
    const sourceTexture = new THREE.Texture({ width: 1, height: 1 })
    const sourceData = sourceTexture.source
    const make = () => {
      const material = new THREE.MeshToonMaterial({ map: sourceTexture, emissiveMap: sourceTexture })
      material.name = 'Surface_source_uniform_front'
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material)
      mesh.name = 'Decal_source_uniform_front'
      const root = new THREE.Group(); root.add(mesh)
      return mesh
    }
    const a = make(); const b = make()
    applyPlayerV9Outfit(a.parent, 'winter')
    applyPlayerV9Outfit(b.parent, 'winter')
    expect(a.material.map).not.toBe(sourceTexture)
    expect(a.material.emissiveMap).toBe(a.material.map)
    expect(b.material.map).toBe(a.material.map)
    expect(sourceTexture.source).toBe(sourceData)
    expect(ctx.putImageData).toHaveBeenCalledTimes(1)
    expect(`#${Array.from(pixels.data.slice(0, 3)).map((v) => v.toString(16).padStart(2, '0')).join('')}`).toBe(WINTER.tie)
  })
})

// ── S6 임시안 (2026-11-01): v9 can only recolor, so it wears the two recolor looks and falls
// back to the school uniform for the two whose identity is added geometry (scarf/bib, cap).
describe('v9 player outfit (S6 placeholders)', () => {
  it('knows every wardrobe id, but renders apron/grad as the default uniform', () => {
    for (const id of ['raincoat', 'gym', 'apron', 'grad']) expect(resolvePlayerOutfitId(id)).toBe(id)
    expect(resolvePlayerV9OutfitId('raincoat')).toBe('raincoat')
    expect(resolvePlayerV9OutfitId('gym')).toBe('gym')
    expect(resolvePlayerV9OutfitId('apron')).toBe('default')
    expect(resolvePlayerV9OutfitId('grad')).toBe('default')
    expect(resolvePlayerV9OutfitId('winter')).toBe('winter')
    expect(resolvePlayerV9OutfitId('nope')).toBe('default')
  })

  it.each(['raincoat', 'gym'])('%s recolors the v9 garments from the shared palette and leaves hair, skin, shoes and bag alone', (id) => {
    const colors = resolveRosariOutfit(id).colors
    const root = buildV9LikeScene()
    const before = new Map(snapshotMaterials(root).map((row) => [row[0], row[2]]))
    applyPlayerV9Outfit(root, id)
    const hex = (name) => `#${root.getObjectByName(name).material.color.getHexString()}`
    const expectSlot = (name, slot) => expect(hex(name), `${id} ${name}`).toBe(colors[slot] ?? `#${before.get(name).toString(16).padStart(6, '0')}`)
    expectSlot('Torso_short_school_jacket', 'blazer')
    expectSlot('Arm_L_continuous_sleeve', 'blazer')
    expectSlot('Arm_L_cuff', 'shirt')
    expectSlot('Skirt_simple_closed_A_line', 'skirt')
    for (const leg of ['Leg_L_sock', 'Leg_R_sock', 'Leg_L_thigh', 'Leg_R_thigh']) expectSlot(leg, 'legwear')
    for (const name of ['Neck_short', 'Hand_L', 'Hair_bob_back', 'Head_skin_broad_short_chin', 'Shoe_L', 'Shoe_sole_L', 'Backpack_main_rectangular', 'Backpack_front_pocket']) {
      expect(root.getObjectByName(name).material.color.getHex(), `${id} ${name}`).toBe(before.get(name))
    }
  })

  it('raincoat turns the skirt into the coat hem and keeps the legs; gym turns the skirt and legs navy; sports day gives navy shorts over bare legs', () => {
    const raincoat = buildV9LikeScene()
    const legBefore = raincoat.getObjectByName('Leg_L_thigh').material.color.getHex()
    applyPlayerV9Outfit(raincoat, 'raincoat')
    // Approved redesign (Terry 2026-11-14): one long mustard coat, its hem a step darker.
    expect(`#${raincoat.getObjectByName('Skirt_simple_closed_A_line').material.color.getHexString()}`).toBe('#b8931f')
    expect(raincoat.getObjectByName('Leg_L_thigh').material.color.getHex()).toBe(legBefore)
    const sportsDay = buildV9LikeScene()
    applyPlayerV9Outfit(sportsDay, 'sportsDay')
    expect(`#${sportsDay.getObjectByName('Skirt_simple_closed_A_line').material.color.getHexString()}`).toBe('#1f2a4d')
    expect(sportsDay.getObjectByName('Leg_L_thigh').material.color.getHex()).toBe(legBefore)
    const gym = buildV9LikeScene()
    applyPlayerV9Outfit(gym, 'gym')
    expect(`#${gym.getObjectByName('Skirt_simple_closed_A_line').material.color.getHexString()}`).toBe('#1b3f8c')
    expect(`#${gym.getObjectByName('Leg_L_thigh').material.color.getHexString()}`).toBe('#1b3f8c')
  })

  it('decal remap: gym paints the drawn tie and buttons into the white jersey; raincoat makes them the dark closure', () => {
    const front = PLAYER_V9_DECAL_RULES.Surface_source_uniform_front
    const target = (id, rgb) => resolvePlayerV9DecalTargets(front, id).find((entry) => entry.from.join() === rgb.join())?.to
    expect(target('gym', [246, 184, 26])).toEqual([242, 244, 248]) // tie body -> jersey
    expect(target('gym', [255, 210, 50])).toEqual([242, 244, 248]) // buttons -> jersey
    expect(target('gym', [212, 32, 32])).toEqual([242, 244, 248]) // lapels -> jersey
    expect(target('raincoat', [246, 184, 26])).toEqual([143, 111, 28]) // tie -> closure #8f6f1c
    expect(target('raincoat', [212, 32, 32])).toEqual([201, 162, 39]) // lapels -> coat #c9a227
  })

  it.each(['apron', 'grad'])('%s on the real clone path is byte-for-byte the default uniform', (id) => {
    const source = buildV9LikeScene()
    const strip = (rows) => rows.map(([n, m, c, map, em, s, v]) => [n, m, c, map === null, em === null, s, v])
    expect(strip(snapshotMaterials(clonePlayerV9Scene(source, true, id)))).toEqual(strip(snapshotMaterials(clonePlayerV9Scene(source, true, 'default'))))
    expect(applyPlayerV9Outfit(buildV9LikeScene(), id)).toEqual([])
    expect(resolvePlayerV9DecalTargets(PLAYER_V9_DECAL_RULES.Surface_source_uniform_front, id)).toEqual([])
  })
})
