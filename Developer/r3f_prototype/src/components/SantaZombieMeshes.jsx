// Limited-time Christmas Santa zombies (Terry 2026-11-24, shown until Dec 25).
//
//  XSG  Santa zombie with a big gift sack over the shoulder. Wanders like the E08 coin
//       monster and runs away once it spots the player (gold-goblin role).
//  XSL  Zombie Santa riding a sleigh pulled by Rudolph. One hit target that crosses the
//       screen like the running crew.
//
// Visual only. Gameplay (spawn, stats, behaviour) lives in levelmini's files.
//
// Draw budget: every rigid part (head, body, each arm/leg, sack, sleigh ...) is ONE merged
// geometry with per-vertex colour + per-vertex glow, drawn as one toon mesh and one
// inverted-hull outline mesh (2 draw calls per part) instead of 2 per box. The zombie
// face is the E07-style SDF shader plane (no texture). Rudolph's red nose glows through
// vertex emissive plus a soft additive halo sphere; no lights are added.
//   XSG = 7 parts x 2 + face 1                    = 15 draw calls
//   XSL = 11 parts x 2 + face 1 + nose halo 1     = 24 draw calls
// Only one of each is alive at a time, so this is cheaper than adding ~70 rows to the
// shared InstancedMesh tables (which would cost draw calls for every pooled type).
//
// Model space matches the box zombies: +Z is forward (facing), feet bottom ~ -0.63,
// render scale = ENEMY_STATS.scale x 4/3 x 0.333 (same as every zombie).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getCachedChamferedBoxGeo, getFlashMat, getSharedOutlineMat, getToonGradient, inflateScale } from '../lib/toon.js'

const disableRaycast = () => null

export const SANTA_SACK_ZOMBIE_TYPE = 'XSG'
export const SANTA_SLEIGH_ZOMBIE_TYPE = 'XSL'
export const SANTA_ZOMBIE_TYPES = Object.freeze([SANTA_SACK_ZOMBIE_TYPE, SANTA_SLEIGH_ZOMBIE_TYPE])
export function isSantaZombieType(type) { return type === SANTA_SACK_ZOMBIE_TYPE || type === SANTA_SLEIGH_ZOMBIE_TYPE }

export const SANTA_ZOMBIE_COLORS = Object.freeze({
  skin: 0x93b26a,
  skinShadow: 0x6c8a4d,
  coat: 0xc4202a,
  coatShadow: 0x8e1520,
  fur: 0xf4f1e6,
  beard: 0xeeeae0,
  belt: 0x1a1a1a,
  buckle: 0xf2c53d,
  boot: 0x161616,
  santaNose: 0xc0504a,
  sack: 0x8a5a2c,
  sackShadow: 0x6a421f,
  sackTie: 0x4a2f14,
  giftGreen: 0x2f8f4a,
  giftBlue: 0x2f66b8,
  giftYellow: 0xf0c636,
  ribbonGold: 0xf2c53d,
  ribbonRed: 0xd8282e,
  deerFur: 0x8a5530,
  deerFurDark: 0x5e3820,
  deerBelly: 0xc8a070,
  hoof: 0x1c1410,
  antler: 0xd9c49a,
  rudolphNose: 0xff2a1a,
  zombieEye: 0xffd84a,
  sleighRed: 0xb81d26,
  sleighShadow: 0x7e1219,
  sleighGold: 0xe8b53a,
  runner: 0xd6d9de,
  seat: 0x1f6b3a,
  harness: 0x5a2a14,
  bell: 0xf6d24a,
})
const C = SANTA_ZOMBIE_COLORS

// Death-debris / palette lookups (EnemyDeathCollapse reads ZOMBIE_PALETTE[type]).
export const SANTA_ZOMBIE_PALETTE_ENTRIES = Object.freeze({
  XSG: Object.freeze({ body: C.coat, skin: C.skin, eye: C.zombieEye, mark: C.fur }),
  XSL: Object.freeze({ body: C.sleighRed, skin: C.deerFur, eye: C.rudolphNose, mark: C.sleighGold }),
})

// ── Block tables ────────────────────────────────────────────────────────────
// Block row: [name, size, position (part-local), hex, emissive, outlineScale, rotation?]
// emissive = glow as a fraction of the block's own colour (ZBlock uses 0.04-0.14; glowing
// eyes/nose ~0.9-1.2).
const B = (name, size, position, hex, emissive = 0.1, outline = 1.05, rotation = null) => [name, size, position, hex, emissive, outline, rotation]

// Santa head shared by both types. Head centre at the part pivot; face plane on the front
// (+Z = 0.23); beard and moustache cover the lower face.
const SANTA_HEAD_BLOCKS = [
  B('head', [0.52, 0.48, 0.46], [0, 0, 0], C.skin, 0.08, 1.08),
  B('nose', [0.09, 0.08, 0.06], [0, -0.03, 0.255], C.santaNose, 0.14, 1.0),
  B('moustacheL', [0.17, 0.065, 0.06], [-0.085, -0.085, 0.255], C.beard, 0.12, 1.0, [0, 0, 0.18]),
  B('moustacheR', [0.17, 0.065, 0.06], [0.085, -0.085, 0.255], C.beard, 0.12, 1.0, [0, 0, -0.18]),
  B('beard', [0.54, 0.20, 0.14], [0, -0.19, 0.19], C.beard, 0.12, 1.05),
  B('beardSideL', [0.08, 0.26, 0.30], [-0.25, -0.08, 0.06], C.beard, 0.12, 1.03),
  B('beardSideR', [0.08, 0.26, 0.30], [0.25, -0.08, 0.06], C.beard, 0.12, 1.03),
  B('beardPoint', [0.32, 0.16, 0.13], [0, -0.33, 0.17], C.beard, 0.12, 1.04),
  B('hatBand', [0.58, 0.11, 0.50], [0, 0.25, 0], C.fur, 0.12, 1.05),
  B('hat1', [0.48, 0.14, 0.42], [0, 0.36, -0.02], C.coat, 0.1, 1.05),
  B('hat2', [0.36, 0.13, 0.32], [0.02, 0.47, -0.07], C.coat, 0.1, 1.04, [-0.12, 0, -0.08]),
  B('hat3', [0.24, 0.12, 0.22], [0.07, 0.55, -0.15], C.coat, 0.1, 1.04, [-0.32, 0, -0.18]),
  B('hatTip', [0.15, 0.10, 0.15], [0.13, 0.57, -0.25], C.coat, 0.1, 1.04, [-0.6, 0, -0.3]),
  B('pomPom', [0.16, 0.16, 0.16], [0.18, 0.55, -0.33], C.fur, 0.14, 1.05, [0.3, 0.4, 0]),
]

// Coat torso shared by both types (body pivot at the torso centre).
const SANTA_TORSO_BLOCKS = [
  B('coat', [0.60, 0.60, 0.42], [0, 0, 0], C.coat, 0.1, 1.08),
  B('collarFur', [0.64, 0.08, 0.46], [0, 0.28, 0], C.fur, 0.12, 1.02),
  B('frontFur', [0.11, 0.54, 0.05], [0, 0.0, 0.225], C.fur, 0.12, 1.0),
  B('hemFur', [0.66, 0.09, 0.47], [0, -0.28, 0], C.fur, 0.12, 1.02),
  B('belt', [0.65, 0.085, 0.465], [0, -0.10, 0], C.belt, 0.04, 1.02),
  B('buckle', [0.15, 0.12, 0.05], [0, -0.10, 0.245], C.buckle, 0.3, 1.0),
  B('buckleHole', [0.07, 0.05, 0.03], [0, -0.10, 0.27], C.belt, 0.02, 1.0),
  // zombie touch: torn coat showing green skin.
  B('tearSkin', [0.11, 0.13, 0.04], [0.19, 0.10, 0.22], C.skinShadow, 0.06, 1.0, [0, 0, 0.3]),
]

const santaArm = (side) => [
  B(`sleeve${side}`, [0.20, 0.48, 0.20], [0, -0.24, 0], C.coat, 0.09, 1.05),
  B(`cuff${side}`, [0.23, 0.08, 0.23], [0, -0.46, 0], C.fur, 0.12, 1.02),
  B(`hand${side}`, [0.18, 0.16, 0.18], [0, -0.57, 0], C.skin, 0.08, 1.03),
]

const santaLeg = (side) => [
  B(`pants${side}`, [0.22, 0.34, 0.26], [0, -0.17, 0], C.coat, 0.09, 1.05),
  B(`bootCuff${side}`, [0.27, 0.065, 0.31], [0, -0.35, 0.01], C.fur, 0.12, 1.02),
  B(`boot${side}`, [0.25, 0.20, 0.29], [0, -0.47, 0.01], C.boot, 0.04, 1.04),
  B(`bootToe${side}`, [0.25, 0.09, 0.38], [0, -0.575, 0.06], C.boot, 0.04, 1.03),
]

// XSG rig. Part pivots/rest rotations follow the shared box zombie (head 0.84, body 0.28,
// shoulders +-0.40/0.52, hips +-0.15/0). Right arm is raised up and back over the shoulder
// gripping the sack neck; the sack hangs on the back from that hand.
export const SANTA_SACK_RIG = Object.freeze({
  head: { pivot: [0, 0.84, 0], rot: [0, 0, 0], blocks: SANTA_HEAD_BLOCKS },
  body: { pivot: [0, 0.28, 0], rot: [0, 0, 0], blocks: SANTA_TORSO_BLOCKS },
  armL: { pivot: [-0.40, 0.52, 0], rot: [-1.15, 0, 0.12], blocks: santaArm('L') },
  armR: { pivot: [0.40, 0.52, 0], rot: [2.55, 0, -0.18], blocks: santaArm('R') },
  legL: { pivot: [-0.15, 0, 0], rot: [0, 0, 0], blocks: santaLeg('L') },
  legR: { pivot: [0.15, 0, 0], rot: [0, 0, 0], blocks: santaLeg('R') },
  sack: {
    pivot: [0.30, 0.98, -0.30],
    rot: [0, 0, 0],
    blocks: [
      B('sackNeck', [0.16, 0.14, 0.16], [0, -0.02, 0], C.sack, 0.08, 1.04),
      B('sackTie', [0.20, 0.055, 0.20], [0, -0.10, 0], C.sackTie, 0.04, 1.02),
      B('sackShoulder', [0.46, 0.26, 0.42], [-0.16, -0.25, -0.14], C.sack, 0.08, 1.05),
      B('sackBody', [0.82, 0.70, 0.60], [-0.26, -0.62, -0.24], C.sack, 0.08, 1.06),
      B('sackBottom', [0.70, 0.14, 0.52], [-0.26, -1.00, -0.24], C.sackShadow, 0.06, 1.04),
      B('sackPatch', [0.18, 0.16, 0.04], [-0.42, -0.56, -0.55], C.sackShadow, 0.05, 1.0, [0, 0, 0.25]),
      // a gift box bursting out of a tear on the outer side of the sack (reads from the top-down camera)
      B('giftBox', [0.28, 0.26, 0.26], [0.16, -0.50, -0.26], C.giftGreen, 0.12, 1.05, [0.1, -0.25, -0.42]),
      B('giftRibbonA', [0.29, 0.06, 0.27], [0.16, -0.50, -0.26], C.ribbonGold, 0.3, 1.0, [0.1, -0.25, -0.42]),
      B('giftRibbonB', [0.06, 0.27, 0.27], [0.16, -0.50, -0.26], C.ribbonGold, 0.3, 1.0, [0.1, -0.25, -0.42]),
      B('giftBow', [0.15, 0.08, 0.11], [0.23, -0.35, -0.24], C.ribbonRed, 0.25, 1.02, [0.1, -0.25, -0.42]),
    ],
  },
})

// XSL: a sleigh pulled by Rudolph. Built along +Z (reindeer in front), then the whole
// model is shifted back so its footprint is centred on the entity position.
export const SANTA_SLEIGH_CENTER_SHIFT_Z = -0.62
const deerLeg = (name) => [
  B(`${name}Upper`, [0.12, 0.32, 0.14], [0, -0.16, 0], C.deerFur, 0.08, 1.05),
  B(`${name}Lower`, [0.09, 0.26, 0.11], [0, -0.42, 0], C.deerFurDark, 0.06, 1.04),
  B(`${name}Hoof`, [0.12, 0.08, 0.14], [0, -0.58, 0.01], C.hoof, 0.03, 1.03),
]
const SLEIGH_SANTA_TORSO_BLOCKS = SANTA_TORSO_BLOCKS.concat([
  // seated legs (thighs forward, shins down, boots on the footboard)
  B('thighL', [0.21, 0.18, 0.40], [-0.14, -0.26, 0.20], C.coat, 0.09, 1.04),
  B('thighR', [0.21, 0.18, 0.40], [0.14, -0.26, 0.20], C.coat, 0.09, 1.04),
  B('shinL', [0.20, 0.30, 0.20], [-0.14, -0.42, 0.38], C.coat, 0.09, 1.04),
  B('shinR', [0.20, 0.30, 0.20], [0.14, -0.42, 0.38], C.coat, 0.09, 1.04),
  B('bootL', [0.23, 0.14, 0.30], [-0.14, -0.58, 0.44], C.boot, 0.04, 1.03),
  B('bootR', [0.23, 0.14, 0.30], [0.14, -0.58, 0.44], C.boot, 0.04, 1.03),
])
export const SANTA_SLEIGH_RIG = Object.freeze({
  sleigh: {
    pivot: [0, 0, 0],
    rot: [0, 0, 0],
    blocks: [
      // runners (silver) with curled fronts
      B('runnerL', [0.07, 0.07, 1.56], [-0.40, -0.585, -0.32], C.runner, 0.12, 1.04),
      B('runnerR', [0.07, 0.07, 1.56], [0.40, -0.585, -0.32], C.runner, 0.12, 1.04),
      B('runnerCurlL', [0.07, 0.26, 0.07], [-0.40, -0.47, 0.47], C.runner, 0.12, 1.04, [-0.35, 0, 0]),
      B('runnerCurlR', [0.07, 0.26, 0.07], [0.40, -0.47, 0.47], C.runner, 0.12, 1.04, [-0.35, 0, 0]),
      B('runnerTipL', [0.07, 0.07, 0.16], [-0.40, -0.35, 0.47], C.runner, 0.12, 1.03),
      B('runnerTipR', [0.07, 0.07, 0.16], [0.40, -0.35, 0.47], C.runner, 0.12, 1.03),
      B('strutFL', [0.05, 0.20, 0.05], [-0.40, -0.46, 0.08], C.sleighGold, 0.2, 1.02),
      B('strutFR', [0.05, 0.20, 0.05], [0.40, -0.46, 0.08], C.sleighGold, 0.2, 1.02),
      B('strutBL', [0.05, 0.20, 0.05], [-0.40, -0.46, -0.78], C.sleighGold, 0.2, 1.02),
      B('strutBR', [0.05, 0.20, 0.05], [0.40, -0.46, -0.78], C.sleighGold, 0.2, 1.02),
      // sled body
      B('bed', [0.90, 0.24, 1.26], [0, -0.26, -0.34], C.sleighRed, 0.1, 1.06),
      B('sideL', [0.09, 0.36, 1.26], [-0.45, 0.0, -0.34], C.sleighRed, 0.1, 1.04),
      B('sideR', [0.09, 0.36, 1.26], [0.45, 0.0, -0.34], C.sleighRed, 0.1, 1.04),
      B('sideTrimL', [0.11, 0.05, 1.28], [-0.45, 0.19, -0.34], C.sleighGold, 0.25, 1.02),
      B('sideTrimR', [0.11, 0.05, 1.28], [0.45, 0.19, -0.34], C.sleighGold, 0.25, 1.02),
      B('sideSwirlL', [0.03, 0.14, 0.36], [-0.50, -0.04, -0.34], C.sleighGold, 0.25, 1.0),
      B('sideSwirlR', [0.03, 0.14, 0.36], [0.50, -0.04, -0.34], C.sleighGold, 0.25, 1.0),
      B('backrest', [0.90, 0.62, 0.11], [0, 0.10, -0.97], C.sleighRed, 0.1, 1.05),
      B('backCurl', [0.94, 0.11, 0.17], [0, 0.44, -0.93], C.sleighGold, 0.25, 1.03, [0.35, 0, 0]),
      B('dash', [0.90, 0.40, 0.11], [0, -0.02, 0.27], C.sleighShadow, 0.08, 1.04),
      B('dashCurl', [0.94, 0.11, 0.20], [0, 0.20, 0.33], C.sleighGold, 0.25, 1.03, [-0.4, 0, 0]),
      B('seat', [0.74, 0.10, 0.42], [0, -0.09, -0.66], C.seat, 0.1, 1.02),
      // gift pile behind Santa (colourful from the top-down camera)
      B('giftA', [0.32, 0.30, 0.30], [-0.20, 0.06, -0.80], C.giftGreen, 0.12, 1.05, [0, 0.2, 0]),
      B('giftARibbon', [0.33, 0.31, 0.06], [-0.20, 0.06, -0.80], C.ribbonRed, 0.25, 1.0, [0, 0.2, 0]),
      B('giftB', [0.26, 0.24, 0.26], [0.22, 0.04, -0.82], C.giftBlue, 0.12, 1.05, [0, -0.3, 0]),
      B('giftBRibbon', [0.06, 0.25, 0.27], [0.22, 0.04, -0.82], C.ribbonGold, 0.3, 1.0, [0, -0.3, 0]),
      B('giftC', [0.24, 0.22, 0.24], [0.02, 0.30, -0.84], C.giftYellow, 0.14, 1.05, [0.1, 0.5, 0.08]),
      B('giftCBow', [0.14, 0.07, 0.10], [0.02, 0.44, -0.84], C.ribbonRed, 0.25, 1.02, [0.1, 0.5, 0.08]),
      // shafts and reins to Rudolph
      B('shaftL', [0.05, 0.05, 0.86], [-0.30, -0.16, 0.74], C.harness, 0.05, 1.02, [-0.1, 0, 0]),
      B('shaftR', [0.05, 0.05, 0.86], [0.30, -0.16, 0.74], C.harness, 0.05, 1.02, [-0.1, 0, 0]),
      B('reinL', [0.03, 0.03, 1.12], [-0.17, 0.20, 0.62], C.harness, 0.05, 1.0, [0.16, 0.1, 0]),
      B('reinR', [0.03, 0.03, 1.12], [0.17, 0.20, 0.62], C.harness, 0.05, 1.0, [0.16, -0.1, 0]),
    ],
  },
  santaBody: { pivot: [0, 0.30, -0.42], rot: [0.06, 0, 0], blocks: SLEIGH_SANTA_TORSO_BLOCKS },
  santaHead: { pivot: [0, 0.86, -0.44], rot: [0, 0, 0], blocks: SANTA_HEAD_BLOCKS },
  santaArmL: { pivot: [-0.40, 0.54, -0.42], rot: [-1.05, 0, 0.20], blocks: santaArm('L') },
  santaArmR: { pivot: [0.40, 0.54, -0.42], rot: [-1.05, 0, -0.20], blocks: santaArm('R') },
  deerBody: {
    pivot: [0, 0.22, 1.36],
    rot: [0, 0, 0],
    blocks: [
      B('deerTorso', [0.44, 0.40, 0.96], [0, 0, 0], C.deerFur, 0.09, 1.07),
      B('deerBelly', [0.36, 0.10, 0.80], [0, -0.18, 0], C.deerBelly, 0.1, 1.02),
      B('deerChest', [0.38, 0.30, 0.16], [0, -0.02, 0.48], C.deerBelly, 0.1, 1.03),
      B('deerNeck', [0.24, 0.42, 0.26], [0, 0.30, 0.40], C.deerFur, 0.09, 1.05, [0.5, 0, 0]),
      B('deerTail', [0.12, 0.12, 0.08], [0, 0.14, -0.50], C.fur, 0.14, 1.03, [-0.4, 0, 0]),
      B('collar', [0.48, 0.10, 0.14], [0, 0.10, 0.36], C.ribbonRed, 0.2, 1.03, [0.5, 0, 0]),
      B('bellL', [0.09, 0.09, 0.09], [-0.18, 0.02, 0.46], C.bell, 0.4, 1.02),
      B('bellM', [0.09, 0.09, 0.09], [0, -0.02, 0.50], C.bell, 0.4, 1.02),
      B('bellR', [0.09, 0.09, 0.09], [0.18, 0.02, 0.46], C.bell, 0.4, 1.02),
      B('harnessBand', [0.46, 0.06, 0.08], [0, 0.0, -0.18], C.harness, 0.05, 1.02),
      // zombie touch: exposed rib patch
      B('ribPatch', [0.04, 0.16, 0.26], [0.225, 0.02, 0.08], C.skinShadow, 0.06, 1.0),
    ],
  },
  deerHead: {
    pivot: [0, 0.62, 1.86],
    rot: [0, 0, 0],
    blocks: [
      B('deerHead', [0.30, 0.28, 0.36], [0, 0, 0], C.deerFur, 0.09, 1.07),
      B('deerSnout', [0.22, 0.18, 0.22], [0, -0.05, 0.25], C.deerBelly, 0.1, 1.04),
      // RUDOLPH'S NOSE: full self-glow (vertex emissive) + halo sphere at runtime.
      B('rudolphNose', [0.14, 0.13, 0.12], [0, -0.01, 0.39], C.rudolphNose, 1.25, 1.03),
      B('deerEyeL', [0.05, 0.07, 0.06], [-0.155, 0.05, 0.10], C.zombieEye, 0.95, 1.0),
      B('deerEyeR', [0.05, 0.07, 0.06], [0.155, 0.05, 0.10], C.zombieEye, 0.95, 1.0),
      B('deerEarL', [0.14, 0.06, 0.09], [-0.20, 0.12, -0.06], C.deerFurDark, 0.06, 1.03, [0, 0, 0.5]),
      B('deerEarR', [0.14, 0.06, 0.09], [0.20, 0.12, -0.06], C.deerFurDark, 0.06, 1.03, [0, 0, -0.5]),
      B('antlerL', [0.05, 0.30, 0.05], [-0.10, 0.28, -0.08], C.antler, 0.12, 1.03, [-0.2, 0, 0.35]),
      B('antlerR', [0.05, 0.30, 0.05], [0.10, 0.28, -0.08], C.antler, 0.12, 1.03, [-0.2, 0, -0.35]),
      B('antlerTineL1', [0.15, 0.045, 0.045], [-0.22, 0.34, -0.10], C.antler, 0.12, 1.02, [0, 0, -0.5]),
      B('antlerTineR1', [0.15, 0.045, 0.045], [0.22, 0.34, -0.10], C.antler, 0.12, 1.02, [0, 0, 0.5]),
      B('antlerTineL2', [0.045, 0.14, 0.045], [-0.17, 0.44, -0.02], C.antler, 0.12, 1.02, [0.3, 0, 0.1]),
      B('antlerTineR2', [0.045, 0.14, 0.045], [0.17, 0.44, -0.02], C.antler, 0.12, 1.02, [0.3, 0, -0.1]),
    ],
  },
  deerLegFL: { pivot: [-0.15, 0.08, 1.70], rot: [0, 0, 0], blocks: deerLeg('legFL') },
  deerLegFR: { pivot: [0.15, 0.08, 1.70], rot: [0, 0, 0], blocks: deerLeg('legFR') },
  deerLegBL: { pivot: [-0.15, 0.08, 1.02], rot: [0, 0, 0], blocks: deerLeg('legBL') },
  deerLegBR: { pivot: [0.15, 0.08, 1.02], rot: [0, 0, 0], blocks: deerLeg('legBR') },
})
export const SANTA_SLEIGH_NOSE_LOCAL = Object.freeze([0, -0.01, 0.39])

// ── Merged-part geometry ────────────────────────────────────────────────────
const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _e = new THREE.Euler()
const _p = new THREE.Vector3(); const _s = new THREE.Vector3(); const _c = new THREE.Color()

function blockGeometry(size) {
  const base = getCachedChamferedBoxGeo(size[0], size[1], size[2], 1)
  return base.index ? base.toNonIndexed() : base.clone()
}

// One body geometry (position, normal, color, aGlow) + one outline hull geometry per part.
export function buildSantaPartGeometry(blocks) {
  const bodies = []; const outlines = []
  for (const [, size, position, hex, emissive, outlineScale, rotation] of blocks) {
    _e.set(rotation ? rotation[0] : 0, rotation ? rotation[1] : 0, rotation ? rotation[2] : 0, 'XYZ')
    _q.setFromEuler(_e)
    _p.set(position[0], position[1], position[2])

    const body = blockGeometry(size)
    body.deleteAttribute('uv')
    _m.compose(_p, _q, _s.set(1, 1, 1)); body.applyMatrix4(_m)
    const count = body.attributes.position.count
    const colors = new Float32Array(count * 3); const glow = new Float32Array(count)
    _c.setHex(hex)
    for (let i = 0; i < count; i += 1) { colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b; glow[i] = emissive }
    body.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    body.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1))
    bodies.push(body)

    const hull = blockGeometry(size)
    hull.deleteAttribute('uv'); hull.deleteAttribute('normal')
    const os = inflateScale(outlineScale)
    _m.compose(_p, _q, _s.set(os, os, os)); hull.applyMatrix4(_m)
    outlines.push(hull)
  }
  const body = mergeGeometries(bodies, false); const outline = mergeGeometries(outlines, false)
  for (const g of bodies) g.dispose()
  for (const g of outlines) g.dispose()
  body.computeBoundingSphere(); outline.computeBoundingSphere()
  return { body, outline, blockCount: blocks.length }
}

const _partGeometryCache = new Map()
function getPartGeometry(cacheKey, blocks) {
  let entry = _partGeometryCache.get(cacheKey)
  if (!entry) { entry = buildSantaPartGeometry(blocks); _partGeometryCache.set(cacheKey, entry) }
  return entry
}

// Toon material that reads per-vertex colour and per-vertex glow. Emissive = vertex colour x
// aGlow, the same "own colour x intensity" rule ZBlock/getCachedToonMat use. Stencil setup is
// identical to toon.js so the shared outline hull only draws on the silhouette.
let _santaToonMat = null
export function getSantaToonMaterial() {
  if (_santaToonMat) return _santaToonMat
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: getToonGradient(), emissive: 0xffffff, emissiveIntensity: 1 })
  m.stencilWrite = true
  m.stencilRef = 1
  m.stencilFunc = THREE.AlwaysStencilFunc
  m.stencilZPass = THREE.ReplaceStencilOp
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float aGlow;\nvarying float vSantaGlow;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSantaGlow = aGlow;')
    shader.fragmentShader = `varying float vSantaGlow;\n${shader.fragmentShader}`
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor.rgb * vSantaGlow;')
  }
  m.customProgramCacheKey = () => 'santa-zombie-vertex-glow-v1'
  m.userData.santaZombieMaterial = true
  return m
}

function SantaPart({ partKey, cacheKey, def, partRef, children = null }) {
  const geometry = getPartGeometry(cacheKey, def.blocks)
  return (
    <group ref={partRef} name={`santa-${partKey}`} position={def.pivot} rotation={def.rot}>
      <mesh name={`santa-${partKey}-outline`} renderOrder={1} geometry={geometry.outline} material={getSharedOutlineMat()} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
      <mesh name={`santa-${partKey}-body`} renderOrder={2} geometry={geometry.body} material={getSantaToonMaterial()} userData={{ santaBody: true, studioNonTunable: true }} />
      {children}
    </group>
  )
}

// ── SDF face (E07 approach: UV distance fields, no texture) ─────────────────
// Eyes/brows/cheeks only; the beard and moustache blocks cover the mouth. uPanic 0..1 widens
// the eyes, shrinks the pupils and lifts the bushy white brows (fleeing / spooked look).
const FACE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
export const SANTA_FACE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uPanic;
  varying vec2 vUv;

  float softCircle(vec2 point, vec2 center, vec2 radius) {
    vec2 normalized = (point - center) / radius;
    return 1.0 - smoothstep(0.82, 1.0, dot(normalized, normalized));
  }

  float softLine(vec2 point, vec2 start, vec2 end, float width) {
    vec2 segment = end - start;
    float projection = clamp(dot(point - start, segment) / dot(segment, segment), 0.0, 1.0);
    return 1.0 - smoothstep(width * 0.7, width, length(point - (start + segment * projection)));
  }

  void main() {
    // plane is 0.50 x 0.30: work in width units so circles stay round.
    vec2 point = (vUv - 0.5) * vec2(1.0, 0.6);
    float blink = pow(max(0.0, sin(uTime * 0.8 + 1.3)), 24.0) * (1.0 - uPanic);
    float eyeH = mix(mix(0.062, 0.088, uPanic), 0.008, blink);
    float eyeW = mix(0.082, 0.095, uPanic);
    vec2 eyeL = vec2(-0.19, 0.005);
    vec2 eyeR = vec2(0.19, 0.005);
    float sockets = softCircle(point, eyeL, vec2(eyeW + 0.035, eyeH + 0.03)) + softCircle(point, eyeR, vec2(eyeW + 0.035, eyeH + 0.03));
    float eyes = softCircle(point, eyeL, vec2(eyeW, eyeH)) + softCircle(point, eyeR, vec2(eyeW, eyeH));
    float look = sin(uTime * 0.6) * 0.018 * (1.0 - uPanic);
    float pupilR = mix(0.03, 0.017, uPanic);
    float pupils = softCircle(point, eyeL + vec2(look, -0.004), vec2(pupilR, min(pupilR, eyeH * 0.7)))
      + softCircle(point, eyeR + vec2(look, -0.004), vec2(pupilR, min(pupilR, eyeH * 0.7)));
    // bushy white brows: menacing (inner ends down) -> panic (inner ends up)
    float innerY = mix(0.075, 0.135, uPanic);
    float outerY = mix(0.125, 0.105, uPanic);
    float brows = softLine(point, vec2(-0.33, outerY), vec2(-0.09, innerY), 0.038)
      + softLine(point, vec2(0.09, innerY), vec2(0.33, outerY), 0.038);
    float cheeks = softCircle(point, vec2(-0.31, -0.105), vec2(0.075, 0.05)) + softCircle(point, vec2(0.31, -0.105), vec2(0.075, 0.05));
    float scar = softLine(point, vec2(0.05, 0.145), vec2(0.14, 0.10), 0.011) + softLine(point, vec2(0.075, 0.105), vec2(0.115, 0.145), 0.009);

    float socketMask = clamp(sockets, 0.0, 1.0);
    float eyeMask = clamp(eyes, 0.0, 1.0);
    float browMask = clamp(brows, 0.0, 1.0);
    float cheekMask = clamp(cheeks, 0.0, 1.0) * 0.55;
    float scarMask = clamp(scar, 0.0, 1.0);
    vec3 color = vec3(0.16, 0.08, 0.16);
    color = mix(color, vec3(0.86, 0.36, 0.40), cheekMask);
    color = mix(color, vec3(1.0, 0.88, 0.34), eyeMask);
    color = mix(color, vec3(0.7, 0.04, 0.05), clamp(pupils, 0.0, 1.0));
    color = mix(color, vec3(0.97, 0.96, 0.92), browMask);
    color = mix(color, vec3(0.45, 0.07, 0.10), scarMask);
    float alpha = max(max(socketMask * 0.55, eyeMask), max(max(browMask, cheekMask), scarMask));
    gl_FragColor = vec4(color, alpha);
  }
`

function SantaFace({ materialRef }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPanic: { value: 0 } }), [])
  return (
    <mesh name="santa-procedural-face" position={[0, 0.04, 0.236]} renderOrder={3} raycast={disableRaycast} userData={{ studioNonFocusable: true, studioNonTunable: true }}>
      <planeGeometry args={[0.50, 0.30]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={FACE_VERTEX_SHADER} fragmentShader={SANTA_FACE_FRAGMENT_SHADER} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// Soft additive halo around Rudolph's nose (view-facing falloff on a small sphere).
const HALO_VERTEX_SHADER = `
  varying float vFacing;
  void main() {
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(n.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const HALO_FRAGMENT_SHADER = `
  uniform float uIntensity;
  varying float vFacing;
  void main() {
    float a = pow(vFacing, 2.2) * uIntensity;
    gl_FragColor = vec4(vec3(1.0, 0.16, 0.08) * a, a);
  }
`
function NoseHalo({ materialRef }) {
  const uniforms = useMemo(() => ({ uIntensity: { value: 0.7 } }), [])
  return (
    <mesh name="rudolph-nose-halo" position={SANTA_SLEIGH_NOSE_LOCAL} renderOrder={4} raycast={disableRaycast} userData={{ studioNonFocusable: true, studioNonTunable: true }}>
      <sphereGeometry args={[0.2, 12, 8]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={HALO_VERTEX_SHADER} fragmentShader={HALO_FRAGMENT_SHADER} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

// ── Pure pose functions (also used by tests) ───────────────────────────────
// Rotations are absolute part rotations [x, y, z]; offsets are added to the rest pivot.
export function getSantaSackPose(t, fleeing) {
  if (!fleeing) {
    // Wander: slow sneaky waddle, head scanning left/right, sack swaying.
    const step = Math.sin(t * 5.5)
    return {
      rootY: 0,
      body: [0.06, 0, step * 0.05], bodyY: Math.abs(step) * 0.02,
      head: [0, Math.sin(t * 1.1) * 0.45, Math.sin(t * 1.6) * 0.06],
      armL: [-1.15 + Math.sin(t * 2.8) * 0.08, 0, 0.12],
      armR: [2.55 + step * 0.05, 0, -0.18],
      legL: [step * 0.34, 0, 0], legR: [-step * 0.34, 0, 0],
      sack: [Math.sin(t * 5.5) * 0.06, 0, Math.sin(t * 2.75) * 0.08], sackY: 0,
      panic: 0,
    }
  }
  // Flee: fast scramble, leaning forward, looking back over the shoulder, free arm
  // flailing overhead, sack bouncing hard, little hops.
  const s = Math.sin(t * 14)
  return {
    rootY: Math.abs(s) * 0.10,
    body: [0.42, 0, s * 0.08], bodyY: 0,
    head: [-0.15, 0.95 + Math.sin(t * 3) * 0.25, s * 0.05],
    armL: [-2.6 + Math.sin(t * 14 + 0.6) * 0.6, 0, 0.55],
    armR: [2.75 + s * 0.12, 0, -0.22],
    legL: [s * 0.95, 0, 0], legR: [-s * 0.95, 0, 0],
    sack: [-0.25 + Math.sin(t * 14 + 1) * 0.25, 0, Math.sin(t * 7) * 0.18], sackY: Math.abs(s) * 0.06,
    panic: 1,
  }
}

export function getSantaSleighPose(t) {
  const g = t * 10.5
  return {
    legFL: Math.sin(g) * 0.8, legFR: Math.sin(g - 0.5) * 0.8,
    legBL: Math.sin(g + 2.4) * 0.72, legBR: Math.sin(g + 2.9) * 0.72,
    deerBodyX: Math.sin(g) * 0.08, deerBodyY: Math.sin(g + 1.2) * 0.045,
    deerHeadX: -Math.sin(g) * 0.12,
    sleighZ: Math.sin(t * 3.1) * 0.025, sleighY: Math.sin(t * 6.2) * 0.015,
    santaHead: [0, Math.sin(t * 0.9) * 0.2, Math.sin(t * 3.1) * 0.06],
    santaArmL: -1.05 + Math.sin(t * 5.2) * 0.10, santaArmR: -1.05 + Math.sin(t * 5.2 + 0.4) * 0.10,
    noseGlow: 0.62 + Math.sin(t * 5) * 0.22,
  }
}

// Flee hysteresis on world speed (units/s): E08-style wander ~0.34-0.63, flee ~1.19.
export const SANTA_SACK_FLEE_ENTER_SPEED = 0.9
export const SANTA_SACK_FLEE_EXIT_SPEED = 0.7
export function resolveSantaSackFleeing(previous, speed, hint) {
  if (hint === true || hint === false) return hint
  if (previous) return speed > SANTA_SACK_FLEE_EXIT_SPEED
  return speed > SANTA_SACK_FLEE_ENTER_SPEED
}

const lerp = (a, b, k) => a + (b - a) * k
function setRot(obj, r) { if (obj) obj.rotation.set(r[0], r[1], r[2]) }

// Body-mesh hit flash: swap the merged toon meshes to the shared white flash material.
function collectBodyMeshes(root, out) {
  root.traverse((node) => { if (node.isMesh && node.userData.santaBody) out.push(node) })
  return out
}
function applyFlash(meshes, flashing) {
  for (let i = 0; i < meshes.length; i += 1) meshes[i].material = flashing ? getFlashMat() : getSantaToonMaterial()
}

// Measures world speed (units/s) of `group` from frame-to-frame position deltas, so no
// simulation field is needed. Returns the smoothed speed.
const _wp = new THREE.Vector3()
function measureSpeed(group, motion, delta) {
  if (!group || !(delta > 0)) return motion.speed
  group.getWorldPosition(_wp)
  if (motion.has) {
    const dx = _wp.x - motion.x; const dz = _wp.z - motion.z
    const raw = Math.hypot(dx, dz) / delta
    // teleports (pool slot reuse) read as huge speed: ignore them.
    if (raw < 20) motion.speed += (raw - motion.speed) * Math.min(1, delta * 6)
    if (Math.hypot(dx, dz) > 1e-5) motion.heading = Math.atan2(dx, dz)
  }
  motion.x = _wp.x; motion.z = _wp.z; motion.has = true
  return motion.speed
}

// Turns `turn` so the model faces its measured world travel direction, cancelling whatever
// world yaw the parent already has (Enemy.jsx may face the player, not the travel path).
function faceTravel(root, turn, motion, delta) {
  if (!root || !turn || motion.speed <= 0.05) return
  root.getWorldQuaternion(_q)
  _e.setFromQuaternion(_q, 'YXZ')
  const target = motion.heading - _e.y
  if (motion.yaw === null || motion.yaw === undefined) motion.yaw = target
  let diff = target - motion.yaw
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  motion.yaw += diff * Math.min(1, delta * 8)
  turn.rotation.y = motion.yaw
}

// stateRef (optional, pooled layer): { current: { flash, fleeing } }. Without it the mesh
// uses the hitFlash / animPhase props and its own measured speed.
export function SantaSackZombieMesh({ hitFlash = false, animPhase = 'normal', staticPose = false, stateRef = null, orientToTravel = false }) {
  const parts = useRef({})
  const reg = (key) => (node) => { if (node) parts.current[key] = node }
  const rootRef = useRef(null)
  const turnRef = useRef(null)
  const faceRef = useRef(null)
  const motion = useRef({ has: false, x: 0, z: 0, speed: 0, heading: 0, fleeing: false, blend: 0, flash: false, yaw: null })
  const bodyMeshes = useRef([])
  const rig = SANTA_SACK_RIG

  useLayoutEffect(() => {
    bodyMeshes.current = rootRef.current ? collectBodyMeshes(rootRef.current, []) : []
  }, [])
  useEffect(() => {
    if (stateRef) return
    applyFlash(bodyMeshes.current, hitFlash)
    motion.current.flash = hitFlash
  }, [hitFlash, stateRef])

  useFrame(({ clock }, delta) => {
    const m = motion.current
    if (stateRef) {
      const flash = !!stateRef.current?.flash
      if (flash !== m.flash) { applyFlash(bodyMeshes.current, flash); m.flash = flash }
    }
    if (staticPose) return
    const t = clock.getElapsedTime()
    const speed = measureSpeed(rootRef.current, m, delta)
    if (orientToTravel) faceTravel(rootRef.current, turnRef.current, m, delta)
    const hint = stateRef ? stateRef.current?.fleeing : (animPhase === 'charge' || animPhase === 'retreat' ? true : undefined)
    m.fleeing = resolveSantaSackFleeing(m.fleeing, speed, hint)
    m.blend += ((m.fleeing ? 1 : 0) - m.blend) * Math.min(1, delta * 8)
    const k = m.blend
    const a = getSantaSackPose(t, false); const b = getSantaSackPose(t, true)
    const p = parts.current
    const mix3 = (x, y) => [lerp(x[0], y[0], k), lerp(x[1], y[1], k), lerp(x[2], y[2], k)]
    if (p.inner) p.inner.position.y = lerp(a.rootY, b.rootY, k)
    if (p.body) { setRot(p.body, mix3(a.body, b.body)); p.body.position.y = rig.body.pivot[1] + lerp(a.bodyY, b.bodyY, k) }
    setRot(p.head, mix3(a.head, b.head))
    setRot(p.armL, mix3(a.armL, b.armL))
    setRot(p.armR, mix3(a.armR, b.armR))
    setRot(p.legL, mix3(a.legL, b.legL))
    setRot(p.legR, mix3(a.legR, b.legR))
    if (p.sack) { setRot(p.sack, mix3(a.sack, b.sack)); p.sack.position.y = rig.sack.pivot[1] + lerp(a.sackY, b.sackY, k) }
    const face = faceRef.current
    if (face) { face.uniforms.uTime.value = t; face.uniforms.uPanic.value = k }
  })

  return (
    <group ref={rootRef} name="santaSackZombie">
      <group ref={turnRef}>
      <group ref={reg('inner')}>
        <SantaPart partKey="head" cacheKey="XSG:head" def={rig.head} partRef={reg('head')}>
          <SantaFace materialRef={faceRef} />
        </SantaPart>
        <SantaPart partKey="body" cacheKey="XSG:body" def={rig.body} partRef={reg('body')} />
        <SantaPart partKey="sack" cacheKey="XSG:sack" def={rig.sack} partRef={reg('sack')} />
        <SantaPart partKey="armL" cacheKey="XSG:armL" def={rig.armL} partRef={reg('armL')} />
        <SantaPart partKey="armR" cacheKey="XSG:armR" def={rig.armR} partRef={reg('armR')} />
        <SantaPart partKey="legL" cacheKey="XSG:legL" def={rig.legL} partRef={reg('legL')} />
        <SantaPart partKey="legR" cacheKey="XSG:legR" def={rig.legR} partRef={reg('legR')} />
      </group>
      </group>
    </group>
  )
}

const SLEIGH_PART_KEYS = ['sleigh', 'santaBody', 'santaArmL', 'santaArmR', 'deerBody', 'deerLegFL', 'deerLegFR', 'deerLegBL', 'deerLegBR']

// The sleigh always gallops (it only ever crosses the screen). The parent decides the
// facing; pass `orientToTravel` to make the mesh turn itself toward its measured travel
// direction (used on the React special-enemy path, where the outer group may not rotate).
export function SantaSleighZombieMesh({ hitFlash = false, staticPose = false, stateRef = null, orientToTravel = false }) {
  const parts = useRef({})
  const reg = (key) => (node) => { if (node) parts.current[key] = node }
  const rootRef = useRef(null)
  const turnRef = useRef(null)
  const faceRef = useRef(null)
  const haloRef = useRef(null)
  const motion = useRef({ has: false, x: 0, z: 0, speed: 0, heading: 0, flash: false, yaw: null })
  const bodyMeshes = useRef([])
  const rig = SANTA_SLEIGH_RIG

  useLayoutEffect(() => {
    bodyMeshes.current = rootRef.current ? collectBodyMeshes(rootRef.current, []) : []
  }, [])
  useEffect(() => {
    if (stateRef) return
    applyFlash(bodyMeshes.current, hitFlash)
    motion.current.flash = hitFlash
  }, [hitFlash, stateRef])

  useFrame(({ clock }, delta) => {
    const m = motion.current
    if (stateRef) {
      const flash = !!stateRef.current?.flash
      if (flash !== m.flash) { applyFlash(bodyMeshes.current, flash); m.flash = flash }
    }
    if (staticPose) return
    const t = clock.getElapsedTime()
    measureSpeed(rootRef.current, m, delta)
    if (orientToTravel) faceTravel(rootRef.current, turnRef.current, m, delta)
    const pose = getSantaSleighPose(t)
    const p = parts.current
    if (p.deerLegFL) p.deerLegFL.rotation.x = pose.legFL
    if (p.deerLegFR) p.deerLegFR.rotation.x = pose.legFR
    if (p.deerLegBL) p.deerLegBL.rotation.x = pose.legBL
    if (p.deerLegBR) p.deerLegBR.rotation.x = pose.legBR
    if (p.deerBody) { p.deerBody.rotation.x = pose.deerBodyX; p.deerBody.position.y = rig.deerBody.pivot[1] + pose.deerBodyY }
    if (p.deerHead) { p.deerHead.rotation.x = pose.deerHeadX; p.deerHead.position.y = rig.deerHead.pivot[1] + pose.deerBodyY }
    if (p.sleigh) { p.sleigh.rotation.z = pose.sleighZ; p.sleigh.position.y = pose.sleighY }
    if (p.santaBody) p.santaBody.position.y = rig.santaBody.pivot[1] + pose.sleighY
    setRot(p.santaHead, pose.santaHead)
    if (p.santaArmL) p.santaArmL.rotation.x = pose.santaArmL
    if (p.santaArmR) p.santaArmR.rotation.x = pose.santaArmR
    const face = faceRef.current
    if (face) face.uniforms.uTime.value = t
    if (haloRef.current) haloRef.current.uniforms.uIntensity.value = pose.noseGlow
  })

  return (
    <group ref={rootRef} name="santaSleighZombie">
      <group ref={turnRef}>
        <group position={[0, 0, SANTA_SLEIGH_CENTER_SHIFT_Z]}>
          {SLEIGH_PART_KEYS.map((key) => (
            <SantaPart key={key} partKey={key} cacheKey={`XSL:${key}`} def={rig[key]} partRef={reg(key)} />
          ))}
          <SantaPart partKey="santaHead" cacheKey="XSL:santaHead" def={rig.santaHead} partRef={reg('santaHead')}>
            <SantaFace materialRef={faceRef} />
          </SantaPart>
          <SantaPart partKey="deerHead" cacheKey="XSL:deerHead" def={rig.deerHead} partRef={reg('deerHead')}>
            <NoseHalo materialRef={haloRef} />
          </SantaPart>
        </group>
      </group>
    </group>
  )
}

// Registry: type -> visual. Anything that needs to know how a Santa type is drawn reads this.
export const SANTA_ZOMBIE_VISUALS = Object.freeze({
  XSG: Object.freeze({ type: 'XSG', component: 'SantaSackZombieMesh', rootName: 'santaSackZombie', partCount: Object.keys(SANTA_SACK_RIG).length, drawCalls: Object.keys(SANTA_SACK_RIG).length * 2 + 1, states: Object.freeze(['wander', 'flee']) }),
  XSL: Object.freeze({ type: 'XSL', component: 'SantaSleighZombieMesh', rootName: 'santaSleighZombie', partCount: Object.keys(SANTA_SLEIGH_RIG).length, drawCalls: Object.keys(SANTA_SLEIGH_RIG).length * 2 + 2, states: Object.freeze(['gallop']) }),
})
export function getSantaZombieVisual(type) { return SANTA_ZOMBIE_VISUALS[type] || null }

export default function SantaZombieMesh({ type, hitFlash = false, animPhase = 'normal', staticPose = false, stateRef = null, orientToTravel = false }) {
  if (type === SANTA_SLEIGH_ZOMBIE_TYPE) return <SantaSleighZombieMesh hitFlash={hitFlash} staticPose={staticPose} stateRef={stateRef} orientToTravel={orientToTravel} />
  if (type === SANTA_SACK_ZOMBIE_TYPE) return <SantaSackZombieMesh hitFlash={hitFlash} animPhase={animPhase} staticPose={staticPose} stateRef={stateRef} orientToTravel={orientToTravel} />
  return null
}
