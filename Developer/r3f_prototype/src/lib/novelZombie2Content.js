// 신규 좀비 2차 세트 18종(E89~E106, typeCode 94~111)의 데이터 정본. Level_Mini 소유.
// 설계 정본: 2026-11-14 "스테이지별 3종 + 치프" 설계안 v1(스테이지 1~6, 스테이지마다 3종, 그중 치프 1종).
//
// 순수 데이터 모듈이다. 다른 게임 모듈을 import하지 않는다 — enemyEntityPool / enemySimulation / Enemy.jsx /
// expansionAttackRuntime이 모두 이 표를 읽으므로 순환 의존을 만들면 안 된다.
//
// 번호 규칙:
//  - typeCode는 ENEMY_TYPE_NAMES 끝(75 = B10, 76~93 = 블록 좀비 다음)에만 붙인다. 94 = E89 … 111 = E106. 재배열 금지.
//  - 확장 DATA.enemies(expansionContent.js)에 행을 넣지 않는다 — 넣으면 typeCode 37~75가 전부 한 칸씩 밀린다.
//  - 18개 id는 전부 지금 예약한다(조우 기록·Rules 허용 목록이 18개를 한 번에 갖는다). 실제 스폰·행동이 있는 것은
//    implemented: true인 행(wave 1 8종 + wave 2 4종 + wave 3 3종)뿐이고, 나머지는 스탯이 없어 스폰되지 않는다(시뮬레이션이 오류로 격리).
//
// 수치 규칙:
//  - 일반 종: 같은 HP의 기본 좀비(host) 1기와 1:1 교체 → 스테이지 총 HP·XP 불변. hp/xp = host.
//  - 치프: base 400 × 스테이지 배수. 보상은 stageChiefContent.js의 엘리트 보상 행.
//    예외 E89(Stage 1 반장)는 base 120(×1.0 = 120). 2026-11-15 balanceqa: base 400은 기준 봇 119판 중 처치 0회(런 끝 중앙값 300/400 남음),
//    1차 조정 240 뒤 wave 2 리뷰에서 balanceqa 권고값 120으로 내렸다 — 초보가 보상에 닿고 미니 HP바가 런 내내 남지 않게.
//    2차(wave 2) 치프 E92·E95도 balanceqa 권고 실효값(E92 머리 120, E95 몸 40)으로 정했다(아래 행 주석).
//    3차(wave 3) 치프 E98·E101·E104는 E92와 같은 base 100 규칙(스4 173, 스6 절대 250). E101만 base 90(스5 187 — 아래 행 주석).
//  - hpMode 'absolute'는 E104(Stage 6 치프)도 쓴다.
//  - 두 몸 치프(E95 긴줄넘기 듀오): 한 행이 몸 bodyCount개를 낸다. 행 hp는 몸 하나 — 치프 합계 = hp × bodyCount.
//  - hpMode 'absolute'(E105, Stage 6): 기존 종 배수(2.488)를 타지 않고 표의 hp를 그대로 쓴다(E19와 같은 30).
//
// 거리 단위는 월드 유닛(u). 1블록 = 4u.

export const NOVEL2_FIRST_TYPE_CODE = 94
export const NOVEL2_LAST_TYPE_CODE = 111

// 순서 = typeCode 94, 95, … 111. 배열 순서를 바꾸면 전부 어긋난다.
export const NOVEL2_TYPE_IDS = Object.freeze([
  'E89', 'E90', 'E91', // Stage 1 교실: 반장(치프) · 숙제 걷기 당번 · 교과서 미믹
  'E92', 'E93', 'E94', // Stage 2 복도: 기차놀이 기관사(치프) · 그림자밟기 · 대걸레 밀기
  'E95', 'E96', 'E97', // Stage 3 체육관: 긴줄넘기 듀오(치프) · 드리블 · 뜀틀
  'E98', 'E99', 'E100', // Stage 4 급식실: 대식가(치프) · 압력밥솥 · 찹쌀떡
  'E101', 'E102', 'E103', // Stage 5 교무실: 복사기(치프) · 회전의자 · 커피 셔틀
  'E104', 'E105', 'E106', // Stage 6 운동장: 공굴리기 대장(치프) · 2인3각 · 기마전
])

export const NOVEL2_TYPE_CODES = Object.freeze(Object.fromEntries(NOVEL2_TYPE_IDS.map((id, i) => [id, NOVEL2_FIRST_TYPE_CODE + i])))

export const NOVEL2_CHIEF_IDS = Object.freeze(['E89', 'E92', 'E95', 'E98', 'E101', 'E104'])

// 1차 구현분(wave 1).
export const NOVEL2_WAVE1_IDS = Object.freeze(['E89', 'E93', 'E94', 'E96', 'E97', 'E99', 'E103', 'E105'])
// 2차 구현분(wave 2, 2026-11-15).
export const NOVEL2_WAVE2_IDS = Object.freeze(['E90', 'E91', 'E92', 'E95'])
// 3차 구현분 첫 묶음(wave 3, 2026-11-16): 치프 3종. 남은 3종(E100·E102·E106)은 id·typeCode·조우 기록만 예약돼 있다.
export const NOVEL2_WAVE3_IDS = Object.freeze(['E98', 'E101', 'E104'])

// 행 공통 필드: stageId, chief, visualId(비주얼 교체 키 — 행동은 이 값을 읽지 않는다), implemented.
// visualId는 lib/novelZombie2Visuals.js가 해석한다. Kenney Mini Characters 몸체가 들어오면 그 표만 바뀐다.
const ROWS = {
  E89: { stageId: 'stage1', chief: true, visualId: 'n2-class-president', implemented: true,
    stats: { hp: 120, speed: 0.42, damage: 12, scale: 1.5, xp: 15, contactDist: 0.38 } },
  // host E07(hp 16 / xp 8) — Stage 1 150초 웃는좀비 행 6기 중 1기. 공격 없음(피해 0): 떨어진 교과서를 주워 가방에 담고 도망친다.
  E90: { stageId: 'stage1', chief: false, visualId: 'n2-homework-collector', implemented: true,
    stats: { hp: 16, speed: 0.95, damage: 0, scale: 0.95, xp: 8, contactDist: 0.26 } },
  // host E01(hp 8 / xp 4) — Stage 1 184초 혼합 E01 행 1기. 바닥 교과서로 위장했다가 물기(6). 처치하면 진짜 교과서 2권.
  E91: { stageId: 'stage1', chief: false, visualId: 'n2-textbook-mimic', implemented: true,
    dropBonus: { textbook: 2 },
    stats: { hp: 8, speed: 0.75, damage: 6, scale: 1.0, xp: 4, contactDist: 0.24 } },
  // 치프. 머리 + 객차 E01(실효 10씩, 머리가 첫 걸음에 직접 풀에 세운다 — 객차 HP는 머리 배율을 따른다. 객차 수는 E92_TRAIN.carCount).
  // 머리 접촉 0.3 × 4/3 = 0.4u — 돌진 예고선 폭 1.1u(반폭 0.55)가 머리 판정 + 옆 밀림 허용 0.15u를 덮는다.
  // 머리 HP: base 100(스2 실효 120) — 2026-11-15 balanceqa wave 2 리뷰 권고 실효값.
  //   이전 기록: 설계 360(base 300) → base 44(실효 53). stageRuntimeProbe 기준 봇(KITE r4, REF_BUILD_V1) 60판:
  //   실효 360 처치 0/60(가한 피해 중앙값 40 — 객차가 앞에서 연필을 받는다), 53 처치 15~30/60.
  //   기차의 압박(사망률 +5.8%p, 240판 짝비교)은 머리 HP와 무관하게 객차가 연필을 받아 내는 데서 왔다 —
  //   압박은 HP가 아니라 객차 수·방패/회복 제외로 줄인다(novelZombie2Behavior.js E92_TRAIN 주석에 측정).
  E92: { stageId: 'stage2', chief: true, visualId: 'n2-train-conductor', implemented: true,
    stats: { hp: 100, speed: 1.1, damage: 12, scale: 1.5, xp: 15, contactDist: 0.3 } },
  // host E03(hp 10 / xp 5) — Stage 2 60초 포위 러너(ring) 행 6기 중 1기(24초 E03 행은 블록 좀비 E83이 먼저 받았다).
  E93: { stageId: 'stage2', chief: false, visualId: 'n2-shadow-stepper', implemented: true,
    stats: { hp: 10, speed: 0.8, damage: 6, scale: 0.95, xp: 5, contactDist: 0.24 } },
  // host E07(hp 16 / xp 8) — Stage 2 60초 웃는좀비 행 4기 중 1기(108초 E07 행은 블록 좀비 E72가 먼저 받았다). 걸레 직선 = 확장 rootline 행동(피해 9로 덮어쓰기).
  E94: { stageId: 'stage2', chief: false, visualId: 'n2-mop-pusher', implemented: true, behaviorId: 'rootline', attackDamage: 9,
    stats: { hp: 16, speed: 0.55, damage: 8, scale: 1.0, xp: 8, contactDist: 0.26 } },
  // 치프, 두 몸. 줄(선 공격) 피해 10, 접촉 10.
  // 몸 HP: base 28(스3 실효 40, 합계 80) — 2026-11-15 balanceqa wave 2 리뷰 권고 실효값.
  //   이전 기록: 설계 288(base 200) → base 17(실효 24). stageRuntimeProbe 기준 봇 60판(스폰 56판): 몸 288 → 두 몸 처치 0/56,
  //   몸 35 → 4/56, 25 → 11/56. 느린 두 몸(0.5u/s)이 카이팅 봇에 거의 닿지 못해 처치 몫은 HP보다 교전 시간이 정한다.
  //   행동은 소유자 플레이테스트 뒤 다시 본다(두 독립 좀비로 나눌 수 있음).
  E95: { stageId: 'stage3', chief: true, visualId: 'n2-long-rope-duo', implemented: true, bodyCount: 2,
    stats: { hp: 28, speed: 0.5, damage: 10, scale: 1.4, xp: 15, contactDist: 0.3 } },
  // E07 체급(hp 16 / xp 8). Stage 3 40초에 새로 더한 스폰(순증 hp 16) — host 맞교환이 아니다(치프처럼 밀도 동결 밖).
  E96: { stageId: 'stage3', chief: false, visualId: 'n2-dribbler', implemented: true,
    stats: { hp: 16, speed: 1.0, damage: 8, scale: 1.0, xp: 8, contactDist: 0.26 } },
  // host E03(hp 10 / xp 5) — Stage 3 60초 포위 러너 5기 중 1기. 도약 = 확장 hop 행동(착지 피해 9로 덮어쓰기).
  E97: { stageId: 'stage3', chief: false, visualId: 'n2-vaulter', implemented: true, behaviorId: 'hop', attackDamage: 9,
    stats: { hp: 10, speed: 0.6, damage: 6, scale: 0.95, xp: 5, contactDist: 0.24 } },
  // 치프(3차, 2026-11-16). base 100(스4 실효 173) — wave 2 E92와 같은 base. 먹을 때마다 최대 HP 8% 회복·크기 +6%·속도 −5%(novelZombie2Behavior.js E98_EATER).
  // 물기 14(빨간 부채꼴 70°·r 2.2u, 예고 1.0초), 접촉 14. 접촉 0.34 × 4/3 = 0.45u.
  E98: { stageId: 'stage4', chief: true, visualId: 'n2-big-eater', implemented: true,
    stats: { hp: 100, speed: 0.45, damage: 14, scale: 1.6, xp: 15, contactDist: 0.34 } },
  // host E05(hp 70 / xp 15) — Stage 4 120초 차저 포위 4기 중 1기.
  E99: { stageId: 'stage4', chief: false, visualId: 'n2-pressure-cooker', implemented: true,
    stats: { hp: 70, speed: 0.42, damage: 10, scale: 1.3, xp: 15, contactDist: 0.34 } },
  E100: { stageId: 'stage4', chief: false, visualId: 'n2-mochi-cling', implemented: false },
  // 치프(3차, 2026-11-16). base 90(스5 실효 187) — 봇 사망률이 이미 가장 높은 스5라 E98보다 한 단계 가볍게, 등장도 가장 이른(40초) 치프라
  // 플레이어 화력이 가장 낮을 때 나온다. 근접 부채꼴 12(60°·r 2.4u, 예고 1.0초), 접촉 12. 복사본은 XP·드롭 0(E101_COPIER).
  E101: { stageId: 'stage5', chief: true, visualId: 'n2-photocopier', implemented: true,
    stats: { hp: 90, speed: 0.38, damage: 12, scale: 1.5, xp: 15, contactDist: 0.3 } },
  E102: { stageId: 'stage5', chief: false, visualId: 'n2-swivel-chair', implemented: false },
  // host E04(hp 32 / xp 10) — Stage 5 144초 원거리 행 4기 중 1기. 탄을 쏘지 않는다(사수 상한·사수 순환 계층 밖).
  E103: { stageId: 'stage5', chief: false, visualId: 'n2-coffee-runner', implemented: true,
    stats: { hp: 32, speed: 0.5, damage: 6, scale: 1.0, xp: 10, contactDist: 0.26 } },
  // 치프(3차, 2026-11-16). Stage 6 절대 HP 250(= base 100 × 기존 종 배수 2.488 — 다른 치프와 같은 base 규칙). 설계 1000은
  // wave 2 교훈(치프 실효 HP = 집중 공격 10~20초 분량)으로 내렸다. 공 10(빨간 선 폭 1.8u, 예고 1.3초 — 설계 14는 스6 짝비교 사망 +20%p라 내렸다), 접촉 14.
  E104: { stageId: 'stage6', chief: true, visualId: 'n2-ball-roll-captain', implemented: true, hpMode: 'absolute',
    stats: { hp: 250, speed: 0.5, damage: 14, scale: 1.55, xp: 15, contactDist: 0.3 } },
  // Stage 6 절대 HP(E19와 같은 30 / xp 6). 150초·168초 E01 3기(실효 20 × 3 = 60) 자리를 한 쌍(30 × 2)씩 받는다 — HP 불변.
  E105: { stageId: 'stage6', chief: false, visualId: 'n2-three-legged', implemented: true, hpMode: 'absolute',
    stats: { hp: 30, speed: 0.9, damage: 10, scale: 0.95, xp: 6, contactDist: 0.26 } },
  E106: { stageId: 'stage6', chief: false, visualId: 'n2-cavalry', implemented: false },
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

export const NOVEL2_ROWS = deepFreeze(Object.fromEntries(NOVEL2_TYPE_IDS.map((id) => [id, { id, typeCode: NOVEL2_TYPE_CODES[id], ...ROWS[id] }])))

// ENEMY_STATS에 펼치는 구현분 스탯(Enemy.jsx). novel2: true 표식은 HP 배수·풀 경로 판정에 쓰인다.
export const NOVEL2_ZOMBIE_STATS = Object.freeze(Object.fromEntries(
  NOVEL2_TYPE_IDS.filter((id) => NOVEL2_ROWS[id].implemented)
    .map((id) => [id, Object.freeze({ ...NOVEL2_ROWS[id].stats, novel2: true, ...(NOVEL2_ROWS[id].chief ? { chief: true } : {}) })]),
))

// 확장 공격 런타임(stepExpansionAttack)이 일반 확장 적처럼 다루는 행. 확장 DATA.enemies와 같은 모양의 필드만 둔다.
export const NOVEL2_EXPANSION_ENEMIES = deepFreeze(Object.fromEntries(
  NOVEL2_TYPE_IDS.filter((id) => NOVEL2_ROWS[id].implemented && NOVEL2_ROWS[id].behaviorId)
    .map((id) => {
      const row = NOVEL2_ROWS[id]
      return [id, { id, typeCode: row.typeCode, stageId: row.stageId, behaviorId: row.behaviorId, attackDamage: row.attackDamage, novel2: true }]
    }),
))

// 처치 보너스 드롭(일반 종). Enemies.jsx ELITE_BONUS에 펼친다 — E91 미믹은 진짜 교과서 2권(값 = 자기 xp).
export const NOVEL2_DROP_BONUS = deepFreeze(Object.fromEntries(
  NOVEL2_TYPE_IDS.filter((id) => NOVEL2_ROWS[id].implemented && NOVEL2_ROWS[id].dropBonus).map((id) => [id, { ...NOVEL2_ROWS[id].dropBonus }]),
))

export function novel2IdFromCode(typeCode) {
  return Number.isInteger(typeCode) && typeCode >= NOVEL2_FIRST_TYPE_CODE && typeCode <= NOVEL2_LAST_TYPE_CODE
    ? NOVEL2_TYPE_IDS[typeCode - NOVEL2_FIRST_TYPE_CODE] : null
}

export function isNovel2TypeCode(typeCode) {
  return novel2IdFromCode(typeCode) !== null
}

export function isNovel2ImplementedTypeCode(typeCode) {
  const id = novel2IdFromCode(typeCode)
  return id !== null && NOVEL2_ROWS[id].implemented === true
}

export function isNovel2Id(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(NOVEL2_ROWS, id)
}

export function isNovel2ExpansionTypeCode(typeCode) {
  const id = novel2IdFromCode(typeCode)
  return id !== null && Object.prototype.hasOwnProperty.call(NOVEL2_EXPANSION_ENEMIES, id)
}

export function isNovel2AbsoluteHp(id) {
  return isNovel2Id(id) && NOVEL2_ROWS[id].hpMode === 'absolute'
}

// 한국어 이름 정본(도감·조우·치프 이름표). en/ja는 locales의 zombie.<ID>.
export const NOVEL2_LABELS_KO = Object.freeze({
  E89: '반장 좀비',
  E90: '숙제 걷기 당번 좀비',
  E91: '교과서 미믹',
  E92: '복도 기차놀이 기관사 좀비',
  E93: '그림자밟기 좀비',
  E94: '대걸레 밀기 좀비',
  E95: '긴줄넘기 듀오',
  E96: '드리블 좀비',
  E97: '뜀틀 좀비',
  E98: '대식가 좀비',
  E99: '압력밥솥 좀비',
  E100: '찹쌀떡 좀비',
  E101: '복사기 좀비',
  E102: '회전의자 좀비',
  E103: '커피 셔틀 좀비',
  E104: '공굴리기 대장 좀비',
  E105: '2인3각 좀비',
  E106: '기마전 좀비',
})
