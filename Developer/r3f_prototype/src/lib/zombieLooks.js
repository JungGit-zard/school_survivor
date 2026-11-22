// Zombie look variants (2026-11-19, Terry: "똑같이 생긴 좀비 10마리 이상 못나오게 막아").
//
// Purely visual. Spawn counts, stats, hitboxes, timings and RNG are untouched: a zombie only gets a
// look index when the pool creates its record (enemyEntityPool.spawnInto), picked by the fewest alive
// zombies of that type per look (ties -> lowest index). No randomness is consumed. Look 0 is the
// existing look, unchanged.
//
// A look combines at least two of: clothing colour (shirt and/or trousers), headgear / hair, skin tone,
// body proportion (visual only, hitbox unchanged) and a worn accessory — the head top and the
// accessories carry most of the difference, because the game camera sees heads from above.

import { ROAD_ZOMBIE_COLORS } from './roadZombieRoster.js'

export const LOOK_ALIVE_LIMIT = 10
export const MAX_ZOMBIE_LOOKS = 16

// Worst concurrent alive per type in stages 1-6 (balanceqa 2026-11-15, 40 seeds/bot, normal/worst bots
// incl. post-exit; F:/ezs-work/backup/zombie_total_review_20261115/verify/same_summary.json). RZC = the
// 12-runner crew behind the single RZL leader (Stage 3 72 s row of 13).
// 2026-11-22 wave standard: raised to the per-type max of the stage 1-6 alive probe (6 seeds/stage, immortal
// KITE bot, 300 s; F:/ezs-work/backup/wave_standard_20261121/alive/win_stage*.json) — E03 79, E07 73, E19 94,
// E40 14, E56 11, E66 11, E74 11. Values only ever go up (E01 keeps 37 > that probe's 25).
export const ZOMBIE_MEASURED_WORST_ALIVE = Object.freeze({
  E01: 37, E02: 16, E03: 79, E04: 15, E05: 12, E06: 22, E07: 73, E08: 2, E19: 94, E20: 9, E21: 50,
  E34: 20, E35: 11, E36: 11, E37: 14, E38: 9, E39: 8, E40: 14, E41: 9, E42: 6, E43: 7, E44: 7, E45: 7,
  E46: 10, E47: 5, E48: 8, E49: 4, E50: 3, E51: 5, E52: 4, E53: 5, E54: 2, E55: 1, E56: 11, E57: 5,
  E58: 3, E59: 5, E60: 7, E61: 6, E62: 2, E63: 4, E64: 9, E65: 4, E66: 11, E67: 4, E68: 7, E69: 4,
  E70: 2, E71: 3, E72: 2, E73: 2, E74: 11, E75: 3, E76: 3, E77: 6, E78: 1, E79: 4, E80: 8, E81: 3,
  E82: 4, E83: 4, E84: 6, E85: 8, E86: 4, E87: 6, E88: 2, E89: 1, E90: 4, E91: 3, E92: 1, E93: 6,
  E94: 4, E95: 2, E96: 9, E97: 7, E98: 1, E99: 5, E100: 4, E101: 1, E102: 3, E103: 4, E104: 1,
  E105: 4, E106: 4, RZC: 12, RZG: 6, RZL: 1, RZT: 1,
})
// Types that never get variants (bosses, chiefs, Matilda, E08 and stage 7-10 sets are simply absent).
export const ZOMBIE_LOOK_EXCLUDED = Object.freeze(['E08', 'RZL'])

// ── accessories (boxes in a head or body frame; hx/hy/hz = half extents of that part) ──
// Each kind returns [{ frame, pos, size, tone }] — tone 0 = main colour, 1 = second colour.
const ACCESSORIES = {
  // hair mop + forehead fringe (stays above the eyes)
  mop: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy + 0.03, -0.01], size: [hx * 2 + 0.05, 0.14, hz * 2 + 0.05], tone: 0 },
    { frame: 'head', pos: [0, hy - 0.045, hz + 0.004], size: [hx * 2 + 0.05, 0.07, 0.06], tone: 0 },
  ],
  // three spikes on a thin cap of hair
  spiky: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy + 0.015, 0], size: [hx * 2 + 0.03, 0.06, hz * 2 + 0.03], tone: 0 },
    { frame: 'head', pos: [-hx * 0.55, hy + 0.1, 0], size: [0.12, 0.17, 0.12], tone: 0 },
    { frame: 'head', pos: [0, hy + 0.13, -0.02], size: [0.13, 0.22, 0.13], tone: 0 },
    { frame: 'head', pos: [hx * 0.55, hy + 0.1, 0], size: [0.12, 0.17, 0.12], tone: 0 },
  ],
  // hair cap + top bun at the back
  bun: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy + 0.02, -0.01], size: [hx * 2 + 0.04, 0.08, hz * 2 + 0.04], tone: 0 },
    { frame: 'head', pos: [0, hy + 0.13, -hz * 0.45], size: [0.21, 0.18, 0.2], tone: 0 },
  ],
  // baseball cap: crown + forward brim
  cap: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy + 0.05, 0], size: [hx * 2 + 0.04, 0.11, hz * 2 + 0.04], tone: 0 },
    { frame: 'head', pos: [0, hy + 0.005, hz + 0.1], size: [hx * 1.4, 0.035, 0.22], tone: 0 },
  ],
  // knitted beanie + pom
  beanie: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy + 0.06, 0], size: [hx * 2 + 0.05, 0.18, hz * 2 + 0.05], tone: 0 },
    { frame: 'head', pos: [0, hy + 0.2, 0], size: [0.14, 0.12, 0.14], tone: 1 },
  ],
  // headband round the forehead
  band: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy - 0.07, 0], size: [hx * 2 + 0.05, 0.08, hz * 2 + 0.05], tone: 0 },
  ],
  // long hair at the back and sides (worn under an existing cap, e.g. E19)
  longhair: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, 0, -hz - 0.035], size: [hx * 2 + 0.05, hy * 1.7, 0.08], tone: 0 },
    { frame: 'head', pos: [-hx - 0.025, -0.01, -0.03], size: [0.06, hy * 1.5, hz * 1.6], tone: 0 },
    { frame: 'head', pos: [hx + 0.025, -0.01, -0.03], size: [0.06, hy * 1.5, hz * 1.6], tone: 0 },
  ],
  // backpack on the body
  bag: ({ bx, by, bz }) => [
    { frame: 'body', pos: [0, by * 0.12, -bz - 0.09], size: [bx * 1.45, by * 1.35, 0.17], tone: 0 },
    { frame: 'body', pos: [0, by * 0.62, -bz - 0.17], size: [bx * 1.1, 0.09, 0.05], tone: 1 },
  ],
  // scarf round the neck with a hanging tail
  scarf: ({ bx, by, bz }) => [
    { frame: 'body', pos: [0, by - 0.035, 0], size: [bx * 2 + 0.06, 0.1, bz * 2 + 0.06], tone: 0 },
    { frame: 'body', pos: [bx * 0.42, by - 0.2, bz + 0.035], size: [0.11, 0.24, 0.05], tone: 0 },
  ],
  // ── 2026-11-22 fodder variety (wave standard: one species ~70 % on screen) ──
  // glasses: rim bars above and below the eyes + temple arms — the eyes stay visible between the bars.
  // Only for box heads with eyes at +0.04 (E01/E03 STANDARD, E19); never over a shader face (E07, E46-E70).
  glasses: ({ hx, hz }) => [
    { frame: 'head', pos: [0, 0.115, hz + 0.018], size: [hx * 1.55, 0.035, 0.03], tone: 0 },
    { frame: 'head', pos: [0, -0.03, hz + 0.018], size: [hx * 1.55, 0.025, 0.03], tone: 0 },
    { frame: 'head', pos: [-hx - 0.012, 0.09, -0.01], size: [0.025, 0.03, hz * 2], tone: 0 },
    { frame: 'head', pos: [hx + 0.012, 0.09, -0.01], size: [0.025, 0.03, hz * 2], tone: 0 },
  ],
  // headphones: band over the crown + two ear cups (cups in colour 2)
  headphones: ({ hx, hy }) => [
    { frame: 'head', pos: [0, hy + 0.035, -0.02], size: [hx * 2 + 0.1, 0.05, 0.1], tone: 0 },
    { frame: 'head', pos: [-hx - 0.045, 0, -0.02], size: [0.09, 0.22, 0.2], tone: 1 },
    { frame: 'head', pos: [hx + 0.045, 0, -0.02], size: [0.09, 0.22, 0.2], tone: 1 },
  ],
  // hair ribbon on one side of the crown: knot (colour 2) + two loops
  bow: ({ hx, hy }) => [
    { frame: 'head', pos: [hx * 0.42, hy + 0.06, -0.03], size: [0.07, 0.08, 0.07], tone: 1 },
    { frame: 'head', pos: [hx * 0.42 - 0.1, hy + 0.07, -0.03], size: [0.13, 0.11, 0.06], tone: 0 },
    { frame: 'head', pos: [hx * 0.42 + 0.1, hy + 0.07, -0.03], size: [0.13, 0.11, 0.06], tone: 0 },
  ],
  // thin hair cap + two side bunches
  pigtails: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy + 0.02, -0.01], size: [hx * 2 + 0.04, 0.07, hz * 2 + 0.04], tone: 0 },
    { frame: 'head', pos: [-hx - 0.07, -0.02, -hz * 0.3], size: [0.13, 0.22, 0.13], tone: 0 },
    { frame: 'head', pos: [hx + 0.07, -0.02, -hz * 0.3], size: [0.13, 0.22, 0.13], tone: 0 },
  ],
  // school necktie down the shirt front (knot in colour 2)
  tie: ({ by, bz }) => [
    { frame: 'body', pos: [0, by - 0.05, bz + 0.016], size: [0.11, 0.08, 0.035], tone: 1 },
    { frame: 'body', pos: [0, by * 0.3, bz + 0.012], size: [0.09, by * 1.05, 0.025], tone: 0 },
  ],
  // hoodie hood hanging behind the head
  hood: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, -hy * 0.25, -hz - 0.06], size: [hx * 2 + 0.08, hy * 1.4, 0.13], tone: 0 },
    { frame: 'head', pos: [0, hy * 0.38, -hz - 0.03], size: [hx * 2 + 0.02, 0.07, 0.1], tone: 0 },
  ],
  // face mask over mouth and chin (box faces only — never over a shader face)
  mask: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, -hy * 0.55, hz + 0.012], size: [hx * 1.35, hy * 0.62, 0.035], tone: 0 },
    { frame: 'head', pos: [0, -hy * 0.4, 0], size: [hx * 2 + 0.03, 0.025, hz * 2 + 0.03], tone: 1 },
  ],
  // ── RDZ road zombie (2026-11-22, ported from the Sltera racer's zHeadGeo / zTorsoGeo) ──
  // flat hair cap on the crown (racer: 0.54 x 0.10 x 0.48 at y +0.20)
  roadHair: ({ hx, hy, hz }) => [
    { frame: 'head', pos: [0, hy - 0.04, 0], size: [hx * 2 + 0.02, 0.1, hz * 2 + 0.02], tone: 0 },
  ],
  // dark open mouth under the eyes (racer: 0.20 x 0.10 at y -0.15 on the face)
  roadMouth: ({ hy, hz }) => [
    { frame: 'head', pos: [0, -hy * 0.62, hz + 0.012], size: [0.2, 0.1, 0.03], tone: 0 },
  ],
  // white shirt collar + red tie on the uniform front (racer: collar 0.20 x 0.30, tie 0.07 x 0.24)
  roadCollar: ({ by, bz }) => [
    { frame: 'body', pos: [0, by * 0.34, bz + 0.008], size: [0.2, by * 1.0, 0.02], tone: 0 },
    { frame: 'body', pos: [0, by * 0.28, bz + 0.022], size: [0.07, by * 0.82, 0.025], tone: 1 },
  ],
}
// Accessories that cover the face front — not allowed on looks of types whose face is a shader/quad.
export const FACE_FRONT_ACCESSORIES = Object.freeze(['glasses', 'mask'])
// E07 smile quad, E56/E66 projectile face shader, E74 Kenney atlas face, E40 posed head (eyes elsewhere), E19 cap brim.
export const NO_FACE_FRONT_ACCESSORY_TYPES = Object.freeze(['E07', 'E19', 'E40', 'E56', 'E66', 'E74'])
export const ZOMBIE_ACCESSORY_KINDS = Object.freeze(Object.keys(ACCESSORIES))

export function accessoryBoxes(kind, frames) {
  const build = ACCESSORIES[kind]
  return build ? build({ ...frames.head, ...frames.body }) : []
}

// ── looks per type (index 0 = existing look, always {}) ──
// shirt: torso + arms, pants: legs, skin: head + hands, band: run-crew headband, cap: E19 cap,
// acc: [{ kind, color, color2 }], scale: [width, height] (each within ±12 %).
const L = (shirt, pants, skin, acc, scale, extra) => Object.freeze({ shirt, pants, skin, acc: Object.freeze(acc ?? []), scale: scale ?? null, ...(extra ?? {}) })
const acc = (kind, color, color2) => Object.freeze({ kind, color, color2: color2 ?? color })
const ROAD = ROAD_ZOMBIE_COLORS
const ROAD_ACC = [acc('roadHair', ROAD.hair), acc('roadMouth', ROAD.mouth), acc('roadCollar', ROAD.collar, ROAD.tie)]

export const ZOMBIE_LOOKS = Object.freeze({
  // Classic box zombies: each keeps its own shirt hue family (that is how the types tell apart), the looks
  // change trousers, skin, headgear/hair, accessory and build.
  E01: [{},
    L(0x3f6a26, 0x2c4a7a, 0x9aa86a, [acc('mop', 0x5a3a22)], [1, 1.06]),
    L(0x5c8e36, 0x6a6a72, 0x7f9f84, [acc('cap', 0xd23a2e)], [1.08, 0.94]),
    L(0x4a7a2c, 0x1d1d24, 0x8ab060, [acc('beanie', 0x24324a, 0xf2efe4), acc('scarf', 0xe0b030)], [0.92, 1.08]),
    L(0x36602a, 0x6b4a2e, 0xa9be8c, [acc('bun', 0x141418), acc('bag', 0x3a8fd0, 0x1f4f7a)], [1.04, 1]),
    // 2026-11-22 (+7): E01 is the stage 1-5 fodder (~70 % of every wave) — 12 looks keep ≤ 10 per look up to 120 alive.
    L(0x4e8030, 0x2a2a30, 0x94b468, [acc('spiky', 0x2a1a10), acc('glasses', 0x1d1d24)], [0.96, 1.04]),
    L(0x426e28, 0x3a5a8c, 0x86a45c, [acc('headphones', 0x1d1d24, 0xf2efe4)], [1.06, 0.96]),
    L(0x55883a, 0x6b4a2e, 0x7f9f84, [acc('pigtails', 0x141418), acc('bow', 0xff5fa2, 0xd23a2e)], [0.94, 1.02]),
    L(0x3b6626, 0x1d1d24, 0x9aa86a, [acc('mop', 0x141418), acc('tie', 0xd23a2e, 0x8a1414)], [1.04, 1.04]),
    L(0x5a8a3a, 0x24324a, 0xa9be8c, [acc('hood', 0x3a5a2a), acc('mask', 0xf2efe4, 0xd8d4c8)], [1.08, 0.94]),
    L(0x46762a, 0x8a8a92, 0x7a9a58, [acc('band', 0xf2c94c), acc('bag', 0xe08a2e, 0x8a4a1a)], [0.92, 1.06]),
    L(0x3f702a, 0x2c4a7a, 0x9db480, [acc('beanie', 0xd23a2e, 0xf2efe4), acc('glasses', 0x6b4a2e)], [1.02, 1.08]),
  ],
  E02: [{},
    L(0x6a2aa0, 0x2a2a30, 0xc290dc, [acc('cap', 0xf2c94c)], [1.06, 0.95]),
    L(0x8a3ac4, 0x3a5a8c, 0xa868c4, [acc('mop', 0x1e1e22), acc('bag', 0x3fae5e, 0x1f6a36)], [0.94, 1.06]),
  ],
  E03: [{},
    L(0x2c4a1c, 0xb03a2a, 0x4e6a38, [acc('spiky', 0xe0c050)], [0.94, 1.08]),
    L(0x1f3414, 0x2c4a7a, 0x56704a, [acc('band', 0xf2efe4)], [1.08, 0.95]),
    L(0x2a4620, 0x6a6a72, 0x425e30, [acc('cap', 0xe08a2e)], [1, 1.06]),
    L(0x253e18, 0x1d1d24, 0x6a8a5a, [acc('mop', 0x141418), acc('bag', 0x3a8fd0, 0x1f4f7a)], [1.06, 0.92]),
    // 2026-11-22 (+7): E03 stays its own body in waves (fast light body) and peaks at 79 alive (stage 1 overtime).
    L(0x2e4a1e, 0xf2efe4, 0x50703c, [acc('headphones', 0xd23a2e, 0x1d1d24)], [0.96, 1.06]),
    L(0x203818, 0x3a5a8c, 0x5a7a48, [acc('beanie', 0x2fa8a0, 0xf2efe4)], [1.06, 0.96]),
    L(0x2a4420, 0x6b4a2e, 0x46643a, [acc('bun', 0x2a1a10), acc('glasses', 0x141418)], [0.94, 1.04]),
    L(0x1c3012, 0x2a2a30, 0x5e7e4a, [acc('band', 0x2f5fa8), acc('scarf', 0xf2c94c)], [1.04, 1]),
    L(0x284a1c, 0x1d1d24, 0x4a6a40, [acc('hood', 0x5a3a22), acc('bag', 0xd23a2e, 0x7a1a14)], [1, 1.08]),
    L(0x22381a, 0x8a8a92, 0x3e5a2e, [acc('pigtails', 0xe0c050), acc('bow', 0x2fa8a0, 0xf2efe4)], [0.92, 1.02]),
    L(0x30501e, 0x24324a, 0x587848, [acc('cap', 0x7a4fa0), acc('tie', 0xf2efe4, 0x9a9a9a)], [1.08, 0.94]),
  ],
  E04: [{},
    L(0xc06018, 0x2a2a30, 0xe0a060, [acc('beanie', 0x2f5fa8, 0xf2efe4)], [0.94, 1.06]),
    L(0x9c4410, 0x3f6a26, 0xc07a36, [acc('mop', 0x2a1a10), acc('bag', 0xf2efe4, 0x9a9a9a)], [1.06, 0.95]),
  ],
  E05: [{},
    L(0xb02020, 0x1d1d24, 0xd86050, [acc('cap', 0x1d1d24)], [1.06, 0.95]),
    L(0x8a1414, 0x2c4a7a, 0xb83a2e, [acc('spiky', 0xf2c94c), acc('scarf', 0xf2efe4)], [0.94, 1.06]),
  ],
  E06: [{},
    L(0x5c0c0c, 0x2a2a30, 0x9a2a2a, [acc('mop', 0x141418)], [1.06, 0.95]),
    L(0x440606, 0x6a6a72, 0x7a2020, [acc('cap', 0xf2efe4)], [0.94, 1.06]),
    L(0x621010, 0x3a2a1e, 0x8a2424, [acc('beanie', 0x3fae5e, 0xf2efe4), acc('bag', 0xe0b030, 0x8a6a10)], [1.08, 1]),
  ],
  // E07 keeps its smile face on every look.
  E07: [{},
    L(0x3e5f8a, 0xa8905a, 0x6a9a62, [acc('mop', 0x5a3a22)], [1.06, 0.96]),
    L(0x55789f, 0x1d1d24, 0x4e7e4c, [acc('cap', 0x3fae5e)], [0.94, 1.06]),
    L(0x486d9b, 0xf2efe4, 0x7a9a70, [acc('beanie', 0xd96a9a, 0xf2efe4), acc('bag', 0xe0b030, 0x8a6a10)], [1.04, 1]),
    // 2026-11-22 (+8): E07 (mid body kept as itself) peaks at 73 alive. No glasses/mask — the smile face stays clear.
    L(0x3a6290, 0x2a2a30, 0x6a9a62, [acc('spiky', 0x141418)], [1.04, 1]),
    L(0x5280b0, 0x6b4a2e, 0x4e7e4c, [acc('headphones', 0xf2efe4, 0xd23a2e)], [0.96, 1.06]),
    L(0x426a96, 0x3a5a8c, 0x7a9a70, [acc('pigtails', 0x2a1a10), acc('bow', 0xf2c94c, 0xe08a2e)], [0.94, 1.02]),
    L(0x4a74a4, 0x1d1d24, 0x5c8c58, [acc('bun', 0x6b4a2e), acc('scarf', 0xd23a2e)], [1.06, 0.98]),
    L(0x35577f, 0x8a8a92, 0x62925a, [acc('hood', 0x24324a), acc('bag', 0x3fae5e, 0x1f6a36)], [1.02, 1.06]),
    L(0x5a7fa6, 0x24324a, 0x709a68, [acc('band', 0xf2efe4), acc('tie', 0xd23a2e, 0x8a1414)], [1.08, 0.94]),
    L(0x46709e, 0x3a3a44, 0x7aa872, [acc('cap', 0xe0b030), acc('scarf', 0x2fa8a0)], [0.92, 1.08]),
    L(0x4e6e94, 0x6a6a72, 0x5a8452, [acc('beanie', 0x3fae5e, 0xf2efe4), acc('bag', 0xd96a9a, 0x8a3a5a)], [1.04, 1.04]),
  ],
  // Track B posed zombies: keep body hue + silhouette pose; looks change head-top, trousers, skin, accessory.
  E34: [{},
    L(0x5a6626, 0x2c4a7a, 0x9aa462, [acc('cap', 0xd23a2e)], [1.06, 0.95]),
    L(0x46501e, 0x1d1d24, 0x7a8446, [acc('mop', 0x141418), acc('scarf', 0xf2efe4)], [0.94, 1.06]),
  ],
  // E35 must stay apart from E39/E45 (all dark teal): its variants add bold head-tops in warm colours.
  E35: [{},
    L(0x1d3a38, 0x6b4a2e, 0x7a9a90, [acc('beanie', 0xe08a2e, 0xf2efe4)], [1.06, 0.95]),
    L(0x24443f, 0x2a2a30, 0x5c7b72, [acc('spiky', 0xf2c94c), acc('bag', 0xd23a2e, 0x7a1a14)], [0.94, 1.06]),
  ],
  E36: [{},
    L(0xa8884a, 0x2c4a7a, 0xd0b878, [acc('mop', 0x2a1a10)], [1.06, 0.95]),
    L(0x8a6a30, 0x1d1d24, 0xb89a5a, [acc('cap', 0x3fae5e), acc('scarf', 0xd23a2e)], [0.94, 1.06]),
  ],
  E37: [{},
    L(0x4e6c88, 0x1d1d24, 0x90a8ba, [acc('bun', 0x141418)], [0.94, 1.06]),
    L(0x3a546c, 0x6b4a2e, 0x6e899c, [acc('cap', 0xe0b030), acc('bag', 0x3fae5e, 0x1f6a36)], [1.06, 0.95]),
  ],
  // 2026-11-22 wave specials whose measured worst alive passed 10 (E40 14, E56/E66/E74 11): +2 looks each so the
  // ≥ worst/10 + 1 margin holds. Specials keep body hue, silhouette and their signature props (E56 nurse cap +
  // backpack, E66 planaria + goggles, E74 robot atlas); nothing covers their faces (faces carry the telegraph).
  E40: [{},
    L(0x4e3076, 0x2a2a30, 0x8a70b0, [acc('cap', 0xf2c94c)], [1.06, 0.96]),
    L(0x6a4496, 0x24324a, 0xa88ccc, [acc('spiky', 0x1d1d24), acc('scarf', 0xf2efe4)], [0.94, 1.06]),
  ],
  E56: [{},
    L(0xe892b2, 0xf2efe4, 0x7a9c72, [acc('pigtails', 0x2a1a10)], [0.96, 1.04]),
    L(0xf5b8cc, 0xe0a0b8, 0x96b88c, [acc('longhair', 0x6b4a2e), acc('scarf', 0x6fcf6a)], [1.04, 0.97]),
  ],
  E66: [{},
    L(0x6cc4b0, 0x1d1d24, 0x6a9a7c, [acc('bag', 0xf2c94c, 0x8a6a10)], [1.05, 0.96]),
    L(0x92e0cc, 0x3a5a8c, 0x8ab896, [acc('band', 0x2f5fa8), acc('tie', 0x24324a, 0x141418)], [0.95, 1.05]),
  ],
  // Blocky (Kenney atlas) robot: `tint` multiplies the atlas colour (white = original), plus build + accessory.
  E74: [{},
    L(null, null, null, [acc('headphones', 0xf2c94c, 0x1d1d24)], [1.06, 0.96], { tint: 0xc8d8ff }),
    L(null, null, null, [acc('cap', 0xe08a2e), acc('bag', 0x2f5fa8, 0x1f3a6a)], [0.95, 1.05], { tint: 0xffe2cc }),
  ],
  // Run crew (behind the RZL leader): jersey and headband colours change, the bib stays.
  RZC: [{},
    L(0xf2c94c, 0x2a2a30, null, [acc('mop', 0x2a1a10)], [0.95, 1.05], { band: 0xd23a2e }),
    L(0x9be08c, 0x8a1414, null, [acc('spiky', 0x141418)], [1.05, 0.96], { band: 0x1d1d24 }),
  ],
  // Stage 6 assembly-line zombie: every look keeps the cap, name tag and arms-forward pose (the E19 cue);
  // coat + cap colours change, plus hair / skin / build / accessory. No red headbands, bibs or sashes
  // (those are E20/E21 cues). Every look has its own cap colour (the cap is what the camera sees first).
  E19: [{},
    L(0xc64b3c, 0x24324a, null, [acc('longhair', 0x141418)], [1, 1.04], { cap: 0xf2efe4 }),
    L(0x3e8e4e, 0x24324a, 0xa8b5a0, [acc('bag', 0xe07b39, 0x8a4a1a)], [1.08, 0.94], { cap: 0xff5fa2 }),
    L(0xe3e0d4, 0x3a3a44, null, [acc('scarf', 0x2fa8a0)], [0.92, 1.08], { cap: 0x24324a }),
    L(0x7a4fa0, 0x24324a, 0xb9c98a, [acc('longhair', 0x6b4a2e)], [1.04, 0.96], { cap: 0xc9a8ee }),
    L(0xe08a2e, 0x1d1d24, null, [acc('bag', 0x24324a, 0x111824)], [1.06, 1.04], { cap: 0x2f5fa8 }),
    L(0x1e2a3a, 0x3a3a44, 0xc9d8b0, [acc('scarf', 0xf2c94c)], [0.92, 1], { cap: 0x7ec8f0 }),
    L(0xd96a9a, 0x24324a, null, [acc('longhair', 0x141418)], [1, 1.08], { cap: 0x6b4a2e }),
    L(0x8b6a3e, 0x2a2a30, 0x9db4b8, [acc('bag', 0x3e8e4e, 0x1f4a26)], [1.08, 1], { cap: 0x2fa8a0 }),
    L(0x2fa8a0, 0x24324a, null, [acc('scarf', 0xf2efe4)], [1.1, 0.92], { cap: 0xe08a2e }),
    // 2026-11-22 (+2): stage 6 assembly rows peak at 94 alive.
    L(0xd8b44a, 0x24324a, 0xa8c09c, [acc('bag', 0x7a4fa0, 0x3a2450)], [1.04, 0.98], { cap: 0x3fae5e }),
    L(0x9ab4c8, 0x3a3a44, null, [acc('tie', 0x24324a, 0x111824), acc('longhair', 0x6b4a2e)], [0.96, 1.06], { cap: 0x1d1d24 }),
  ],
  // Stage 6 relay zombie: keeps the baton, red sash and lean; coats change, plus hair (never a cap —
  // that is the E19 cue — and never a headband — that is E20).
  E21: [{},
    L(0xe3e0d4, 0x24324a, null, [acc('mop', 0x141418)], [0.96, 1.05]),
    L(0x3e8e4e, 0x2a2a30, 0xa8b5a0, [acc('spiky', 0xf2c94c)], [1.06, 0.95]),
    L(0xe08a2e, 0x1d1d24, null, [acc('bun', 0x141418)], [0.94, 1.06]),
    L(0x7a4fa0, 0x3a3a44, 0xb9c98a, [acc('mop', 0x6b4a2e)], [1.05, 1]),
    L(0x1e2a3a, 0x6b4a2e, 0xc9d8b0, [acc('spiky', 0xd23a2e)], [1, 1.07]),
  ],
  // RDZ road zombie (lib/roadZombieRoster.js): the racer's six uniforms x four green skins. Every look keeps the
  // racer silhouette — hair cap, mouth, collar + tie — and its group variety comes from uniform + skin + build.
  // Look 0 is drawn from ZOMBIE_BASE_LOOKS.RDZ below (first uniform), so index 0 stays {} like every other type.
  RDZ: [{},
    L(ROAD.uniforms[1], ROAD.pants, ROAD.skins[1], ROAD_ACC, [1.04, 0.97]),
    L(ROAD.uniforms[2], ROAD.pants, ROAD.skins[2], ROAD_ACC, [0.96, 1.04]),
    L(ROAD.uniforms[3], ROAD.pants, ROAD.skins[3], ROAD_ACC, [1.06, 1]),
    L(ROAD.uniforms[4], ROAD.pants, ROAD.skins[0], ROAD_ACC, [0.95, 1.05]),
    L(ROAD.uniforms[5], ROAD.pants, ROAD.skins[2], ROAD_ACC, [1, 1.06]),
  ],
})

// Look 0 for types whose original look is itself a coloured look with accessories (only RDZ: its racer details are
// accessories on the shared STANDARD box body). Renderers use this when a zombie's look index is 0.
export const ZOMBIE_BASE_LOOKS = Object.freeze({
  RDZ: L(ROAD.uniforms[0], ROAD.pants, ROAD.skins[0], ROAD_ACC, null),
})

// Look count per type name (1 = no variants).
export function zombieLookCount(type) {
  if (ZOMBIE_LOOK_EXCLUDED.includes(type)) return 1
  return ZOMBIE_LOOKS[type]?.length ?? 1
}
export function getZombieLook(type, look) {
  const list = ZOMBIE_LOOKS[type]
  return (list && look > 0 && look < list.length) ? list[look] : null
}

// Least-used look among `count` looks starting at `base` in `alive` (ties -> lowest index).
export function pickLeastUsedLook(alive, base, count) {
  let best = 0, bestAlive = Infinity
  for (let k = 0; k < count; k += 1) {
    const n = alive[base + k]
    if (n < bestAlive) { bestAlive = n; best = k }
  }
  return best
}
