// 원거리 탄·사선이 solid 프롭에 막히는 스테이지 규칙(2026-11-08, 스펙 Part B §3-4 "solid는 E04·투사체 좀비 시야를 끊는다").
// Stage 5 교무실 전용이다. Stage 4 급식실은 balanceqa 기준선(사망 32%) 보존을 위해 일부러 넣지 않는다 —
// 이 술어에 stage4를 더하면 S4 난이도가 바뀐다.
//
// 장애물은 getStageObjectSightObstacles가 만든 회전 OBB { x, z, halfX, halfZ, cosY, sinY }다(직접 만든 리터럴은
// rotationY 폴백). 이 모듈은 React/Three/Rapier에 의존하지 않는 순수 기하다. 단위 u(1블록 = 4u).

export const RANGED_PROP_BLOCK_STAGE_IDS = Object.freeze(['stage5'])

export function isRangedPropBlockStage(stageId) {
  return RANGED_PROP_BLOCK_STAGE_IDS.includes(stageId)
}

function cosOf(o) { return o.cosY !== undefined ? o.cosY : (o.rotationY ? Math.cos(o.rotationY) : 1) }
function sinOf(o) { return o.sinY !== undefined ? o.sinY : (o.rotationY ? Math.sin(o.rotationY) : 0) }

// 반지름 radius인 점(탄)이 어느 장애물 OBB(반크기 + radius) 안에 있는가.
export function isPointInsideRangedBlockers(x, z, radius, obstacles) {
  if (!obstacles) return false
  for (let i = 0; i < obstacles.length; i += 1) {
    const o = obstacles[i]
    const dx = x - o.x
    const dz = z - o.z
    const c = cosOf(o)
    const s = sinOf(o)
    if (Math.abs(dx * c - dz * s) <= o.halfX + radius && Math.abs(dx * s + dz * c) <= o.halfZ + radius) return true
  }
  return false
}

// 선분(사수 → 플레이어)이 장애물 OBB(반크기 + padding)를 지나는가 — 슬랩 판정.
export function isSegmentBlockedByRangedBlockers(ax, az, bx, bz, obstacles, padding = 0) {
  if (!obstacles) return false
  for (let i = 0; i < obstacles.length; i += 1) {
    const o = obstacles[i]
    const c = cosOf(o)
    const s = sinOf(o)
    const ox = ax - o.x, oz = az - o.z
    const tx = bx - o.x, tz = bz - o.z
    const x0 = ox * c - oz * s, z0 = ox * s + oz * c
    const x1 = tx * c - tz * s, z1 = tx * s + tz * c
    const hx = o.halfX + padding, hz = o.halfZ + padding
    let enter = 0, exit = 1
    let blocked = true
    for (const [p0, p1, h] of [[x0, x1, hx], [z0, z1, hz]]) {
      const d = p1 - p0
      if (Math.abs(d) < 1e-12) {
        if (p0 < -h || p0 > h) { blocked = false; break }
        continue
      }
      let t0 = (-h - p0) / d
      let t1 = (h - p0) / d
      if (t0 > t1) { const t = t0; t0 = t1; t1 = t }
      if (t0 > enter) enter = t0
      if (t1 < exit) exit = t1
      if (enter > exit) { blocked = false; break }
    }
    if (blocked) return true
  }
  return false
}

// E04가 사격을 "시작"해도 되는가: 사선(탄 반지름만큼 두께)이 solid 프롭에 막히지 않아야 한다.
export function hasClearRangedSight(fromX, fromZ, toX, toZ, obstacles, padding = 0) {
  return !isSegmentBlockedByRangedBlockers(fromX, fromZ, toX, toZ, obstacles, padding)
}
