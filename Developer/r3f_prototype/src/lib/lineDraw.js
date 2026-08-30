// 「선긋기」 전투 규칙의 순수 계산부.
// 정본 기획: Planner/game_contents/weapons/slash_evolution_weapon_concepts_2026-08-09.md §2
// 스탯 정본은 weaponCatalog.js의 lineDraw.base 하나뿐이다.
//
// 이 무기의 정체성은 "서 있는 적을 지지는 장판이 아니라, 넘어오면 잘리는 선"이다.
// 따라서 잔류 절단선 판정은 거리 기반(선 근처 = 피격)이 아니라 **교차 기반**이다:
// 적의 직전 프레임 위치 → 현재 위치를 잇는 이동 선분이 절단선과 교차했을 때만 잘린다.
// 선 위에 가만히 서 있는 적은 이동 선분이 길이 0이라 절대 교차하지 않는다(= 안 맞는다).
// 선을 따라 나란히 미끄러지는 이동도 평행/공선이라 교차로 치지 않는다.

import { normalizePlanarFacing, pickBoxCutterTargets } from './boxCutter.js'
import { enemyEntityId } from './enemyEntityPool.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { applyEnemyHit, captureEnemyGeneration, isEnemyHitLive } from './weaponCollision.js'
import { isPlayerWeaponSightBlocked } from './weaponTargeting.js'

const BASE = WEAPON_CATALOG.lineDraw.base

export function rotateLineDrawFacing90(facing) {
  const dir = normalizePlanarFacing(facing)
  return { x: dir.z, z: -dir.x }
}

function num(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// ── 절단선 수명 관리 ──────────────────────────────────────────────────────────
// 절단선은 동시에 여러 개 존재할 수 있다. 기본값(쿨다운 4200 > 지속 2000)에서는 보통 1개지만,
// 쿨다운 감소 강화가 붙으면 겹칠 수 있으므로 항상 배열로 다룬다.

export function createLineDrawRuntime() {
  return {
    lines: [],
    nextLineId: 1,
    // entityKey -> { x, z, lastCutMs } — 직전 프레임 위치와 재절단 쿨다운을 함께 들고 있다.
    tracked: new Map(),
  }
}

// 절단선은 플레이어 발밑에서 전방으로 range만큼 뻗은 선분이다.
export function buildCutLine({ origin, facing, range = BASE.range, nowMs = 0, durationMs = BASE.lineDurationMs, id = 0 }) {
  const dir = normalizePlanarFacing(facing)
  const len = num(range, BASE.range)
  const ax = num(origin?.x, 0)
  const az = num(origin?.z, 0)
  return {
    id,
    ax,
    az,
    bx: ax + dir.x * len,
    bz: az + dir.z * len,
    dirX: dir.x,
    dirZ: dir.z,
    startMs: nowMs,
    expiresMs: nowMs + num(durationMs, BASE.lineDurationMs),
  }
}

export function spawnCutLine(runtime, options) {
  const line = buildCutLine({ ...options, id: runtime.nextLineId })
  runtime.nextLineId += 1
  runtime.lines.push(line)
  return line
}

// 만료된 절단선을 걷어내고 그 목록을 돌려준다(소멸 SFX·연출 트리거용).
export function pruneExpiredCutLines(runtime, nowMs) {
  if (runtime.lines.length === 0) return []
  const expired = []
  const live = []
  for (const line of runtime.lines) {
    if (nowMs >= line.expiresMs) expired.push(line)
    else live.push(line)
  }
  runtime.lines = live
  return expired
}

// ── 선분-선분 교차 판정 ───────────────────────────────────────────────────────
// 이 무기의 핵심 사양. 두 선분이 실제로 가로지를 때만 true.
// - 이동 선분이 길이 0(제자리)이면 denom이 0이라 항상 false → "선 위에 서 있는 적은 안 맞는다".
// - 평행/공선(선을 따라 미끄러짐)도 denom 0이라 false → 선을 따라 걷는다고 잘리지 않는다.
function cross2(ax, az, bx, bz) {
  return ax * bz - az * bx
}

export function segmentsIntersect(p0, p1, q0, q1) {
  const d1x = num(p1?.x, 0) - num(p0?.x, 0)
  const d1z = num(p1?.z, 0) - num(p0?.z, 0)
  const d2x = num(q1?.x, 0) - num(q0?.x, 0)
  const d2z = num(q1?.z, 0) - num(q0?.z, 0)
  const denom = cross2(d1x, d1z, d2x, d2z)
  if (denom === 0) return false

  const sx = num(q0?.x, 0) - num(p0?.x, 0)
  const sz = num(q0?.z, 0) - num(p0?.z, 0)
  const t = cross2(sx, sz, d2x, d2z) / denom
  if (t < 0 || t > 1) return false
  const u = cross2(sx, sz, d1x, d1z) / denom
  return u >= 0 && u <= 1
}

export function doesMovementCrossLine(prev, cur, line) {
  if (!prev || !cur || !line) return false
  return segmentsIntersect(prev, cur, { x: line.ax, z: line.az }, { x: line.bx, z: line.bz })
}

// ── 같은 적 재절단 쿨다운 ─────────────────────────────────────────────────────
export function canCutEntity(entry, nowMs, cooldownMs = BASE.lineCrossCooldownMs) {
  if (!entry || !Number.isFinite(entry.lastCutMs)) return true
  return nowMs - entry.lastCutMs >= num(cooldownMs, BASE.lineCrossCooldownMs)
}

// ── 긋는 순간의 직격 ──────────────────────────────────────────────────────────
// 잔류 절단선의 통과 판정과는 완전히 별개인 즉시 판정이다. 선상의 적 전원이 한 번에 맞는다.
// 관통 무제한이므로 대상 수 제한이 없고, 넉백 0이라 밀리지 않는다(자를 대고 그은 직선).
export function applyLineDrawStrike({
  origin,
  facing,
  range = BASE.range,
  width = BASE.width,
  damage = BASE.damage,
  knockback = BASE.knockback,
  critChance,
  critMultiplier,
  enemies = globalEnemyBodies,
  sightBlocker = isPlayerWeaponSightBlocked,
  onHit,
}) {
  const targets = pickBoxCutterTargets({
    enemies,
    origin,
    facing: normalizePlanarFacing(facing),
    range: num(range, BASE.range),
    width: num(width, BASE.width),
    sightBlocker,
  })

  let hits = 0
  for (const target of targets) {
    const hit = applyEnemyHit(target.rb, target.generation, num(damage, BASE.damage), {
      source: { x: num(origin?.x, 0), z: num(origin?.z, 0) },
      knockback: num(knockback, 0),
      knockbackMs: 0,
      critChance,
      critMultiplier,
    })
    if (!hit) continue
    hits += 1
    onHit?.(target)
  }
  return hits
}

// ── 잔류 절단선 통과 판정 ─────────────────────────────────────────────────────
// 매 프레임 호출한다. 살아있는 적 전원의 위치를 새 Map으로 다시 쌓으므로 죽은 적 항목은
// 자동으로 사라진다(별도 GC 불필요). 절단선이 하나도 없으면 추적 자체를 비우고 즉시 빠진다.
export function updateCutLineCrossings(runtime, {
  nowMs,
  damage = BASE.lineCrossDamage,
  cooldownMs = BASE.lineCrossCooldownMs,
  knockback = BASE.knockback,
  critChance,
  critMultiplier,
  enemies = globalEnemyBodies,
  sightBlocker = isPlayerWeaponSightBlocked,
  onCut,
} = {}) {
  if (!runtime) return 0
  if (runtime.lines.length === 0) {
    if (runtime.tracked.size > 0) runtime.tracked.clear()
    return 0
  }

  const prevTracked = runtime.tracked
  const next = new Map()
  let cuts = 0

  const visit = (key, x, z, rb, generation) => {
    const prev = prevTracked.get(key)
    let lastCutMs = prev?.lastCutMs ?? NaN

    if (prev && canCutEntity(prev, nowMs, cooldownMs)) {
      const cur = { x, z }
      for (const line of runtime.lines) {
        if (!doesMovementCrossLine(prev, cur, line)) continue
        if (sightBlocker({ x, z })) break
        const hit = applyEnemyHit(rb, generation, num(damage, BASE.lineCrossDamage), {
          source: { x: line.ax, z: line.az },
          knockback: num(knockback, 0),
          knockbackMs: 0,
          critChance,
          critMultiplier,
        })
        if (!hit) break
        lastCutMs = nowMs
        cuts += 1
        onCut?.({ x, z, line, rb, generation })
        break // 한 프레임에 여러 선을 동시에 넘어도 절단은 1회다.
      }
    }

    next.set(key, { x, z, lastCutMs })
  }

  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const generation = enemyPool.generation[index]
    visit(
      enemyEntityId(index, generation),
      enemyPool.posX[index],
      enemyPool.posZ[index],
      enemyPool.proxies[index],
      generation,
    )
  }

  if (enemies?.forEach) {
    enemies.forEach((rb, enemyId) => {
      if (Number.isInteger(rb?.index) && enemyPool.proxies[rb.index] === rb) return // 풀 프록시 중복 등록
      if (!isEnemyHitLive(rb) || !rb.translation) return
      const t = rb.translation()
      if (!t) return
      visit(enemyId, t.x, t.z, rb, captureEnemyGeneration(rb))
    })
  }

  runtime.tracked = next
  return cuts
}
