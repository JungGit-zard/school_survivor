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
// 재설계(2026-07-18): 발견 C(밀도 절반) 대응 = 오프닝 프론트로드(t=0 ×2, Enemies.jsx) +
// 카이팅 차단 형태(ring/pincer) + ×1.44 실효 HP 전제 곡선. RZL@72 이완 창으로 대각 스파이크 부각.
// 조기 도입 사슬(E04@34·E05@52·E06@108) 유지. 설계 정본: Planner/stage3_zombie_wave_redesign_2026-07-18.md.
export const STAGE3_WAVE_PHASES = [
  // 0:00–0:16 도입 — 온보딩 16s 압축. t=0 프론트로드 ×2로 오프닝 밀도 확립. 러너 비중↑ 이동 압박 즉시.
  { start:   0, end:  16, target: 20, weights: { E01: 0.80, E03: 0.20 } },
  // 0:16–0:34 러너 강화 + 탱커 조기 등장(처치지연 시작)
  { start:  16, end:  34, target: 24, weights: { E01: 0.60, E03: 0.22, E02: 0.18 } },
  // 0:34–0:52 원거리 E04 조기 도입(스2는 72s) — 원거리 축 또렷하게(0.14). ring E03×6@44 첫 포위
  { start:  34, end:  52, target: 26, weights: { E01: 0.48, E03: 0.20, E02: 0.18, E04: 0.14 } },
  // 0:52–1:12 차저 E05 조기 도입(스2는 120s) — 4종 동시, RZL 직전 빌드업
  { start:  52, end:  72, target: 28, weights: { E01: 0.40, E03: 0.16, E02: 0.18, E05: 0.16, E04: 0.10 } },
  // 1:12–1:32 RZL 이완 창 — target↓·차저 제거로 앰비언트 이완 → RZL×13 대각 횡단이 주역(웨이브가 비켜간다)
  { start:  72, end:  92, target: 24, weights: { E01: 0.44, E03: 0.20, E02: 0.20, E04: 0.16 } },
  // 1:32–1:48 탱커 호흡 — pincer E02×6@92 앞뒤 협공. 거대 직전 리듬 전환
  { start:  92, end: 108, target: 26, weights: { E01: 0.30, E02: 0.42, E05: 0.18, E04: 0.10 } },
  // 1:48–2:12 거대 E06 조기 도입(스2는 168s) — 시그니처 3축 겹침 시작. ring E05×4@120 차저 포위
  { start: 108, end: 132, target: 30, weights: { E01: 0.24, E03: 0.10, E02: 0.22, E05: 0.22, E06: 0.12, E04: 0.10 } },
  // 2:12–2:30 보스 직전 피크 — 최대 복합. target 30 억제(발견 D 스택 과부하 방지). E04 cap 3 승격(132)
  { start: 132, end: 150, target: 30, weights: { E01: 0.20, E03: 0.10, E02: 0.20, E05: 0.24, E06: 0.14, E04: 0.12 } },
  // ── 더블 보스 B02~135/B01~147(burstEvents) 등장 후 보스 구간(isBossPhase는 min=135에서 파생) ──
  // 2:30–2:52 보스 구간 1 — 잡몹 target 급감(보스 집중). ×1.44 긴 처치창(발견 A) 전제, 원거리 견제만 유지
  { start: 150, end: 172, target: 16, weights: { E01: 0.36, E02: 0.28, E05: 0.18, E04: 0.18 } },
  // 2:52–3:16 보스 구간 2 — pincer E06×2@176 거대 앞뒤 재투입(미조우 바닥). gauntlet 폐기(개방 맵서 통로강제 소멸)
  { start: 172, end: 196, target: 20, weights: { E01: 0.32, E02: 0.34, E05: 0.22, E06: 0.06, E04: 0.06 } },
  // 3:16–3:38 마틸다 접근 — 원거리 제거(가독성) + 차저 비중↓(3중겹침 창 차저 과적 완화)
  { start: 196, end: 218, target: 18, weights: { E01: 0.46, E02: 0.34, E05: 0.20 } },
  // 3:38–4:00 탈출 스프린트 — E01 다수로 포탈까지. 차저 경량(마틸다 이미 추격 중)
  { start: 218, end: 240, target: 22, weights: { E01: 0.46, E02: 0.28, E05: 0.18, E04: 0.08 } },
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
  { sec: 120, leadSec: 2.5, label: '돌진 무리가 에워싼다' },   // ring (개편: swarm→ring 안티카이팅)
  { sec: 176, leadSec: 2.5, label: '거대들이 앞뒤를 막는다' }, // pincer (개편: gauntlet→pincer 개방 맵 대응)
]
