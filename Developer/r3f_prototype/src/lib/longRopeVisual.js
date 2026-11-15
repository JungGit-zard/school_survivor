// E95 긴줄넘기 듀오(Stage 3 치프)의 줄 비주얼 정본 — 순수 함수(three·React 의존 없음). 2026-11-15, threemini.
//
// 줄 양끝 = 확장 공격 맵(lib/expansionAttackRuntime.js expansionAttackSnapshots)의 E95 줄 스냅샷이 예고 시작 순간 고정한 양끝이다.
// 살아 있는 두 몸 위치가 아니다: 안전 구간(recovery)에 두 몸이 다시 걸어도 줄은 고정 자리에 떠 있다.
//   A = originXZ, B = originXZ + directionXZ × rangeUnits — expansionAttackSafety.expansionAuthoredPolygons('line')와 같은 식.
// 단계(스냅샷 phase가 정본 — behavior ropePhase와 같다):
//   windup   (0.9초 예고, 피해 0)  줄을 높이 든다(처음 30% 동안 떠 있던 높이에서 들어 올리고, 그 뒤 살짝 떨린다)
//   active   (0.3초 내려침, 피해)   바닥에 납작하게 깔린다 — 폭 = widthUnits(0.5u), 양끝 = 피해 선과 정확히 같다
//   recovery (0.8초 안전)           바닥 위에 떠 있다
// 스냅샷이 사라지면(한 몸이 죽음 → behavior가 피해 없이 지운다) 줄도 그 프레임에 사라진다.
// 시간 함수는 스냅샷 elapsedMs만 쓴다(게임 시간 — 일시정지 중 멈춘다). Math.random 없음.

export const LONG_ROPE_VISUAL = Object.freeze({
  type: 'E95',
  raisedY: 1.25,        // 예고: 머리 위로 든 줄 높이(치프 몸 키 ≈ 1.05u + 든 팔)
  safeY: 0.8,           // 안전 구간: 허리 높이에 떠 있다
  slamY: 0.062,         // 내려침: 납작한 줄 띠의 중심 높이. 띠 밑면 0.042가 바닥 경고 채움(y ≈ 0.038, polygonOffset)보다
                        // 위라야 채움이 띠를 덮지 않는다(0.03이면 빨간 채움이 파란 띠를 보라로 덮었다 — 화면 확인).
  ropeThickness: 0.07,  // 들었을 때·떠 있을 때 줄 굵기(폭·두께)
  slamThickness: 0.04,  // 바닥에 깔린 띠 두께
  raiseFraction: 0.3,   // 예고 앞 30% 동안 safeY → raisedY
  shakeAmp: 0.035,
  shakeHz: 9,
  bobAmp: 0.05,
  bobHz: 2,
  color: 0x2f7de1,      // 파란 플라스틱 줄넘기 — 바닥(베이지)·경고 채움(빨강)·두 몸(빨간 팀 조끼) 모두와 대비
  outlineColor: 0x050209, // 2차 좀비 외곽선과 같은 색
  outlineWidth: 0.022,  // 월드 단위(인스턴스 배율과 무관하게 일정 — LongRopeLayer 셰이더가 배율로 나눈다)
  capacity: 4,
})

const TAU = Math.PI * 2
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** 스냅샷 phase → 'raised' | 'slam' | 'safe' | null(줄 아님·끝남). */
export function longRopeStage(snapshot) {
  if (!snapshot || snapshot.type !== LONG_ROPE_VISUAL.type || snapshot.shape !== 'line') return null
  if (snapshot.phase === 'windup') return 'raised'
  if (snapshot.phase === 'active') return 'slam'
  if (snapshot.phase === 'recovery') return 'safe'
  return null
}

/**
 * 줄 한 가닥의 그리기 값. 실패(줄 아님·값이 이상함)면 null.
 * @returns out { ax, az, bx, bz, span, yaw, y, width, thickness, stage }
 *   yaw는 three rotation.y 규칙(로컬 +Z → (sin yaw, cos yaw)) = Math.atan2(dirX, dirZ).
 */
export function longRopeInto(out, snapshot) {
  const stage = longRopeStage(snapshot)
  if (!stage) return null
  const origin = snapshot.originXZ
  const dir = snapshot.directionXZ
  const span = snapshot.rangeUnits
  const width = snapshot.widthUnits
  if (!origin || !dir) return null
  const ax = origin[0]; const az = origin[1]
  const dirLen = Math.hypot(dir[0], dir[1])
  if (!Number.isFinite(ax + az + span + width + dirLen) || span <= 0 || width <= 0 || dirLen < 1e-6) return null
  const dx = dir[0] / dirLen; const dz = dir[1] / dirLen
  const V = LONG_ROPE_VISUAL
  const elapsed = Number.isFinite(snapshot.elapsedMs) ? snapshot.elapsedMs : 0
  const windupMs = snapshot.windupMs > 0 ? snapshot.windupMs : 1
  const activeMs = snapshot.activeMs > 0 ? snapshot.activeMs : 0
  let y; let thickness; let ropeWidth
  if (stage === 'slam') {
    y = V.slamY; thickness = V.slamThickness; ropeWidth = width // 피해 선 폭 그대로
  } else if (stage === 'raised') {
    const t = clamp01(elapsed / windupMs)
    const rise = clamp01(t / V.raiseFraction)
    const eased = 1 - (1 - rise) * (1 - rise)
    const shake = rise >= 1 ? Math.sin(elapsed * 0.001 * TAU * V.shakeHz) * V.shakeAmp : 0
    y = V.safeY + (V.raisedY - V.safeY) * eased + shake
    thickness = V.ropeThickness; ropeWidth = V.ropeThickness
  } else {
    const local = Math.max(0, elapsed - windupMs - activeMs)
    y = V.safeY + Math.sin(local * 0.001 * TAU * V.bobHz) * V.bobAmp
    thickness = V.ropeThickness; ropeWidth = V.ropeThickness
  }
  out.ax = ax; out.az = az
  out.bx = ax + dx * span; out.bz = az + dz * span
  out.span = span
  out.yaw = Math.atan2(dx, dz)
  out.y = y
  out.width = ropeWidth
  out.thickness = thickness
  out.stage = stage
  return out
}

/** 줄 비주얼 값(longRopeInto 결과)의 인스턴스 행렬 성분: 단위 상자(x·y ±0.5, z 0..1)를 A→B로 늘인다. */
export function longRopeMatrixParts(rope) {
  return {
    position: [rope.ax, rope.y, rope.az],
    yaw: rope.yaw,
    scale: [rope.width, rope.thickness, rope.span],
  }
}
