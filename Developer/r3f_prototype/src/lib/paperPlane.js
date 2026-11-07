// 종이비행기(paperPlane) 무기의 순수 비행·피격 로직 — 2026-11-07 Terry.
// E47 종이비행기 좀비의 탄을 로자리 무기로 가져왔다. 비행기는 언제나 로자리 몸에서 출발하고
// (Terry 규칙: 로자리 발사체는 로자리에서 출발, 동시 개수 상한 없음), 가장 가까운 적을 향해
// 완만하게 선회(글라이드)하며 날아간다. 적을 꿰뚫고 지나가며 pierce회까지 서로 다른 적을 맞히고,
// 맞힐 횟수가 남은 비행기는 수명이 끝날 때까지 근처의 다음 적을 쫓는다.
//
// 메모리 규칙: 풀은 typed array 슬롯이다. 매 프레임 할당이 없고, 빈 슬롯이 없을 때만 용량을
// 두 배로 늘린다(줄이지 않음). 컴포넌트는 같은 슬롯 인덱스로 InstancedMesh 행렬을 쓴다.
import { createWeaponTargetScratch, resolveWeaponTarget, scanRadiusEnemiesInto, scanSweptCapsuleEnemiesInto } from './weaponTargeting.js'
import { applyEnemyHit } from './weaponCollision.js'

// 거리 단위: 1블록 = 0.75u.
export const PAPER_PLANE_SPEED = 6.5            // u/s (연필 12의 절반 남짓 — 눈으로 따라갈 수 있는 활공)
export const PAPER_PLANE_LIFETIME_MS = 4000     // 수명 4초 → 최대 비행거리 26u
export const PAPER_PLANE_TURN_RATE = 4.5        // rad/s 기본 선회(곡선을 그리며 꺾인다)
export const PAPER_PLANE_CLOSE_TURN_RATE = 14   // 표적 1.4u(약 2블록) 안에서는 급선회 — 표적 둘레를 맴돌지 않게
export const PAPER_PLANE_CLOSE_DISTANCE = 1.4
export const PAPER_PLANE_HIT_RADIUS = 0.36      // 스윕 캡슐 반경
export const PAPER_PLANE_RETARGET_RADIUS = 6    // 다음 표적 탐색 반경 6u = 8블록
export const PAPER_PLANE_MAX_PIERCE = 8         // 비행기당 기록하는 적중 수 상한(카드 cap 5 + 영구강화 여유)
export const PAPER_PLANE_LAUNCH_SPREAD = 0.32   // 같은 표적을 나눠 쫓는 비행기 간 발사각 차이(rad)
export const PAPER_PLANE_HEIGHT = 0.55          // 비행 높이(로자리 허리께)

const RETARGET_SCAN = 8

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
    dirX: new Float32Array(cap),
    dirZ: new Float32Array(cap),
    ageMs: new Float32Array(cap),
    lifeMs: new Float32Array(cap),
    damage: new Float32Array(cap),
    critChance: new Float32Array(cap),
    critMultiplier: new Float32Array(cap),
    hitsLeft: new Uint8Array(cap),
    targetIndex: new Int16Array(cap).fill(-1),
    targetGeneration: new Uint16Array(cap),
    targetSpecial: new Array(cap).fill(null),
    hitCount: new Uint8Array(cap),
    hitIndex: new Int16Array(cap * PAPER_PLANE_MAX_PIERCE),
    hitGeneration: new Uint16Array(cap * PAPER_PLANE_MAX_PIERCE),
    hitSpecial: new Array(cap * PAPER_PLANE_MAX_PIERCE).fill(null),
    // 스캔·피격 임시 공간(풀 하나에 한 벌).
    sweepScratch: createWeaponTargetScratch(16),
    retargetScratch: createWeaponTargetScratch(RETARGET_SCAN),
    impact: { source: { x: 0, z: 0 }, knockback: 0.6, knockbackMs: 60, critChance: 0, critMultiplier: 1.5, weaponKey: 'paperPlane' },
  }
}

function growPool(pool) {
  const cap = pool.capacity * 2
  for (const key of ['active', 'posX', 'posZ', 'dirX', 'dirZ', 'ageMs', 'lifeMs', 'damage', 'critChance', 'critMultiplier', 'hitsLeft', 'targetGeneration', 'hitCount']) {
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
export function spawnPaperPlane(pool, { x, z, dirX, dirZ, damage, pierce, critChance = 0, critMultiplier = 1.5, lifeMs = PAPER_PLANE_LIFETIME_MS, targetIndex = -1, targetGeneration = 0, targetSpecial = null }) {
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
  pool.dirX[slot] = dirX / len
  pool.dirZ[slot] = dirZ / len
  pool.ageMs[slot] = 0
  pool.lifeMs[slot] = lifeMs
  pool.damage[slot] = damage
  pool.critChance[slot] = critChance
  pool.critMultiplier[slot] = critMultiplier
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

// 남은 비행기가 쫓을 다음 적: 비행기 근처에서 가장 가까운, 아직 맞히지 않은 적.
function retarget(pool, slot, deps) {
  const scratch = pool.retargetScratch
  const n = deps.scanRadius(scratch, pool.posX[slot], pool.posZ[slot], PAPER_PLANE_RETARGET_RADIUS, RETARGET_SCAN)
  for (let k = 0; k < n; k += 1) {
    const special = scratch.special[k] ?? null
    const index = scratch.indices[k]
    const generation = scratch.generations[k]
    if (hasPaperPlaneHit(pool, slot, index, generation, special)) continue
    setPlaneTarget(pool, slot, index, generation, special)
    return true
  }
  setPlaneTarget(pool, slot, -1, 0, null)
  return false
}

const DEFAULT_DEPS = Object.freeze({
  scanRadius: scanRadiusEnemiesInto,
  scanSweep: scanSweptCapsuleEnemiesInto,
  resolveTarget: resolveWeaponTarget,
  applyHit: applyEnemyHit,
})

// 한 고정 스텝 진행. onHit(slot, x, z)는 적중마다 1회(효과음 등). 반환 = 이번 스텝 적중 수.
export function stepPaperPlanes(pool, dt, deps = DEFAULT_DEPS, onHit = null) {
  const d = deps === DEFAULT_DEPS ? deps : { ...DEFAULT_DEPS, ...deps }
  const dtMs = dt * 1000
  let hits = 0
  for (let i = 0; i <= pool.highest; i += 1) {
    if (!pool.active[i]) continue
    pool.ageMs[i] += dtMs
    if (pool.ageMs[i] >= pool.lifeMs[i]) { despawn(pool, i); continue }

    // 표적 확인 — 죽었거나(세대 바뀜) 이미 맞힌 적이면 근처의 다음 적으로 바꾼다.
    const special = pool.targetSpecial[i]
    const tIndex = pool.targetIndex[i]
    let rb = (special || tIndex >= 0) ? d.resolveTarget(tIndex, special ? (pool.targetGeneration[i] || null) : pool.targetGeneration[i], special) : null
    if (!rb || hasPaperPlaneHit(pool, i, tIndex, pool.targetGeneration[i], special)) {
      rb = null
      if (retarget(pool, i, d)) {
        const s2 = pool.targetSpecial[i]
        rb = d.resolveTarget(pool.targetIndex[i], s2 ? (pool.targetGeneration[i] || null) : pool.targetGeneration[i], s2)
      }
    }

    // 활공 선회: 표적 방향으로 최대 turnRate×dt만 꺾는다. 표적이 없으면 직진한다.
    if (rb) {
      const t = rb.translation()
      const tx = t.x - pool.posX[i]
      const tz = t.z - pool.posZ[i]
      const dist = Math.hypot(tx, tz)
      if (dist > 1e-4) {
        const cx = pool.dirX[i]
        const cz = pool.dirZ[i]
        const cross = cx * tz - cz * tx
        const dot = cx * tx + cz * tz
        const want = Math.atan2(cross, dot)
        const rate = dist < PAPER_PLANE_CLOSE_DISTANCE ? PAPER_PLANE_CLOSE_TURN_RATE : PAPER_PLANE_TURN_RATE
        const maxTurn = rate * dt
        const a = want > maxTurn ? maxTurn : (want < -maxTurn ? -maxTurn : want)
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        pool.dirX[i] = cx * cos - cz * sin
        pool.dirZ[i] = cx * sin + cz * cos
      }
    }

    const fromX = pool.posX[i]
    const fromZ = pool.posZ[i]
    const toX = fromX + pool.dirX[i] * PAPER_PLANE_SPEED * dt
    const toZ = fromZ + pool.dirZ[i] * PAPER_PLANE_SPEED * dt
    pool.posX[i] = toX
    pool.posZ[i] = toZ

    // 꿰뚫기: 이번 스텝에 지나간 캡슐 안의 적을 순서대로, 아직 안 맞힌 적만 1회씩 때린다.
    const sweep = pool.sweepScratch
    const n = d.scanSweep(sweep, fromX, fromZ, toX, toZ, PAPER_PLANE_HIT_RADIUS, sweep.indices.length)
    const impact = pool.impact
    for (let k = 0; k < n && pool.active[i]; k += 1) {
      const sp = sweep.special[k] ?? null
      const index = sweep.indices[k]
      const generation = sp ? (sweep.generations[k] || null) : sweep.generations[k]
      if (hasPaperPlaneHit(pool, i, index, generation, sp)) continue
      const target = sp ?? d.resolveTarget(index, generation, null)
      if (!target) continue
      impact.source.x = fromX
      impact.source.z = fromZ
      impact.critChance = pool.critChance[i]
      impact.critMultiplier = pool.critMultiplier[i]
      if (!d.applyHit(target, generation, pool.damage[i], impact)) continue
      recordHit(pool, i, index, generation, sp)
      hits += 1
      if (onHit) onHit(i, toX, toZ)
      pool.hitsLeft[i] -= 1
      if (pool.hitsLeft[i] <= 0) despawn(pool, i)
    }
  }
  return hits
}

// 발사 계획: 가장 가까운 적 N명(scratch, 거리순)에게 count대를 나눠 보낸다. 표적이 count보다 적으면
// 같은 표적을 나눠 쫓되 발사각을 부채꼴로 벌린다. 반환 = 생성한 비행기 수.
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
      x: originX + Math.sin(base) * 0.3,
      z: originZ + Math.cos(base) * 0.3,
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
