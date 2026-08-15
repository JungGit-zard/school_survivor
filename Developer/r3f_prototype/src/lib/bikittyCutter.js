// 바이키티 커터칼 전투 규칙의 순수 계산부.
// 정본 기획: Planner/game_contents/weapons/slash_evolution_weapon_concepts_2026-08-09.md §1
// 스탯 정본은 weaponCatalog.js의 bikittyCutter.base 하나뿐이며, 여기서는 그 값에서
// "몇 단째 날인가"에 따른 유효 사거리·유효 위력과 부러짐 산탄 판정만 파생시킨다.
//
// 단(segment)은 0부터 시작해 segments-1(=7)에서 부러진다. 즉 8타가 한 사이클이다.

import { normalizePlanarFacing } from './boxCutter.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { applyEnemyHit, isEnemyHitLive } from './weaponCollision.js'
import {
  createWeaponTargetScratch,
  isPlayerWeaponSightBlocked,
  resolveWeaponTarget,
  scanRadiusEnemiesInto,
} from './weaponTargeting.js'

const BASE = WEAPON_CATALOG.bikittyCutter.base

function num(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// 런타임 무기 객체는 레벨업·치비코 보정으로 값이 바뀔 수 있으므로 항상 무기 쪽을 먼저 읽고,
// 없을 때만 카탈로그 base로 떨어진다.
export function bikittySegmentCount(weapon) {
  const n = Math.floor(num(weapon?.segments, BASE.segments))
  return n > 0 ? n : BASE.segments
}

export function clampBikittySegment(segment, weapon) {
  const max = bikittySegmentCount(weapon) - 1
  const s = Math.floor(num(segment, 0))
  return Math.min(max, Math.max(0, s))
}

// 유효 사거리 = range + segmentRangeStep × segment. (기본값 기준 segment 0 → 1.0, 7 → 2.26)
export function bikittySegmentRange(weapon, segment) {
  const s = clampBikittySegment(segment, weapon)
  return num(weapon?.range, BASE.range) + num(weapon?.segmentRangeStep, BASE.segmentRangeStep) * s
}

// 유효 위력 = damage × (1 + segmentDamageStep × segment). 가산 배율이라 7단에서 ×1.84.
export function bikittySegmentDamage(weapon, segment) {
  const s = clampBikittySegment(segment, weapon)
  return num(weapon?.damage, BASE.damage) * (1 + num(weapon?.segmentDamageStep, BASE.segmentDamageStep) * s)
}

export function isBikittySnapSegment(weapon, segment) {
  return clampBikittySegment(segment, weapon) >= bikittySegmentCount(weapon) - 1
}

// 다음 단. 부러지는 단이었으면 1단(=0)으로 리셋된다.
export function nextBikittySegment(weapon, segment) {
  if (isBikittySnapSegment(weapon, segment)) return 0
  return clampBikittySegment(segment, weapon) + 1
}

// ── 사이클 검산용 (밸런스 회귀 방지) ────────────────────────────────────────────
export function bikittyCycleDamage(weapon) {
  const count = bikittySegmentCount(weapon)
  let total = 0
  for (let s = 0; s < count; s += 1) total += bikittySegmentDamage(weapon, s)
  return total + num(weapon?.snapDamage, BASE.snapDamage)
}

// 사이클 시간 = (단 수 × 쿨다운) + reloadMs.
// reloadMs는 쿨다운을 대체하는 값이 아니라 마지막 타격 뒤에 얹히는 추가 무장해제 시간이다.
// 두 값이 겹쳐 흐르면(reload 1200 < cooldown 2400) 재장전이 실효 시간을 전혀 못 깎으므로,
// 무기 컴포넌트도 부러진 직후 다음 발사를 cooldown + reloadMs 뒤로 미룬다.
export function bikittyCycleMs(weapon) {
  return bikittySegmentCount(weapon) * num(weapon?.cooldown, BASE.cooldown)
    + num(weapon?.reloadMs, BASE.reloadMs)
}

export function bikittyCycleDps(weapon) {
  const ms = bikittyCycleMs(weapon)
  return ms > 0 ? bikittyCycleDamage(weapon) / (ms / 1000) : 0
}

// ── 부러짐 산탄(전방 부채꼴) ────────────────────────────────────────────────────
// 단순화 합의(소유자 확정): 펠릿을 개별 시뮬레이션하지 않는다. 부채꼴 안에 든 적 전원이
// snapDamage를 1회씩 그대로 받는다. 파편 VFX 자체가 아직 없어서 카탈로그에도 펠릿 수 스탯을
// 두지 않는다 — 연출을 만들 때 함께 되살린다.
export function isPointInBikittyFan({ origin, facing, point, range, arcDeg }) {
  if (!origin || !point) return false
  const safeRange = num(range, BASE.snapRange)
  const dx = num(point.x, 0) - num(origin.x, 0)
  const dz = num(point.z, 0) - num(origin.z, 0)
  const distSq = dx * dx + dz * dz
  if (distSq > safeRange * safeRange) return false
  if (distSq <= 1e-8) return true // 발밑에 겹친 적은 각도를 정의할 수 없으므로 포함시킨다.

  const dir = normalizePlanarFacing(facing)
  const cos = (dx * dir.x + dz * dir.z) / Math.sqrt(distSq)
  const halfArc = (num(arcDeg, BASE.snapArcDeg) / 2) * (Math.PI / 180)
  return cos >= Math.cos(halfArc)
}

const fanScratch = createWeaponTargetScratch()

export function applyBikittySnapDamage({
  origin,
  facing,
  range = BASE.snapRange,
  arcDeg = BASE.snapArcDeg,
  damage = BASE.snapDamage,
  knockback,
  knockbackMs,
  critChance,
  critMultiplier,
  sightBlocker = isPlayerWeaponSightBlocked,
}) {
  if (!origin || !Number.isFinite(damage)) return 0

  let hits = 0
  const count = scanRadiusEnemiesInto(fanScratch, origin.x, origin.z, range)
  for (let i = 0; i < count; i += 1) {
    const special = fanScratch.special[i]
    const generation = special ? (fanScratch.generations[i] || null) : fanScratch.generations[i]
    const rb = special ?? resolveWeaponTarget(fanScratch.indices[i], generation, null)
    if (!rb || !isEnemyHitLive(rb, generation)) continue
    const t = rb.translation?.()
    if (!t) continue
    if (!isPointInBikittyFan({ origin, facing, point: t, range, arcDeg })) continue
    if (sightBlocker(t)) continue
    const hit = applyEnemyHit(rb, generation, damage, {
      source: { x: origin.x, z: origin.z },
      knockback,
      knockbackMs,
      critChance,
      critMultiplier,
    })
    if (hit) hits += 1
  }
  return hits
}
