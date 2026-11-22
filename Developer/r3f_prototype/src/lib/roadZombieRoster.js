// RDZ "도로 좀비(road zombie)" — the Sltera racer's blocky road zombie ported into the main game (2026-11-22).
//
// Terry: "기왕 만든 이 좀비들은 본 게임에서도 활용 가능하도록 연결". Source look: the standalone racer
// (F:/ezs-work/backup/sltera_racer_20261122/index.html, "blocky zombies (instanced, pooled)"): green skin, red eyes,
// a dark mouth, a flat dark-green hair cap, a school-uniform torso with a white collar and red tie, dark trousers,
// arms held forward. The racer picks a random uniform/skin per zombie; here that variety comes from the look system
// (lib/zombieLooks.js ZOMBIE_LOOKS.RDZ / ZOMBIE_BASE_LOOKS.RDZ), so no randomness is consumed.
//
// Wiring (no new render system):
//  - typeCode 112 = the next free code after the novel2 set (94~111). Fixed — never renumber.
//  - Simulation: the plain chase path of E01 (lib/enemySimulation.js runtime tables + isMelee).
//  - Body: ZombieInstanceLayer's STANDARD part slots — the same InstancedMeshes as E01, so an RDZ crowd adds no draw
//    calls; the racer-only details (hair cap, mouth, collar + tie) ride the shared look-accessory mesh pair.
//  - Not placed in any stage wave or burst (Terry decides placement). Spawnable through the pool like E08.
// Pure data: no three / React / Firebase / storage imports.

export const ROAD_ZOMBIE_TYPE = 'RDZ'
export const ROAD_ZOMBIE_TYPE_CODE = 112

// Stats = E01 (the stage 1-5 fodder) copied 1:1 — the racer zombie is a one-hit fodder body.
// Keep in step with ENEMY_STATS.E01 (components/Enemy.jsx) and the E01 runtime slot (lib/enemySimulation.js);
// roadZombieRoster.test.js checks the copy.
export const ROAD_ZOMBIE_STATS = Object.freeze({ hp: 8, speed: 0.5225, damage: 8, scale: 1.0, xp: 4, contactDist: 0.28 })

// Racer colours (index.html SKINS / UNIFORMS / zHeadGeo / zTorsoGeo / zLegGeo).
export const ROAD_ZOMBIE_COLORS = Object.freeze({
  skins: Object.freeze([0x7fae5a, 0x8fa680, 0x6b9a58, 0x93b86a]),
  uniforms: Object.freeze([0x2c3a66, 0x7a2a3a, 0x2f5a44, 0x5a5f6e, 0xe6e6dc, 0x27345a]),
  eye: 0xd8353a,
  mouth: 0x3a1210,
  hair: 0x46603a,
  collar: 0xf0f0ea,
  tie: 0xb02a30,
  pants: 0x2a2a36,
})

// ZOMBIE_PALETTE entry (box tree, death debris, purified student uniform). bottom = trousers.
export const ROAD_ZOMBIE_PALETTE = Object.freeze({
  body: ROAD_ZOMBIE_COLORS.uniforms[0],
  skin: ROAD_ZOMBIE_COLORS.skins[0],
  eye: ROAD_ZOMBIE_COLORS.eye,
  bottom: ROAD_ZOMBIE_COLORS.pants,
})

export const ROAD_ZOMBIE_LABEL = '도로 좀비'
