// 버스트(일회성) 스폰 이벤트 정본 — 순수 데이터, 3D import 없음(2026-07-10 분리).
// 어드민이 3D 체인 없이 읽고, waveTimelines/게임 로직이 보스 구간을 파생하는 단일 소스.
//
// 보스 엔티티 등장(B01/B02)도 여기 버스트로 정의된다 = 보스 등장 시각의 단일 소스.
// '보스 구간(bossPhase)'은 이 등장 시각에서 파생한다 — 어디에도 하드코딩하지 않는다.

// 보스 버스트 타입. 등장 시각 파생의 기준 + 보스 판별 단일 소스.
// (하드코딩 나열이 여러 파일로 번지지 않도록 isBossType 헬퍼로 통일 — Enemy/Enemies/AdminPage가 재사용한다.)
export const BOSS_BURST_TYPES = ['B01', 'B02', 'B03', 'B04']
export const isBossType = (type) => BOSS_BURST_TYPES.includes(type)
export const RUN_ZOMBIE_CREW_FORMATION = 'runZombieCrew'
export const STAGE2_GUARD_CHASE_FORMATION = 'stage2GuardChase'
export const STAGE2_MIXED_REINFORCEMENT = 'stage2MixedReinforcement'
export const ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS = [
  { sec: 110, type: 'E07', count: 3 },
  { sec: 110, type: 'E02', count: 3 },
]

// ── 스테이지1·2 스폰 마릿수 +10% & 종류 랜덤화 (2026-08-13 사용자 지시) ──────────────
// 규칙 1(마릿수): count → Math.round(count × 1.1). 1~4마리짜리 "첫 등장 신호" 이벤트는
//   반올림으로 그대로 유지되어 도입 사슬(E02@60·E03@72·E05@120·E06@168)이 깨지지 않는다.
//   실집계: 스1 90→100(+11.1%), 스2 177→196(+10.7%). 보스·경비추격 크루는 대상 아님
//   (크루 인원은 evt.count가 아니라 STAGE2_GUARD_CHASE_SIZE가 정한다).
// 규칙 2(종류 랜덤): 순수 E01 대물량 러시에만 mixedTypes를 달아 매 판 구성이 바뀌게 한다.
//   pickMixedReinforcementTypes(Enemies.jsx)는 풀의 각 타입을 1마리씩 먼저 보장한 뒤 균등 랜덤으로
//   채우므로, 풀에 무거운 타입(E02 70hp·E05 70hp·E06 320hp)을 넣으면 "랜덤"이 아니라 확정 난이도
//   상승이 된다. 그래서 풀은 경량대(E01 8hp·E03 10hp)로만 제한한다 — 템포 개선이 목적이지
//   난이도 상승이 목적이 아니다. (E07은 저 함수의 /^E0[1-6]$/ 필터에 걸려 풀에 못 들어간다.)
// 스테이지1 로스터 제약(추격/돌진형만, E04 금지 — Bang_Rules 2026-05-09 부록 / stage1_replan §3-2)은
//   유지된다: 아래 어떤 mixedTypes에도 E04가 없고, 새 타입을 도입하지도 않는다.
// ALL_STAGES_110SEC_* 는 스3·스4와 공유하는 배열이라 손대지 않는다(round(3×1.1)=3이라 어차피 불변).
const LIGHT_MOB_MIX = ['E01', 'E03']

export const STAGE1_150SEC_SMILING_GREEN_REINFORCEMENT_EVENTS = [
  { sec: 150, type: 'E07', count: 6 },
  { sec: 150, type: 'E01', count: 6, mixedTypes: LIGHT_MOB_MIX },
]

export const STAGE1_40SEC_GREEN_SMILING_REINFORCEMENT_EVENTS = [
  { sec: 40, type: 'E01', count: 6 },
  { sec: 40, type: 'E07', count: 3 },
]

// Stage 2 추가 보강(2026-08-09 사용자 지시): 120초부터 30초마다,
// 240초 종료 전까지만 15마리씩 일반 좀비를 현재 phase 구성 안에서 섞어 더한다.
export const STAGE2_MIXED_REINFORCEMENT_EVENTS = [
  { sec: 120, type: 'E01', count: 17, mixedTypes: ['E01', 'E02', 'E03', 'E04', 'E05'], reinforcement: STAGE2_MIXED_REINFORCEMENT },
  { sec: 150, type: 'E03', count: 17, mixedTypes: ['E02', 'E03', 'E04', 'E05'], reinforcement: STAGE2_MIXED_REINFORCEMENT },
  { sec: 184, type: 'E02', count: 17, mixedTypes: ['E02', 'E04', 'E06'], reinforcement: STAGE2_MIXED_REINFORCEMENT },
  { sec: 216, type: 'E02', count: 17, mixedTypes: ['E02', 'E04', 'E05'], reinforcement: STAGE2_MIXED_REINFORCEMENT },
]

// 4분 타임라인. 5분 기준 sec ×0.8.
export const BURST_EVENTS = [
  { sec:   5, type: 'E01', count: 10 },  // Stage 1 정상 첫 웨이브(5초, 기존 0초 E01×18 대체 아님)
  { sec:  24, type: 'E01', count:  9 },  // 첫 phase target(24)을 burst만으로 초과하지 않게 완화
  ...STAGE1_40SEC_GREEN_SMILING_REINFORCEMENT_EVENTS,
  { sec:  60, type: 'E01', count:  6 },  // 60초 녹색좀비 추가 고정 스폰
  { sec:  60, type: 'E07', count:  6 },  // 60초 웃는좀비 추가 고정 스폰
  { sec:  60, type: 'E02', count:  2 },  // 탱커 첫 등장 신호 — 60초 총 2마리로 조정
  { sec:  72, type: 'E03', count:  2 },  // 러너 압박 — 6→2 (E03 전 구간 ×1/3, 2026-07-04)
  { sec: 108, type: 'E01', count:  6, mixedTypes: LIGHT_MOB_MIX },  // 90–108초 완화 구간 이후 잡몹 러시 — 경량대 랜덤 구성
  { sec: 108, type: 'E02', count:  3 },
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  { sec: 120, type: 'E05', count:  3 },  // 돌진 첫 등장 (E04 탄환형 폐기 — 2026-05-09)
  { sec: 144, type: 'E05', count:  3 },  // 돌진 압박 강화
  ...STAGE1_150SEC_SMILING_GREEN_REINFORCEMENT_EVENTS,
  { sec: 168, type: 'E06', count:  1 },  // 거대 첫 등장
  { sec: 184, type: 'E01', count:  6, mixedTypes: LIGHT_MOB_MIX },  // 마지막 러시 (보스 직전) — 경량대 랜덤 구성
  { sec: 184, type: 'E02', count:  3 },
  { sec: 184, type: 'E05', count:  2 },
  { sec: 150, type: 'B01', count:  1 },  // 보스 등장 (2:30) — 보스 구간 파생 기준
  { sec: 216, type: 'E05', count:  3 },
]

// 4분 타임라인. 5분 기준 sec ×0.8.
export const STAGE2_BURST_EVENTS = [
  { sec:   5, type: 'E01', count: 17 },  // 첫 웨이브 0→5초, 물량 ×1.5(2026-08-09)
  { sec:  24, type: 'E03', count:  4 },
  { sec:  60, type: 'E02', count:  3 },
  { sec:  72, type: 'E04', count:  1 },
  { sec: 120, type: 'E05', count:  2 },
  { sec: 150, type: 'E05', count:  2 },
  { sec: 168, type: 'E06', count:  1 },
  { sec: 120, type: 'B02', count:  1 },  // 보스 등장 (2:00) — 보스 구간 파생 기준
  { sec: 216, type: 'E05', count:  3 },
  { sec: 216, type: 'E04', count:  1 },
  // Stage 2 only: fleeing trench-coat zombie followed by six security guards.
  { sec:  40, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  { sec: 108, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  { sec: 144, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  { sec: 216, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  // ── 형태(formation) 버스트 (2026-07-10) — 균일 압력을 깨는 스파이크→이완 비트.
  // 유지 루프가 총원을 target과 비교하므로 형태로 채운 만큼 자동으로 덜 스폰된다(의도).
  // E04/보스와 시각 겹치지 않게 배치. 예고 정본은 waveTimelines.STAGE2_SPAWN_TELEGRAPHS.
  { sec:  40, type: 'E01', count:  7, formation: 'swarm' },   // 초반 단조 구간 깨기
  { sec:  40, type: 'E01', count: 22, mixedTypes: LIGHT_MOB_MIX },  // 30초 녹색좀비 러시 — 경량대 랜덤 구성(E03@24 도입 이후)
  { sec: 110, type: 'E01', count: 22, mixedTypes: LIGHT_MOB_MIX },  // 1분 30초 러시 — 경량대 랜덤 구성
  { sec: 110, type: 'E02', count:  3 },                       // 1분 30초 탱커 동반(2026-08-09)
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  ...STAGE2_MIXED_REINFORCEMENT_EVENTS,
  { sec:  60, type: 'E03', count:  6, formation: 'ring' },    // 러너 포위
  { sec:  60, type: 'E07', count:  6 },                       // 1분 웃는얼굴 좀비(E01 2배 스탯, 2026-08-09)
  { sec: 108, type: 'E07', count: 11 },
  { sec: 144, type: 'E02', count:  7, formation: 'pincer' },  // 탱커 협공 (120–144 위상)
  { sec: 184, type: 'E05', count:  4, formation: 'swarm' },   // 돌진 무리 (168–192 위상)
]

// 4분 타임라인 — 스테이지3 "총력전/혼돈".
// 보스 = 체육교사 B03 단일(135). 로비 카드 광고(체육교사)와 실제 전투를 일치시킨다.
// (이전 더블 보스 B02/B01은 로비의 체육교사 광고와 불일치라 폐기 — 2026-07-21 사용자 지시.)
// 보스와 형태/그룹 버스트는 모두 이 표의 sec 그대로 런타임에 발화한다.
// 설계 정본: Developer/agent_room/levelmini_stage3_wave_balance_design_2026-07-11.md §4-1.
// 2026-08-17: 보스(B03@135)를 제외한 런타임 좀비 이벤트의 고유 초를 Stage 1 공통 앵커
// 5/24/40/60/72/108/110/120/144/150/168/184/216에 맞췄다. payload/count/formation/order는 보존.
export const STAGE3_BURST_EVENTS = [
  { sec:   5, type: 'E01', count: 12 },                         // 온보딩 초기 밀도
  { sec:  24, type: 'E03', count:  4 },                         // 러너 조기 압박
  { sec:  40, type: 'E04', count:  1 },                         // 원거리 조기 등장 신호
  { sec:  72, type: 'E05', count:  2 },                         // 차저 조기 등장 신호
  { sec:  40, type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION }, // 런좀비 크루 1차: 리더 1 + 러닝크루 6, 대각선 화면 횡단
  { sec: 108, type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION }, // 런좀비 크루 2차: 이완 창 내부 대각선 압박
  { sec: 144, type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION }, // 런좀비 크루 3차: 2분 압박 체크포인트
  { sec: 168, type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION }, // 런좀비 크루 4차: 보스 직후 재압박
  { sec: 110, type: 'E06', count:  1 },                         // 거대 조기 등장 보장
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  { sec: 150, type: 'E06', count:  1 },                         // 피크 거대 1기 추가(미조우 방어)
  // ── 보스: 체육교사 B03 단일 등장(135). 로비 카드(체육교사)와 실제 전투 일치. ──
  { sec: 135, type: 'B03', count:  1 },
  { sec: 216, type: 'E05', count:  3 },                         // 마틸다 직전 차저 러시
  // ── 형태(formation) 버스트 — 개방 아레나에선 플레이어 상대 포위(ring/pincer)만 사용해 카이팅을 끊는다.
  // swarm(한 방향 스윕)·gauntlet(양벽)은 넓은 사공간서 자명하게 카이팅되므로 스3 스케줄서 배제(구현체는 스2가 계속 사용).
  // 예고 정본 STAGE3_SPAWN_TELEGRAPHS. 재설계: Planner/stage3_zombie_wave_redesign_2026-07-18.md §3.
  { sec:  60, type: 'E03', count:  6, formation: 'ring' },      // 첫 완전 포위
  { sec: 110, type: 'E02', count:  6, formation: 'pincer' },    // 탱커 호흡 구간 앞뒤 협공
  { sec: 120, type: 'E05', count:  4, formation: 'ring' },      // 3축 창 차저 포위(120s 예열 후 RZL@144가 주역)
  { sec: 184, type: 'E06', count:  2, formation: 'pincer' },    // 보스 구간 거대 앞뒤 벽(개편: gauntlet→pincer)
]

// 4분 타임라인 — 스테이지4 "급식실 대탈출".
// 시그니처 = 원거리 E04 "안전지대 소멸"(조기 18s + 상시 고비중, 보스 구간에도 유지).
// 보스 = 단일 B04 주방장. 이 표의 sec 그대로 런타임에 고정 등장한다.
// 급식실 맵은 12×16으로 스3(18×18)보다 좁아 실효 밀도가 높으므로 물량은 억제하고
// 난이도는 마릿수가 아니라 원거리 지속 압박·보스에서 온다("마릿수로 어렵게 하지 않음").
// 형태 버스트는 스3와 동일하게 개방 맵 안티카이팅(ring/pincer)만 사용. RZL은 스3 시그니처라 스4는 미채용.
// 전 버스트가 런타임에 발화한다(아래 getRuntimeBurstEventsForStage).
export const STAGE4_BURST_EVENTS = [
  { sec:   0, type: 'E01', count: 10 },                        // 온보딩 초기 밀도(작은 맵 — 과밀 회피 위해 스3보다 낮춤)
  { sec:  18, type: 'E04', count:  1 },                        // 원거리 조기 등장 — "안전지대 소멸" 첫 신호(발사 게이트도 18s)
  { sec:  30, type: 'E05', count:  2 },                        // 차저 조기 등장 신호
  { sec:  74, type: 'E06', count:  1 },                        // 거대 조기 등장 보장
  { sec: 140, type: 'B04', count:  1 },                        // 주방장 보스 등장(경고 134) — 보스 구간 파생 기준
  // ── 형태(formation) 버스트 — 개방 맵 안티카이팅(플레이어 상대 ring/pincer만). swarm/gauntlet 배제(스3 선례).
  // 예고 정본 STAGE4_SPAWN_TELEGRAPHS와 sec 1:1 정렬.
  { sec:  40, type: 'E03', count:  6, formation: 'ring' },     // 첫 완전 포위(러너)
  { sec:  96, type: 'E02', count:  6, formation: 'pincer' },   // 탱커 앞뒤 협공(피크 예열)
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  { sec: 120, type: 'E05', count:  4, formation: 'ring' },     // 차저 포위(피크 정점, 보스 직전)
  { sec: 178, type: 'E06', count:  2, formation: 'pincer' },   // 보스 구간 거대 앞뒤 벽
]

export function getBurstEventsForStage(stageId) {
  if (stageId === 'stage2') return STAGE2_BURST_EVENTS
  if (stageId === 'stage3') return STAGE3_BURST_EVENTS
  if (stageId === 'stage4') return STAGE4_BURST_EVENTS
  return BURST_EVENTS
}

// 모든 일반 좀비와 보스는 이 명시 이벤트 표에서만 발화한다.
// 랜덤 웨이브나 런 시작 시각 난수로 이벤트를 추가·치환하지 않는다.
export function getRuntimeBurstEventsForStage(stageId) {
  return getBurstEventsForStage(stageId)
}

// 보스(B01/B02) 등장 시각 — 없으면 Infinity. 보스 구간 파생의 단일 소스.
export function getBossSpawnSec(stageId) {
  const bossSecs = getBurstEventsForStage(stageId)
    .filter((e) => isBossType(e.type))
    .map((e) => e.sec)
  return bossSecs.length > 0 ? Math.min(...bossSecs) : Infinity
}

export function getBossPhaseStatus(startSec, stageId) {
  if (startSec < getBossSpawnSec(stageId)) return 'before'
  return 'after'
}

// 웨이브 시작 시각이 보스 등장 이후면 보스 구간. (하드코딩 시간 없음 — 순수 파생)
export function isBossPhase(startSec, stageId) {
  return startSec >= getBossSpawnSec(stageId)
}
