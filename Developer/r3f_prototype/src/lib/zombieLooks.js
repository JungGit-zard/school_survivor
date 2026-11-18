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

export const LOOK_ALIVE_LIMIT = 10
export const MAX_ZOMBIE_LOOKS = 16

// Worst concurrent alive per type in stages 1-6 (balanceqa 2026-11-15, 40 seeds/bot, normal/worst bots
// incl. post-exit; F:/ezs-work/backup/zombie_total_review_20261115/verify/same_summary.json). RZC = the
// 12-runner crew behind the single RZL leader (Stage 3 72 s row of 13).
export const ZOMBIE_MEASURED_WORST_ALIVE = Object.freeze({
  E01: 37, E02: 16, E03: 36, E04: 15, E05: 12, E06: 22, E07: 26, E08: 2, E19: 83, E20: 9, E21: 50,
  E34: 20, E35: 11, E36: 11, E37: 14, E38: 9, E39: 8, E40: 3, E41: 9, E42: 6, E43: 7, E44: 7, E45: 7,
  E46: 10, E47: 5, E48: 8, E49: 4, E50: 3, E51: 5, E52: 4, E53: 5, E54: 2, E55: 1, E56: 5, E57: 5,
  E58: 3, E59: 5, E60: 7, E61: 6, E62: 2, E63: 4, E64: 9, E65: 4, E66: 9, E67: 4, E68: 7, E69: 4,
  E70: 2, E71: 3, E72: 2, E73: 2, E74: 9, E75: 3, E76: 3, E77: 6, E78: 1, E79: 4, E80: 8, E81: 3,
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
}
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

export const ZOMBIE_LOOKS = Object.freeze({
  // Classic box zombies: each keeps its own shirt hue family (that is how the types tell apart), the looks
  // change trousers, skin, headgear/hair, accessory and build.
  E01: [{},
    L(0x3f6a26, 0x2c4a7a, 0x9aa86a, [acc('mop', 0x5a3a22)], [1, 1.06]),
    L(0x5c8e36, 0x6a6a72, 0x7f9f84, [acc('cap', 0xd23a2e)], [1.08, 0.94]),
    L(0x4a7a2c, 0x1d1d24, 0x8ab060, [acc('beanie', 0x24324a, 0xf2efe4), acc('scarf', 0xe0b030)], [0.92, 1.08]),
    L(0x36602a, 0x6b4a2e, 0xa9be8c, [acc('bun', 0x141418), acc('bag', 0x3a8fd0, 0x1f4f7a)], [1.04, 1]),
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
