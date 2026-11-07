// 버스트(일회성) 스폰 이벤트 정본 — 순수 데이터, 3D import 없음(2026-07-10 분리).
// 어드민이 3D 체인 없이 읽고, waveTimelines/게임 로직이 보스 구간을 파생하는 단일 소스.
//
// 보스 엔티티 등장(B01/B02)도 여기 버스트로 정의된다 = 보스 등장 시각의 단일 소스.
// '보스 구간(bossPhase)'은 이 등장 시각에서 파생한다 — 어디에도 하드코딩하지 않는다.

// 보스 버스트 타입. 등장 시각 파생의 기준 + 보스 판별 단일 소스.
// (하드코딩 나열이 여러 파일로 번지지 않도록 isBossType 헬퍼로 통일 — Enemy/Enemies/AdminPage가 재사용한다.)
import { EXPANSION_STAGES, EXPANSION_BOSSES } from './expansionContent.js'

export const BOSS_BURST_TYPES = ['B01', 'B02', 'B03', 'B04', ...Object.keys(EXPANSION_BOSSES)]
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
// 2026-10-31 Terry 지시: 탈출구가 열린 뒤의 정기 대량 웨이브는 회차마다 기본 마릿수의 10%씩 늘어난다.
// 설계 의도: 탈출구가 열리면 압박이 끝없이 자라 결국 버티지 못하고 탈출할 수밖에 없게 한다.
// 선형(복리 아님): n번째(첫 회 n=0) 웨이브 = round(base × (1 + 0.10 × n)). 마릿수 자체에 상한을 두지 않는다 —
// 동시 개체 천장(MAX_ENEMIES)만 실제 스폰을 자른다.
export const POST_EXIT_WAVE_GROWTH_RATE = 0.1

export function postExitWaveCount(baseCount, waveIndex) {
  const base = Math.max(0, Math.floor(baseCount) || 0)
  const n = Math.floor(waveIndex)
  if (!Number.isFinite(n) || n <= 0) return base
  return Math.round(base * (1 + POST_EXIT_WAVE_GROWTH_RATE * n))
}

// 반복 버스트 tick의 탈출구 개방 후 회차. 개방 전 tick은 -1(기존 마릿수 그대로).
// 개방 시각 정각에 떨어지는 tick이 첫 회(n=0)다.
export function postExitRepeatWaveIndex(event, tick, portalSec) {
  const tickSec = repeatingBurstSecAtTick(event, tick)
  if (tickSec === null || !Number.isFinite(portalSec) || tickSec < portalSec) return -1
  const firstPostExitTick = Math.max(0, Math.ceil((portalSec - event.sec) / event.repeatIntervalSec))
  return Math.floor(tick) - firstPostExitTick
}

export const ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS = [
  { sec: 110, type: 'E07', count: 3 },
  { sec: 110, type: 'E02', count: 3 },
]

// 코인 몬스터(E08)는 일반 웨이브 예산/랜덤 풀과 분리된 확정 보너스 이벤트다.
// 매 스테이지 90초와 180초에 각 1마리만 등장해 희소성을 유지하고, 런마다 놓치지 않게 한다.
export const COIN_MONSTER_RUNTIME_EVENTS = Object.freeze([
  Object.freeze({ sec: 90, type: 'E08', count: 1, rewardEvent: 'coinMonster' }),
  Object.freeze({ sec: 180, type: 'E08', count: 1, rewardEvent: 'coinMonster' }),
])

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
  // 2026-11-04: 8 → 5, 10 → 6. 덜어 낸 7마리는 STAGE2_BURST_EVENTS의 E37/E34(hp 8) 행으로 옮겼다.
  { sec: 150, type: 'E01', count:  5, mixedTypes: LIGHT_MOB_MIX, reinforcement: STAGE2_MIXED_REINFORCEMENT },
  { sec: 216, type: 'E01', count:  6, mixedTypes: LIGHT_MOB_MIX, reinforcement: STAGE2_MIXED_REINFORCEMENT },
]

// 4분 타임라인. 5분 기준 sec ×0.8.
export const BURST_EVENTS = [
  { sec:   5, type: 'E01', count: 10 },  // Stage 1 정상 첫 웨이브(5초, 기존 0초 E01×18 대체 아님)
  // Track B 대체(2026-10-25): E01×9 → E01×5 + E34×4. hp(E34)=hp(E01)=8이라 count×hp 합이 그대로다.
  // 마릿수도 9 그대로이고 150 동시 상한도 건드리지 않는다 — 추가가 아니라 자리 교체다.
  { sec:  24, type: 'E01', count:  5 },  // 첫 phase target(24)을 burst만으로 초과하지 않게 완화
  { sec:  24, type: 'E34', count:  4 },  // 박자접기형 첫 등장 (Stage 1 좁힘 예고 학습 슬롯)
  ...STAGE1_40SEC_GREEN_SMILING_REINFORCEMENT_EVENTS,
  { sec:  60, type: 'E01', count:  3 },  // 60초 녹색좀비 추가 고정 스폰 — 절반을 Track B로 교체
  // 2026-11-04 분산 재배치: 60초는 탱커 E02 첫 등장 시각이라 새 패턴 E36을 겹치지 않는다.
  // 24초에 배운 E34를 다시 보여주는 복습 슬롯으로 바꾸고, E36 첫 등장은 108초로 옮겼다. hp 8 = E01.
  { sec:  60, type: 'E34', count:  3 },  // 박자접기형 복습
  // 2026-11-07 2차 10종: 스1은 원거리 금지라 탄이 없는 두 종만 넣는다(E66 분열·E62 몸 돌진). 같은 hp 맞교환.
  { sec:  60, type: 'E07', count:  5 },  // 60초 웃는좀비 추가 고정 스폰
  { sec:  60, type: 'E66', count:  1 },  // 플라나리아 첫 등장(반피에 둘로 갈라짐, 탄 없음). hp 16 = E07
  { sec:  60, type: 'E02', count:  2 },  // 탱커 첫 등장 신호 — 60초 총 2마리로 조정
  // 러너 슬롯(E03×2, hp 10)을 모서리비껴형으로 전량 교체한다. hp(E35)=10이라 총 HP 불변.
  // Stage 1에 원거리는 여전히 0이다 — E35는 선회 접촉만 한다.
  { sec:  72, type: 'E35', count:  2 },  // 모서리비껴형 첫 등장 (옛 E03×2 자리)
  { sec: 108, type: 'E01', count:  3, mixedTypes: LIGHT_MOB_MIX },  // 90–108초 완화 구간 이후 잡몹 러시 — 경량대 랜덤 구성
  { sec: 108, type: 'E36', count:  3 },  // 반걸음되짚기형 첫 등장(2026-11-04: 60초 → 108초, 단독 도입). hp 8 = E01
  { sec: 108, type: 'E02', count:  3 },
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  { sec: 120, type: 'E05', count:  2 },  // 돌진 첫 등장 (E04 탄환형 폐기 — 2026-05-09)
  { sec: 120, type: 'E62', count:  1 },  // 셔틀런 첫 등장(같은 선을 왕복 돌진, 탄 없음). hp 70 = E05
  // 2026-11-04 투사체 좀비 15종 배치(Terry 지시). 스1은 원거리 피해 0 규칙(Bang_Rules: E04 스1 제외)을 지키려고
  // 피해를 주지 않는 두 종만 넣는다 — E56(회복 지원)·E49(물웅덩이 감속, 피해 0). 둘 다 hp 70 = E05/E02 맞교환.
  // 첫 등장은 기존 신규 종 첫 등장(24·72·108)과 30초 이상 떨어진 144·184초다.
  { sec: 144, type: 'E05', count:  2 },  // 돌진 압박 강화
  { sec: 144, type: 'E56', count:  1 },  // 보건실 첫 등장(공격 없음, 다친 아군 회복). hp 70 = E05
  ...STAGE1_150SEC_SMILING_GREEN_REINFORCEMENT_EVENTS,
  { sec: 168, type: 'E06', count:  1 },  // 거대 첫 등장
  { sec: 184, type: 'E01', count:  2, mixedTypes: LIGHT_MOB_MIX },  // 마지막 러시 — 경량대 랜덤 구성
  { sec: 184, type: 'E34', count:  2 },  // 2026-11-04: 후반 조합 — 스1에서 배운 근접 패턴 둘을 함께 다시 보여준다
  { sec: 184, type: 'E36', count:  2 },  //   (E34 사선 밀기 + E36 되짚기). 둘 다 hp 8 = E01
  { sec: 184, type: 'E02', count:  2 },
  { sec: 184, type: 'E49', count:  1 },  // 양동이청소 첫 등장(물웅덩이 감속, 피해 0). hp 70 = E02
  { sec: 184, type: 'E05', count:  2 },
  { sec: 150, type: 'B01', count:  1 },  // 보스 등장 (2:30) — 보스 구간 파생 기준
  { sec: 216, type: 'E05', count:  2 },
  { sec: 216, type: 'E56', count:  1 },  // 보건실 복습. hp 70 = E05
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
  { sec:   5, type: 'E01', count:  7 },                       // 오프닝 밀도 — 5마리를 E37로 교체
  { sec:   5, type: 'E37', count:  5 },                       // 빗금엇갈림형(복도 축 교차). hp 8 = E01
  { sec:  24, type: 'E03', count:  3 },                       // 러너 첫 등장 — 이동 압박 시작
  { sec:  24, type: 'E38', count:  3 },                       // 빈칸반응형(플레이어 이동 읽기). hp 10 = E03
  // 2026-11-04 투사체 좀비 배치: 첫 등장 60(E47)·144(E51)·184(E46) — 기존 신규 종 첫 등장(5·24·108)과 30초 이상.
  // 60·108·120·216은 같은 행 맞교환, 144·184 새 행은 같은 분(150초 E37, 216초 E34)에서 한 마리씩 옮겼다.
  { sec:  60, type: 'E07', count:  4 },                       // 웃는좀비(E01 2배 스탯) 합류
  { sec:  60, type: 'E47', count:  1 },                       // 종이비행기 첫 등장(느린 약유도 탄). hp 16 = E07
  { sec:  72, type: 'E04', count:  1 },                       // 원거리 첫 등장 — 발사 게이트(e04IntroSec 72)와 동시
  { sec:  72, type: 'E63', count:  1 },                       // 2026-11-07 마이크줄 첫 등장(맞으면 끌려감). hp 32 = E04
  { sec: 108, type: 'E07', count:  2 },                       // 웃는좀비 러시 — 절반을 E39로 교체
  { sec: 108, type: 'E47', count:  1 },                       // 종이비행기 복습. hp 16 = E07
  { sec: 108, type: 'E39', count:  3 },                       // 선끝접기형(열린 쪽 신호). hp 16 = E07
  { sec: 120, type: 'E05', count:  1 },                       // 차저 첫 등장 (보스 등장과 동시각)
  { sec: 120, type: 'E67', count:  1 },                       // 2026-11-07 학생회 방패 첫 등장(아군 추가 체력, 공격 없음). hp 70 = E05
  { sec: 120, type: 'E49', count:  1 },                       // 스1 양동이청소 복습. hp 70 = E05
  { sec: 144, type: 'E51', count:  1 },                       // 합창지휘 첫 등장(물결 음표 3연). hp 8 — 150초 E37에서 옮김
  { sec: 168, type: 'E06', count:  1 },                       // 거대 첫 등장
  { sec: 184, type: 'E05', count:  3 },                       // 보스 처치 후 차저 재압박
  { sec: 184, type: 'E46', count:  1 },                       // 지우개튕김 첫 등장(화면 가장자리 반사탄). hp 8 — 216초 E34에서 옮김
  { sec: 216, type: 'E05', count:  2 },                       // 마틸다 직전 차저 러시(스1·스3 공통 관용구)
  { sec: 216, type: 'E56', count:  1 },                       // 스1 보건실 복습. hp 70 = E05
  { sec: 150, type: 'B02', count:  1 },                       // 보스 등장 (2:30) — 보스 구간 파생 기준
  // 2026-11-04 분산 재배치: 108초 이후 신규 패턴이 전혀 없던 후반부에 패턴 복습을 넣는다.
  // 경량 혼합 보강(STAGE2_MIXED_REINFORCEMENT_EVENTS)의 E01 몫을 덜어 같은 hp 8 타입으로 바꾼 것이다.
  { sec: 150, type: 'E37', count:  2 },                       // 빗금엇갈림형 복습(보스전 아래 경량)
  { sec: 216, type: 'E37', count:  1 },                       // 탈출 스프린트 조합 — 빗금엇갈림형
  { sec: 216, type: 'E51', count:  1 },                       //   + 합창지휘 복습
  { sec: 216, type: 'E34', count:  1 },                       //   + 스1 박자접기형 (전부 hp 8 = E01)
  // Stage 2 only: 도망치는 트렌치코트 좀비 + 경비 6명. 스테이지2 시그니처.
  // 2026-08-17: 4회(40/108/144/216) → 2회. 도입 1회 + 보스 구간 재현 1회로 리듬은 남기고 예산을 뺀다.
  { sec:  40, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  { sec: 144, type: 'RZT', count:  7, formation: STAGE2_GUARD_CHASE_FORMATION },
  // ── 형태(formation) 버스트 — 균일 압력을 깨는 스파이크→이완 비트. E04/보스와 시각이 겹치지 않게 배치.
  { sec:  40, type: 'E01', count:  7, formation: 'swarm' },    // 초반 단조 구간 깨기 — 경비추격과 동시각 스파이크
  { sec:  40, type: 'E65', count:  1 },                        // 2026-11-07 시험감독 첫 등장(고리에서 가운데로 모이는 시험지). hp 8 — 스웜 E01 1기
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
  { sec:   5, type: 'E01', count:  6 },                         // 온보딩 초기 밀도
  { sec:   5, type: 'E64', count:  1 },                         // 2026-11-07 분필가루 첫 등장(머물면 아픈 가루 구름). hp 8 = E01
  { sec:   5, type: 'E37', count:  2 },                         // 2026-11-04: 스2 빗금엇갈림형 복습(오프닝 3마리 교체). hp 8 = E01
  { sec:   5, type: 'E46', count:  1 },                         // 스2 지우개튕김 복습. hp 8 = E01
  { sec:  24, type: 'E03', count:  2 },                         // 러너 조기 압박 — 절반을 E41로 교체
  { sec:  24, type: 'E41', count:  2 },                         // 쌍박자교대형(낮은 팔/높은 팔). hp 10 = E03
  { sec:  40, type: 'E04', count:  1 },                         // 원거리 조기 등장 신호(e04IntroSec 34 이후)
  // 2026-11-04 투사체 좀비: 스3 단발 행은 반복 증원이 대부분이라 첫 등장 자리가 72초 하나뿐이다
  // (기존 첫 등장 24·120·168과 30초 이상). 72초 차저 첫 등장 신호(E05×1)는 도입 사슬이라 그대로 두고,
  // 216초 E05×1을 72초로 당겨 E57로 바꾼다(1~2분 +7.3% / 3~4분 −4.5%, 총 HP·마릿수 불변).
  { sec:  72, type: 'E05', count:  1 },                         // 차저 첫 등장 신호(2026-08-19: 2→1, 25초 반복 상쇄)
  { sec:  72, type: 'E57', count:  1 },                         // 출석부 생활지도 첫 등장(카드 3연). hp 70 — 216초 E05에서 옮김
  // 2026-11-04 분산 재배치: E40은 216초(탈출구 개방 뒤)에만 있어 바로 탈출하면 한 번도 못 봤다.
  // 216초 E40×2 중 1기를 168초(보스 구간 중반, 다른 첫 등장 없음)로 당겨 탈출 전 첫 등장을 만든다.
  // 마릿수·총 HP는 그대로이고 2~3분 구간 +101 / 3~4분 구간 −101(각 +7.9% / −4.3%)만 옮겨 간다.
  { sec: 168, type: 'E40', count:  1 },                         // 중심축비틀기형 첫 등장(제자리 비틀림-해제). hp 70 = E05
  { sec: 216, type: 'E40', count:  1 },                         // 중심축비틀기형 복습. hp 70 = E05
  // ── 런좀비 크루: 리더 1 + 러닝크루 12, 대각선 화면 횡단. 이전 단일 대형 크루 리듬으로 복원.
  { sec:  72, type: 'RZL', count: 13, formation: RUN_ZOMBIE_CREW_FORMATION },
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  // ── 보스: 체육교사 B03 단일 등장(150). 로비 카드(체육교사)와 실제 전투 일치. ──
  { sec: 150, type: 'B03', count:  1 },
  // ── 형태(formation) 버스트 — 배열 순서 = STAGE3_SPAWN_TELEGRAPHS 순서(60 → 120 → 150 → 184).
  { sec:  60, type: 'E03', count:  5, formation: 'ring' },      // 첫 완전 포위
  { sec:  60, type: 'E68', count:  1 },                         // 2026-11-07 지구본 첫 등장(둘레를 도는 지구본 3개) — 포위 러너 1기. hp 10 = E03
  // Track B 대체(2026-10-25): 120초 포위를 차저(E05×3)에서 반원발맞춤형(E42×3)으로 통째로 바꾼다.
  // hp(E42) = hp(E05) = 70, count 3, sec·formation 그대로라 총 HP·마릿수·예고 1:1 정렬이 전부 보존된다.
  // 이벤트를 쪼개 150초에 두 번째 pincer를 더하는 안은 폐기했다 — 같은 초에 예고 배너가 두 번 떠서
  // waveTimelines의 "예고 ↔ formation 버스트 1:1" 계약을 깬다.
  // 포위 자체도 곡선 발맞춤 쪽이 더 맞는다: 차저 돌진은 72초 단발로 이미 도입돼 있다.
  { sec: 120, type: 'E42', count:  3, formation: 'ring' },      // 반원발맞춤형 포위
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
// 2026-11-04 분산 재배치: 신규 3종이 144·150·168초(24초 안, 보스 옆)에 몰려 있었고 0~144초엔 하나도 없었다.
//   E43 첫 등장을 40초, E44 첫 등장을 108초로 앞당겨 40 / 108 / 150(E45)으로 벌리고,
//   144·168초의 기존 행은 복습으로 남긴다. 오프닝 5초에는 스2의 E37을 복습시킨다.
//   전부 hp가 같은 맞교환이라 마릿수 68과 적용 HP 5,577이 그대로다.
//   (E45는 hp 10이라 host가 E03뿐인데 스4의 단발 E03 행은 150초 하나라 그대로 둔다.)
export const STAGE4_BURST_EVENTS = [
  // 2026-11-04 투사체 좀비: 첫 등장 5(E58)·72(E50)·184(E59) — 기존 첫 등장(40·108·150)과 30초 이상.
  // 72초 새 행은 108초 E44×2 중 1기, 184초 새 행은 216초 E05×4 중 1기를 같은 분 안에서 옮긴 것이다.
  { sec:   5, type: 'E01', count:  6 },                        // 온보딩 초기 밀도
  { sec:   5, type: 'E58', count:  1 },                        // 줄넘기 매복 첫 등장(숨어 기다리다 줄 채찍). hp 8 = E01
  { sec:   5, type: 'E37', count:  3 },                        // 스2 빗금엇갈림형 복습. hp 8 = E01
  { sec:  24, type: 'E04', count:  4 },                        // 원거리 조기 등장(발사 게이트 18s 이후) — 포화점 4기
  { sec:  40, type: 'E05', count:  1 },                        // 차저 조기 등장 신호
  { sec:  40, type: 'E43', count:  1 },                        // 엇높이교차형 첫 등장. hp 70 = E05
  { sec:  72, type: 'E06', count:  1 },                        // 거대 조기 등장 보장
  { sec:  72, type: 'E50', count:  1 },                        // 배구스파이크 첫 등장(착지점 원 → 스파이크). hp 16
  { sec: 108, type: 'E44', count:  1 },                        // 발맞춤후퇴형 첫 등장 — 옛 경량 속공 E07×2 자리. hp 16 = E07
  { sec: 144, type: 'E04', count:  4 },                        // 보스 구간 원거리 벽 1 — 포화점 4기
  { sec: 144, type: 'E61', count:  1 },                        // 2026-11-07 급식판 첫 등장(일직선 돌진 + 국물 웅덩이) — 옛 E57 복습 자리. hp 70
  { sec: 144, type: 'E43', count:  1 },                        // 엇높이교차형(낮은/높은 분리 스윕). hp 70 = E02
  { sec: 150, type: 'E05', count:  3 },                        // 보스 등장 동시 차저 — 2026-08-19 옛 E04×6 자리
  { sec: 150, type: 'E03', count:  3 },                        // 러너로 카이팅 차단(원거리 사선 유지용 몰이)
  { sec: 150, type: 'E45', count:  3 },                        // 무게중심넘김형(발 옮기고 넘김). hp 10 = E03
  { sec: 168, type: 'E69', count:  1 },                        // 2026-11-07 도미노 첫 등장(줄지어 차례로 터짐) — 옛 속공 E07×1 자리. hp 16
  { sec: 168, type: 'E47', count:  1 },                        //   스2 종이비행기 복습. hp 16 = E07
  { sec: 168, type: 'E44', count:  1 },                        // 발맞춤후퇴형(옆 재배치 후 사선 복귀). hp 16 = E07
  { sec: 168, type: 'E50', count:  1 },                        //   배구스파이크 복습. hp 16
  { sec: 184, type: 'E59', count:  1 },                        // 우유당번 첫 등장(멈춘 뒤 터지는 우유갑). hp 70 — 216초 E05에서 옮김
  { sec: 216, type: 'E05', count:  2 },                        // 마틸다 직전 차저 러시 — 옛 빈 앵커
  { sec: 216, type: 'E59', count:  1 },                        //   우유당번 복습. hp 70 = E05
  { sec: 150, type: 'B04', count:  1 },                        // 주방장 보스 등장(2:30) — 보스 구간 파생 기준
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  // ── 형태(formation) 버스트 — 배열 순서 = STAGE4_SPAWN_TELEGRAPHS 순서(60 → 108 → 120 → 168 → 184).
  { sec:  60, type: 'E03', count:  5, formation: 'ring' },     // 첫 완전 포위(러너)
  { sec:  60, type: 'E70', count:  1 },                        // 2026-11-07 술래 첫 등장(찍은 자리로 순간이동 + 터치) — 포위 러너 1기. hp 10 = E03
  { sec: 108, type: 'E02', count:  4, formation: 'pincer' },   // 탱커 앞뒤 협공(피크 예열)
  { sec: 120, type: 'E05', count:  4, formation: 'ring' },     // 차저 포위(피크 정점, 보스 직전)
  { sec: 168, type: 'E04', count:  4, formation: 'ring' },     // 원거리 포위 = "안전지대 소멸" 문자 그대로 — 포화점 4기
  { sec: 184, type: 'E06', count:  2, formation: 'pincer' },   // 보스 구간 거대 앞뒤 벽
]

// Stage5: 승인된 기존 적(Track B 12종 포함)만 사용. 반복 descriptor 종료는 exclusive다.
// 2026-11-04 분산 재배치: 스5는 특수 행동 좀비가 0종이었다. 마지막 스테이지라 스1~4 패턴 8종을 다시 보여준다.
//   쉬운 것(스1·2)은 앞쪽, 무거운 근접(E40·E42·E43)은 216초 탈출 구간이다. 모두 같은 hp의 기존 행을 쪼갠 맞교환이다.
//   처음 안(12종 전부, 24초 러너 6 전량·40초 웃는좀비 4 교체)은 런타임 프로브(시드 36 × 봇 2)에서
//   사망이 9/72 → 21/72로 늘었다. 느린 근접형이 빠른 E03/E07 자리를 다 먹으면 무리가 늦게 녹아 쌓이기 때문이라
//   각 행에서 1~3자리만 바꾸고 144초 웃는좀비 러시는 그대로 두는 쪽으로 줄였다(최종안 10/72, 변경 전 9/72).
// 2026-11-04 balanceqa 검수: 5초 E34×3·24초 E38×2 복습은 되돌렸다. 시드 400판(반경 4u·2.5u, 탈출 돌입 봇)에서
//   0:30~1:00 피격이 약 2배, 3:00 전 사망이 15 → 38판으로 늘었다. 두 행을 원래대로 두니 전체 사망 13.8% → 15.0%,
//   3:00 전 사망 19판으로 돌아왔다. 스5 복습은 40초 E39·E44, 150초 E37, 216초 E40·E42·E43 6종으로 남긴다.
// 2026-11-04 투사체 좀비: 가장 어려운 6종의 첫 등장을 5·40·72·108·144·184초에 하나씩(간격 32~40초) 둔다.
//   스5에는 기존 신규 종 첫 등장이 없어 자리가 넓고, 마지막 스테이지라 고난도 사수가 맞는다.
//   5초 E53은 24초 E03 1기, 108초 E60은 40초 E07 1기(0~1분 → 1~2분, 분당 HP −6% / +2%),
//   144초 E54는 168초 E04 1기, 184초 E55는 216초 E05×1을 옮긴 것이다. 72초 E52는 E04 맞교환.
export const STAGE5_BURST_EVENTS = [
  { sec: 5, type: 'E01', count: 12 },
  { sec: 5, type: 'E53', count: 1 },                            // 물감뿌림 첫 등장(붙었다 빠지며 부채꼴 물감). hp 10 = E03
  { sec: 24, type: 'E03', count: 4 },
  { sec: 24, type: 'E70', count: 1 },                           // 2026-11-07 스4 복습: 술래. hp 10 = E03
  { sec: 40, type: 'E07', count: 1 },
  { sec: 40, type: 'E66', count: 1 },                           // 2026-11-07 스1 복습: 플라나리아. hp 16 = E07
  { sec: 40, type: 'E48', count: 1 },                           // 부메랑자 첫 등장(나갔다 돌아오는 자). hp 16 = E07
  { sec: 40, type: 'E39', count: 1 },                           // 스2 복습: 선끝접기형
  { sec: 40, type: 'E44', count: 1 },                           // 스4 복습: 발맞춤후퇴형
  { sec: 60, type: 'E03', count: 8, formation: 'ring' },
  { sec: 72, type: 'E04', count: 1 },
  { sec: 72, type: 'E52', count: 1 },                           // 플라스크분열 첫 등장(3갈래 분열). hp 32 = E04
  { sec: 108, type: 'E60', count: 1 },                          // 배수구잠복 첫 등장(숨어 오다 6방향 물줄기). hp 16 = E07
  { sec: 108, type: 'E02', count: 4, formation: 'pincer' },
  ...ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS,
  { sec: 120, type: 'E05', count: 4, formation: 'ring' },
  { sec: 144, type: 'E07', count: 6 },
  { sec: 144, type: 'E54', count: 1 },                          // 확성기방송 첫 등장(부채꼴 음파 5발). hp 32 = E04
  { sec: 150, type: 'B03', count: 1 },
  { sec: 150, type: 'E01', count: 4 },
  { sec: 150, type: 'E65', count: 1 },                          // 2026-11-07 스2 복습: 시험감독. hp 8 = E01
  { sec: 150, type: 'E58', count: 1 },                          // 스4 복습: 줄넘기 매복. hp 8 = E01
  { sec: 150, type: 'E37', count: 1 },                          // 스2 복습: 빗금엇갈림형
  { sec: 150, type: 'E51', count: 1 },                          // 스2 복습: 합창지휘. hp 8 = E37
  { sec: 168, type: 'E04', count: 1 },
  { sec: 184, type: 'E55', count: 1 },                          // 강속구 야구부 첫 등장(1.1초 와인드업 강속구). hp 70 = E05
  { sec: 184, type: 'E06', count: 2, formation: 'pincer' },
  // 216초 차저 4 → 1 + 무거운 근접 3종 각 1(전부 hp 70). 탈출 스프린트에서 제자리·곡선·교차 휘두르기를
  // 한 번씩 보여 준다. 108초 협공을 E43으로 바꾸는 안은 프로브에서 1:48 사망이 늘어 폐기했다(2026-11-04).
  { sec: 216, type: 'E40', count: 1 },                          // 스3 복습: 중심축비틀기형(제자리라 탈출 동선에서 피하기 쉽다)
  { sec: 216, type: 'E42', count: 1 },                          // 스3 복습: 반원발맞춤형
  { sec: 216, type: 'E43', count: 1 },                          // 스4 복습: 엇높이교차형
  { sec: 160, endExclusiveSec: 240, repeatIntervalSec: 20, type: 'E01', count: 8 },
  { sec: 160, endExclusiveSec: 240, repeatIntervalSec: 20, type: 'E07', count: 2 },
]

export function getBurstEventsForStage(stageId) {
  if (EXPANSION_STAGES[stageId]) return EXPANSION_STAGES[stageId].events
  if (stageId === 'stage5') return STAGE5_BURST_EVENTS
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

// 보상 이벤트(코인 몬스터)는 한 마리도 못 놓으면 fired로 남기지 않고 다음 틱에 재시도한다.
// 동시 천장(150)이 보스 구간에 오래 차 있어도 이 창을 넘기면 포기해 무한 재시도를 막는다.
export const REWARD_BURST_RETRY_WINDOW_SEC = 30
export function shouldRetryRewardBurst(evt, placed, nowSec) {
  return Boolean(evt?.rewardEvent) && !placed && nowSec < evt.sec + REWARD_BURST_RETRY_WINDOW_SEC
}

// 실제 런타임 스폰 캐시만 코인 보너스 이벤트를 합친다. 기존 버스트 API의 배열 identity와
// 웨이브 HP 예산/앵커 계산 계약은 그대로 보존한다.
export function getRuntimeSpawnEventsForStage(stageId) {
  return [...getRuntimeBurstEventsForStage(stageId), ...COIN_MONSTER_RUNTIME_EVENTS]
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
