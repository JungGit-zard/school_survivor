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
// An outfit also carries a few low-poly accessory meshes attached to the torso or the hair
// pivot, and may hide a surface it replaces (`hide`), so the silhouette budget stays inside
// the playbook (S-tier masses unchanged; details are color + <=100 tris per outfit).
// `models` says which player appearances can render the look; the rest wear the default.
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
    models: Object.freeze(['rosari', 'v9', 'legacy']),
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
    models: Object.freeze(['rosari', 'v9', 'legacy']),
  }),
  // ── S6 임시안 4벌 (2026-11-01) ─────────────────────────────────────────────────────
  // No approved 2D concept exists for any of these (threemini_rosari_school_costume_design
  // _2026-10-28.md §0 blocker). Terry ordered all four built anyway ("모두 구현해"), so they
  // ship as clearly temporary looks: palette swaps on the existing garment slots plus at most
  // ~100 triangles of low-poly detail each. Replace when the 2D art lands.
  //
  // `models` lists the player appearances that can actually render the look. Any other
  // appearance shows the school uniform (resolveRosariOutfitForModel) — v9 has no geometry
  // channel (recolor + decal texel remap only, so geometry-identity looks are unsupported
  // there), and the legacy PlayerMesh is also the title-screen player, which the title canon
  // lock keeps on default/동복 only.
  Object.freeze({
    // 비옷: mustard raincoat (D-4: muted mustard, not primary yellow). The coat replaces the
    // blazer color, the tie becomes the darker front closure, and a hood covers the pink bob,
    // which is the strongest cue at 20px. The skirt shows below the coat as on a real commute.
    id: 'raincoat',
    label: '비옷',
    note: '비옷 임시안이에요. 원화가 나오면 다시 다듬을 거예요.',
    colors: Object.freeze({
      blazer: '#c9a227',
      shirt: '#c9a227',
      collar: '#c9a227',
      tie: '#8f6f1c',
      buttons: '#8f6f1c', // v9 decal only (rosari has no button slot)
      skirt: '#b8931f', // coat hem: the body reads as one long coat, not a blazer over a skirt
    }),
    // A raincoat has no tie: the dark placket strip replaces it as the front closure.
    hide: Object.freeze(['yellow_tie_knot', 'yellow_tie_long_drop']),
    accessories: Object.freeze(['hood', 'coatPlacket', 'umbrellaHandle', 'umbrellaCanopy', 'umbrellaStrap', 'umbrellaTip']),
    models: Object.freeze(['rosari', 'v9']),
  }),
  Object.freeze({
    // 체육복: white jersey + navy track pants. The tie is hidden (a jersey has none) and a navy
    // zipper line takes its place. The skirt cannot be hidden — it is the only surface between
    // the torso hem (y 1.233) and the thigh tops (y 0.891) — so it turns navy with the legs and
    // the lower body reads as one navy block under the white top.
    id: 'gym',
    label: '체육복',
    note: '체육복 임시안이에요. 원화가 나오면 다시 다듬을 거예요.',
    colors: Object.freeze({
      blazer: '#f2f4f8',
      shirt: '#1b3f8c',
      collar: '#1b3f8c',
      tie: '#f2f4f8', // v9 decal only: paints the drawn tie into the jersey
      buttons: '#f2f4f8', // v9 decal only
      skirt: '#1b3f8c',
      legwear: '#1b3f8c',
    }),
    hide: Object.freeze(['yellow_tie_knot', 'yellow_tie_long_drop']),
    accessories: Object.freeze(['zipper']),
    models: Object.freeze(['rosari', 'v9']),
  }),
  Object.freeze({
    // 급식 당번복 (Terry 2026-11-14: 흰 가운): the white lunch-duty smock (給食当番の白衣) worn over
    // the uniform — a long white coat over the jacket, white sleeves, and its hem covering the
    // skirt (the skirt shell becomes the coat's lower part). The tie is hidden under the closed
    // smock. Crown-only white kerchief with a nape knot, and a steel soup ladle (국자) in the right
    // hand, parented to the hand so it swings with the arm.
    id: 'apron',
    label: '급식 당번복',
    note: '급식 당번복 임시안이에요. 원화가 나오면 다시 다듬을 거예요.',
    colors: Object.freeze({
      blazer: '#f4f4f0',
      shirt: '#f4f4f0',
      collar: '#f4f4f0',
      skirt: '#ecece6', // smock hem, a step darker so the waist line still reads
    }),
    hide: Object.freeze(['yellow_tie_knot', 'yellow_tie_long_drop']),
    accessories: Object.freeze(['headScarf', 'scarfKnot', 'ladleHandle', 'ladleBowl']),
    models: Object.freeze(['rosari']),
  }),
  Object.freeze({
    // 졸업: the default uniform with a black mortarboard and a gold tassel (D-6: no long gown).
    // The cap changes the head *shape*, which no other outfit does.
    id: 'grad',
    label: '졸업',
    note: '졸업 임시안이에요. 원화가 나오면 다시 다듬을 거예요.',
    colors: Object.freeze({}),
    accessories: Object.freeze(['capCrown', 'capBoard', 'capTassel', 'capCord']),
    models: Object.freeze(['rosari']),
  }),
  // ── Stage 5·6 클리어 의상 임시안 (2026-11-08, spec56 B §9 · C-9-4) ──────────────────────
  // Same rule as the S6 four: no approved 2D concept yet, palette on the existing garment slots
  // plus <=100 triangles of low-poly detail. Replace when the 2D art lands.
  Object.freeze({
    // 선도부 교복: navy blazer and skirt over the white shirt, a red tie, a red "선도" armband on
    // the upper sleeve and white gloves. The armband and gloves are the 20px identity cues.
    id: 'prefect',
    label: '선도부 교복',
    note: '선도부 교복 임시안이에요. 원화가 나오면 다시 다듬을 거예요.',
    colors: Object.freeze({
      blazer: '#1f2a4d',
      shirt: '#fffaf4',
      collar: '#fffaf4',
      tie: '#b3202c',
      skirt: '#2a3558',
    }),
    accessories: Object.freeze(['prefectArmband', 'gloveLeft', 'gloveRight']),
    models: Object.freeze(['rosari', 'v9']),
  }),
  Object.freeze({
    // 운동회 반티 (Terry 2026-11-14: 일본 중학교 체육복 + 부르마). White short-sleeve gym T-shirt
    // with navy trim at the collar and sleeve hems, a white name patch (zekken) with a navy border,
    // navy buruma as plain athletic shorts, bare legs with the GLB's white socks, and a plain red
    // hachimaki band (no tail pieces at the back). The spec56 yellow (#F2C94C) no longer applies (Terry override).
    // The jacket mesh runs shoulder to wrist, so short sleeves are a skin-colored shell over the
    // forearm half of each sleeve (built from the sleeve's own vertex rings) under a navy hem band;
    // the wrist cuff turns skin too. The skirt is hidden and the buruma box fills hem to upper thigh.
    id: 'sportsDay',
    label: '운동회 반티',
    note: '운동회 반티 임시안이에요. 원화가 나오면 다시 다듬을 거예요.',
    colors: Object.freeze({
      blazer: '#f2f2ee', // white gym T-shirt
      shirt: '#ffe0c9', // wrist cuff band = bare wrist
      collar: '#1f2a4d', // navy neck trim
      tie: '#f2f2ee', // v9 decal only: paints the drawn tie into the tee
      buttons: '#f2f2ee', // v9 decal only
      skirt: '#1f2a4d', // v9 only (the rosari skirt is hidden under the buruma)
    }),
    hide: Object.freeze(['yellow_tie_knot', 'yellow_tie_long_drop', 'reference_tapered_pleated_skirt_shell', 'left_white_cuff_band_at_wrist', 'right_white_cuff_band_at_wrist']),
    accessories: Object.freeze([
      'burumaHips', 'burumaWaistband', 'burumaLegLeft', 'burumaLegRight', 'zekkenBorder', 'zekken',
      'forearmLeft', 'forearmRight', 'sleeveHemLeft', 'sleeveHemRight',
      'headband',
    ]),
    models: Object.freeze(['rosari', 'v9']),
  }),
])

export const ROSARI_OUTFIT_IDS = Object.freeze(ROSARI_OUTFITS.map((outfit) => outfit.id))

export function resolveRosariOutfit(id) {
  return ROSARI_OUTFITS.find((outfit) => outfit.id === id) || ROSARI_OUTFITS[0]
}

// Whether `model` ('rosari' | 'v9' | 'legacy') can render this outfit's look. The default
// uniform renders everywhere; an outfit without a `models` list is rosari-only.
export function isRosariOutfitSupportedOn(id, model) {
  const outfit = resolveRosariOutfit(id)
  if (outfit.id === DEFAULT_ROSARI_OUTFIT_ID) return true
  return (outfit.models || ['rosari']).includes(model)
}

// The outfit a given player model actually wears: the chosen one when it can render it,
// otherwise the school uniform (default).
export function resolveRosariOutfitForModel(id, model) {
  return isRosariOutfitSupportedOn(id, model) ? resolveRosariOutfit(id) : ROSARI_OUTFITS[0]
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

// 체육복 zipper: a thin navy strip down the torso center where the (hidden) tie was.
function buildZipper() {
  return extrudedTriangle([[-0.014, 1.25], [0.014, 1.25], [0.014, 1.8], [-0.014, 1.8]], SHIRT_V_Z)
}

// 비옷 placket: same strip as the 체육복 zipper, in the dark coat color, where the hidden tie was.
function buildCoatPlacket() {
  return buildZipper()
}

// 운동회 zekken (name patch): a flat white rectangle on the chest over a slightly larger navy one,
// which shows as a thin border. Flat shapes (2 tris each): the chest front is the only view.
function flatRect(x0, y0, x1, y1, z) {
  const shape = new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)])
  const geometry = new THREE.ShapeGeometry(shape, 1)
  geometry.translate(0, 0, z)
  return geometry
}

function buildZekkenBorder() {
  return flatRect(-0.15, 1.41, 0.15, 1.66, SHIRT_V_Z + 0.006)
}

function buildZekken() {
  return flatRect(-0.13, 1.43, 0.13, 1.64, SHIRT_V_Z + 0.009)
}

// 운동회 buruma, shaped as ordinary athletic shorts with the same coverage as before (torso hem
// down to y 0.82 on the upper thigh):
//  - hips: a static open 6-sided prism from y 0.92 to 1.20 around the pelvis; its widest faces
//    sit mid-depth so the hips read slightly rounded, and it tapers 5% toward the bottom.
//    It encloses the torso hem box (x −0.401..0.427, z −0.22..0.326).
//  - waistband: a darker, 4% wider ring of the same hexagon at y 1.18–1.26, over the torso hem.
//  - legs: one open 4-sided tube per thigh, parented to the thigh mesh so it swings with the
//    leg, from just above the thigh top down to y ≈0.82. The hips stop at 0.92, so between the
//    two tubes there is a visible crotch split instead of a skirt-like box.
const BURUMA_HEX = [[-0.47, 0.05], [-0.42, 0.38], [0.45, 0.38], [0.5, 0.05], [0.45, -0.27], [-0.42, -0.27]]
const BURUMA_CENTER = [0.015, 0.055]

function hexRing(scaleTop, yTop, scaleBottom, yBottom) {
  const at = ([x, z], k, y) => [BURUMA_CENTER[0] + (x - BURUMA_CENTER[0]) * k, y, BURUMA_CENTER[1] + (z - BURUMA_CENTER[1]) * k]
  const positions = []
  for (let j = 0; j < BURUMA_HEX.length; j += 1) {
    const a = BURUMA_HEX[j]; const b = BURUMA_HEX[(j + 1) % BURUMA_HEX.length]
    const a0 = at(a, scaleTop, yTop); const b0 = at(b, scaleTop, yTop)
    const a1 = at(a, scaleBottom, yBottom); const b1 = at(b, scaleBottom, yBottom)
    // Hexagon points run clockwise seen from above (+y), so this winding faces outward.
    positions.push(...a0, ...a1, ...b0, ...b0, ...a1, ...b1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function buildBurumaHips() {
  return hexRing(1, 1.2, 0.95, 0.92)
}

function buildBurumaWaistband() {
  return hexRing(1.04, 1.26, 1.04, 1.18)
}

// Thigh mesh local bounds (relative to its hip pivot + 0.01): left x −0.157..0.164,
// z −0.126..0.152; right x −0.142..0.179, z −0.118..0.161; top at y −0.069. The tube clears the
// thigh by 0.03 per side and spans y +0.02 (inside the hips) to −0.15 (model y ≈0.82).
function burumaLegTube(minX, maxX, minZ, maxZ) {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true)
  geometry.rotateY(Math.PI / 4)
  geometry.scale((maxX - minX) / 2 / Math.SQRT1_2 + 0.03 / Math.SQRT1_2, 0.17, (maxZ - minZ) / 2 / Math.SQRT1_2 + 0.03 / Math.SQRT1_2)
  geometry.translate((minX + maxX) / 2, -0.065, (minZ + maxZ) / 2)
  return geometry
}

const buildBurumaLegLeft = () => burumaLegTube(-0.157, 0.164, -0.126, 0.152)
const buildBurumaLegRight = () => burumaLegTube(-0.142, 0.179, -0.118, 0.161)

// Short sleeves on a sleeve mesh that runs shoulder to wrist. The sleeve is a 6-sided prism with
// three vertex rings (shoulder, mid, wrist) in its own space; the shell reads those rings from the
// parent geometry and wraps the mid→wrist half, pushed out from each ring's center by `expand`.
function readSleeveRings(parent) {
  const position = parent?.geometry?.attributes?.position
  if (!position) return null
  const unique = new Map()
  for (let i = 0; i < position.count; i += 1) {
    const v = [position.getX(i), position.getY(i), position.getZ(i)]
    unique.set(v.map((n) => n.toFixed(4)).join(','), v)
  }
  const points = [...unique.values()].sort((a, b) => a[1] - b[1])
  if (points.length !== 18) return null
  const rings = [points.slice(0, 6), points.slice(6, 12), points.slice(12, 18)] // wrist, mid, shoulder
  return rings.map((ring) => {
    const c = ring.reduce((acc, v) => [acc[0] + v[0] / 6, acc[1] + v[1] / 6, acc[2] + v[2] / 6], [0, 0, 0])
    const sorted = [...ring].sort((a, b) => Math.atan2(a[2] - c[2], a[0] - c[0]) - Math.atan2(b[2] - c[2], b[0] - c[0]))
    return { c, verts: sorted }
  })
}

// `bodyDir` (+1 / −1) is the sleeve-local x direction toward the torso; `skip` drops that many
// faces nearest the body (ranked toward the body first, then toward the back), which sit against
// the torso and are not seen, to keep the outfit inside its triangle budget.
function sleeveBand(parent, fromT, toT, expand, bodyDir = 0, skip = 0) {
  const rings = readSleeveRings(parent)
  if (!rings) return new THREE.BufferGeometry()
  const [wrist, mid] = rings
  const at = (t, j) => {
    const a = mid.verts[j]; const b = wrist.verts[j]
    const ca = mid.c; const cb = wrist.c
    const c = [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]
    const v = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    return { v: [c[0] + (v[0] - c[0]) * expand, v[1], c[2] + (v[2] - c[2]) * expand], c }
  }
  const faceScore = (j) => {
    const k = (j + 1) % 6
    const ox = (mid.verts[j][0] + mid.verts[k][0]) / 2 - mid.c[0]
    const oz = (mid.verts[j][2] + mid.verts[k][2]) / 2 - mid.c[2]
    return bodyDir * ox - 0.3 * oz
  }
  const skipped = new Set([0, 1, 2, 3, 4, 5].sort((a, b) => faceScore(b) - faceScore(a)).slice(0, skip))
  const positions = []
  for (let j = 0; j < 6; j += 1) {
    if (skipped.has(j)) continue
    const k = (j + 1) % 6
    const quad = [at(fromT, j), at(fromT, k), at(toT, k), at(toT, j)]
    for (const [a, b, c] of [[quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]]) {
      // Wind every triangle outward (away from the ring center).
      const e1 = [b.v[0] - a.v[0], b.v[1] - a.v[1], b.v[2] - a.v[2]]
      const e2 = [c.v[0] - a.v[0], c.v[1] - a.v[1], c.v[2] - a.v[2]]
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      const out = [a.v[0] - a.c[0], 0, a.v[2] - a.c[2]]
      const tri = n[0] * out[0] + n[2] * out[2] >= 0 ? [a, b, c] : [a, c, b]
      for (const p of tri) positions.push(...p.v)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

// Bare forearm (mid ring → wrist ring) and the navy hem band at the mid ring. The left sleeve
// hangs at −x, so the torso is +x in its space; the right sleeve mirrors that.
const buildForearmLeft = (parent) => sleeveBand(parent, 0.08, 1, 1.05, 1, 1)
const buildForearmRight = (parent) => sleeveBand(parent, 0.08, 1, 1.05, -1, 1)
const buildSleeveHemLeft = (parent) => sleeveBand(parent, -0.06, 0.1, 1.1, 1, 2)
const buildSleeveHemRight = (parent) => sleeveBand(parent, -0.06, 0.1, 1.1, -1, 2)

// 비옷 folded umbrella (Terry's reference), held like the ladle in right_simple_lowpoly_hand_mitten's
// own space: a dark J-hook rises out of the fist and curls outward; right under the hand the
// furled canopy is at its widest (the gathered, flared fabric edge), a white strap wraps it just
// below that, and it tapers steadily to a thin dark tip near the ankle. 5-sided, so the flared
// top reads blocky like the reference. Navy, not the reference's orange: next to the mustard
// coat navy is the strongest value contrast at phone size, while orange would melt into the coat.
// Budget: hook 18 + canopy 20 + strap 10 + tip 3 = 51 (the hood dropped to 34 to make room).

// A 3-sided tube along a polyline (open ends), for the hook.
function polyTube(points, radius) {
  const rings = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]; const b = points[Math.min(points.length - 1, i + 1)]
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()
    const n = new THREE.Vector3(0, 0, 1).cross(t)
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0)
    n.normalize()
    const m = new THREE.Vector3().crossVectors(t, n)
    return [0, 1, 2].map((k) => {
      const ang = (k / 3) * Math.PI * 2
      return new THREE.Vector3(...p).addScaledVector(n, Math.cos(ang) * radius).addScaledVector(m, Math.sin(ang) * radius)
    })
  })
  const positions = []
  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let k = 0; k < 3; k += 1) {
      const a = rings[i][k]; const b = rings[i][(k + 1) % 3]; const c = rings[i + 1][k]; const d = rings[i + 1][(k + 1) % 3]
      positions.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...b.toArray(), ...d.toArray(), ...c.toArray())
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

// Hand y 0.128..0.354, x 0..0.212 (+x is the outer side; +y runs up into the forearm). The shaft
// runs from the canopy top up through the fist, then the J curls out past the hand's outer side
// and down, so the hook shows beside the fist instead of disappearing into the sleeve.
function buildUmbrellaHandle() {
  return polyTube([[0.106, 0.06, 0.075], [0.106, 0.3, 0.075], [0.3, 0.38, 0.075], [0.38, 0.2, 0.075]], 0.045)
}

const UMBRELLA_SEGMENTS = 5
function umbrellaRing(r, y, j) {
  const a = (j / UMBRELLA_SEGMENTS) * Math.PI * 2
  return [0.106 + r * Math.sin(a), y, 0.075 + r * Math.cos(a)]
}

// Profile [radius, y]: flare out from under the hand to the widest edge, then one long taper.
const UMBRELLA_PROFILE = [[0.15, 0.08], [0.22, -0.03], [0.03, -0.8]]
function buildUmbrellaCanopy() {
  const positions = []
  for (let i = 0; i < UMBRELLA_PROFILE.length - 1; i += 1) {
    const [r0, y0] = UMBRELLA_PROFILE[i]; const [r1, y1] = UMBRELLA_PROFILE[i + 1]
    for (let j = 0; j < UMBRELLA_SEGMENTS; j += 1) {
      const a = umbrellaRing(r0, y0, j); const b = umbrellaRing(r0, y0, j + 1)
      const c = umbrellaRing(r1, y1, j); const d = umbrellaRing(r1, y1, j + 1)
      positions.push(...a, ...c, ...b, ...b, ...c, ...d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

// The strap just below the widest edge (canopy r ≈0.21 → 0.195 over y −0.07..−0.13), same
// 5 corners as the canopy and slightly outside it.
function buildUmbrellaStrap() {
  const geometry = new THREE.CylinderGeometry(0.228, 0.212, 0.06, UMBRELLA_SEGMENTS, 1, true)
  geometry.translate(0.106, -0.1, 0.075)
  return geometry
}

// An open cone as a plain triangle fan (one triangle per side). three.js ConeGeometry keeps a
// degenerate apex row, which doubles the count for the same shape.
function fanCone(radius, topY, apexY, segments, x, z) {
  const positions = []
  for (let j = 0; j < segments; j += 1) {
    const a0 = (j / segments) * Math.PI * 2
    const a1 = ((j + 1) / segments) * Math.PI * 2
    positions.push(
      x + radius * Math.sin(a0), topY, z + radius * Math.cos(a0),
      x, apexY, z,
      x + radius * Math.sin(a1), topY, z + radius * Math.cos(a1),
    )
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

// Thin dark ferrule closing the taper at the bottom.
function buildUmbrellaTip() {
  return fanCone(0.03, -0.8, -0.9, 3, 0.106, 0.075)
}

// 급식 국자 (soup ladle) in right_simple_lowpoly_hand_mitten's own space (local bounds
// x 0..0.212, y 0.128..0.354, z −0.085..0.234; its axes are within 18° of model axes at rest).
// The handle runs through the fist from just above the hand down past it; the bowl hangs at the
// bottom end, a little forward so the handle meets its back rim, opening upward.
function buildLadleHandle() {
  const geometry = new THREE.BoxGeometry(0.035, 0.62, 0.035)
  geometry.translate(0.106, 0.11, 0.075)
  return geometry
}

function buildLadleBowl() {
  const geometry = new THREE.SphereGeometry(0.13, 5, 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
  geometry.translate(0.106, -0.18, 0.195)
  return geometry
}

// 급식 당번복 bib: on the belly/chest, narrow at the top so it stays inside the backpack
// straps (x ±0.167). Ends at the torso hem y 1.24 (never lower: legs swing below it).
function buildApronBib() {
  return extrudedTriangle([[-0.3, 1.24], [0.3, 1.24], [0.15, 1.72], [-0.15, 1.72]], SHIRT_V_Z)
}

// Head accessories live in removable_hair_pivot space, which is the bob mesh's own space
// (bob local bounds x −0.633..0.658, y 0.080..1.269, z −0.589..0.585; model y = local + 1.88).
// Measured bob radius around this axis, max over all angles: 0.746 at the hem (y 0.08–0.1),
// 0.741 at y 0.6, 0.666 at y 0.9, 0.549 at y 1.1, 0.224 at y 1.2, apex y 1.269.
const HAIR_AXIS_X = 0.0125
const HAIR_AXIS_Z = -0.002

// A lathe-like shell around the hair axis. `rings` are [y, radius] bottom to top, closed by a
// fan to `apexY`. Rows below `openBelowY` skip the segments facing +z, leaving a face window
// of ±(openSegments·step) around the front. Indexed so normals stay smooth under toon shading.
function buildHeadShell(rings, apexY, { segments = 10, openBelowY = -Infinity, openSegments = 1 } = {}) {
  const step = (Math.PI * 2) / segments
  const positions = []
  for (const [y, r] of rings) {
    for (let j = 0; j < segments; j += 1) {
      const a = (j - 0.5) * step // segment j is centered on angle j·step (0 = +z, facing front)
      positions.push(HAIR_AXIS_X + r * Math.sin(a), y, HAIR_AXIS_Z + r * Math.cos(a))
    }
  }
  const apex = positions.length / 3
  positions.push(HAIR_AXIS_X, apexY, HAIR_AXIS_Z)
  const index = []
  const isFront = (j) => j <= openSegments || j >= segments - openSegments
  for (let i = 0; i < rings.length - 1; i += 1) {
    const open = rings[i + 1][0] <= openBelowY
    for (let j = 0; j < segments; j += 1) {
      if (open && isFront(j)) continue
      const a = i * segments + j
      const b = i * segments + ((j + 1) % segments)
      const c = a + segments
      const d = b + segments
      index.push(a, b, c, b, d, c)
    }
  }
  const top = (rings.length - 1) * segments
  for (let j = 0; j < segments; j += 1) index.push(top + j, top + ((j + 1) % segments), apex)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

// 비옷 hood: stops above the bob hem (y 0.35) so the pink hair shows below it all around, and the
// face window is the whole front half below the forehead so pink side hair frames the face —
// a full mustard shell over the bob read as blonde hair at gameplay size.
// 8 sides and 3 rings (34 tris) to leave room for the umbrella. Checked against every bob
// vertex (all 408-tri bob positions vs the octagon edge at that height and angle): nothing pokes
// out above the face window; the top ring sits at r 0.6 (a 0.52 ring let the crown corners
// through by 0.03). The face window is the front three segments below y 0.9.
function buildHood() {
  return buildHeadShell([[0.35, 0.815], [0.9, 0.78], [1.2, 0.6]], 1.38, { segments: 8, openBelowY: 1.0, openSegments: 1 })
}

// 급식 당번복 삼각건: a crown-only kerchief (from the brow line up), so the pink bob shows at the
// sides and back. The face window stays open on the lowest row.
function buildHeadScarf() {
  return buildHeadShell([[0.75, 0.72], [0.95, 0.75], [1.15, 0.62], [1.3, 0.3]], 1.34, { openBelowY: 0.95 })
}

// The kerchief's knot tail: a flat triangle pointing down at the nape, just behind the shell.
function buildScarfKnot() {
  return extrudedTriangle([[HAIR_AXIS_X - 0.18, 0.86], [HAIR_AXIS_X + 0.18, 0.86], [HAIR_AXIS_X, 0.5]], HAIR_AXIS_Z - 0.8)
}

// 졸업 mortarboard: an open 8-sided crown sitting on the top of the bob, a flat square board on
// it and a gold tassel hanging off the front-right corner. No cylinders for small round parts
// (design doc §6 rule 1) — every piece is a box or an uncapped ring.
function buildCapCrown() {
  const geometry = new THREE.CylinderGeometry(0.52, 0.68, 0.25, 8, 1, true)
  geometry.translate(HAIR_AXIS_X, 1.18, HAIR_AXIS_Z)
  return geometry
}

function buildCapBoard() {
  const geometry = new THREE.BoxGeometry(1.24, 0.04, 1.24)
  geometry.translate(HAIR_AXIS_X, 1.32, HAIR_AXIS_Z)
  return geometry
}

// Cord on top of the board from its center to the tassel corner (direction (0.6, 0, 0.3)).
function buildCapCord() {
  const geometry = new THREE.BoxGeometry(0.67, 0.02, 0.025)
  geometry.rotateY(-Math.atan2(0.3, 0.6))
  geometry.translate(HAIR_AXIS_X + 0.3, 1.35, HAIR_AXIS_Z + 0.15)
  return geometry
}

function buildCapTassel() {
  const geometry = new THREE.BoxGeometry(0.035, 0.26, 0.035)
  geometry.translate(HAIR_AXIS_X + 0.63, 1.17, HAIR_AXIS_Z + 0.3)
  return geometry
}

// 선도부 armband: an uncapped 8-sided ring around the upper sleeve, in the sleeve mesh's own
// space (left_upper_sleeve_continuous_to_white_cuff local bounds x −0.214..0.154,
// y −0.349..0.284, z −0.071..0.325 → axis x −0.03, z 0.127, half width ≤ 0.198).
function buildPrefectArmband() {
  const geometry = new THREE.CylinderGeometry(0.215, 0.215, 0.1, 8, 1, true)
  geometry.translate(-0.03, -0.12, 0.127)
  return geometry
}

// White gloves: a box shell just outside each mitten hand, in the hand mesh's own space.
// Mitten local bounds — left x −0.192..0.043, y 0.153..0.373, z −0.040..0.281;
// right x 0.000..0.212, y 0.128..0.354, z −0.085..0.234. Shell = bounds + 0.015 per side.
function buildGloveShell(min, max) {
  const pad = 0.015
  const geometry = new THREE.BoxGeometry(max[0] - min[0] + pad * 2, max[1] - min[1] + pad * 2, max[2] - min[2] + pad * 2)
  geometry.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
  return geometry
}

function buildGloveLeft() {
  return buildGloveShell([-0.192, 0.153, -0.04], [0.043, 0.373, 0.281])
}

function buildGloveRight() {
  return buildGloveShell([0, 0.128, -0.085], [0.212, 0.354, 0.234])
}

// 운동회 hachimaki: an uncapped 10-sided band on the forehead line, just above the bangs' edge
// (bob radius ≈0.703 at y 0.75 → 0.666 at y 0.9). Radii are set so the 10-gon's inradius clears
// the bob (0.745·cos18° = 0.709, 0.71·cos18° = 0.675): it hugs without corners poking through,
// and it sits below the crown's rounding, so no edge sticks out sideways above the hair.
function buildHeadband() {
  const geometry = new THREE.CylinderGeometry(0.71, 0.745, 0.15, 10, 1, true)
  geometry.translate(HAIR_AXIS_X, 0.825, HAIR_AXIS_Z)
  return geometry
}

export const ROSARI_OUTFIT_TORSO_NODE = 'simple_closed_lego_torso_exterior_one_piece'
export const ROSARI_OUTFIT_HAIR_NODE = 'removable_hair_pivot'

// `attach` names the node the accessory is parented to (default: the torso shell, whose world
// transform is identity so its local space is model space).
// `doubleSided` marks open shells (uncapped rings, head shells with a face window). Single-sided,
// their inside is culled and the black outline hull behind it shows through the opening as black
// slabs; drawn from both sides, the inner surface writes the outline stencil and hides the hull.
const ACCESSORY_BUILDERS = Object.freeze({
  shirtV: { build: buildShirtV, slot: 'shirt' },
  lapels: { build: buildLapels, color: '#5e1627' },
  buttons: { build: buildButtons, color: '#e6b04a' },
  zipper: { build: buildZipper, color: '#1b3f8c' },
  coatPlacket: { build: buildCoatPlacket, color: '#8f6f1c' },
  apronBib: { build: buildApronBib, color: '#fbfbf7' },
  ladleHandle: { build: buildLadleHandle, color: '#b8bec8', attach: 'right_simple_lowpoly_hand_mitten' },
  umbrellaHandle: { build: buildUmbrellaHandle, color: '#2a2a30', attach: 'right_simple_lowpoly_hand_mitten', doubleSided: true },
  umbrellaCanopy: { build: buildUmbrellaCanopy, color: '#1f2a4d', attach: 'right_simple_lowpoly_hand_mitten', doubleSided: true },
  umbrellaStrap: { build: buildUmbrellaStrap, color: '#e9edf5', attach: 'right_simple_lowpoly_hand_mitten', doubleSided: true },
  umbrellaTip: { build: buildUmbrellaTip, color: '#2a2a30', attach: 'right_simple_lowpoly_hand_mitten', doubleSided: true },
  ladleBowl: { build: buildLadleBowl, color: '#b8bec8', attach: 'right_simple_lowpoly_hand_mitten', doubleSided: true },
  zekkenBorder: { build: buildZekkenBorder, color: '#1f2a4d' },
  zekken: { build: buildZekken, color: '#fbfbf7' },
  burumaHips: { build: buildBurumaHips, color: '#1f2a4d', doubleSided: true },
  burumaWaistband: { build: buildBurumaWaistband, color: '#141c36', doubleSided: true },
  burumaLegLeft: { build: buildBurumaLegLeft, color: '#1f2a4d', attach: 'left_upper_leg_tapered_thigh_to_knee', doubleSided: true },
  burumaLegRight: { build: buildBurumaLegRight, color: '#1f2a4d', attach: 'right_upper_leg_tapered_thigh_to_knee', doubleSided: true },
  forearmLeft: { build: buildForearmLeft, color: '#ffe0c9', attach: 'left_upper_sleeve_continuous_to_white_cuff' },
  forearmRight: { build: buildForearmRight, color: '#ffe0c9', attach: 'right_upper_sleeve_continuous_to_white_cuff' },
  sleeveHemLeft: { build: buildSleeveHemLeft, color: '#1f2a4d', attach: 'left_upper_sleeve_continuous_to_white_cuff' },
  sleeveHemRight: { build: buildSleeveHemRight, color: '#1f2a4d', attach: 'right_upper_sleeve_continuous_to_white_cuff' },
  hood: { build: buildHood, color: '#c9a227', attach: ROSARI_OUTFIT_HAIR_NODE, doubleSided: true },
  headScarf: { build: buildHeadScarf, color: '#fbfbf7', attach: ROSARI_OUTFIT_HAIR_NODE, doubleSided: true },
  scarfKnot: { build: buildScarfKnot, color: '#fbfbf7', attach: ROSARI_OUTFIT_HAIR_NODE },
  capCrown: { build: buildCapCrown, color: '#1d1d26', attach: ROSARI_OUTFIT_HAIR_NODE, doubleSided: true },
  capBoard: { build: buildCapBoard, color: '#1d1d26', attach: ROSARI_OUTFIT_HAIR_NODE },
  capCord: { build: buildCapCord, color: '#d4a53a', attach: ROSARI_OUTFIT_HAIR_NODE },
  capTassel: { build: buildCapTassel, color: '#d4a53a', attach: ROSARI_OUTFIT_HAIR_NODE },
  prefectArmband: { build: buildPrefectArmband, color: '#c8202f', attach: 'left_upper_sleeve_continuous_to_white_cuff' },
  gloveLeft: { build: buildGloveLeft, color: '#fbfbf7', attach: 'left_simple_lowpoly_hand_mitten' },
  gloveRight: { build: buildGloveRight, color: '#fbfbf7', attach: 'right_simple_lowpoly_hand_mitten' },
  headband: { build: buildHeadband, color: '#d1242f', attach: ROSARI_OUTFIT_HAIR_NODE, doubleSided: true },
})

export const ROSARI_OUTFIT_ACCESSORY_IDS = Object.freeze(Object.keys(ACCESSORY_BUILDERS))

export function getRosariOutfitAccessoryAttachNode(accessoryId) {
  return ACCESSORY_BUILDERS[accessoryId]?.attach || ROSARI_OUTFIT_TORSO_NODE
}

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
//
// `hide` (node names) sets visible = false on surfaces the outfit replaces, e.g. the tie under
// a jersey; the outline hulls are children of their surface, so they disappear with it.
export function applyRosariOutfit(root, outfitId, makeMaterial) {
  const outfit = resolveRosariOutfit(outfitId)
  const anchors = new Map()
  const anchorNames = new Set([ROSARI_OUTFIT_TORSO_NODE, ROSARI_OUTFIT_HAIR_NODE])
  for (const id of outfit.accessories) if (ACCESSORY_BUILDERS[id]?.attach) anchorNames.add(ACCESSORY_BUILDERS[id].attach)
  const hide = new Set(outfit.hide || [])
  root.traverse((node) => {
    if (anchorNames.has(node.name)) {
      if (!anchors.has(node.name)) anchors.set(node.name, node)
    }
    if (hide.has(node.name)) node.visible = false
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
  for (const id of outfit.accessories) {
    const spec = ACCESSORY_BUILDERS[id]
    if (!spec) continue
    const parent = anchors.get(spec.attach || ROSARI_OUTFIT_TORSO_NODE)
    if (!parent) continue
    const color = spec.color || outfit.colors[spec.slot]
    const material = makeMaterial(color)
    if (spec.doubleSided) material.side = THREE.DoubleSide
    const mesh = new THREE.Mesh(spec.build(parent), material)
    mesh.name = `outfit_${outfit.id}_${id}`
    mesh.userData.ownedGeometry = true
    parent.add(mesh)
    added.push(mesh)
  }
  return added
}
