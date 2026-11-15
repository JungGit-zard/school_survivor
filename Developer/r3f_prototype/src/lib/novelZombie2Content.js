// 신규 좀비 2차 세트 18종(E89~E106, typeCode 94~111)의 데이터 정본. Level_Mini 소유.
// 설계 정본: 2026-11-14 "스테이지별 3종 + 치프" 설계안 v1(스테이지 1~6, 스테이지마다 3종, 그중 치프 1종).
//
// 순수 데이터 모듈이다. 다른 게임 모듈을 import하지 않는다 — enemyEntityPool / enemySimulation / Enemy.jsx /
// expansionAttackRuntime이 모두 이 표를 읽으므로 순환 의존을 만들면 안 된다.
//
// 번호 규칙:
//  - typeCode는 ENEMY_TYPE_NAMES 끝(75 = B10 다음)에만 붙인다. 76 = E89 … 93 = E106. 재배열 금지.
//  - 확장 DATA.enemies(expansionContent.js)에 행을 넣지 않는다 — 넣으면 typeCode 37~75가 전부 한 칸씩 밀린다.
//  - 18개 id는 전부 지금 예약한다(조우 기록·Rules 허용 목록이 18개를 한 번에 갖는다). 실제 스폰·행동이 있는 것은
//    implemented: true인 1차(wave 1) 8종뿐이고, 나머지는 스탯이 없어 스폰되지 않는다(시뮬레이션이 오류로 격리).
//
// 수치 규칙:
//  - 일반 종: 같은 HP의 기본 좀비(host) 1기와 1:1 교체 → 스테이지 총 HP·XP 불변. hp/xp = host.
//  - 치프: base 400 × 스테이지 배수(Stage 1은 ×1.0 = 400). 보상은 stageChiefContent.js의 엘리트 보상 행.
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

// 1차 구현분(wave 1). 나머지 10종은 id·typeCode·조우 기록만 예약돼 있다.
export const NOVEL2_WAVE1_IDS = Object.freeze(['E89', 'E93', 'E94', 'E96', 'E97', 'E99', 'E103', 'E105'])

// 행 공통 필드: stageId, chief, visualId(비주얼 교체 키 — 행동은 이 값을 읽지 않는다), implemented.
// visualId는 lib/novelZombie2Visuals.js가 해석한다. Kenney Mini Characters 몸체가 들어오면 그 표만 바뀐다.
const ROWS = {
  E89: { stageId: 'stage1', chief: true, visualId: 'n2-class-president', implemented: true,
    stats: { hp: 400, speed: 0.42, damage: 12, scale: 1.5, xp: 15, contactDist: 0.38 } },
  E90: { stageId: 'stage1', chief: false, visualId: 'n2-homework-collector', implemented: false },
  E91: { stageId: 'stage1', chief: false, visualId: 'n2-textbook-mimic', implemented: false },
  E92: { stageId: 'stage2', chief: true, visualId: 'n2-train-conductor', implemented: false },
  // host E03(hp 10 / xp 5) — Stage 2 24초 러너 행 3기 중 1기.
  E93: { stageId: 'stage2', chief: false, visualId: 'n2-shadow-stepper', implemented: true,
    stats: { hp: 10, speed: 0.8, damage: 6, scale: 0.95, xp: 5, contactDist: 0.24 } },
  // host E07(hp 16 / xp 8) — Stage 2 108초 웃는좀비 행 2기 중 1기. 걸레 직선 = 확장 rootline 행동(피해 9로 덮어쓰기).
  E94: { stageId: 'stage2', chief: false, visualId: 'n2-mop-pusher', implemented: true, behaviorId: 'rootline', attackDamage: 9,
    stats: { hp: 16, speed: 0.55, damage: 8, scale: 1.0, xp: 8, contactDist: 0.26 } },
  E95: { stageId: 'stage3', chief: true, visualId: 'n2-long-rope-duo', implemented: false },
  // E07 체급(hp 16 / xp 8). Stage 3 5초 E01×2(합 base 16) 자리 — Stage 3에는 단발 E07 행이 없다.
  E96: { stageId: 'stage3', chief: false, visualId: 'n2-dribbler', implemented: true,
    stats: { hp: 16, speed: 1.0, damage: 8, scale: 1.0, xp: 8, contactDist: 0.26 } },
  // host E03(hp 10 / xp 5) — Stage 3 60초 포위 러너 5기 중 1기. 도약 = 확장 hop 행동(착지 피해 9로 덮어쓰기).
  E97: { stageId: 'stage3', chief: false, visualId: 'n2-vaulter', implemented: true, behaviorId: 'hop', attackDamage: 9,
    stats: { hp: 10, speed: 0.6, damage: 6, scale: 0.95, xp: 5, contactDist: 0.24 } },
  E98: { stageId: 'stage4', chief: true, visualId: 'n2-big-eater', implemented: false },
  // host E05(hp 70 / xp 15) — Stage 4 120초 차저 포위 4기 중 1기.
  E99: { stageId: 'stage4', chief: false, visualId: 'n2-pressure-cooker', implemented: true,
    stats: { hp: 70, speed: 0.42, damage: 10, scale: 1.3, xp: 15, contactDist: 0.34 } },
  E100: { stageId: 'stage4', chief: false, visualId: 'n2-mochi-cling', implemented: false },
  E101: { stageId: 'stage5', chief: true, visualId: 'n2-photocopier', implemented: false },
  E102: { stageId: 'stage5', chief: false, visualId: 'n2-swivel-chair', implemented: false },
  // host E04(hp 32 / xp 10) — Stage 5 144초 원거리 행 4기 중 1기. 탄을 쏘지 않는다(사수 상한·사수 순환 계층 밖).
  E103: { stageId: 'stage5', chief: false, visualId: 'n2-coffee-runner', implemented: true,
    stats: { hp: 32, speed: 0.5, damage: 6, scale: 1.0, xp: 10, contactDist: 0.26 } },
  E104: { stageId: 'stage6', chief: true, visualId: 'n2-ball-roll-captain', implemented: false },
  // Stage 6 절대 HP(E19와 같은 30 / xp 6). 52초·168초 E01 3기(실효 20 × 3 = 60) 자리를 한 쌍(30 × 2)이 받는다 — HP 불변.
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
