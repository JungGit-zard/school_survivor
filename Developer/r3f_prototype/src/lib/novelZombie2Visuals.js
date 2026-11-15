// 2차 신규 좀비(E89~E106) 비주얼 표 — visualId 하나로 몸체를 바꾼다. 행동 코드는 이 파일을 읽지 않는다.
//
// 지금(2026-11-14)은 자리표시 모습이다: 기존 풀 렌더러의 포즈형 리그(E34~E45 중 하나)를 빌려 쓰고
// 팔레트(몸·피부·눈·표식)와 크기(ENEMY_STATS.scale)만 바꾼다. 표식(mark) 슬롯이 모자·완장·공 같은 소품 역할이다.
// 리그를 빌리므로 예고(상태 8)·공격(9)·회복(10)·기절(4) 포즈도 그 리그의 것이 그대로 붙는다.
//
// 2026-11-15부터 몸은 Kenney Mini Characters 2.0(CC0) — components/MiniZombieLayer.jsx가 lib/miniZombieRoster.js
// (visualId → 몸·리컬러·소품·포즈 정본)로 그린다. 아래 kenney 필드는 그 표의 요약(설명용)이고, placeholderAlias·palette는
// 지우지 않고 남겨 둔다: 별칭은 더 이상 렌더 경로에 쓰이지 않고(ZombieInstanceLayer MINI_TYPE), palette는 ZOMBIE_PALETTE
// (사망 파편 색 등)에 계속 펼쳐진다. 행동·스탯·스폰은 visualId만 보므로 손댈 필요가 없다.
// 이동보조·의료 보조기구(cane·crutch·wheelchair·hearing aid)와 휠체어 클립은 좀비 기믹에 절대 쓰지 않는다.
import { NOVEL2_ROWS, NOVEL2_TYPE_IDS } from './novelZombie2Content.js'

export const NOVEL2_VISUALS = Object.freeze({
  'n2-class-president': Object.freeze({
    placeholderAlias: 'E36',
    palette: Object.freeze({ body: 0x2f7d3a, skin: 0x8ab060, eye: 0xff2020, mark: 0xd62828 }), // 초록 셔츠 + 빨간 완장
    kenney: Object.freeze({ body: 'character-male-a', clips: Object.freeze(['walk', 'interact-right', 'emote-yes', 'attack-melee-right', 'die']) }),
  }),
  'n2-shadow-stepper': Object.freeze({
    placeholderAlias: 'E38',
    palette: Object.freeze({ body: 0x2a1f3d, skin: 0x4a3d66, eye: 0xb98cff, mark: 0x111111 }), // 보라·검정 그림자
    kenney: Object.freeze({ body: 'character-zombie', props: Object.freeze(['aid-sunglasses']), clips: Object.freeze(['walk', 'sprint']) }),
  }),
  'n2-mop-pusher': Object.freeze({
    placeholderAlias: 'E39',
    palette: Object.freeze({ body: 0x3d6fa8, skin: 0x7e9a5c, eye: 0xff2020, mark: 0xe8c34a }), // 청소 작업복 + 노란 모자
    kenney: Object.freeze({ body: 'character-worker', clips: Object.freeze(['walk', 'holding-both', 'attack-melee-right']) }),
  }),
  'n2-dribbler': Object.freeze({
    placeholderAlias: 'E41',
    palette: Object.freeze({ body: 0xe07a1f, skin: 0x8ab060, eye: 0xff6a2a, mark: 0xb3541e }), // 주황 저지 + 농구공
    kenney: Object.freeze({ body: 'character-male-f', clips: Object.freeze(['walk', 'holding-right', 'sprint', 'attack-kick-right']) }),
  }),
  'n2-vaulter': Object.freeze({
    placeholderAlias: 'E45',
    palette: Object.freeze({ body: 0x2d5fd0, skin: 0x85a85a, eye: 0xffe3a0, mark: 0xffffff }), // 파란 체육복
    kenney: Object.freeze({ body: 'character-female-f', clips: Object.freeze(['walk', 'jump', 'fall', 'crouch']) }),
  }),
  'n2-pressure-cooker': Object.freeze({
    placeholderAlias: 'E43',
    palette: Object.freeze({ body: 0xf0eee6, skin: 0x9bb26a, eye: 0x2a2418, mark: 0x8a8a92 }), // 흰 조리복 + 솥뚜껑
    kenney: Object.freeze({ body: 'character-male-e', clips: Object.freeze(['walk', 'die', 'static']) }),
  }),
  'n2-coffee-runner': Object.freeze({
    placeholderAlias: 'E44',
    palette: Object.freeze({ body: 0x6b4226, skin: 0x8ab060, eye: 0xffb02a, mark: 0x3b2314 }), // 갈색 앞치마 + 커피포트
    kenney: Object.freeze({ body: 'character-female-e', clips: Object.freeze(['walk', 'holding-right', 'interact-right']) }),
  }),
  'n2-three-legged': Object.freeze({
    placeholderAlias: 'E34',
    palette: Object.freeze({ body: 0x1f5fbf, skin: 0x8ab060, eye: 0xff2020, mark: 0xd61f1f }), // 청군 체육복 + 빨간 발목 끈
    kenney: Object.freeze({ body: 'character-female-c', partnerBody: 'character-male-f', clips: Object.freeze(['walk', 'fall', 'crouch']) }),
  }),
  // ── 2·3차(아직 스폰 안 됨) — id·조우만 예약된 10종도 자리표시 모습을 미리 둔다(풀 렌더러가 어떤 예약 id도 빈 몸으로 그리지 않게).
  'n2-homework-collector': Object.freeze({
    placeholderAlias: 'E35',
    palette: Object.freeze({ body: 0xd9a03a, skin: 0x8ab060, eye: 0xff2020, mark: 0x6a4a2a }),
    kenney: Object.freeze({ body: 'character-female-b', props: Object.freeze(['item-luggage-upright']), clips: Object.freeze(['walk', 'pick-up', 'sprint']) }),
  }),
  'n2-textbook-mimic': Object.freeze({
    placeholderAlias: 'E37',
    palette: Object.freeze({ body: 0x2c6fb7, skin: 0xf2efe2, eye: 0xff2020, mark: 0xd62828 }),
    kenney: null, // Kenney 몸 없음: miniZombieRoster의 절차 교과서 몸(body 'textbook')
  }),
  'n2-train-conductor': Object.freeze({
    placeholderAlias: 'E36',
    palette: Object.freeze({ body: 0x23315e, skin: 0x8ab060, eye: 0xff2020, mark: 0xf2c94c }),
    kenney: Object.freeze({ body: 'character-male-c', clips: Object.freeze(['walk', 'sprint', 'interact-right', 'die']) }),
  }),
  'n2-long-rope-duo': Object.freeze({
    placeholderAlias: 'E41',
    palette: Object.freeze({ body: 0xc8102e, skin: 0x8ab060, eye: 0xffe3a0, mark: 0xffffff }),
    kenney: Object.freeze({ body: 'character-female-c', partnerBody: 'character-male-g', clips: Object.freeze(['walk', 'holding-right', 'interact-right', 'sprint', 'die']) }),
  }),
  'n2-big-eater': Object.freeze({
    placeholderAlias: 'E43',
    palette: Object.freeze({ body: 0xf4f1e8, skin: 0x9bb26a, eye: 0x2a2418, mark: 0xe86a3a }),
    kenney: Object.freeze({ body: 'character-male-b', clips: Object.freeze(['walk', 'crouch', 'attack-melee-left', 'attack-melee-right', 'emote-yes', 'die']) }),
  }),
  'n2-mochi-cling': Object.freeze({
    placeholderAlias: 'E45',
    palette: Object.freeze({ body: 0xf7e1ea, skin: 0xfaf6f0, eye: 0x2a2418, mark: 0xe8a0b4 }),
    kenney: Object.freeze({ body: 'character-female-a', clips: Object.freeze(['sprint', 'jump', 'holding-both']) }),
  }),
  'n2-photocopier': Object.freeze({
    placeholderAlias: 'E40',
    palette: Object.freeze({ body: 0x3a3f4a, skin: 0x8ab060, eye: 0x7cf27c, mark: 0xd8d8d8 }),
    kenney: Object.freeze({ body: 'character-male-d', clips: Object.freeze(['walk', 'interact-left', 'interact-right', 'holding-both-shoot', 'die']) }),
  }),
  'n2-swivel-chair': Object.freeze({
    placeholderAlias: 'E44',
    palette: Object.freeze({ body: 0x6d6d78, skin: 0x8ab060, eye: 0xff2020, mark: 0x1e1e24 }),
    // 사무용 회전의자(바퀴 5개 받침)는 자체 블록 소품이다. Kenney 휠체어 모델·휠체어 클립은 쓰지 않는다.
    kenney: Object.freeze({ body: 'character-female-d', clips: Object.freeze(['drive', 'sit', 'die']) }),
  }),
  'n2-ball-roll-captain': Object.freeze({
    placeholderAlias: 'E42',
    palette: Object.freeze({ body: 0x1f5fbf, skin: 0x8ab060, eye: 0xff2020, mark: 0xffffff }),
    kenney: Object.freeze({ body: 'character-male-g', clips: Object.freeze(['walk', 'holding-both', 'sprint', 'attack-kick-right', 'die']) }),
  }),
  'n2-cavalry': Object.freeze({
    placeholderAlias: 'E39',
    palette: Object.freeze({ body: 0xf2f2f2, skin: 0x8ab060, eye: 0xff2020, mark: 0x1f5fbf }),
    kenney: Object.freeze({ body: 'character-female-b', carrierBody: 'character-male-e', clips: Object.freeze(['holding-both', 'attack-melee-right', 'walk']) }),
  }),
})

export function getNovel2Visual(id) {
  const row = NOVEL2_ROWS[id]
  return row ? NOVEL2_VISUALS[row.visualId] ?? null : null
}

// ZombieMesh ZOMBIE_PALETTE에 펼치는 id → 팔레트(자리표시 모습이 있는 종만).
export const NOVEL2_PALETTE_ENTRIES = Object.freeze(Object.fromEntries(
  NOVEL2_TYPE_IDS.map((id) => [id, getNovel2Visual(id)?.palette]).filter(([, palette]) => palette),
))

// 풀 렌더러가 리그를 빌릴 포즈형 타입(id → 'E34'…'E45'). 자리표시 모습이 없는 종은 빠진다(스폰도 안 된다).
export const NOVEL2_PLACEHOLDER_ALIASES = Object.freeze(Object.fromEntries(
  NOVEL2_TYPE_IDS.map((id) => [id, getNovel2Visual(id)?.placeholderAlias]).filter(([, alias]) => alias),
))
