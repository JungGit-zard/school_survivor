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
