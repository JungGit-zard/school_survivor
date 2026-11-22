// Knock-flight death VFX ("치여 날아가 펑" — 2026-11-22, ported from the Sltera racer's run-over death).
// Terry: "죽는 연출도". The racer (F:/ezs-work/backup/sltera_racer_20261122/index.html knockZombie / puffBurst):
// the hit zombie tumbles up and away spinning for 0.7 s, then pops into a small burst of coloured cartoon puffs.
// No gore, no debris.
//
// Selectable per kill source: a hit whose impact carries deathStyleOverride = KNOCK_FLIGHT_DEATH_STYLE dies with this
// effect instead of the normal collapse + kill puff (Enemies.jsx emitEnemyDeathVisual). Today only the Sltera car
// sets it (SlteraEvent hits); any later source can pass the same option on its impact / applyRadialDamage call.
//
// Fixed SoA pools, sized once: spawning and stepping allocate nothing. Bodies at capacity recycle the oldest flight
// (it pops early); puffs at capacity are simply not made (the racer did the same). Each pop is also queued in a small
// ring (popX/popZ/...) so the renderer can hand the spot to the purified-student pool after the burst.
// Pure module: no React / three / Firebase / storage.

export const KNOCK_FLIGHT_DEATH_STYLE = 'knockFlight'

export const KNOCK_FLIGHT_CAPACITY = 24
export const KNOCK_FLIGHT_PUFF_CAPACITY = 96
export const KNOCK_FLIGHT_PUFFS_PER_POP = 8
// Racer: z.t > 0.7 → puffBurst.
export const KNOCK_FLIGHT_SEC = 0.7

// Motion in zombie MODEL units (the box-zombie layout, ~1.7 tall); multiplied by the death's visualScale
// (= world units per model unit, same as the pooled renderer). Racer values / 1.05 (its Z_SCALE), with the
// forward fling shortened for the top-down camera (the car already launched the body once).
export const KNOCK_FLIGHT_GRAVITY = 23
export const KNOCK_FLIGHT_UP_MIN = 8.5
export const KNOCK_FLIGHT_UP_SPAN = 4.8
export const KNOCK_FLIGHT_AWAY_MIN = 7
export const KNOCK_FLIGHT_AWAY_SPAN = 4
export const KNOCK_FLIGHT_SIDE_MAX = 3
export const KNOCK_FLIGHT_SPIN = Object.freeze([21, 13, 21]) // full spread of the racer's (rand - 0.5) * w
// Feet sit 0.63 model units under the pooled body origin; the flight never sinks through the floor.
export const KNOCK_FLIGHT_FEET_DROP = 0.63

// Racer puffs: radius 0.42 icosahedron, scale 0.6..1.5, life 0.38..0.63 s, v (±4.5, 1..7, ±4.5), drag 4/s, lift 2/s².
export const KNOCK_FLIGHT_PUFF_RADIUS = 0.42
export const KNOCK_FLIGHT_PUFF_COLORS = Object.freeze([0xfff6dc, 0xffffff, 0xffe08a, 0xc8f0a0, 0xffb3c6])

const DEFAULT_BODY = 0x4a7a2c
const DEFAULT_SKIN = 0x8ab060
const DEFAULT_EYE = 0xff2020

// Deterministic per-spawn noise (no Math.random): visual only, but stable for tests and replays.
function noise(seq, k) {
  const v = Math.sin(seq * 12.9898 + k * 78.233) * 43758.5453
  return v - Math.floor(v)
}

export function createKnockFlightPool(capacity = KNOCK_FLIGHT_CAPACITY, puffCapacity = KNOCK_FLIGHT_PUFF_CAPACITY) {
  return {
    capacity,
    puffCapacity,
    // bodies
    active: new Uint8Array(capacity),
    age: new Float32Array(capacity),
    x: new Float32Array(capacity), y: new Float32Array(capacity), z: new Float32Array(capacity),
    vx: new Float32Array(capacity), vy: new Float32Array(capacity), vz: new Float32Array(capacity),
    rx: new Float32Array(capacity), ry: new Float32Array(capacity), rz: new Float32Array(capacity),
    wx: new Float32Array(capacity), wy: new Float32Array(capacity), wz: new Float32Array(capacity),
    scale: new Float32Array(capacity),
    floorY: new Float32Array(capacity),
    body: new Uint32Array(capacity), skin: new Uint32Array(capacity), eye: new Uint32Array(capacity), legs: new Uint32Array(capacity),
    // Palette object per flight (for the purified student after the pop). Reference writes only.
    palette: new Array(capacity).fill(null),
    activeCount: 0,
    // puffs
    puffActive: new Uint8Array(puffCapacity),
    puffAge: new Float32Array(puffCapacity),
    puffLife: new Float32Array(puffCapacity),
    puffX: new Float32Array(puffCapacity), puffY: new Float32Array(puffCapacity), puffZ: new Float32Array(puffCapacity),
    puffVX: new Float32Array(puffCapacity), puffVY: new Float32Array(puffCapacity), puffVZ: new Float32Array(puffCapacity),
    puffSize: new Float32Array(puffCapacity),
    puffColor: new Uint32Array(puffCapacity),
    puffCount: 0,
    // pops waiting for the renderer (ring, one slot per body)
    popX: new Float32Array(capacity), popZ: new Float32Array(capacity), popScale: new Float32Array(capacity),
    popPalette: new Array(capacity).fill(null),
    popRead: 0,
    popCount: 0,
    // counters
    spawned: 0,
    recycled: 0,
    popped: 0,
    puffsDropped: 0,
    _seq: 0,
  }
}

function emitPuffs(pool, x, y, z, k, seq) {
  let made = 0
  for (let i = 0; i < pool.puffCapacity && made < KNOCK_FLIGHT_PUFFS_PER_POP; i += 1) {
    if (pool.puffActive[i]) continue
    const n = seq * 7 + made
    pool.puffActive[i] = 1
    pool.puffAge[i] = 0
    pool.puffLife[i] = 0.38 + noise(n, 1) * 0.25
    pool.puffSize[i] = (0.6 + noise(n, 2) * 0.9) * k
    pool.puffX[i] = x; pool.puffY[i] = y; pool.puffZ[i] = z
    pool.puffVX[i] = (noise(n, 3) - 0.5) * 9 * k
    pool.puffVY[i] = (noise(n, 4) * 6 + 1) * k
    pool.puffVZ[i] = (noise(n, 5) - 0.5) * 9 * k
    pool.puffColor[i] = KNOCK_FLIGHT_PUFF_COLORS[Math.floor(noise(n, 6) * KNOCK_FLIGHT_PUFF_COLORS.length) % KNOCK_FLIGHT_PUFF_COLORS.length]
    pool.puffCount += 1
    made += 1
  }
  pool.puffsDropped += KNOCK_FLIGHT_PUFFS_PER_POP - made
  return made
}

function popBody(pool, i) {
  const k = pool.scale[i]
  // The burst sits at the body's centre (racer: puffBurst(z.p)).
  emitPuffs(pool, pool.x[i], pool.y[i], pool.z[i], k, pool.spawned + i)
  if (pool.popCount < pool.capacity) {
    const slot = (pool.popRead + pool.popCount) % pool.capacity
    pool.popX[slot] = pool.x[i]; pool.popZ[slot] = pool.z[i]; pool.popScale[slot] = k
    pool.popPalette[slot] = pool.palette[i]
    pool.popCount += 1
  }
  pool.active[i] = 0
  pool.palette[i] = null
  pool.activeCount -= 1
  pool.popped += 1
}

// palette = ZOMBIE_PALETTE[type] ({ body, skin, eye, bottom? }). dirX/dirZ = fling direction on the ground
// (from the hit source to the zombie); 0,0 picks a deterministic direction. Returns the body slot, or -1 if refused.
export function spawnKnockFlightDeath(pool, x, y, z, dirX, dirZ, visualScale, palette) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return -1
  let slot = -1
  let oldest = -1
  let oldestAge = -1
  for (let i = 0; i < pool.capacity; i += 1) {
    if (!pool.active[i]) { slot = i; break }
    if (pool.age[i] > oldestAge) { oldestAge = pool.age[i]; oldest = i }
  }
  if (slot < 0) {
    popBody(pool, oldest) // pool full: the oldest flight pops early and gives up its slot
    slot = oldest
    pool.recycled += 1
  }
  const seq = pool._seq = (pool._seq + 1) % 9973
  const k = Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 0.333
  let dx = Number.isFinite(dirX) ? dirX : 0
  let dz = Number.isFinite(dirZ) ? dirZ : 0
  let len = Math.hypot(dx, dz)
  if (len < 1e-4) {
    const angle = noise(seq, 11) * Math.PI * 2
    dx = Math.cos(angle); dz = Math.sin(angle); len = 1
  }
  dx /= len; dz /= len
  const side = noise(seq, 12) < 0.5 ? -1 : 1
  const away = KNOCK_FLIGHT_AWAY_MIN + noise(seq, 13) * KNOCK_FLIGHT_AWAY_SPAN
  const sideSpeed = side * (0.4 + noise(seq, 14) * 0.6) * KNOCK_FLIGHT_SIDE_MAX
  pool.active[slot] = 1
  pool.age[slot] = 0
  pool.x[slot] = x
  pool.y[slot] = Number.isFinite(y) ? y : KNOCK_FLIGHT_FEET_DROP * k
  pool.z[slot] = z
  pool.floorY[slot] = Math.max(pool.y[slot], KNOCK_FLIGHT_FEET_DROP * k)
  pool.vx[slot] = (dx * away - dz * sideSpeed) * k
  pool.vz[slot] = (dz * away + dx * sideSpeed) * k
  pool.vy[slot] = (KNOCK_FLIGHT_UP_MIN + noise(seq, 15) * KNOCK_FLIGHT_UP_SPAN) * k
  // Face the fling direction at the start (racer: rot.y = yaw), then tumble.
  pool.rx[slot] = 0
  pool.ry[slot] = Math.atan2(dx, dz)
  pool.rz[slot] = 0
  pool.wx[slot] = (noise(seq, 16) - 0.5) * KNOCK_FLIGHT_SPIN[0]
  pool.wy[slot] = (noise(seq, 17) - 0.5) * KNOCK_FLIGHT_SPIN[1]
  pool.wz[slot] = (noise(seq, 18) - 0.5) * KNOCK_FLIGHT_SPIN[2]
  pool.scale[slot] = k
  const body = Number.isFinite(palette?.body) ? palette.body : DEFAULT_BODY
  pool.body[slot] = body
  pool.skin[slot] = Number.isFinite(palette?.skin) ? palette.skin : DEFAULT_SKIN
  pool.eye[slot] = Number.isFinite(palette?.eye) ? palette.eye : DEFAULT_EYE
  pool.legs[slot] = Number.isFinite(palette?.bottom) ? palette.bottom : body
  pool.palette[slot] = palette ?? null
  pool.activeCount += 1
  pool.spawned += 1
  return slot
}

export function stepKnockFlightPool(pool, dtSec) {
  const dt = Number.isFinite(dtSec) && dtSec > 0 ? Math.min(dtSec, 0.1) : 0
  if (!dt) return
  if (pool.activeCount > 0) {
    for (let i = 0; i < pool.capacity; i += 1) {
      if (!pool.active[i]) continue
      pool.age[i] += dt
      if (pool.age[i] >= KNOCK_FLIGHT_SEC) { popBody(pool, i); continue }
      const k = pool.scale[i]
      pool.vy[i] -= KNOCK_FLIGHT_GRAVITY * k * dt
      pool.x[i] += pool.vx[i] * dt
      pool.y[i] += pool.vy[i] * dt
      pool.z[i] += pool.vz[i] * dt
      if (pool.y[i] < pool.floorY[i]) { pool.y[i] = pool.floorY[i]; if (pool.vy[i] < 0) pool.vy[i] = 0 }
      pool.rx[i] += pool.wx[i] * dt
      pool.ry[i] += pool.wy[i] * dt
      pool.rz[i] += pool.wz[i] * dt
    }
  }
  if (pool.puffCount > 0) {
    const drag = Math.max(0, 1 - dt * 4)
    for (let i = 0; i < pool.puffCapacity; i += 1) {
      if (!pool.puffActive[i]) continue
      pool.puffAge[i] += dt
      if (pool.puffAge[i] >= pool.puffLife[i]) { pool.puffActive[i] = 0; pool.puffCount -= 1; continue }
      pool.puffX[i] += pool.puffVX[i] * dt
      pool.puffY[i] += pool.puffVY[i] * dt
      pool.puffZ[i] += pool.puffVZ[i] * dt
      pool.puffVX[i] *= drag; pool.puffVY[i] *= drag; pool.puffVZ[i] *= drag
      pool.puffVY[i] += 2 * dt * pool.puffSize[i] // racer: v.y += 2·dt (world), scaled like the rest of the puff
    }
  }
}

// Racer puff scale curve: grows to 1.2x over the first 30 % of its life, then shrinks to 0.
export function getKnockFlightPuffScale(age, life, size) {
  if (!(life > 0)) return 0
  const u = Math.min(1, Math.max(0, age / life))
  return size * (u < 0.3 ? (u / 0.3) * 1.2 : 1.2 * (1 - (u - 0.3) / 0.7))
}

// Hands each finished pop to fn(x, z, visualScale, palette) once. Returns how many were drained.
export function drainKnockFlightPops(pool, fn) {
  let drained = 0
  while (pool.popCount > 0) {
    const slot = pool.popRead
    pool.popRead = (slot + 1) % pool.capacity
    pool.popCount -= 1
    const palette = pool.popPalette[slot]
    pool.popPalette[slot] = null
    drained += 1
    fn(pool.popX[slot], pool.popZ[slot], pool.popScale[slot], palette)
  }
  return drained
}

export function resetKnockFlightPool(pool) {
  pool.active.fill(0); pool.palette.fill(null); pool.activeCount = 0
  pool.puffActive.fill(0); pool.puffCount = 0
  pool.popPalette.fill(null); pool.popRead = 0; pool.popCount = 0
}

// Game-wide single pool: Enemies.jsx death routing spawns, KnockFlightDeathLayer steps and draws.
export const knockFlightDeathPool = createKnockFlightPool()
