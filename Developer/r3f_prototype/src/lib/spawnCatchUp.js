// 스폰 시계 캐치업 — "화면이 완전히 비어 있는 시간"의 상한을 2초로 강제한다(2026-08-22 사용자 지시).
//
// 목적은 개별 이벤트를 당기는 게 아니다. 남은 스폰 스케줄 **전체**가 상대 간격을 그대로 유지한 채
// 통째로 앞으로 이동한다. 그래서 여기서 관리하는 상태는 오프셋 하나뿐이다:
//
//   spawnSec = realElapsedSec + offsetSec
//
// 스폰 게이트(버스트 표·도지·오버타임 보강·보스 압박)만 이 spawnSec을 읽는다.
// HUD 경과 타이머·탈출 포탈·마틸다·스테이지 종료는 실시간(realElapsedSec) 그대로다 — 런 길이는 안 바뀐다.
//
// 규칙:
//   - 적이 한 마리라도 살아 있으면(또는 스폰 대기 중이면) 아무 일도 없다. 빈 시간 누적만 0으로 리셋한다.
//   - 완전히 빈 채로 2초가 차면, 다음 예정 스폰 시각까지의 간격만큼 오프셋을 올린다.
//     그 결과 그 프레임에 다음 스폰이 곧바로 발화한다 = 빈 화면이 2초를 넘지 않는다.
//   - 다음 예정 스폰이 아예 없으면(표 소진 + 오버타임도 없음) 오프셋을 올리지 않는다.
//     없는 스폰을 만들어내지 않는다.
//   - 오프셋은 단조 증가만 한다. 절대 되돌아가지 않는다(발화 플래그가 시각 단조성에 의존한다).
//
// ── 설계 확정 사항(2026-08-22 사용자 승인) — clamp 금지 정본 ──────────────────────────
// (1) offsetSec에 인위적 상한을 두지 마라. 자연 상한이 이미 있다: 버스트 표는 유한하므로
//     당길 수 있는 총량은 표 안의 빈 간격 합으로 묶인다. 그보다 더 당겨지면 오버타임 보강
//     (무한 모드)에 일찍 진입할 뿐이고, 그건 빨리 밀어붙인 플레이어에게 주는 의도된 보상이다.
//     "앞당기면 무한모드로 빨리 들어갈 뿐이야" — 사용자 명시 승인.
// (2) 오버타임 구간에서도 캐치업은 계속 동작한다. 화면이 2초 이상 비면 다음 오버타임 tick으로
//     당긴다. 초고속 클리어 플레이어에게 오버타임이 사실상 2초 간격으로 오는 건 버그가 아니라
//     명세다("화면이 완전히 비워진 시간을 2초로 제한하는게 목적이다"). 이걸 막는 가드 금지.
// 이 두 항목은 정본이다. "오프셋 폭주 버그"로 오인해 clamp/가드를 추가하지 마라.

export const EMPTY_ARENA_MAX_SEC = 2

export function createSpawnCatchUpState() {
  return { offsetSec: 0, emptyForSec: 0 }
}

export function resetSpawnCatchUpState(state) {
  if (!state) return state
  state.offsetSec = 0
  state.emptyForSec = 0
  return state
}

// 한 프레임 전진. 이번 프레임에 앞당긴 초를 반환한다(점프 없으면 0).
export function advanceSpawnCatchUp(state, options = {}) {
  if (!state) return 0
  const { deltaSec = 0, liveEnemyCount = 0, spawnSec = 0, nextPendingSpawnSec = null } = options

  if (!(liveEnemyCount === 0)) {
    state.emptyForSec = 0
    return 0
  }

  const step = Number.isFinite(deltaSec) && deltaSec > 0 ? deltaSec : 0
  state.emptyForSec += step
  if (state.emptyForSec < EMPTY_ARENA_MAX_SEC) return 0

  if (!Number.isFinite(nextPendingSpawnSec) || !Number.isFinite(spawnSec) || nextPendingSpawnSec <= spawnSec) {
    // 당길 스폰이 없다. 빈 시간 누적은 유지해서, 스케줄이 생기는 즉시 다음 프레임에 당기게 둔다.
    return 0
  }

  const jump = nextPendingSpawnSec - spawnSec
  state.offsetSec += jump
  state.emptyForSec = 0
  return jump
}

// HUD처럼 프레임 루프 밖에서 오프셋을 읽어야 하는 소비자를 위한 모듈 전역 게시판.
// Enemies의 프레임 루프가 매 프레임 갱신하고, 스테이지 리셋에서 0으로 되돌린다.
let publishedOffsetSec = 0

export function publishSpawnCatchUpOffsetSec(offsetSec) {
  publishedOffsetSec = Number.isFinite(offsetSec) && offsetSec > 0 ? offsetSec : 0
  return publishedOffsetSec
}

export function getSpawnCatchUpOffsetSec() {
  return publishedOffsetSec
}
