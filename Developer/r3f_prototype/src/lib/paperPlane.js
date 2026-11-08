// 종이비행기(paperPlane) 무기의 순수 비행·피격 로직.
// 2026-11-07 Terry: E47 종이비행기 좀비의 탄을 로자리 무기로.
// 2026-11-08 Terry: "좀비가 공격하는 바로 그 종이 비행기와 완전히 동일하게 — 크기, 비행속도, 공격스타일 모두
//   동일하게. 단 주인공이 던진 건 민트색 테두리 등으로 표시한다."
//
// 그래서 비행 수치는 E47 탄 스펙(projectileZombieBehavior.js) 하나가 정본이고, 선회 코드는
// projectileZombieShotPool.js의 steerHomingVelocity를 좀비 탄과 같이 쓴다. 여기에 복사본이 없다.
//   - 로자리 자리에서 표적 쪽으로 출발해 초속 1.6u로 난다(E47 speed).
//   - 표적 쪽으로 초당 45°까지, 누적 90°까지만 꺾는다(E47 p0·p1). 예산을 다 쓰면 그대로 직진한다.
//   - 적 하나에 닿으면(좀비 탄이 로자리에 닿는 거리 = hitRadius 0.12 + 몸 반폭 0.136) 피해를 준다.
//     기본(pierce 1)은 좀비 탄처럼 한 번 맞히면 사라진다.
//   - 4.2초(E47 lifeMs) 뒤 사라진다. 최대 비행거리 6.72u(약 9블록, 1블록 = 0.75u).
// 좀비 탄과 다른 것은 표적뿐이다: 좀비 탄 → 로자리 / 로자리 비행기 → 발사 때 고른 적.
// 그 적이 먼저 죽으면(다른 무기 등) 비행기 근처의 다음 적을 표적으로 삼되, 남은 선회 예산 안에서만 꺾는다.
// 관통(2026-11-08 Terry): "관통은 연필처럼 좀비를 타격한 뒤 뚫고 지나가 뒤의 좀비까지 타격하는 것".
//   pierce = 비행기 한 대가 맞힐 수 있는 서로 다른 적 수(기본 1). 관통 카드·영구강화 Lv5/Lv10이 +1씩 올린다.
//   맞히고 남은 비행기는 연필처럼 그 방향 그대로 직진하며 뚫고 지나간다(옆의 적을 쫓아 꺾지 않는다).
//   속도·수명은 같고, 뒤에서 닿는 적을 맞힌다. 같은 적은 두 번 맞히지 않는다(비행기별 적중 기록).
//
// 비행기는 언제나 로자리 몸에서 출발하고 동시 개수 상한이 없다(Terry 2026-11-02 규칙).
// 메모리 규칙: 풀은 typed array 슬롯이다. 매 프레임 할당이 없고, 빈 슬롯이 없을 때만 용량을
// 두 배로 늘린다(줄이지 않음). 컴포넌트는 같은 슬롯 인덱스로 InstancedMesh 행렬을 쓴다.
import { scanRadiusEnemiesInto, createWeaponTargetScratch, resolveWeaponTarget } from './weaponTargeting.js'
import { applyEnemyHit } from './weaponCollision.js'
import { PLAYER_CONTACT_HALF_EXTENT } from './enemyProjectilePool.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS } from './projectileZombieBehavior.js'
import { steerHomingVelocity } from './projectileZombieShotPool.js'

// E47 종이비행기 좀비의 탄 스펙(속도·수명·선회·판정 반경의 정본).
export const E47_PAPER_PLANE_SHOT = Object.values(PROJECTILE_ZOMBIE_BEHAVIORS).find((b) => b.id === 'E47').shot

// 거리 단위: 월드 유닛(1블록 = 0.75u). 아래 값은 전부 E47 탄에서 읽는다 — 숫자를 여기서 다시 쓰지 않는다.
export const PAPER_PLANE_SPEED = E47_PAPER_PLANE_SHOT.speed               // 1.6 u/s
export const PAPER_PLANE_LIFETIME_MS = E47_PAPER_PLANE_SHOT.lifeMs        // 4200ms → 최대 6.72u
export const PAPER_PLANE_TURN_RATE = E47_PAPER_PLANE_SHOT.p0              // 45°/s
export const PAPER_PLANE_TURN_BUDGET = E47_PAPER_PLANE_SHOT.p1            // 누적 90°
// 좀비 탄이 로자리에 닿는 거리와 같다: 탄 반경 0.12 + 몸 반폭 0.136 = 0.256u(약 1/3블록).
export const PAPER_PLANE_CONTACT_RADIUS = E47_PAPER_PLANE_SHOT.hitRadius + PLAYER_CONTACT_HALF_EXTENT
export const PAPER_PLANE_RETARGET_RADIUS = 6    // 표적이 먼저 죽었을 때 다음 표적 탐색 반경 6u = 8블록
export const PAPER_PLANE_LAUNCH_SPREAD = 0.32   // 같은 표적을 나눠 쫓는 비행기 간 발사각 차이(rad)
export const PAPER_PLANE_MAX_PIERCE = 8         // 비행기당 기록하는 적중 수 상한(카드 cap 4보다 넉넉히)
// 좀비 탄 풀과 같은 프레임 상한(projectileZombieShotPool.step).
const MAX_STEP_SEC = 1 / 30
// 좀비 탄 풀은 선회 속도(p0)를 Float32로 저장해 쓴다. 같은 값으로 꺾어야 궤적이 비트 단위로 같다.
const TURN_RATE_F32 = Math.fround(PAPER_PLANE_TURN_RATE)

const CONTACT_SCAN = 6
const RETARGET_SCAN = 8
const _steer = { x: 0, z: 0 }

function growTyped(Ctor, old, size) {
  const next = new Ctor(size)
  next.set(old)
  return next
}

export function createPaperPlanePool(capacity = 16) {
  const cap = Math.max(1, Math.floor(capacity))
  return {
    capacity: cap,
    highest: -1,
    active: new Uint8Array(cap),
    posX: new Float32Array(cap),
    posZ: new Float32Array(cap),
    velX: new Float32Array(cap),
    velZ: new Float32Array(cap),
    ageMs: new Float32Array(cap),
    lifeMs: new Float32Array(cap),
    damage: new Float32Array(cap),
    critChance: new Float32Array(cap),
    critMultiplier: new Float32Array(cap),
    turnLeft: new Float32Array(cap), // 남은 선회 예산(rad). 좀비 탄 풀의 p1과 같다.
    hitsLeft: new Uint8Array(cap), // 남은 적중 수(= pierce - 맞힌 수)
    hitCount: new Uint8Array(cap),
    hitIndex: new Int16Array(cap * PAPER_PLANE_MAX_PIERCE),
    hitGeneration: new Uint16Array(cap * PAPER_PLANE_MAX_PIERCE),
    hitSpecial: new Array(cap * PAPER_PLANE_MAX_PIERCE).fill(null),
    targetIndex: new Int16Array(cap).fill(-1),
    targetGeneration: new Uint16Array(cap),
    targetSpecial: new Array(cap).fill(null),
    // 스캔·피격 임시 공간(풀 하나에 한 벌).
    contactScratch: createWeaponTargetScratch(CONTACT_SCAN),
    retargetScratch: createWeaponTargetScratch(RETARGET_SCAN),
    impact: { source: { x: 0, z: 0 }, knockback: 0.6, knockbackMs: 60, critChance: 0, critMultiplier: 1.5, weaponKey: 'paperPlane' },
  }
}

function growPool(pool) {
  const cap = pool.capacity * 2
  for (const key of ['active', 'posX', 'posZ', 'velX', 'velZ', 'ageMs', 'lifeMs', 'damage', 'critChance', 'critMultiplier', 'turnLeft', 'hitsLeft', 'hitCount', 'targetGeneration']) {
    pool[key] = growTyped(pool[key].constructor, pool[key], cap)
  }
  const targetIndex = new Int16Array(cap).fill(-1)
  targetIndex.set(pool.targetIndex)
  pool.targetIndex = targetIndex
  pool.targetSpecial = pool.targetSpecial.concat(new Array(cap - pool.capacity).fill(null))
  pool.hitIndex = growTyped(Int16Array, pool.hitIndex, cap * PAPER_PLANE_MAX_PIERCE)
  pool.hitGeneration = growTyped(Uint16Array, pool.hitGeneration, cap * PAPER_PLANE_MAX_PIERCE)
  pool.hitSpecial = pool.hitSpecial.concat(new Array((cap - pool.capacity) * PAPER_PLANE_MAX_PIERCE).fill(null))
  pool.capacity = cap
}

export function countActivePaperPlanes(pool) {
  let n = 0
  for (let i = 0; i <= pool.highest; i += 1) n += pool.active[i]
  return n
}

export function clearPaperPlanePool(pool) {
  pool.active.fill(0)
  pool.targetSpecial.fill(null)
  pool.hitSpecial.fill(null)
  pool.highest = -1
}

// 비행기 1대를 슬롯에 넣는다. 빈 슬롯이 없으면 풀을 두 배로 늘린다(상한 없음).
// 좀비 탄처럼 발사 지점(x, z)에서 (dirX, dirZ) 방향으로 E47 속도로 출발한다. pierce = 맞힐 수 있는 적 수(기본 1).
export function spawnPaperPlane(pool, { x, z, dirX, dirZ, damage, pierce = 1, critChance = 0, critMultiplier = 1.5, lifeMs = PAPER_PLANE_LIFETIME_MS, targetIndex = -1, targetGeneration = 0, targetSpecial = null }) {
  let slot = -1
  for (let i = 0; i < pool.capacity; i += 1) {
    if (!pool.active[i]) { slot = i; break }
  }
  if (slot < 0) {
    slot = pool.capacity
    growPool(pool)
  }
  const len = Math.hypot(dirX, dirZ) || 1
  pool.active[slot] = 1
  pool.posX[slot] = x
  pool.posZ[slot] = z
  pool.velX[slot] = (dirX / len) * PAPER_PLANE_SPEED
  pool.velZ[slot] = (dirZ / len) * PAPER_PLANE_SPEED
  pool.ageMs[slot] = 0
  pool.lifeMs[slot] = lifeMs
  pool.damage[slot] = damage
  pool.critChance[slot] = critChance
  pool.critMultiplier[slot] = critMultiplier
  pool.turnLeft[slot] = PAPER_PLANE_TURN_BUDGET
  pool.hitsLeft[slot] = Math.max(1, Math.min(PAPER_PLANE_MAX_PIERCE, Math.floor(pierce) || 1))
  pool.hitCount[slot] = 0
  setPlaneTarget(pool, slot, targetIndex, targetGeneration, targetSpecial)
  if (slot > pool.highest) pool.highest = slot
  return slot
}

function setPlaneTarget(pool, slot, index, generation, special) {
  pool.targetIndex[slot] = special ? -1 : index
  pool.targetGeneration[slot] = generation ?? 0
  pool.targetSpecial[slot] = special ?? null
}

function despawn(pool, slot) {
  pool.active[slot] = 0
  pool.targetSpecial[slot] = null
  const base = slot * PAPER_PLANE_MAX_PIERCE
  for (let k = 0; k < PAPER_PLANE_MAX_PIERCE; k += 1) pool.hitSpecial[base + k] = null
  while (pool.highest >= 0 && !pool.active[pool.highest]) pool.highest -= 1
}

export function hasPaperPlaneHit(pool, slot, index, generation, special) {
  const base = slot * PAPER_PLANE_MAX_PIERCE
  for (let k = 0; k < pool.hitCount[slot]; k += 1) {
    if (special) { if (pool.hitSpecial[base + k] === special) return true }
    else if (pool.hitSpecial[base + k] == null && pool.hitIndex[base + k] === index && pool.hitGeneration[base + k] === (generation ?? 0)) return true
  }
  return false
}

function recordHit(pool, slot, index, generation, special) {
  const k = pool.hitCount[slot]
  if (k >= PAPER_PLANE_MAX_PIERCE) return
  const base = slot * PAPER_PLANE_MAX_PIERCE
  pool.hitIndex[base + k] = special ? -1 : index
  pool.hitGeneration[base + k] = generation ?? 0
  pool.hitSpecial[base + k] = special ?? null
  pool.hitCount[slot] = k + 1
}

function resolveSlotTarget(pool, slot, d) {
  const special = pool.targetSpecial[slot]
  const index = pool.targetIndex[slot]
  if (!special && index < 0) return null
  if (hasPaperPlaneHit(pool, slot, index, pool.targetGeneration[slot], special)) return null
  return d.resolveTarget(index, special ? (pool.targetGeneration[slot] || null) : pool.targetGeneration[slot], special)
}

// 표적이 먼저 죽었거나 이미 뚫고 지나간 적이면, 비행기 근처에서 아직 안 맞힌 가장 가까운 적으로 바꾼다.
// 없으면 표적 없이 직진한다.
function retarget(pool, slot, d) {
  const scratch = pool.retargetScratch
  const n = d.scanRadius(scratch, pool.posX[slot], pool.posZ[slot], PAPER_PLANE_RETARGET_RADIUS, RETARGET_SCAN)
  for (let k = 0; k < n; k += 1) {
    const special = scratch.special[k] ?? null
    const index = scratch.indices[k]
    const generation = scratch.generations[k]
    if (hasPaperPlaneHit(pool, slot, index, generation, special)) continue
    const rb = d.resolveTarget(index, special ? (generation || null) : generation, special)
    if (!rb) continue
    setPlaneTarget(pool, slot, index, generation, special)
    return rb
  }
  setPlaneTarget(pool, slot, -1, 0, null)
  return null
}

// 접촉: 비행기 둘레 PAPER_PLANE_CONTACT_RADIUS 안에서 아직 안 맞힌 적에게 가까운 순으로 피해를 준다.
// 남은 적중 수를 다 쓰면 사라지고, 남았으면 방향 그대로 뚫고 지나간다. 피해가 거절된 적(숨은 매복형 등)은
// 건너뛴다. 반환 = 이번 스텝 적중 수.
function contact(pool, slot, dt, d, onHit) {
  const scratch = pool.contactScratch
  const x = pool.posX[slot]
  const z = pool.posZ[slot]
  const n = d.scanRadius(scratch, x, z, PAPER_PLANE_CONTACT_RADIUS, CONTACT_SCAN)
  if (n <= 0) return 0
  const impact = pool.impact
  impact.source.x = x - pool.velX[slot] * dt
  impact.source.z = z - pool.velZ[slot] * dt
  impact.critChance = pool.critChance[slot]
  impact.critMultiplier = pool.critMultiplier[slot]
  let hits = 0
  for (let k = 0; k < n; k += 1) {
    const special = scratch.special[k] ?? null
    const index = scratch.indices[k]
    const generation = special ? (scratch.generations[k] || null) : scratch.generations[k]
    if (hasPaperPlaneHit(pool, slot, index, generation, special)) continue
    const target = special ?? d.resolveTarget(index, generation, null)
    if (!target) continue
    if (!d.applyHit(target, generation, pool.damage[slot], impact)) continue
    recordHit(pool, slot, index, generation, special)
    hits += 1
    if (onHit) onHit(slot, x, z)
    pool.hitsLeft[slot] -= 1
    if (pool.hitsLeft[slot] <= 0) { despawn(pool, slot); return hits }
    // 관통: 이후로는 표적을 쫓지 않고 지금 방향 그대로 직진한다(연필과 같은 뚫고 지나가기).
    pool.turnLeft[slot] = 0
    setPlaneTarget(pool, slot, -1, 0, null)
  }
  return hits
}

const DEFAULT_DEPS = Object.freeze({
  scanRadius: scanRadiusEnemiesInto,
  resolveTarget: resolveWeaponTarget,
  applyHit: applyEnemyHit,
})

// 한 스텝 진행. 순서는 좀비 탄 풀(projectileZombieShotPool.step)의 HOMING과 같다:
// 나이 → 선회(예산이 남았을 때) → 직진 이동 → 접촉 → 수명.
// onHit(slot, x, z)는 적중마다 1회(효과음 등). 반환 = 이번 스텝 적중 수.
export function stepPaperPlanes(pool, delta, deps = DEFAULT_DEPS, onHit = null) {
  if (!(delta >= 0) || !Number.isFinite(delta)) return 0
  const d = deps === DEFAULT_DEPS ? deps : { ...DEFAULT_DEPS, ...deps }
  const dt = Math.min(delta, MAX_STEP_SEC)
  const dtMs = dt * 1000
  let hits = 0
  for (let i = 0; i <= pool.highest; i += 1) {
    if (!pool.active[i]) continue
    pool.ageMs[i] += dtMs

    if (pool.turnLeft[i] > 0) {
      const rb = resolveSlotTarget(pool, i, d) ?? retarget(pool, i, d)
      if (rb) {
        const t = rb.translation()
        const used = steerHomingVelocity(pool.velX[i], pool.velZ[i], t.x - pool.posX[i], t.z - pool.posZ[i], TURN_RATE_F32, pool.turnLeft[i], dt, _steer)
        if (used !== 0) {
          pool.velX[i] = _steer.x
          pool.velZ[i] = _steer.z
          pool.turnLeft[i] -= used
        }
      }
    }

    pool.posX[i] += pool.velX[i] * dt
    pool.posZ[i] += pool.velZ[i] * dt

    hits += contact(pool, i, dt, d, onHit)
    if (pool.active[i] && pool.ageMs[i] >= pool.lifeMs[i]) despawn(pool, i)
  }
  return hits
}

// 발사 계획: 가장 가까운 적 N명(scratch, 거리순)에게 count대를 나눠 보낸다. 표적이 count보다 적으면
// 같은 표적을 나눠 쫓되 발사각을 부채꼴로 벌린다(겹쳐 한 대로 보이지 않게). 반환 = 생성한 비행기 수.
// 좀비 탄처럼 발사 지점(로자리 자리) 그대로에서 출발한다.
export function launchPaperPlanes(pool, { originX, originZ, weapon, scratch, targetCount, resolveTarget = resolveWeaponTarget }) {
  if (targetCount <= 0) return 0
  const count = Math.max(1, Math.floor(weapon.projectileCount ?? 1))
  let launched = 0
  for (let p = 0; p < count; p += 1) {
    const k = p % targetCount
    const special = scratch.special[k] ?? null
    const index = scratch.indices[k]
    const generation = scratch.generations[k]
    const rb = resolveTarget(index, special ? (generation || null) : generation, special)
    if (!rb) continue
    const t = rb.translation()
    const share = Math.floor(p / targetCount)
    const fan = share === 0 ? 0 : (share % 2 === 1 ? 1 : -1) * Math.ceil(share / 2) * PAPER_PLANE_LAUNCH_SPREAD
    const base = Math.atan2(t.x - originX, t.z - originZ) + fan
    spawnPaperPlane(pool, {
      x: originX,
      z: originZ,
      dirX: Math.sin(base),
      dirZ: Math.cos(base),
      damage: weapon.damage,
      pierce: weapon.pierce ?? 1,
      critChance: weapon.critChance ?? 0,
      critMultiplier: weapon.critMultiplier ?? 1.5,
      targetIndex: index,
      targetGeneration: generation,
      targetSpecial: special,
    })
    launched += 1
  }
  return launched
}
