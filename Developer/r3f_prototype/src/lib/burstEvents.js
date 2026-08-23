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
export const STAGE3_25_SECOND_REINFORCEMENT = 'stage3TwentyFiveSecondE01E07'
export const STAGE3_25_SECOND_REINFORCEMENT_START_SEC = 25
export const STAGE3_25_SECOND_REINFORCEMENT_END_EXCLUSIVE_SEC = 150
export const STAGE3_25_SECOND_REINFORCEMENT_INTERVAL_SEC = 25
// 2026-08-24 사용자 지시: "스테이지 3에서 보스가 출현한 뒤부터 5분 이전까지 무조건 10초에 한번씩
// 기본녹색좀비 10마리, 웃는좀비 3마리씩 자동 추가 스폰".
// 시작 150 = 보스 B03 등장 시각, 종료 300 exclusive = 5분 이전. tick = ceil((300-150)/10) = 15회.
// 25초 보강(위)과 창이 겹치지 않는다 — 그쪽은 150에서 끝나고 이쪽이 150에서 시작한다.
export const STAGE3_BOSS_PHASE_REINFORCEMENT = 'stage3BossPhaseE01E07'
export const STAGE3_BOSS_PHASE_REINFORCEMENT_START_SEC = 150
export const STAGE3_BOSS_PHASE_REINFORCEMENT_END_EXCLUSIVE_SEC = 300
export const STAGE3_BOSS_PHASE_REINFORCEMENT_INTERVAL_SEC = 10

// The runtime table holds two repeat descriptors instead of duplicating tick entries.
export const STAGE3_25_SECOND_GREEN_SMILING_REINFORCEMENT_EVENTS = [
  { sec: STAGE3_25_SECOND_REINFORCEMENT_START_SEC, type: 'E01', count: 3, repeatIntervalSec: STAGE3_25_SECOND_REINFORCEMENT_INTERVAL_SEC, endExclusiveSec: STAGE3_25_SECOND_REINFORCEMENT_END_EXCLUSIVE_SEC, reinforcement: STAGE3_25_SECOND_REINFORCEMENT },
  { sec: STAGE3_25_SECOND_REINFORCEMENT_START_SEC, type: 'E07', count: 3, repeatIntervalSec: STAGE3_25_SECOND_REINFORCEMENT_INTERVAL_SEC, endExclusiveSec: STAGE3_25_SECOND_REINFORCEMENT_END_EXCLUSIVE_SEC, reinforcement: STAGE3_25_SECOND_REINFORCEMENT },
]

// 보스 구간 10초 반복 증원. 25초 보강과 같은 반복 기구(repeatIntervalSec/endExclusiveSec)를 쓴다.
export const STAGE3_BOSS_PHASE_GREEN_SMILING_REINFORCEMENT_EVENTS = [
  { sec: STAGE3_BOSS_PHASE_REINFORCEMENT_START_SEC, type: 'E01', count: 10, repeatIntervalSec: STAGE3_BOSS_PHASE_REINFORCEMENT_INTERVAL_SEC, endExclusiveSec: STAGE3_BOSS_PHASE_REINFORCEMENT_END_EXCLUSIVE_SEC, reinforcement: STAGE3_BOSS_PHASE_REINFORCEMENT },
  { sec: STAGE3_BOSS_PHASE_REINFORCEMENT_START_SEC, type: 'E07', count: 3, repeatIntervalSec: STAGE3_BOSS_PHASE_REINFORCEMENT_INTERVAL_SEC, endExclusiveSec: STAGE3_BOSS_PHASE_REINFORCEMENT_END_EXCLUSIVE_SEC, reinforcement: STAGE3_BOSS_PHASE_REINFORCEMENT },
]

export function isRepeatingBurstEvent(event) {
  return Number.isFinite(event?.repeatIntervalSec) && event.repeatIntervalSec > 0 && Number.isFinite(event?.endExclusiveSec) && event.endExclusiveSec > event.sec
}

export function repeatingBurstTickCount(event) {
  if (!isRepeatingBurstEvent(event)) return 0
  return Math.ceil((event.endExclusiveSec - event.sec) / event.repeatIntervalSec)
}

export function repeatingBurstTickAt(event, elapsedSec) {
  if (!isRepeatingBurstEvent(event) || !Number.isFinite(elapsedSec) || elapsedSec < event.sec) return null
  if (elapsedSec >= event.endExclusiveSec) return repeatingBurstTickCount(event) - 1
  return Math.floor((elapsedSec - event.sec) / event.repeatIntervalSec)
}

export function repeatingBurstSecAtTick(event, tick) {
  const safeTick = Math.floor(tick)
  if (!isRepeatingBurstEvent(event) || safeTick < 0 || safeTick >= repeatingBurstTickCount(event)) return null
  return event.sec + safeTick * event.repeatIntervalSec
}
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

// Stage 2 추가 보강. 2026-08-17 총체력 사다리 재설계로 4×17(무거운 혼합 풀) → 2×경량 혼합으로 줄였다.
// 옛 풀은 E02/E04/E05/E06가 섞여 있어 pickMixedReinforcementTypes의 "각 타입 1마리 선보장" 때문에
// 랜덤이 아니라 확정 난이도 상승이었고, 스2 잡몹 예산 9,202 중 2,700 이상을 혼자 먹었다.
// 이제 목적은 "후반 템포 유지"뿐이므로 경량대(E01 8hp·E03 10hp)만 남긴다.
export const STAGE2_MIXED_REINFORCEMENT_EVENTS = [
  { sec: 150, type: 'E01', count:  8, mixedTypes: LIGHT_MOB_MIX, reinforcement: STAGE2_MIXED_REINFORCEMENT },
  { sec: 216, type: 'E01', count: 10, mixedTypes: LIGHT_MOB_MIX, reinforcement: STAGE2_MIXED_REINFORCEMENT },
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

// 4분 타임라인 — 스테이지2 "복도 돌파". 5분 기준 sec ×0.8.
// 2026-08-17 총체력 사다리(스1 ×1.3^n) 재설계: 잡몹 예산 9,202 → 3,458(목표 3,443, +0.4%).
//   보스 B02 1,380을 더한 총 HP는 4,838 = 스1 3,710 × 1.304.
// 시각은 스1 공통 앵커 13개(5/24/40/60/72/108/110/120/144/150/168/184/216)만 쓴다. 보스는 150초다.
// 편성 판단: (a) 시그니처 경비추격은 크루 1기당 516 HP(RZT 168 + RZG 58×6)로 예산의 15%다.
//   4회(2,064 = 새 예산의 60%)면 나머지 12개 앵커가 굶으므로 2회(도입 40 + 보스구간 재현 144)로 줄였다.
//   (b) 4×17 혼합 보강은 경량 2회로 축소(위 STAGE2_MIXED_REINFORCEMENT_EVENTS 주석 참조).
//   (c) 대신 마릿수는 95마리로 스1(92)과 나란히 두어 "복도가 텅 빈다"는 체감을 막았다.
export const STAGE2_BURST_EVENTS = [
  { sec:   5, type: 'E01', count: 12 },                       // 오프닝 밀도
  { sec:  24, type: 'E03', count:  6 },                       // 러너 첫 등장 — 이동 압박 시작
  { sec:  60, type: 'E07', count:  5 },                       // 웃는좀비(E01 2배 스탯) 합류
  { sec:  72, type: 'E04', count:  2 },                       // 원거리 첫 등장 — 발사 게이트(e04IntroSec 72)와 동시
  { sec: 108, type: 'E07', count:  6 },                       // 웃는좀비 러시
  { sec: 120, type: 'E05', count:  3 },                       // 차저 첫 등장 (보스 등장과 동시각)
  { sec: 168, type: 'E06', count:  1 },                       // 거대 첫 등장
  { sec: 184, type: 'E05', count:  3 },                       // 보스 처치 후 차저 재압박
  { sec: 216, type: 'E05', count:  3 },                       // 마틸다 직전 차저 러시(스1·스3 공통 관용구)
  { sec: 150, type: 'B02', count:  1 },                       // 보스 등장 (2:30) — 보스 구간 파생 기준
  // Stage 2 only: 도망치는 트렌치코트 좀비 + 경비 6명. 스테이지2 시그니처.
  // 2026-08-17: 4회(40/108/144/216) → 2회. 도입 1회 + 보스 구간 재현 1회로 리듬은 남기고 예산을 뺀다.
  { sec:  40, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  { sec: 144, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  // ── 형태(formation) 버스트 — 균일 압력을 깨는 스파이크→이완 비트. E04/보스와 시각이 겹치지 않게 배치.
  { sec:  40, type: 'E01', count:  8, formation: 'swarm' },    // 초반 단조 구간 깨기 — 경비추격과 동시각 스파이크
  { sec:  60, type: 'E03', count:  6, formation: 'ring' },     // 러너 포위
  { sec: 150, type: 'E02', count:  2, formation: 'pincer' },   // 탱커 협공(보스 구간)
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  ...STAGE2_MIXED_REINFORCEMENT_EVENTS,
]

// 4분 타임라인 — 스테이지3 "총력전/혼돈".
// 보스 = 체육교사 B03 단일(150). 로비 카드 광고(체육교사)와 실제 전투를 일치시킨다.
// 보스와 형태/그룹 버스트는 모두 이 표의 sec 그대로 런타임에 발화한다.
// 2026-08-17 총체력 사다리(스1 ×1.3^n) 재설계 → 2026-08-19 25초 반복 상쇄 개정.
//   단발 편성 4,090 + 25초 반복 보강 525 = 잡몹 4,615(목표 4,614, +0.02%).
//   2026-08-24 사용자 지시("스3 보스 hp를 스2 보스보다 1.3배로")로 B03 base가 1150 → 1246이 되어
//   실효 보스 HP는 1,656 → 1,794(= 스2 보스 실효 1,380 × 1.3)다.
//   같은 날 두 번째 지시로 보스 구간 10초 반복 증원(150~300 exclusive, E01×10 + E07×3, 15 tick)이
//   추가됐다. 이 증원분만 2,835 HP·195마리다.
//   실측 총 HP는 8,214(= 잡몹 3,585 + 보스 1,794 + 보스구간 증원 2,835)다.
//   (직전 주석의 "6,271"은 2026-08-19 런좀비 크루 복원 이후 이미 stale이었다. 실측 5,241 → 8,214.)
//   1.3 사다리에서 의도적으로 이탈했다 — 2026-08-24 사용자 판정: E01 증원은 XP 공급도 함께
//   늘리므로 총 HP 사다리로 stage3 난이도를 재지 않는다.
// 시각은 단발 이벤트가 스1 공통 앵커 13개를 전부 쓴다. 25초 반복 보강만 앵커 밖(25/50/75/100/125)에서
//   발화하는 명시적 예외이며, burstEvents.test.js가 "반복 보강" 규칙으로 따로 단언한다(면제가 아니다).
// 편성 판단: 시그니처 RZL 크루는 이전 단일 대형 크루(RZL@72×13)로 복원했다.
//   2026-08-17 감축: 150초 E06×1(461) 삭제, 110초 E02 협공 6→3(-303), 120초 차저 포위 4→3(-101),
//   5초 오프닝 12→10(-24). 거대 벽(184)·216 차저 러시는 불변.
//   2026-08-19 감축(-562): 25초 반복 보강이 25~125초 창에 525 HP(경량 30마리)를 새로 넣었으므로
//   그 창 안에서만 같은 크기를 뺀다 — 110초 E06×1(461) 삭제 + 72초 차저 2→1(-101).
//   2026-08-22 사용자 지시: 40/108/144/168초 RZL×7 4회는 이전 RZL@72×13 단일 크루로 되돌린다.
//   거대는 184초 앞뒤 벽(pincer ×2) 한 곳으로 모았다. 110초의 ×1은 "조기 등장 보장"이 목적이었는데
//   그 창은 이제 반복 보강이 25초마다 채우므로 역할이 겹쳤고, ×1로 남기면 pincer가 성립하지 않는다.
// 형태 버스트는 개방 아레나 안티카이팅용 ring/pincer만 쓴다(swarm/gauntlet 배제 — 넓은 사공간서 자명하게 카이팅됨).
// 예고 정본 STAGE3_SPAWN_TELEGRAPHS와 배열 순서까지 1:1 정렬(waveTimelines.test.js가 검사).
export const STAGE3_BURST_EVENTS = [
  ...STAGE3_25_SECOND_GREEN_SMILING_REINFORCEMENT_EVENTS,
  ...STAGE3_BOSS_PHASE_GREEN_SMILING_REINFORCEMENT_EVENTS,
  { sec:   5, type: 'E01', count: 10 },                         // 온보딩 초기 밀도
  { sec:  24, type: 'E03', count:  4 },                         // 러너 조기 압박
  { sec:  40, type: 'E04', count:  1 },                         // 원거리 조기 등장 신호(e04IntroSec 34 이후)
  { sec:  72, type: 'E05', count:  1 },                         // 차저 첫 등장 신호(2026-08-19: 2→1, 25초 반복 상쇄)
  { sec: 216, type: 'E05', count:  3 },                         // 마틸다 직전 차저 러시
  // ── 런좀비 크루: 리더 1 + 러닝크루 12, 대각선 화면 횡단. 이전 단일 대형 크루 리듬으로 복원.
  { sec:  72, type: 'RZL', count: 13, formation: RUN_ZOMBIE_CREW_FORMATION },
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  // ── 보스: 체육교사 B03 단일 등장(150). 로비 카드(체육교사)와 실제 전투 일치. ──
  { sec: 150, type: 'B03', count:  1 },
  // ── 형태(formation) 버스트 — 배열 순서 = STAGE3_SPAWN_TELEGRAPHS 순서(60 → 120 → 150 → 184).
  { sec:  60, type: 'E03', count:  6, formation: 'ring' },      // 첫 완전 포위
  { sec: 120, type: 'E05', count:  3, formation: 'ring' },      // 차저 포위(RZL@144 예열)
  { sec: 150, type: 'E02', count:  3, formation: 'pincer' },    // 탱커 앞뒤 협공(보스 구간) — 110초에서 이동
  { sec: 184, type: 'E06', count:  2, formation: 'pincer' },    // 보스 구간 거대 앞뒤 벽
]

// 4분 타임라인 — 스테이지4 "급식실 대탈출".
// 시그니처 = 원거리 E04 "안전지대 소멸"(24초 스폰, 18초 발사 게이트 + 상시 고비중, 보스 구간에도 유지).
// 보스 = 단일 B04 주방장(150). 이 표의 sec 그대로 런타임에 고정 등장한다.
// 2026-08-17 총체력 사다리(스1 ×1.3^n) 재설계 → 2026-08-19 E04 포화 개정.
//   잡몹 예산 5,577(목표 5,559, +0.3%). 보스 B04 2,592를 더한 총 HP는 8,169.
//   (사다리 기준은 스1 3,710 × 1.3^3 = 8,149으로 스4 자체는 목표를 지킨다. 스3 실측 8,214는
//    2026-08-24 보스 구간 반복 증원으로 스4를 앞선다 — 총 HP를 난이도 지표로 쓰지 않는다는
//    같은 날 사용자 판정에 따른 의도된 상태다.)
// 2026-08-17에 메운 구멍은 유지된다: 빈 앵커 144/150/168/216, 특히 2:00~3:04의 64초 보스 단독 공백.
//
// ── E04 포화점(2026-08-19 실측 계산) ─────────────────────────────────────────────
// 앞선 판(E04 26마리)은 "getE04Cap이 동시 발사 3기로 하드캡한다"를 근거로 삼았지만,
// getE04Cap(stage2ProjectileRules.js)에는 런타임 호출자가 없다 — 죽은 코드다. 실제 발사 게이트는
// enemySimulation.js isE04FireAllowed의 `projectileCount < E04_MAX_PROJECTILES(6)` 하나뿐이고,
// 이건 사수 수가 아니라 "비행 중 투사체 6발" 상한이다. 그래서 진짜 상한은 슬롯 회전율로 정해진다:
//   투사체 수명 3,200ms(enemyProjectilePool, 명중 아니면 조기 소멸 없음 — 경계 despawn 없음)
//   → 처리량 천장 = 6발 / 3.2s = 1.875발/초
//   사수 1기 발사율 = 1 / 2,200ms = 0.4545발/초 (E04 rangedCooldown 2200)
//   → 포화 사수 수 = 1.875 / 0.4545 = 4.13기.
// 즉 사선에 4기가 서면 이미 천장의 97%다. 5기째부터는 슬롯 대기열만 길어지고 화면 압박은 그대로다.
// E04는 preferDist 5.5에서 스트레이핑만 하고 근접하지 않으므로(minDist 3.5) 초과분은 접촉 위협도 못 준다
// = 순수 HP 낭비. 보스 구간엔 B04가 같은 풀을 2,600ms로 쓰므로(3.2/2.6 = 1.23슬롯) 포화점이 3.3기로 더 낮다.
// 그래서 E04는 "등장마다 정확히 4마리"로 고정하고 24/144/168 세 앵커에만 둔다(총 12마리).
// stage4가 bossPressure 예외인 건 사실이다(Enemies.jsx / Enemy.jsx가 stage4를 면제) — 보스 구간에도
// 사선이 살아 있는 유일한 스테이지라는 시그니처는 144·168 두 벽으로 그대로 유지된다.
// 회수한 770 HP(14마리분)는 E04가 못 하는 일 = 거리 좁히기에 넣었다: 144초 탱커 2, 150초 차저 3,
// 108·168초 웃는좀비 2+4. 좁은 급식실(halfX 14.4 / halfZ 16)에서 카이팅을 끊는 건 근접 편성뿐이다.
// 형태 버스트는 개방 맵 안티카이팅(ring/pincer)만. RZL은 스3 전용이라 미채용.
// 예고 정본 STAGE4_SPAWN_TELEGRAPHS와 배열 순서까지 1:1 정렬(60 → 108 → 120 → 168 → 184).
export const STAGE4_BURST_EVENTS = [
  { sec:   5, type: 'E01', count: 10 },                        // 온보딩 초기 밀도
  { sec:  24, type: 'E04', count:  4 },                        // 원거리 조기 등장(발사 게이트 18s 이후) — 포화점 4기
  { sec:  40, type: 'E05', count:  2 },                        // 차저 조기 등장 신호
  { sec:  72, type: 'E06', count:  1 },                        // 거대 조기 등장 보장
  { sec: 108, type: 'E07', count:  2 },                        // 탱커 협공 옆 경량 속공 — 2026-08-19 E04 회수분
  { sec: 144, type: 'E04', count:  4 },                        // 보스 구간 원거리 벽 1 — 포화점 4기
  { sec: 144, type: 'E02', count:  2 },                        // 원거리 벽 아래 탱커 몸통 — 2026-08-19 E04 회수분
  { sec: 150, type: 'E05', count:  3 },                        // 보스 등장 동시 차저 — 2026-08-19 옛 E04×6 자리
  { sec: 150, type: 'E03', count:  6 },                        // 러너로 카이팅 차단(원거리 사선 유지용 몰이)
  { sec: 168, type: 'E07', count:  4 },                        // 원거리 포위 안쪽을 메우는 속공 — 2026-08-19 E04 회수분
  { sec: 216, type: 'E05', count:  4 },                        // 마틸다 직전 차저 러시 — 옛 빈 앵커
  { sec: 150, type: 'B04', count:  1 },                        // 주방장 보스 등장(2:30) — 보스 구간 파생 기준
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  // ── 형태(formation) 버스트 — 배열 순서 = STAGE4_SPAWN_TELEGRAPHS 순서(60 → 108 → 120 → 168 → 184).
  { sec:  60, type: 'E03', count:  6, formation: 'ring' },     // 첫 완전 포위(러너)
  { sec: 108, type: 'E02', count:  4, formation: 'pincer' },   // 탱커 앞뒤 협공(피크 예열)
  { sec: 120, type: 'E05', count:  4, formation: 'ring' },     // 차저 포위(피크 정점, 보스 직전)
  { sec: 168, type: 'E04', count:  4, formation: 'ring' },     // 원거리 포위 = "안전지대 소멸" 문자 그대로 — 포화점 4기
  { sec: 184, type: 'E06', count:  2, formation: 'pincer' },   // 보스 구간 거대 앞뒤 벽
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
