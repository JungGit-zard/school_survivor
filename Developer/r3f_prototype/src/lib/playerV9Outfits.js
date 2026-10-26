// Player outfits for the standard v9 player (PLAYER_v9_final.glb), the model used in gameplay.
//
// The palette is NOT duplicated here: it comes from the Rosari room wardrobe data
// (rosariOutfits.js), so the room clone and the v9 player wear the same 동복.
// This module only maps that palette onto v9's own material/node names and its
// painted decals. No geometry is added: the v9 torso decal already paints the shirt V,
// lapels and buttons, so the winter look is pure recolor (0 extra triangles).
//
// Applied once per scene clone (PlayerV9Model's useMemo), never per frame.
import * as THREE from 'three'
import { DEFAULT_ROSARI_OUTFIT_ID, ROSARI_OUTFITS, resolveRosariOutfit } from './rosariOutfits.js'

export const DEFAULT_PLAYER_OUTFIT_ID = DEFAULT_ROSARI_OUTFIT_ID

// titleSettings.playerOutfit: unknown/absent => 'default'.
export function resolvePlayerOutfitId(value) {
  return ROSARI_OUTFITS.some((outfit) => outfit.id === value) ? value : DEFAULT_PLAYER_OUTFIT_ID
}

// v9 material name -> garment slot of the shared outfit palette.
// Hair, face, hands, neck, shoes and backpack materials are intentionally absent.
const V9_GARMENT_BY_MATERIAL = Object.freeze({
  jacket_red: 'blazer', // torso + sleeves
  shirt_white: 'shirt', // sleeve cuffs
  skirt_blue: 'skirt',
  socks_white: 'legwear',
})
// The thighs use the skin material (shared name with the neck), so they are matched
// by node name: under the winter skirt they become the same dark tights as the socks.
const V9_LEGWEAR_NODE_PATTERN = /^Leg_[LR]_thigh$/

export function getPlayerV9GarmentSlot(meshName, materialName) {
  if (V9_LEGWEAR_NODE_PATTERN.test(meshName || '')) return 'legwear'
  return V9_GARMENT_BY_MATERIAL[materialName] || null
}

// Painted decals: exact source texel colors (the v9 PNGs are flat-color art) -> slot.
// shade < 1 darkens the slot color, shade > 1 lerps it toward white by (shade - 1).
// Shirt/collar texels are already the white shirt and are left untouched.
export const PLAYER_V9_DECAL_RULES = Object.freeze({
  Surface_source_uniform_front: Object.freeze([
    { rgb: [212, 32, 32], slot: 'blazer' }, // lapels + front panels
    { rgb: [246, 184, 26], slot: 'tie' }, // tie body
    { rgb: [255, 201, 33], slot: 'tie', shade: 1.18 }, // tie knot
    { rgb: [197, 128, 22], slot: 'tie', shade: 0.7 }, // tie tip edge
    { rgb: [255, 210, 50], slot: 'buttons' }, // blazer buttons
  ]),
  Surface_skirt_front_pleats: Object.freeze([
    { rgb: [22, 104, 160], slot: 'skirt', shade: 0.55 }, // pleat shadow
    { rgb: [56, 200, 240], slot: 'skirt', shade: 1.3 }, // pleat highlight
  ]),
  Surface_skirt_back_pleats: Object.freeze([
    { rgb: [22, 104, 160], slot: 'skirt', shade: 0.55 },
    { rgb: [56, 200, 240], slot: 'skirt', shade: 1.3 },
  ]),
})

// Same gold as the room's winter button accessory (rosariOutfits.js ACCESSORY_BUILDERS.buttons).
const V9_EXTRA_SLOT_COLORS = Object.freeze({ buttons: '#e6b04a' })
const RGB_TOLERANCE = 6

function hexToRgb(hex) {
  const value = parseInt(String(hex).replace('#', ''), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function shadeRgb([r, g, b], shade = 1) {
  if (shade <= 1) return [r * shade, g * shade, b * shade].map(Math.round)
  const t = Math.min(1, shade - 1)
  return [r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t].map(Math.round)
}

// Resolve decal rules to concrete target RGB for an outfit; rules whose slot the outfit
// does not recolor are dropped. Returns [] for the default outfit.
export function resolvePlayerV9DecalTargets(rules, outfitId) {
  const id = resolvePlayerOutfitId(outfitId)
  if (id === DEFAULT_PLAYER_OUTFIT_ID) return []
  const outfit = resolveRosariOutfit(id)
  const out = []
  for (const rule of rules || []) {
    const hex = outfit.colors[rule.slot] || V9_EXTRA_SLOT_COLORS[rule.slot]
    if (hex) out.push({ from: rule.rgb, to: shadeRgb(hexToRgb(hex), rule.shade) })
  }
  return out
}

// Pure RGBA texel remap (alpha preserved). Returns the number of texels changed.
export function recolorPlayerV9DecalPixels(data, targets) {
  if (!targets.length) return 0
  let changed = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    for (const { from, to } of targets) {
      if (Math.abs(data[i] - from[0]) > RGB_TOLERANCE
        || Math.abs(data[i + 1] - from[1]) > RGB_TOLERANCE
        || Math.abs(data[i + 2] - from[2]) > RGB_TOLERANCE) continue
      data[i] = to[0]; data[i + 1] = to[1]; data[i + 2] = to[2]
      changed += 1
      break
    }
  }
  return changed
}

// One recolored texture per (source texture, outfit), shared by every clone and kept for
// the session (at most 3 small decals per outfit), so remounts never reallocate.
const decalTextureCache = new Map()

function getRecoloredDecalTexture(source, materialName, outfitId) {
  const key = `${source.uuid}:${outfitId}`
  if (decalTextureCache.has(key)) return decalTextureCache.get(key)
  const image = source.image
  const width = image?.width
  const height = image?.height
  const canvas = width && height && typeof document !== 'undefined' ? document.createElement('canvas') : null
  const ctx = canvas?.getContext?.('2d', { willReadFrequently: true })
  if (!ctx?.getImageData) return null
  canvas.width = width
  canvas.height = height
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, width, height)
  recolorPlayerV9DecalPixels(pixels.data, resolvePlayerV9DecalTargets(PLAYER_V9_DECAL_RULES[materialName], outfitId))
  ctx.putImageData(pixels, 0, 0)
  const texture = source.clone()
  texture.source = new THREE.Source(canvas) // never mutate the GLB's shared Source
  texture.needsUpdate = true
  decalTextureCache.set(key, texture)
  return texture
}

// Recolor a freshly cloned v9 scene (its materials must already be per-clone copies).
// The default outfit returns immediately and touches nothing.
// Returns the list of { mesh, slot } recolors and decal swaps for inspection.
export function applyPlayerV9Outfit(root, outfitId) {
  const id = resolvePlayerOutfitId(outfitId)
  const applied = []
  if (id === DEFAULT_PLAYER_OUTFIT_ID || !root) return applied
  const outfit = resolveRosariOutfit(id)
  root.traverse((node) => {
    if (!node.isMesh || node.userData.studioRenderOutline) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue
      const slot = getPlayerV9GarmentSlot(node.name, material.name)
      const color = slot && outfit.colors[slot]
      if (color && material.color) {
        material.color.set(color)
        applied.push({ mesh: node.name, slot })
      }
      if (PLAYER_V9_DECAL_RULES[material.name] && material.map) {
        const texture = getRecoloredDecalTexture(material.map, material.name, id)
        if (!texture) continue
        if (material.emissiveMap === material.map) material.emissiveMap = texture
        material.map = texture
        material.needsUpdate = true
        applied.push({ mesh: node.name, slot: 'decal' })
      }
    }
  })
  return applied
}
