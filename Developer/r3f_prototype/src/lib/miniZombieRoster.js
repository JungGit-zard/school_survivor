// 2차 신규 좀비 18종(E89~E106, typeCode 94~111)의 Kenney "Mini Characters 2.0"(CC0) 몸체 표. 2026-11-15, threemini.
//
// visualId(lib/novelZombie2Content.js 행의 visualId) → 몸체 변형(variant) 목록. 행동·스탯·스폰은 이 표를 읽지 않는다.
// 몸은 블록 좀비(BlockyZombieLayer)와 같은 6파트 강체(legL·legR·torso·armL·armR·head) + 절차적 포즈다.
// 클립 믹서·SkinnedMesh는 쓰지 않는다. 지오메트리: assets/models/kenney_mini/mini_zombies_kenney.glb(굽기 스크립트 산출).
//
// 색: Kenney 팩은 캐릭터 20명이 컬러맵 한 장(512², 16열×4행 칸, 칸마다 세로 그라디언트)을 같이 쓰고 UV로 색을 고른다.
// 굽기 때 비어 있던 영역(0행 전체, 1행 10~15열)에 아래 MINI_PALETTE_SLOTS를 8px 폭 칸으로 칠해 넣었다.
// 리컬러 = UV 칸 옮기기(remap): 런타임에 변형마다 지오메트리를 한 번 복제해 'r{행}c{열}'(Kenney 칸) 또는 슬롯 이름을
// 다른 슬롯으로 옮긴다. 그래서 같은 몸이라도 변형마다 색이 다르고, 텍스처·재질은 전 종이 1벌이다.
//   - skin: 몸마다 다른 피부 칸(GLB extras.mini.skinCell)을 좀비 피부 슬롯으로 옮긴다.
//   - eye / mouth: 굽기 때 얼굴 눈·입 조각을 'eye'·'mouth' 슬롯으로 옮겨 두었다(기본색 = Kenney 원래 진회색).
// 이동보조·의료 보조기구(cane·crutch·wheelchair·hearing aid·defibrillator)와 휠체어 클립은 쓰지 않는다.
// 이 모듈은 순수 데이터다(three·React 의존 없음). 굽기 스크립트도 이 파일을 읽어 팔레트 칸을 칠한다.

export const MINI_ZOMBIE_TYPE_IDS = Object.freeze([
  'E89', 'E90', 'E91', 'E92', 'E93', 'E94', 'E95', 'E96', 'E97',
  'E98', 'E99', 'E100', 'E101', 'E102', 'E103', 'E104', 'E105', 'E106',
])
export const MINI_ZOMBIE_FIRST_TYPE_CODE = 94

// ── 팔레트 ───────────────────────────────────────────────────────────────────
export const MINI_PALETTE = Object.freeze({ size: 512, cols: 16, rows: 4, cellWidth: 32, cellHeight: 128, slotWidth: 8 })

// [이름, 색]. 순서 = 슬롯 번호(재배열 금지 — 굽힌 PNG와 같이 움직인다. 새 슬롯은 끝에만).
export const MINI_PALETTE_SLOTS = Object.freeze([
  ['eye', 0x44444d], ['mouth', 0x44444d],
  // 좀비 피부
  ['zGreen', 0x8ab060], ['zOlive', 0x7e9a5c], ['zPale', 0x9bb26a], ['zMoss', 0x85a85a], ['zShadow', 0x5a4a7a], ['mochiWhite', 0xf6f0e8],
  // 눈
  ['eyeRed', 0xff2020], ['eyeViolet', 0xb98cff], ['eyeOrange', 0xff6a2a], ['eyeCream', 0xffe3a0], ['eyeDark', 0x2a2418], ['eyeAmber', 0xffb02a], ['eyeGreen', 0x7cf27c],
  // 옷·소품
  ['shirtGreen', 0x2f7d3a], ['armRed', 0xd62828], ['shadowCloth', 0x2a1f3d], ['shadowBlack', 0x1a1a1f], ['workBlue', 0x3d6fa8],
  ['capYellow', 0xe8c34a], ['jerseyOrange', 0xe07a1f], ['gymBlue', 0x2d5fd0], ['chefWhite', 0xf0eee6], ['lidGrey', 0x8a8a92],
  ['lidDark', 0x4a4a52], ['apronBrown', 0x6b4226], ['coffeeDark', 0x3b2314], ['teamBlue', 0x1f5fbf], ['teamRed', 0xc8102e],
  ['bagMustard', 0xd9a03a], ['bagBrown', 0x6a4a2a], ['bookBlue', 0x2c6fb7], ['pagesWhite', 0xf2efe2], ['conductorNavy', 0x23315e],
  ['conductorGold', 0xf2c94c], ['bibWhite', 0xf4f1e8], ['silver', 0xc8ccd4], ['mochiPink', 0xf7d6e2], ['mochiRose', 0xe8a0b4],
  ['suitCharcoal', 0x3a3f4a], ['copierGrey', 0xd8d8d8], ['officeGrey', 0x6d6d78], ['chairBlack', 0x1e1e24], ['white', 0xf2f2f2],
  ['mopHead', 0xdcdcd2], ['woodBrown', 0x9a6a3a], ['ballOrange', 0xc8641e], ['ballLine', 0x3a2010], ['teeth', 0xfffef5],
  ['giantBallRed', 0xd83a3a], ['giantBallWhite', 0xf6f6f0],
])
export const MINI_PALETTE_SLOT_INDEX = Object.freeze(Object.fromEntries(MINI_PALETTE_SLOTS.map(([name], index) => [name, index])))

// 슬롯 칸(픽셀): 0행 64칸(x 0..512), 이어서 1행 10~15열 영역 24칸(x 320..512). 높이는 Kenney 행과 같은 128px.
export function miniPaletteSlotRect(slot) {
  const index = typeof slot === 'string' ? MINI_PALETTE_SLOT_INDEX[slot] : slot
  if (!Number.isInteger(index) || index < 0 || index >= 88) return null
  const { slotWidth, cellHeight } = MINI_PALETTE
  if (index < 64) return { x: index * slotWidth, y: 0, width: slotWidth, height: cellHeight }
  return { x: 320 + (index - 64) * slotWidth, y: cellHeight, width: slotWidth, height: cellHeight }
}

// UV(glTF 규칙, 위가 v 0) → 칸 열쇠. 슬롯 영역이면 슬롯 이름, 아니면 Kenney 칸 'r{행}c{열}'.
export function miniPaletteKeyAt(u, v) {
  const { size, cellWidth, cellHeight, slotWidth } = MINI_PALETTE
  const px = Math.min(size - 1e-3, Math.max(0, u * size)); const py = Math.min(size - 1e-3, Math.max(0, v * size))
  if (py < cellHeight) return MINI_PALETTE_SLOTS[Math.floor(px / slotWidth)]?.[0] ?? null
  if (py < cellHeight * 2 && px >= 320) return MINI_PALETTE_SLOTS[64 + Math.floor((px - 320) / slotWidth)]?.[0] ?? null
  return `r${Math.floor(py / cellHeight)}c${Math.floor(px / cellWidth)}`
}

// 칸 열쇠의 픽셀 사각형(Kenney 칸 또는 슬롯).
export function miniPaletteRectOf(key) {
  if (MINI_PALETTE_SLOT_INDEX[key] !== undefined) return miniPaletteSlotRect(key)
  const match = /^r(\d)c(\d{1,2})$/.exec(key ?? '')
  if (!match) return null
  const { cellWidth, cellHeight } = MINI_PALETTE
  return { x: Number(match[2]) * cellWidth, y: Number(match[1]) * cellHeight, width: cellWidth, height: cellHeight }
}

// UV 한 점을 칸 from에서 칸 to로 옮긴다(칸 안 상대 위치 유지 — 세로 그라디언트 위치가 그대로다).
export function miniRemapUv(u, v, toKey) {
  const fromRect = miniPaletteRectOf(miniPaletteKeyAt(u, v)); const toRect = miniPaletteRectOf(toKey)
  if (!fromRect || !toRect) return null
  const { size } = MINI_PALETTE
  const fx = (u * size - fromRect.x) / fromRect.width; const fy = (v * size - fromRect.y) / fromRect.height
  const cx = Math.min(0.999, Math.max(0.001, fx)); const cy = Math.min(0.999, Math.max(0.001, fy))
  return [(toRect.x + cx * toRect.width) / size, (toRect.y + cy * toRect.height) / size]
}

// ── 몸체 ─────────────────────────────────────────────────────────────────────
// Kenney 파일 이름(character-<id>.glb) 15명 + 절차 몸 1개(textbook). alien·knight·raider·robot·soldier는 학교 톤이 아니라 뺐다.
export const MINI_BODY_IDS = Object.freeze([
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f',
  'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g', 'worker', 'zombie',
])
export const MINI_PROCEDURAL_BODY_IDS = Object.freeze(['textbook'])
export const MINI_PART_KEYS = Object.freeze(['legL', 'legR', 'torso', 'armL', 'armR', 'head'])
// Kenney 관절 이름 → 파트 열쇠(블록 좀비 포즈와 같은 6파트·같은 좌우: left = +X = 캐릭터 왼쪽).
export const MINI_JOINT_TO_PART = Object.freeze({ 'leg-left': 'legL', 'leg-right': 'legR', torso: 'torso', 'arm-left': 'armL', 'arm-right': 'armR', head: 'head' })

// 소품(GLB의 prop__<id> 노드). pack = Kenney 팩 파일에서 가져온 것, 나머지는 굽기 스크립트가 블록으로 만든다.
export const MINI_PROP_IDS = Object.freeze([
  'luggage', 'sunglasses', // pack: item-luggage-upright, aid-sunglasses
  'armband', 'whistle', 'mop', 'basketball', 'potLid', 'bib', 'spoon', 'copierHead', 'officeChair', 'coffeePot',
  'headband', 'ankleBand', 'cap', 'giantBall', 'ropeHandle',
])
export const MINI_PACK_PROPS = Object.freeze({ luggage: 'item-luggage-upright', sunglasses: 'aid-sunglasses' })

// E91 교과서 미믹 크기 단서. 진짜 XP 교과서 월드 가로 = 표지 0.36(components/XpTextbook.jsx) × TEXTBOOK_SCALE 0.8
// (lib/xpTextbookField.js — 테스트가 두 값을 대조한다). 절차 교과서 몸 표지 가로 = 0.34 Kenney 단위(굽기 스크립트 cover x ±0.17).
export const MINI_REAL_TEXTBOOK_WIDTH = 0.36 * 0.8
export const MINI_TEXTBOOK_BODY_WIDTH = 0.34
export const MINI_MIMIC_SIZE_TELL = 1.15

// ── visualId → 몸체 변형 ─────────────────────────────────────────────────────
// variant 필드
//   body      MINI_BODY_IDS 또는 'textbook'
//   skin/eye/mouth  피부·눈·입 슬롯(생략하면 그대로)
//   recolor   { 'r{행}c{열}' | 슬롯: 슬롯 } — 옷 색 칸 옮기기
//   props     [{ prop, part, anchor, offset, rotation, scale }] — 파트 지오메트리에 합친다(드로콜 0 추가)
//   loose     [{ prop, anchor:'root'|'hipRight', offset, scale, worldSize, lift, spin, hook }] — 따로 그리는 소품(드로콜 2개 추가).
//             worldSize면 크기(최대 변)·offset이 월드 단위. hook = MiniZombieLayer propScale 콜백 이름(0이면 숨김).
// style  = 포즈 문법(lib/miniZombiePose.js), fast = 보폭 빠름, scale = ENEMY_STATS.scale 권장값(치프는 1.5 이상)
// worldWidth/modelWidth = (선택) 몸 크기를 pool 배율 대신 월드 가로로 고정한다(미믹 = 진짜 교과서 × 1.15). 발 높이는 그대로.
// pick   = 같은 typeCode 안에서 몸 고르기: 'single' | 'pair'(짝 2몸) | 'formation'(기수 1 + 말 3)
export const MINI_ZOMBIE_VISUALS = Object.freeze({
  'n2-class-president': { id: 'E89', stage: 1, chief: true, style: 'command', scale: 1.5, pick: 'single', variants: [
    { body: 'male-a', skin: 'zGreen', eye: 'eyeRed', recolor: { r2c9: 'shirtGreen' },
      props: [{ prop: 'armband', part: 'armL', anchor: 'upperArm' }] },
  ] },
  'n2-homework-collector': { id: 'E90', stage: 1, style: 'carry', fast: true, scale: 0.95, pick: 'single', variants: [
    { body: 'female-b', skin: 'zOlive', eye: 'eyeRed', recolor: { r3c1: 'bagMustard', r1c1: 'bagBrown' },
      loose: [{ prop: 'luggage', anchor: 'hipRight', offset: [0, 0, 0.02], scale: 0.62, hook: 'bagScale' }] },
  ] },
  // 미믹 단서 2개(설계): ① 진짜 교과서보다 15% 크다 — 몸 크기를 pool 배율 대신 worldWidth(월드 가로)로 고정한다
  // (MiniZombieLayer). ② 책장 가장자리가 빨갛다 — 책장 블록 전체를 빨강으로(어느 방향을 봐도 옆면이 빨갛고, 뚜껑이 열리면
  // 빨간 입 안이 된다). 눈은 빨간 입 안에서 보이도록 크림색.
  'n2-textbook-mimic': { id: 'E91', stage: 1, style: 'mimic', scale: 1.0, pick: 'single',
    modelWidth: MINI_TEXTBOOK_BODY_WIDTH, worldWidth: MINI_REAL_TEXTBOOK_WIDTH * MINI_MIMIC_SIZE_TELL, variants: [
      { body: 'textbook', eye: 'eyeCream', recolor: { pagesWhite: 'armRed' } },
    ] },
  'n2-train-conductor': { id: 'E92', stage: 2, chief: true, style: 'whistle', scale: 1.5, pick: 'single', variants: [
    { body: 'male-c', skin: 'zGreen', eye: 'eyeRed', recolor: { r1c1: 'conductorNavy', r3c1: 'conductorGold' },
      props: [{ prop: 'whistle', part: 'armR', anchor: 'hand', offset: [0, 0.02, 0.05] }] },
  ] },
  'n2-shadow-stepper': { id: 'E93', stage: 2, style: 'stalk', fast: true, scale: 0.95, pick: 'single', variants: [
    { body: 'zombie', skin: 'zShadow', eye: 'eyeViolet', recolor: { r3c3: 'shadowCloth', r3c5: 'shadowBlack', r2c1: 'shadowCloth', r2c3: 'shadowBlack' },
      props: [{ prop: 'sunglasses', part: 'head', anchor: 'eyes' }] },
  ] },
  'n2-mop-pusher': { id: 'E94', stage: 2, style: 'mop', scale: 1.0, pick: 'single', variants: [
    { body: 'worker', skin: 'zOlive', eye: 'eyeRed', recolor: { r1c1: 'workBlue', r3c1: 'capYellow', r3c0: 'capYellow', r3c5: 'white' },
      props: [{ prop: 'mop', part: 'torso', anchor: 'chest' }] },
  ] },
  'n2-long-rope-duo': { id: 'E95', stage: 3, chief: true, style: 'rope', scale: 1.4, pick: 'pair', variants: [
    { body: 'female-c', skin: 'zMoss', eye: 'eyeCream', recolor: { r1c1: 'teamRed', r3c3: 'shadowCloth' },
      props: [{ prop: 'headband', part: 'head', anchor: 'brow', recolor: { white: 'teamRed' } }, { prop: 'ropeHandle', part: 'armR', anchor: 'hand' }] },
    { body: 'male-g', skin: 'zMoss', eye: 'eyeCream', recolor: { r3c5: 'teamRed', r3c3: 'shadowCloth' },
      props: [{ prop: 'headband', part: 'head', anchor: 'brow', recolor: { white: 'teamRed' } }, { prop: 'ropeHandle', part: 'armL', anchor: 'hand' }] },
  ] },
  'n2-dribbler': { id: 'E96', stage: 3, style: 'dribble', scale: 1.0, pick: 'single', variants: [
    { body: 'male-f', skin: 'zGreen', eye: 'eyeOrange', recolor: { r2c9: 'jerseyOrange' },
      loose: [{ prop: 'basketball', anchor: 'root', offset: [-0.14, 0, 0.2], lift: true, spin: true }] },
  ] },
  'n2-vaulter': { id: 'E97', stage: 3, style: 'vault', scale: 0.95, pick: 'single', variants: [
    { body: 'female-f', skin: 'zMoss', eye: 'eyeCream', recolor: { r3c1: 'gymBlue', r1c1: 'gymBlue', r1c5: 'white' } },
  ] },
  'n2-big-eater': { id: 'E98', stage: 4, chief: true, style: 'eat', scale: 1.6, pick: 'single', variants: [
    { body: 'male-b', skin: 'zPale', eye: 'eyeRed', recolor: { r2c15: 'chefWhite' },
      props: [{ prop: 'bib', part: 'torso', anchor: 'chest' }, { prop: 'spoon', part: 'armR', anchor: 'hand' }] },
  ] },
  'n2-pressure-cooker': { id: 'E99', stage: 4, style: 'rattle', scale: 1.3, pick: 'single', variants: [
    { body: 'male-e', skin: 'zPale', eye: 'eyeOrange', recolor: { r3c1: 'chefWhite' },
      props: [{ prop: 'potLid', part: 'head', anchor: 'headTop' }] },
  ] },
  'n2-mochi-cling': { id: 'E100', stage: 4, style: 'cling', fast: true, scale: 0.95, pick: 'single', variants: [
    { body: 'female-a', skin: 'mochiWhite', eye: 'eyeDark', mouth: 'mochiRose', recolor: { r1c5: 'mochiPink', r1c1: 'mochiRose', r2c1: 'mochiPink', r3c5: 'mochiWhite' } },
  ] },
  'n2-photocopier': { id: 'E101', stage: 5, chief: true, style: 'copier', scale: 1.5, pick: 'single', variants: [
    { body: 'male-d', skin: 'zGreen', eye: 'eyeGreen', recolor: { r3c7: 'suitCharcoal' },
      props: [{ prop: 'copierHead', part: 'head', anchor: 'headCentre' }] },
  ] },
  'n2-swivel-chair': { id: 'E102', stage: 5, style: 'swivel', scale: 1.0, pick: 'single', variants: [
    { body: 'female-d', skin: 'zOlive', eye: 'eyeRed', recolor: { r3c3: 'officeGrey' },
      loose: [{ prop: 'officeChair', anchor: 'root', offset: [0, 0, -0.02] }] },
  ] },
  'n2-coffee-runner': { id: 'E103', stage: 5, style: 'serve', scale: 1.0, pick: 'single', variants: [
    { body: 'female-e', skin: 'zGreen', eye: 'eyeAmber', recolor: { r3c15: 'apronBrown', r1c1: 'coffeeDark' },
      props: [{ prop: 'coffeePot', part: 'armR', anchor: 'hand' }] },
  ] },
  'n2-ball-roll-captain': { id: 'E104', stage: 6, chief: true, style: 'roll', scale: 1.55, pick: 'single', variants: [
    { body: 'male-g', skin: 'zGreen', eye: 'eyeRed', recolor: { r3c5: 'teamBlue', r2c1: 'white' },
      props: [{ prop: 'headband', part: 'head', anchor: 'brow', recolor: { white: 'teamBlue' } }],
      // worldSize 소품은 크기·offset을 월드 단위로 쓴다(공 지름 1.8u, 대장 앞 1.2u). 몸 배율과 무관하게 설계값 그대로.
      loose: [{ prop: 'giantBall', anchor: 'root', offset: [0, 0, 1.2], worldSize: 1.8, hook: 'ballHeld' }] },
  ] },
  'n2-three-legged': { id: 'E105', stage: 6, style: 'threeLegged', scale: 0.95, pick: 'pair', variants: [
    { body: 'female-c', skin: 'zGreen', eye: 'eyeRed', recolor: { r1c1: 'teamBlue', r2c15: 'white' },
      props: [{ prop: 'ankleBand', part: 'legR', anchor: 'ankle' }] },
    { body: 'male-f', skin: 'zGreen', eye: 'eyeRed', recolor: { r2c9: 'teamBlue' },
      props: [{ prop: 'ankleBand', part: 'legL', anchor: 'ankle' }] },
  ] },
  'n2-cavalry': { id: 'E106', stage: 6, style: 'rider', scale: 1.0, pick: 'formation', variants: [
    // 0 = 기수(모자 뺏기), 1 = 말(기수를 받치는 세 명). 말 몸은 male-e(안경) — 같은 스테이지의 E105 male-f와 겹치지 않게.
    { body: 'female-b', skin: 'zGreen', eye: 'eyeRed', recolor: { r3c1: 'white', r1c5: 'teamBlue' },
      props: [{ prop: 'cap', part: 'head', anchor: 'headTop' }] },
    { body: 'male-e', skin: 'zOlive', eye: 'eyeRed', style: 'horse', recolor: { r3c1: 'white', r3c15: 'white' },
      props: [{ prop: 'headband', part: 'head', anchor: 'brow', recolor: { white: 'teamBlue' } }] },
  ] },
})

export const MINI_ZOMBIE_VISUAL_IDS = Object.freeze(Object.keys(MINI_ZOMBIE_VISUALS))

// id(E89…) → visualId. novelZombie2Content.js의 NOVEL2_ROWS[id].visualId와 같아야 한다(테스트가 본다).
export const MINI_ZOMBIE_VISUAL_BY_TYPE = Object.freeze(Object.fromEntries(
  MINI_ZOMBIE_VISUAL_IDS.map((visualId) => [MINI_ZOMBIE_VISUALS[visualId].id, visualId]),
))

// 변형 하나의 최종 리컬러 표(피부·눈·입 + 옷). skinCell = GLB extras.mini.skinCell(몸마다 다르다).
export function miniVariantRemap(variant, skinCell) {
  const remap = {}
  if (variant.skin && skinCell) remap[skinCell] = variant.skin
  if (variant.eye) remap.eye = variant.eye
  if (variant.mouth) remap.mouth = variant.mouth
  return Object.assign(remap, variant.recolor ?? {})
}

// 같은 typeCode 안에서 개체가 어느 몸을 쓰는지. pair: 슬롯 짝·홀(짝으로 스폰된 두 개체는 보통 이웃 슬롯이다),
// formation: 4슬롯마다 1명이 기수. 행동 모듈이 역할을 알려 주면 MiniZombieLayer의 pickVariant로 바꿔 끼운다.
export function miniDefaultVariantIndex(pick, slot, variantCount) {
  if (variantCount <= 1) return 0
  if (pick === 'formation') return slot % 4 === 0 ? 0 : 1
  return slot % variantCount
}

// 1 = 몸 바닥(발) ~ 머리 위 기준 높이(Kenney 단위). 머리 상자 위 0.661 + 머리카락 평균. 블록 좀비 공용 키 1.69에 맞춘다.
export const MINI_MODEL_HEIGHT = 0.671

/**
 * 몸 월드 배율(MiniZombieLayer base 행렬의 배율 — 그 뒤에 MINI_MODEL_FIT = 1.69 / MINI_MODEL_HEIGHT가 곱해진다).
 * 표에 worldWidth·modelWidth가 있으면(미믹) 렌더 가로가 정확히 worldWidth가 되게 고정, 없으면 pool 배율 그대로.
 */
export function miniBodyWorldScale(visual, poolScale) {
  if (visual?.worldWidth > 0 && visual?.modelWidth > 0) return visual.worldWidth / (visual.modelWidth * (1.69 / MINI_MODEL_HEIGHT))
  return poolScale
}
