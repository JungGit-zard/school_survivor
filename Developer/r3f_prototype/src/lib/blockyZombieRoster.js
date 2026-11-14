// 블록 좀비 18종(E71~E88, typeCode 76~93)의 타입 등록부와 비주얼 상수 정본. 2026-11-14.
//
// Terry: "https://kenney.nl/assets/blocky-characters 여기 조사해서 가져다 쓸 수 있는 캐릭터 전부 가져다가 좀비 종류
// 추가해놔" / "난이도보다 구현이 우선, 일단 넣어". Kenney "Blocky Characters 2.0"(CC0) 18명 전원을 좀비로 들인다.
// 출처·해시: src/assets/models/kenney_blocky/PROVENANCE.json, 지오메트리: lib/kenneyBlockyGeometry.js(생성 파일).
//
// 분업(투사체 좀비 E46~E70과 같은 공용 경로를 탄다 — 새 시스템을 만들지 않는다):
//  - 수치·행동(접근 → 예고 → 발사/돌진/순간이동/회복·방패 → 회복): lib/projectileZombieBehavior.js 행동표의 76~93 행.
//    상태 코드도 투사체 좀비와 같은 14~17(PROJECTILE_ZOMBIE_STATE)이다.
//  - 그림자·체력바·스폰 연기: ZombieInstanceLayer(파트 0개로 그린다, E07과 같은 분업).
//  - 몸통: components/BlockyZombieLayer.jsx(6파트 InstancedMesh + 아틀라스 1장 + 툰 + 외곽선).
// 이 모듈은 순수 데이터다. three·React·Firebase·storage 의존이 없다.
//
// typeCode 75는 B10(Stage 5 보스)이 쓰므로 76부터다. 고정 번호 — 재배열 금지, 새 타입은 끝에만 붙인다.

export const BLOCKY_ZOMBIE_TYPES = Object.freeze([
  'E71', 'E72', 'E73', 'E74', 'E75', 'E76', 'E77', 'E78', 'E79',
  'E80', 'E81', 'E82', 'E83', 'E84', 'E85', 'E86', 'E87', 'E88',
])
export const BLOCKY_ZOMBIE_FIRST_TYPE_CODE = 76
export const BLOCKY_ZOMBIE_LAST_TYPE_CODE = BLOCKY_ZOMBIE_FIRST_TYPE_CODE + BLOCKY_ZOMBIE_TYPES.length - 1
export const BLOCKY_ZOMBIE_TYPE_CODES = Object.freeze(Object.fromEntries(BLOCKY_ZOMBIE_TYPES.map((id, index) => [id, BLOCKY_ZOMBIE_FIRST_TYPE_CODE + index])))

export function isBlockyZombieTypeCode(typeCode) {
  return Number.isInteger(typeCode) && typeCode >= BLOCKY_ZOMBIE_FIRST_TYPE_CODE && typeCode <= BLOCKY_ZOMBIE_LAST_TYPE_CODE
}

export function isBlockyZombieType(type) {
  return typeof type === 'string' ? BLOCKY_ZOMBIE_TYPE_CODES[type] !== undefined : isBlockyZombieTypeCode(type)
}

// 1-based 종 번호. 0이면 블록 좀비가 아니다.
export function blockyZombieIndex(typeCode) {
  return isBlockyZombieTypeCode(typeCode) ? typeCode - BLOCKY_ZOMBIE_FIRST_TYPE_CODE + 1 : 0
}

// letter = Kenney character-<letter>.glb / texture-<letter>.png(아틀라스 칸 = 알파벳 순서).
// role: melee | ranged | support | fast. style = 예고·공격 포즈 문법(BlockyZombieLayer):
//   punch(오른팔 내지르기) · kick(오른발 차기) · slam(두 팔 내리찍기) · charge(몸 숙여 돌진) · tumble(돌진 뒤 옆으로 굴러 넘어짐)
//   throw(오른팔 위로 젖혔다 던지기) · shoot(두 팔 앞으로 겨누기) · fan(오른팔 옆으로 휘두르기) · whistle(오른손을 입에)
//   cast(두 팔 들어 올리기 — 지원형) · blink(웅크렸다 팔 뻗어 터치)
// telegraphMs = 예고 길이(행동 모듈이 stateTimer에 넣는다). 모든 종이 18프레임(300ms)보다 길다.
export const BLOCKY_ZOMBIE_VISUALS = Object.freeze({
  E71: Object.freeze({ letter: 'r', key: 'talentShowNinja', label: '학예회 닌자 좀비', look: '검은 닌자 복면', role: 'fast', style: 'blink', telegraphMs: 900 }),
  E72: Object.freeze({ letter: 'j', key: 'crossingGuard', label: '교통지도 좀비', look: '남색 제복·모자', role: 'ranged', style: 'whistle', telegraphMs: 700 }),
  E73: Object.freeze({ letter: 'p', key: 'costumePirate', label: '해적 분장 좀비', look: '안대·파란 코트', role: 'ranged', style: 'throw', telegraphMs: 600 }),
  E74: Object.freeze({ letter: 'g', key: 'roboticsZapper', label: '로봇부 번개 좀비', look: '회색 로봇·번개 배지', role: 'ranged', style: 'shoot', telegraphMs: 600 }),
  E75: Object.freeze({ letter: 'h', key: 'roboticsHeartRammer', label: '로봇부 하트 좀비', look: '회색 로봇·하트 배지', role: 'fast', style: 'charge', telegraphMs: 700 }),
  E76: Object.freeze({ letter: 'o', key: 'dramaClubOrc', label: '연극부 오크 좀비', look: '청록 오크 분장·엄니', role: 'melee', style: 'charge', telegraphMs: 800 }),
  E77: Object.freeze({ letter: 'd', key: 'crashTestDummy', label: '충돌실험 인형 좀비', look: '노란 충돌실험 인형', role: 'fast', style: 'tumble', telegraphMs: 500 }),
  E78: Object.freeze({ letter: 'i', key: 'gardenGrandpa', label: '텃밭 할아버지 좀비', look: '안경 쓴 할아버지', role: 'support', style: 'cast', telegraphMs: 700 }),
  E79: Object.freeze({ letter: 'q', key: 'ptaPresident', label: '학부모회장 좀비', look: '검은 정장·빨간 넥타이', role: 'ranged', style: 'throw', telegraphMs: 600 }),
  E80: Object.freeze({ letter: 'n', key: 'festivalFanDancer', label: '축제 부채 좀비', look: '꽃무늬 기모노', role: 'ranged', style: 'fan', telegraphMs: 600 }),
  E81: Object.freeze({ letter: 'c', key: 'arcadeGamer', label: 'PC방 게이머 좀비', look: '민머리·게임패드 티셔츠', role: 'ranged', style: 'shoot', telegraphMs: 700 }),
  E82: Object.freeze({ letter: 'a', key: 'ssireumWrestler', label: '씨름부 좀비', look: '수염·웃통 벗은 장사', role: 'melee', style: 'slam', telegraphMs: 600 }),
  E83: Object.freeze({ letter: 'b', key: 'cheerCaptain', label: '응원단장 좀비', look: '빨간 셔츠', role: 'melee', style: 'kick', telegraphMs: 500 }),
  E84: Object.freeze({ letter: 'e', key: 'lunchNutritionist', label: '영양사 좀비', look: '보라 상의', role: 'support', style: 'cast', telegraphMs: 500 }),
  E85: Object.freeze({ letter: 'k', key: 'snackBarUncle', label: '매점 아저씨 좀비', look: '콧수염·빨간 옷', role: 'melee', style: 'punch', telegraphMs: 550 }),
  E86: Object.freeze({ letter: 'l', key: 'schoolInspector', label: '장학사 좀비', look: '초록 얼굴·남색 정장', role: 'support', style: 'cast', telegraphMs: 600 }),
  E87: Object.freeze({ letter: 'm', key: 'orienteeringScout', label: '오리엔티어링부 좀비', look: '초록 옷·가죽 끈', role: 'fast', style: 'punch', telegraphMs: 500 }),
  E88: Object.freeze({ letter: 'f', key: 'trackSprinter', label: '육상부 좀비', look: '청록 상의', role: 'fast', style: 'kick', telegraphMs: 500 }),
})

const LETTER_ORDER = 'abcdefghijklmnopqr'
// 아틀라스 칸 번호(0..17). 칸 순서는 Kenney 글자 순서다(kenneyBlockyGeometry.KENNEY_BLOCKY_LETTERS와 같다).
export function blockyZombieAtlasCell(type) {
  const letter = BLOCKY_ZOMBIE_VISUALS[type]?.letter
  return letter ? LETTER_ORDER.indexOf(letter) : -1
}

export function blockyZombieTelegraphMs(typeCode) {
  const type = BLOCKY_ZOMBIE_TYPES[blockyZombieIndex(typeCode) - 1]
  return type ? BLOCKY_ZOMBIE_VISUALS[type].telegraphMs : 0
}

// typeCode 76..93 인덱스 이름 슬롯(ENEMY_TYPE_NAMES처럼 typeCode 인덱스 표가 이어 붙인다).
export const BLOCKY_ZOMBIE_TYPE_NAME_SLOTS = BLOCKY_ZOMBIE_TYPES

// 사망 파편(EnemyDeathCollapse)과 팔레트 조회용 대표색. 아틀라스에서 읽은 옷·피부 근사색이다.
export const BLOCKY_ZOMBIE_PALETTE_ENTRIES = Object.freeze({
  E71: Object.freeze({ body: 0x2c2f45, skin: 0x7f9a6a, eye: 0xd8353a }),
  E72: Object.freeze({ body: 0x27345a, skin: 0x7f9a6a, eye: 0xe0c040 }),
  E73: Object.freeze({ body: 0x3e57a0, skin: 0x7f9a6a, eye: 0x8a5a2a }),
  E74: Object.freeze({ body: 0xa3868c, skin: 0x9a9eaa, eye: 0xd8353a }),
  E75: Object.freeze({ body: 0x9a7fb0, skin: 0x9a9eaa, eye: 0x9a5ad0 }),
  E76: Object.freeze({ body: 0x2f9a80, skin: 0x3fae8c, eye: 0x6b4a2e }),
  E77: Object.freeze({ body: 0xe0b030, skin: 0xe0b030, eye: 0x202020 }),
  E78: Object.freeze({ body: 0xb8cfe0, skin: 0x8fa680, eye: 0x9aa0a8 }),
  E79: Object.freeze({ body: 0x23252c, skin: 0x6b7a58, eye: 0xc0303a }),
  E80: Object.freeze({ body: 0x2aa080, skin: 0xe8ece0, eye: 0xc03040 }),
  E81: Object.freeze({ body: 0x3a9a5a, skin: 0x8fa680, eye: 0xf0f0f0 }),
  E82: Object.freeze({ body: 0x7f9a6a, skin: 0x7f9a6a, eye: 0x3a9a6a }),
  E83: Object.freeze({ body: 0xb03a3a, skin: 0x6b7a58, eye: 0x3a5aa0 }),
  E84: Object.freeze({ body: 0x8a6ac0, skin: 0x8fa680, eye: 0xb87a50 }),
  E85: Object.freeze({ body: 0xb84040, skin: 0x8fa680, eye: 0x3a5aa0 }),
  E86: Object.freeze({ body: 0x2a3550, skin: 0x3a9a5a, eye: 0xf0f0f0 }),
  E87: Object.freeze({ body: 0x3a8a4a, skin: 0x6b7a58, eye: 0x8a5a2a }),
  E88: Object.freeze({ body: 0x2aa088, skin: 0x6b7a58, eye: 0x5a7ab0 }),
})
