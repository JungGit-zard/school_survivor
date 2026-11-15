// Pooled one-shot VFX bursts (Terry 2026-11-15 picks). Gameplay code calls spawnVfxBurst(kind, x, y, z, scale)
// — no object allocation, no React mount. BurstVfxLayer drains this ring buffer every frame and draws each
// effect type with one InstancedMesh per piece (one draw call per piece type, however many effects are live).
//
// This is separate from lib/vfxEvents.js (emitVfx), which still drives the older per-event VFXLayer effects
// (HitSpark fallback, critical star, charge warning arrow, pickup pop).

export const VFX_BURST = Object.freeze({
  NONE: 0,
  HIT_PENCIL: 1, // pencilThrow: Kenney star_07 + circle_05 toon cut (yellow)
  HIT_REEBO: 2, // schoolBag (30cm ruler), boxCutter: REEBOO flash + rays
  HIT_BINBUN: 3, // stunGun, hanako: Binbun 4-way star shader
  HIT_CODEMANU: 4, // bell, scienceFlask, compassBlade: CodeManu impact_white flipbook
  HIT_LANTERN: 5, // studentLantern: Kenney star_07 soft
  HIT_PIXEL: 6, // onigiri, miniRosari, paperPlane: cs5475 hit-spark-48 flipbook
  HIT_CHIBIKO: 7, // Chibiko's pencil: Kenney star_06 x3 + circle_02 toon cut
  KILL_PUFF: 8, // every kill: REEBOO puff x5 flung out (on top of the untouched shatter/collapse)
  PICKUP: 9, // XP / coin / item collected: REEBOO thin ring + twinkle
  HEAL: 10, // every HP recovery: Kenney magic_03 ground + circle_03 + rising star_07
  LEVEL_UP: 11, // REEBOO light pillar + 2 rings
  HEART_BURST: 12, // powerBank missile + eraser bomb explosions: AD_FX heart (existing explosion kept)
  SHARK_EXPLOSION: 13, // shark missile: CodeManu explosion flipbook
  STARLINK_IMPACT: 14, // starlink ground impact: REEBOO fireball + shock ring + rays
  ONIGIRI_TWINKLE: 15, // onigiri trail: REEBOO twinkle stars shed behind the rice ball
})

export const VFX_BURST_KIND_COUNT = 16

// Terry's per-weapon hit distribution (picks.md "HIT per weapon"). Keys are weaponCatalog ids, plus the
// hit-only key 'chibiko' for the pencil Chibiko throws. Anything not listed (tumbler, umbrellaGuard,
// guidedMissile, sharkMissile, starlink, inucon, ...) keeps the existing VFXLayer HitSpark.
export const WEAPON_HIT_BURST = Object.freeze({
  pencilThrow: VFX_BURST.HIT_PENCIL,
  schoolBag: VFX_BURST.HIT_REEBO,
  boxCutter: VFX_BURST.HIT_REEBO,
  stunGun: VFX_BURST.HIT_BINBUN,
  hanako: VFX_BURST.HIT_BINBUN,
  bell: VFX_BURST.HIT_CODEMANU,
  scienceFlask: VFX_BURST.HIT_CODEMANU,
  compassBlade: VFX_BURST.HIT_CODEMANU,
  studentLantern: VFX_BURST.HIT_LANTERN,
  onigiri: VFX_BURST.HIT_PIXEL,
  miniRosari: VFX_BURST.HIT_PIXEL,
  paperPlane: VFX_BURST.HIT_PIXEL,
  chibiko: VFX_BURST.HIT_CHIBIKO,
})

// impact.vfxKey (visual-only tag) wins over impact.weaponKey (also used for mission kill attribution).
// Weapons that never set weaponKey get a vfxKey instead, so mission counters stay exactly as before.
export function resolveWeaponHitBurst(impact) {
  if (!impact) return VFX_BURST.NONE
  const key = impact.vfxKey ?? impact.weaponKey
  return (key && WEAPON_HIT_BURST[key]) || VFX_BURST.NONE
}

export const VFX_BURST_QUEUE_CAPACITY = 256

const queue = {
  kind: new Uint8Array(VFX_BURST_QUEUE_CAPACITY),
  x: new Float32Array(VFX_BURST_QUEUE_CAPACITY),
  y: new Float32Array(VFX_BURST_QUEUE_CAPACITY),
  z: new Float32Array(VFX_BURST_QUEUE_CAPACITY),
  scale: new Float32Array(VFX_BURST_QUEUE_CAPACITY),
  read: 0,
  count: 0,
}

// Queue one burst. When the queue is full the oldest pending burst is dropped (visual only).
export function spawnVfxBurst(kind, x, y, z, scale = 1) {
  if (!(kind > 0 && kind < VFX_BURST_KIND_COUNT) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false
  if (queue.count >= VFX_BURST_QUEUE_CAPACITY) {
    queue.read = (queue.read + 1) % VFX_BURST_QUEUE_CAPACITY
    queue.count -= 1
  }
  const slot = (queue.read + queue.count) % VFX_BURST_QUEUE_CAPACITY
  queue.kind[slot] = kind
  queue.x[slot] = x
  queue.y[slot] = y
  queue.z[slot] = z
  queue.scale[slot] = Number.isFinite(scale) && scale > 0 ? scale : 1
  queue.count += 1
  return true
}

// Drain every pending burst into fn(kind, x, y, z, scale). Returns how many were drained.
export function drainVfxBursts(fn) {
  let drained = 0
  while (queue.count > 0) {
    const slot = queue.read
    queue.read = (slot + 1) % VFX_BURST_QUEUE_CAPACITY
    queue.count -= 1
    drained += 1
    fn(queue.kind[slot], queue.x[slot], queue.y[slot], queue.z[slot], queue.scale[slot])
  }
  return drained
}

export function clearVfxBursts() {
  queue.read = 0
  queue.count = 0
}

export function pendingVfxBurstCount() {
  return queue.count
}

// Onigiri twinkle trail: shed one star every ONIGIRI_TWINKLE_SPACING units travelled per rice ball slot.
export const ONIGIRI_TWINKLE_SPACING = 0.2
const twinkleLastX = new Float32Array(64)
const twinkleLastZ = new Float32Array(64)
const twinkleArmed = new Uint8Array(64)

export function resetOnigiriTwinkle(slot) {
  if (slot >= 0 && slot < twinkleArmed.length) twinkleArmed[slot] = 0
}

export function shedOnigiriTwinkle(slot, x, y, z) {
  if (!(slot >= 0 && slot < twinkleArmed.length)) return false
  if (!twinkleArmed[slot]) {
    twinkleArmed[slot] = 1
    twinkleLastX[slot] = x
    twinkleLastZ[slot] = z
    return false
  }
  const dx = x - twinkleLastX[slot]
  const dz = z - twinkleLastZ[slot]
  if (dx * dx + dz * dz < ONIGIRI_TWINKLE_SPACING * ONIGIRI_TWINKLE_SPACING) return false
  twinkleLastX[slot] = x
  twinkleLastZ[slot] = z
  return spawnVfxBurst(VFX_BURST.ONIGIRI_TWINKLE, x, y, z, 1)
}
