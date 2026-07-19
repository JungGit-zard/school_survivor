// ── 도지 도주(황금고블린) 순수 로직 ─────────────────────────────────────────
// 뱀서 황금고블린 규칙: 도지는 스폰 후 잠깐 제자리 춤을 춘 뒤 가장 가까운 스테이지
// 경계를 향해 "느릿느릿" 춤추며 도망가고, 경계 밖으로 나가면 보상 없이 소멸한다.
// Enemies.jsx(스폰 배선)와 DancingDogeEvent.jsx(프레임 이동)가 함께 쓰는 공용 모듈 —
// 두 컴포넌트가 서로를 임포트하지 않도록 여기에 분리했다(순환 의존 방지).

// 스폰 후 제자리 춤 유지 시간(ms) — 등장 연출을 감상할 잠깐의 정지 구간.
export const DOGE_DANCE_HOLD_MS = 1500

// 도주 속도(units/sec) — 최저속 잡몹 E01(0.475)보다 확실히 느린 84% 수준.
// stage1 중앙→최근접 경계(halfX=10) 기준 10/0.4 = 25초: 놓치기 어렵지만 방치하면 사라진다.
export const DOGE_ESCAPE_SPEED = 0.4

// 경계 밖 유예 거리 — 맵 끝에서 살짝 더 걸어나간 뒤 소멸해 "나갔다"가 화면에서 읽히게.
export const DOGE_ESCAPE_MARGIN = 0.6

// 도주 방향: 위치에서 잔여 거리가 가장 짧은 경계 축을 고르고 부호는 랜덤.
// 단위벡터 [dirX, dirZ] 반환. random 주입으로 결정론 테스트 가능.
export function dogeEscapeDirection(pos, bounds, random = Math.random) {
  const sign = random() < 0.5 ? -1 : 1
  const remX = bounds.halfX - Math.abs(pos[0])
  const remZ = bounds.halfZ - Math.abs(pos[2])
  return remX <= remZ ? [sign, 0] : [0, sign]
}

// 경계 + 마진 밖 도달 = 도주 성공(보상 없이 소멸).
export function dogeHasEscaped(pos, bounds, margin = DOGE_ESCAPE_MARGIN) {
  return Math.abs(pos[0]) >= bounds.halfX + margin || Math.abs(pos[2]) >= bounds.halfZ + margin
}

// ── 도지 몸통 넉백(피해 없음) ─────────────────────────────────────────────────
// 도지는 추격/공격이 없지만, 플레이어가 몸통에 부딪히면 피해 없이 "확" 밀쳐낸다(코믹).
// 밀리는 방향은 항상 도지 중심 → 플레이어 방향의 수평 단위벡터. 플레이어는 velocity를 매
// 프레임 덮어쓰므로 임펄스가 아니라 Player의 넉백 오버라이드(입력 무시 구간)로 밀어낸다.
// 강도는 확실히 밀치되 맵 밖으로 날아가지 않게 — 위치는 playerMovementBounds가 클램프한다.
export const DOGE_KNOCKBACK_SPEED = 7 // units/sec — 피격 넉백(4)보다 확실히 강한 "밀쳐짐"
export const DOGE_KNOCKBACK_MS = 240  // 밀림 지속(이 구간 동안 플레이어 입력 무시)
export const DOGE_KNOCKBACK_COOLDOWN_MS = 300 // 연속 접촉 스팸 방지

// 도지 중심(dogePos)에서 플레이어(playerPos)로 향하는 수평 넉백 속도 벡터.
// pos는 [x, y, z] 형식. 두 점이 겹쳐 방향이 0이면 임의 방향(+x)으로 밀어낸다.
export function dogeKnockbackVelocity(dogePos, playerPos, speed = DOGE_KNOCKBACK_SPEED) {
  const dx = playerPos[0] - dogePos[0]
  const dz = playerPos[2] - dogePos[2]
  const len = Math.hypot(dx, dz)
  if (len < 1e-4) return { x: speed, z: 0 }
  return { x: (dx / len) * speed, z: (dz / len) * speed }
}

// 도지 sensor 접촉이 실제 넉백 명령으로 이어질 수 있는지 판정한다.
// 이 함수는 상태를 바꾸거나 피해를 주지 않는다. 호출자는 반환된 명령만 Player body에 전달한다.
export function resolveDogeContactKnockback({
  phase,
  revealed,
  alive,
  finished,
  escaping,
  lastKnockbackAt,
  now,
  dogePos,
  playerBody,
}) {
  if (phase !== 'playing' || !revealed || !alive || finished || escaping) return null
  if (typeof playerBody?._applyKnockback !== 'function') return null
  if (now - lastKnockbackAt < DOGE_KNOCKBACK_COOLDOWN_MS) return null

  const playerPos = playerBody.translation?.()
  if (!dogePos || !playerPos) return null

  const velocity = dogeKnockbackVelocity(dogePos, [playerPos.x, playerPos.y, playerPos.z])
  return {
    vx: velocity.x,
    vz: velocity.z,
    durationMs: DOGE_KNOCKBACK_MS,
    appliedAt: now,
  }
}
