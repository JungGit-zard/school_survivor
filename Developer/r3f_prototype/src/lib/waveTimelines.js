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
  // 3:12–3:28 후반 구성 1 (잡몹+탱커) — 보스 구간 여부는 등장 시각(2:00)에서 파생
  { start: 192, end: 208, target: 11, weights: { E01: 0.60, E02: 0.40 } },
  // 3:28–3:44 후반 구성 2 (탱커+돌진)
  { start: 208, end: 224, target: 15, weights: { E02: 0.60, E05: 0.40 } },
  // 3:44–4:00 후반 구성 3 — E05 40%→30%, E01 25%로 보스 막판 이동공간 확보
  { start: 224, end: 240, target: 17, weights: { E01: 0.25, E02: 0.45, E05: 0.30 } },
]

// 4분(240초) 타임라인. 5분 기준에서 전체 ×0.8 비례 축소.
export const STAGE2_WAVE_PHASES = [
  { start:   0, end:  24, target: 18, weights: { E01: 1.00 } },
  { start:  24, end:  48, target: 22, weights: { E01: 0.72, E03: 0.28 } },
  { start:  48, end:  72, target: 28, weights: { E01: 0.48, E02: 0.22, E03: 0.30 } },
  { start:  72, end:  90, target: 30, weights: { E01: 0.625, E03: 0.30, E04: 0.075 } },
  { start:  90, end:  96, target: 20, weights: { E01: 0.625, E03: 0.30, E04: 0.075 } },
  { start:  96, end: 120, target: 19, weights: { E01: 0.20, E02: 0.65, E04: 0.15 } },
  { start: 120, end: 144, target: 25, weights: { E01: 0.475, E03: 0.35, E05: 0.15, E04: 0.025 } },
  { start: 144, end: 168, target: 28, weights: { E03: 0.58, E04: 0.14, E05: 0.28 } },
  { start: 168, end: 192, target: 29, weights: { E02: 0.66, E04: 0.16, E06: 0.18 } },
  { start: 192, end: 208, target: 16, weights: { E01: 0.40, E02: 0.50, E04: 0.10 } },
  { start: 208, end: 224, target: 21, weights: { E02: 0.55, E05: 0.35, E04: 0.10 } },
  { start: 224, end: 240, target: 25, weights: { E02: 0.20, E03: 0.40, E04: 0.12, E05: 0.28 } },
]

// 4분(240초) 타임라인 — 스테이지3 "총력전/혼돈".
// 상승 레버: (a) HP 완화 없음(×1.0, 스2 ×0.8 대비 실효 +25%),
//            (b) E04/E05/E06 조기 도입 + 후반 3축 겹침,
//            (c) 더블 보스 B01+B02(burstEvents에서 파생, B02~135/B01~147 스태거).
// weights 합 = 1.00. 상승은 마릿수가 아니라 질적 요소(HP·조기도입·동시성·더블보스)에서 온다.
// 설계 정본: Developer/agent_room/levelmini_stage3_wave_balance_design_2026-07-11.md §2.
export const STAGE3_WAVE_PHASES = [
  // 0:00–0:16 도입 — 온보딩 16s 압축(스1 40s·스2 24s). 첫 웨이브부터 러너 섞기.
  { start:   0, end:  16, target: 20, weights: { E01: 0.85, E03: 0.15 } },
  // 0:16–0:34 러너 강화 + 탱커 조기 등장
  { start:  16, end:  34, target: 24, weights: { E01: 0.62, E03: 0.22, E02: 0.16 } },
  // 0:34–0:52 원거리 E04 조기 도입(스2는 72s)
  { start:  34, end:  52, target: 26, weights: { E01: 0.50, E03: 0.22, E02: 0.18, E04: 0.10 } },
  // 0:52–1:12 차저 E05 조기 도입(스2는 120s) — 4종 동시
  { start:  52, end:  72, target: 28, weights: { E01: 0.42, E03: 0.18, E02: 0.18, E05: 0.14, E04: 0.08 } },
  // 1:12–1:32 3축 첫 맛보기(근접+원거리+차저) — E06만 아직
  { start:  72, end:  92, target: 30, weights: { E01: 0.34, E03: 0.16, E02: 0.20, E05: 0.18, E04: 0.12 } },
  // 1:32–1:48 탱커 호흡(거대 등장 직전 이완) — 탱커벽으로 리듬 전환
  { start:  92, end: 108, target: 20, weights: { E01: 0.30, E02: 0.45, E05: 0.20, E04: 0.05 } },
  // 1:48–2:12 거대 E06 조기 도입(스2는 168s) — 시그니처 3축 겹침 시작
  { start: 108, end: 132, target: 30, weights: { E01: 0.26, E03: 0.10, E02: 0.22, E05: 0.22, E06: 0.12, E04: 0.08 } },
  // 2:12–2:30 보스 직전 피크 — 최대 복합 위협(거대+차저+원거리+탱커)
  { start: 132, end: 150, target: 32, weights: { E01: 0.20, E03: 0.10, E02: 0.20, E05: 0.25, E06: 0.15, E04: 0.10 } },
  // ── 더블 보스 B02~135/B01~147(burstEvents) 등장 후 보스 구간(isBossPhase는 min=135에서 파생) ──
  // 2:30–2:52 보스 구간 1 — 잡몹 target 급감(보스 집중), 원거리 견제 유지
  { start: 150, end: 172, target: 16, weights: { E01: 0.34, E02: 0.28, E05: 0.20, E04: 0.18 } },
  // 2:52–3:16 보스 구간 2 — 탱커/차저 재구성, 거대 소량 재투입(미조우 바닥)
  { start: 172, end: 196, target: 20, weights: { E01: 0.30, E02: 0.34, E05: 0.24, E06: 0.06, E04: 0.06 } },
  // 3:16–3:38 마틸다 예고/등장 구간 — 원거리 제거(가독성), 킷 연료 위주
  { start: 196, end: 218, target: 18, weights: { E01: 0.40, E02: 0.32, E05: 0.28 } },
  // 3:38–4:00 탈출 스프린트 — 혼돈 마무리, E01 다수로 포탈까지 밀고 나갈 여지
  { start: 218, end: 240, target: 22, weights: { E01: 0.44, E02: 0.28, E05: 0.20, E04: 0.08 } },
]

export function getDefaultWavePhases(stageId = 'stage1') {
  if (stageId === 'stage2') return STAGE2_WAVE_PHASES
  if (stageId === 'stage3') return STAGE3_WAVE_PHASES
  return WAVE_PHASES
}

// 형태 버스트는 2026-07-11 웨이브 개편에서 stage2 런타임 발화를 중단했다.
// HUD가 실제로 발생하지 않는 공격을 예고하지 않도록 빈 목록을 유지한다.
export const STAGE2_SPAWN_TELEGRAPHS = []

// 스테이지3 형태 버스트 예고 배너 정본. stage2와 달리 stage3는 형태 버스트가 런타임에
// 실제로 발화하므로(getRuntimeBurstEventsForStage에서 되살림) 이 예고는 허위 배너가 아니다.
// sec/label은 STAGE3_BURST_EVENTS의 formation 항목과 정렬. HUD stage3 배선은 uimini 후속.
export const STAGE3_SPAWN_TELEGRAPHS = [
  { sec:  44, leadSec: 2.5, label: '사방에서 포위된다' },      // ring
  { sec:  92, leadSec: 2.5, label: '양쪽에서 조여온다' },      // pincer
  { sec: 120, leadSec: 2.5, label: '돌진 무리 돌입' },         // swarm
  { sec: 176, leadSec: 2.5, label: '거대 무리가 길을 막는다' }, // gauntlet
]
