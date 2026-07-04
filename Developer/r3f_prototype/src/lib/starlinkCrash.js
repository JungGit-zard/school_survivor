// 고장난 스타링크 — 30회 발사 후 위성 추락 연출의 순수 로직.
// 전부 "연출 전용"이다: 데미지 0, 콜라이더 없음, 무기 발사 로직/스탯과 완전 분리.
// 30발마다 위성이 추락·폭발하고 좀론비스크가 화면 밖으로 도망간다.
// 무기는 새 위성이 도착한 것으로 간주하고 정상 발사를 지속한다(카운터만 리셋).

export const STARLINK_CRASH_FIRE_COUNT = 30

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
