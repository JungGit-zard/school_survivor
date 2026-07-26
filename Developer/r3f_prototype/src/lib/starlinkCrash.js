// 고장난 스타링크 — 15회 유효 발사 후 위성 추락과 착지 피해의 순수 로직.
// 첫 착지는 지우개 폭탄 계약의 피해를 1회 적용하며, 선택한 보스의 최신 좌표를 추적한다.
// 15발마다 위성이 추락·폭발하고 좀론비스크가 화면 밖으로 도망간다.
// 무기는 새 위성이 도착한 것으로 간주하고 정상 발사를 지속한다(카운터만 리셋).

import { isBossType } from './burstEvents.js'

export const STARLINK_CRASH_FIRE_COUNT = 15

// 시퀀스 타이밍 (ms)
export const CRASH_FALL_MS = 2700         // 낙하 시간
export const CRASH_EXPLOSION_MS = 620     // 폭발 이펙트 지속
export const ZOMLON_SPAWN_DELAY_MS = 260  // 착지 후 좀론비스크 등장까지
export const ZOMLON_MAX_ESCAPE_MS = 2000  // 도주 최대 시간 (안전 언마운트)

// 공간 파라미터
export const CRASH_START_HEIGHT = 9                      // 화면 위 시작 고도
export const CRASH_START_LATERAL = { x: 3.2, z: -2.1 }   // 기울며 진입하는 측면 오프셋
export const CRASH_LAND_MIN_DIST = 1.6                   // 플레이어 기준 착지점 최소 거리
export const CRASH_LAND_MAX_DIST = 3.5                   // 최대 거리
export const CRASH_TILT_RAD = Math.PI / 4                // 45deg
export const ZOMLON_ESCAPE_SPEED = 3.0                   // units/sec
export const ESCAPE_MARGIN = 1.6                         // 화면 경계 밖 여유 거리

// 발사 카운터 진행. threshold회째 발사에서 trigger=true, 카운터는 0으로 리셋.
export function advanceCrashCounter(count, threshold = STARLINK_CRASH_FIRE_COUNT) {
  const next = count + 1
  if (next >= threshold) return { count: 0, trigger: true }
  return { count: next, trigger: false }
}

// 플레이어 근처 무작위 착지점.
export function pickCrashLandingPoint(px, pz, rand = Math.random) {
  const angle = rand() * Math.PI * 2
  const dist = CRASH_LAND_MIN_DIST + rand() * (CRASH_LAND_MAX_DIST - CRASH_LAND_MIN_DIST)
  return { x: px + Math.cos(angle) * dist, z: pz + Math.sin(angle) * dist }
}

// 화면에 살아 있는 보스가 있으면 항상 그 보스 좌표를 선택한다.
// 여러 보스는 Map 키의 문자열 정렬 순으로 고정해 프레임/삽입 순서에 흔들리지 않는다.
export function selectCrashLandingPoint({ playerPos, enemyBodies, screenBounds, random = Math.random }) {
  let selected = null

  for (const [id, rb] of enemyBodies) {
    if (!isBossType(rb?._enemyType) || rb._enemyDead || (typeof rb.isValid === 'function' && !rb.isValid()) || typeof rb._enemyHit !== 'function' || typeof rb.translation !== 'function') continue
    const position = rb.translation()
    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) continue
    if (position.x < screenBounds.minX || position.x > screenBounds.maxX || position.z < screenBounds.minZ || position.z > screenBounds.maxZ) continue

    const stableId = String(id)
    if (!selected || stableId < selected.stableId) selected = { id, stableId, x: position.x, z: position.z }
  }

  if (selected) return { x: selected.x, z: selected.z, bossId: selected.id }
  const point = pickCrashLandingPoint(playerPos.x, playerPos.z, random)
  return { ...point, bossId: null }
}

// 낙하 중에는 선택했던 보스 ID만 읽어 동일한 end 객체를 최신 좌표로 갱신한다.
// 보스가 사망·제거·무효화되면 마지막 유효 좌표를 그대로 유지한다.
export function refreshCrashLandingEnd(end, bossId, enemyBodies) {
  if (bossId == null) return false
  const rb = enemyBodies.get(bossId)
  if (!rb || rb._enemyDead || (typeof rb.isValid === 'function' && !rb.isValid()) || typeof rb._enemyHit !== 'function' || typeof rb.translation !== 'function') return false
  const position = rb.translation()
  if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false
  end.x = position.x
  end.z = position.z
  return true
}

// 첫 착지 프레임만 충격을 허용한다. React 재렌더와 무관하게 one-shot으로 쓸 수 있다.
// 첫 착지에서만 현재 end 객체 자체를 넘긴다. 호출자는 참조를 복사하지 않고 즉시 피해 중심으로 사용한다.
export function consumeCrashImpactEnd(impacted, phase, end) {
  return !impacted && phase === 'landed' ? end : null
}

// 낙하 궤적 보간. t: 0..1 (clamp). ease-in 제곱으로 중력 가속감.
// t=0: 화면 위(측면 오프셋 위치), t=1: 착지점 (y=0).
export function getCrashPose(end, t) {
  const c = Math.min(1, Math.max(0, t))
  const ease = c * c
  return {
    x: end.x + CRASH_START_LATERAL.x * (1 - ease),
    y: CRASH_START_HEIGHT * (1 - ease),
    z: end.z + CRASH_START_LATERAL.z * (1 - ease),
    tilt: CRASH_TILT_RAD,
    spin: c * Math.PI * 2.2,  // 낙하 중 Y축 회전
  }
}

// 경과 시간 → 시퀀스 단계.
// falling: 낙하 중 (t: 낙하 진행도 0..1)
// landed:  착지 이후 (t: 폭발 진행도 0..1, explosionMs: 착지 후 경과)
export function getCrashPhase(elapsedMs) {
  if (elapsedMs < CRASH_FALL_MS) {
    return { phase: 'falling', t: elapsedMs / CRASH_FALL_MS }
  }
  const explosionMs = elapsedMs - CRASH_FALL_MS
  return { phase: 'landed', t: Math.min(1, explosionMs / CRASH_EXPLOSION_MS), explosionMs }
}

// (x, z)에서 가장 가까운 화면 밖 방향의 단위 벡터.
export function pickEscapeDirection(x, z, bounds) {
  const options = [
    { d: x - bounds.minX, dir: { x: -1, z: 0 } },
    { d: bounds.maxX - x, dir: { x: 1, z: 0 } },
    { d: z - bounds.minZ, dir: { x: 0, z: -1 } },
    { d: bounds.maxZ - z, dir: { x: 0, z: 1 } },
  ]
  let best = options[0]
  for (const option of options) {
    if (option.d < best.d) best = option
  }
  return best.dir
}

// 도주 경과 시간에 따른 좀론비스크 위치.
export function getZomlonPosition(origin, dir, escapeElapsedMs, speed = ZOMLON_ESCAPE_SPEED) {
  const dist = (escapeElapsedMs / 1000) * speed
  return { x: origin.x + dir.x * dist, z: origin.z + dir.z * dist }
}

// 화면 밖 이탈(또는 타임아웃) 판정 — true면 언마운트.
export function isEscapeDone(pos, bounds, escapeElapsedMs, margin = ESCAPE_MARGIN) {
  if (escapeElapsedMs >= ZOMLON_MAX_ESCAPE_MS) return true
  return (
    pos.x < bounds.minX - margin ||
    pos.x > bounds.maxX + margin ||
    pos.z < bounds.minZ - margin ||
    pos.z > bounds.maxZ + margin
  )
}
