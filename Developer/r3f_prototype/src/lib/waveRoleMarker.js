// Wave role markers (2026-11-22, Terry wave standard step 2: specials must read as "stronger, different job").
//
// A special spawned by the wave rule (lib/waveComposition.js noteWaveSpawn → entry.waveRole, the Korean role
// name from lib/waveStandard.js WAVE_SPECIAL_ROLE) carries a small role code in its pool slot
// (enemyEntityPool.role). components/WaveRoleRingLayer.jsx draws a coloured ground ring under every zombie
// whose code is not 0. Fodder, basic types kept as themselves, chiefs, bosses, crews and every zombie in
// stages 7-10 (no wave rule) get code 0 = no ring. Visual only: nothing in the simulation reads it.
// Pure data module — no imports.

export const WAVE_ROLE_NONE = 0

// code → key. Index = code.
export const WAVE_ROLE_KEYS = Object.freeze(['', 'tank', 'rush', 'ranged', 'zone', 'ambush', 'support', 'split', 'disrupt', 'melee', 'formation'])

// Korean role names used by WAVE_SPECIAL_ROLE → code.
export const WAVE_ROLE_CODE_BY_NAME = Object.freeze({
  '탱크': 1,
  '돌진': 2,
  '원거리': 3,
  '장판·포격': 4,
  '기습': 5,
  '지원': 6,
  '분열': 7,
  '방해': 8,
  '근접기술': 9,
  '편대': 10,
})

// code → ring colour (Terry-approved palette from the plan: split and disrupt share pink).
export const WAVE_ROLE_COLORS = Object.freeze([
  0x000000, // 0 none (never drawn)
  0xe0453a, // 1 tank
  0xf28c28, // 2 rush
  0x9b59d0, // 3 ranged
  0xf2c94c, // 4 zone / bombard
  0x2fb7b0, // 5 ambush
  0x7cc85a, // 6 support
  0xf06aa8, // 7 split
  0xf06aa8, // 8 disrupt
  0x4a90e2, // 9 melee skill
  0xffffff, // 10 formation
])

export const WAVE_ROLE_COUNT = WAVE_ROLE_KEYS.length

// Role name (Korean), key ('tank'), or code → code. Anything unknown → 0 (no ring).
export function waveRoleCode(role) {
  if (typeof role === 'number') return Number.isInteger(role) && role > 0 && role < WAVE_ROLE_COUNT ? role : WAVE_ROLE_NONE
  if (typeof role !== 'string' || !role) return WAVE_ROLE_NONE
  const byName = WAVE_ROLE_CODE_BY_NAME[role]
  if (byName) return byName
  const byKey = WAVE_ROLE_KEYS.indexOf(role)
  return byKey > 0 ? byKey : WAVE_ROLE_NONE
}

export function waveRoleColor(code) {
  return code > 0 && code < WAVE_ROLE_COUNT ? WAVE_ROLE_COLORS[code] : null
}
