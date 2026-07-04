// 스테이지별 좀비 웨이브 타임라인 기본값 정본.
// Enemies.jsx에서 분리(2026-07-04) — 어드민 '스테이지별 웨이브 컨트롤'이
// 3D 컴포넌트 체인 없이 기본 타임라인을 읽을 수 있게 한다.
// 기존 import 경로 호환을 위해 Enemies.jsx가 재수출한다.

// 1스테이지는 추격/돌진형만 사용한다 (Bang_Rules 2026-05-09 부록 / stage1_replan §3-2).
// 기존 E04 비중은 추격 압박을 늘리도록 E02/E03/E05로 재분배.
// 4분(240초) 타임라인. 5분 기준에서 전체 ×0.8 비례 축소.
export const WAVE_PHASES = [
  // 0:00–0:40 단일 좀비 구간. E01 밀도만 기존 대비 2배로 올린다.
  { start:   0, end:  40, target: 24, weights: { E01: 1.00 } },
  // ── E03(짙은 녹색 러너) 전 구간 ×1/3 (2026-07-04): 빈 비중은 E01로 이전 ──
  // 0:40–1:00 잡몹+러너 (이동 압박 시작) — 8초→20초로 확장해 전환 체감 부여
  { start:  40, end:  60, target: 22, weights: { E01: 0.97, E03: 0.03 } },
  // 1:00–1:12 +탱커 등장
  { start:  60, end:  72, target: 26, weights: { E01: 0.80, E03: 0.10, E02: 0.10 } },
  // 1:12–1:30 압박 시작 — E02 20%→15% (초보자 첫 사망 구간 완화)
  { start:  72, end:  90, target: 34, weights: { E01: 0.75, E03: 0.10, E02: 0.15 } },
  // 1:30–1:48 완화 구간 (18초로 연장 — 6초는 체감 거의 없음)
  { start:  90, end: 108, target: 15, weights: { E01: 0.75, E03: 0.05, E02: 0.20 } },
  // 1:48–2:00 추격형 밀도 상승
  { start: 108, end: 120, target: 19, weights: { E01: 0.69, E03: 0.06, E02: 0.25 } },
  // 2:00–2:24 돌진 예고 구간 (E05 첫 등장)
  { start: 120, end: 144, target: 24, weights: { E01: 0.60, E03: 0.05, E02: 0.25, E05: 0.10 } },
  // 2:24–2:48 돌진 본격 도입
  { start: 144, end: 168, target: 29, weights: { E01: 0.50, E03: 0.05, E02: 0.30, E05: 0.15 } },
  // 2:48–3:12 +거대 등장 — E06 5%→3% (버스트 +1 포함 최대 4마리 동시 과부하 방지)
  { start: 168, end: 192, target: 34, weights: { E01: 0.47, E03: 0.05, E02: 0.28, E05: 0.17, E06: 0.03 } },
  // 3:12–3:28 보스 구간 1 (잡몹+탱커)
  { start: 192, end: 208, target: 11, weights: { E01: 0.60, E02: 0.40 }, bossPhase: true },
  // 3:28–3:44 보스 구간 2 (탱커+돌진)
  { start: 208, end: 224, target: 15, weights: { E02: 0.60, E05: 0.40 }, bossPhase: true },
  // 3:44–4:00 보스 구간 3 — E05 40%→30%, E01 25%로 보스 막판 이동공간 확보
  { start: 224, end: 240, target: 17, weights: { E01: 0.25, E02: 0.45, E05: 0.30 }, bossPhase: true },
]

// 4분(240초) 타임라인. 5분 기준에서 전체 ×0.8 비례 축소.
export const STAGE2_WAVE_PHASES = [
  { start:   0, end:  24, target: 18, weights: { E01: 1.00 } },
  { start:  24, end:  48, target: 22, weights: { E01: 0.72, E03: 0.28 } },
  { start:  48, end:  72, target: 28, weights: { E01: 0.48, E02: 0.22, E03: 0.30 } },
  { start:  72, end:  90, target: 30, weights: { E01: 0.55, E03: 0.30, E04: 0.15 } },
  { start:  90, end:  96, target: 20, weights: { E01: 0.55, E03: 0.30, E04: 0.15 } },
  { start:  96, end: 120, target: 19, weights: { E01: 0.20, E02: 0.50, E04: 0.30 } },
  { start: 120, end: 144, target: 25, weights: { E01: 0.45, E03: 0.35, E05: 0.15, E04: 0.05 } },
  { start: 144, end: 168, target: 28, weights: { E03: 0.44, E04: 0.28, E05: 0.28 } },
  { start: 168, end: 192, target: 29, weights: { E02: 0.50, E04: 0.32, E06: 0.18 } },
  { start: 192, end: 208, target: 16, weights: { E01: 0.40, E02: 0.40, E04: 0.20 }, bossPhase: true },
  { start: 208, end: 224, target: 21, weights: { E02: 0.45, E05: 0.35, E04: 0.20 }, bossPhase: true },
  { start: 224, end: 240, target: 25, weights: { E02: 0.20, E03: 0.28, E04: 0.24, E05: 0.28 }, bossPhase: true },
]

export function getDefaultWavePhases(stageId = 'stage1') {
  return stageId === 'stage2' ? STAGE2_WAVE_PHASES : WAVE_PHASES
}
