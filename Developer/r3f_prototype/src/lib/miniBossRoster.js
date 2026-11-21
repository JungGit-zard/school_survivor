// Stage 5 B10 「교감 좀비」 / Stage 6 B05 「교장 선생님 좀비」 Kenney Mini 보스 몸 표 (Terry 2026-11-21 "둘 다 안 A"). threemini.
//
// 그림만 바꾼다. HP·속도·크기(ENEMY_STATS.scale)·접촉 거리·공격 시간/범위·소환은 이 표를 읽지 않는다
// (lib/stage5ViceBoss.js, lib/expansionContent.js 그대로).
//
// 몸: assets/models/kenney_mini/mini_zombies_kenney.glb 안에 이미 있는 Kenney Mini Characters(CC0) 몸을 쓴다
//   B10 = male-a(동그란 안경 남자), B05 = male-d(정장 + 빨간 넥타이). GLB는 다시 굽지 않는다(바이트 동일).
// 색: Mini 좀비와 같은 UV 칸 옮기기. 새 색 칸을 만들지 않고 GLB에 이미 구운 MINI_PALETTE_SLOTS만 쓴다.
// 소품: lib/miniBossProps.data.js(Blender 빌드에서 뽑은 원본 절차 소품, 파트 지오메트리에 합침 → 드로콜 0 추가).
// 얼굴: 절차적 SDF 셰이더(E07 표준). Kenney 눈·입 조각은 피부색 칸으로 지운다.
// 미리보기·비교: Developer/agent_room/boss_remodel_20261121/ (안 B 보관 포함).

// 보스 비율: 머리는 그대로 두고 몸통·팔·다리를 키운다(굽기가 아니라 런타임 1회 빌드 때 적용).
const BOSS_PART_SCALE = Object.freeze({
  B10: Object.freeze({ torso: [1.3, 1.25, 1.25], armL: [1.2, 1.2, 1.2], armR: [1.2, 1.2, 1.2], legL: [1.2, 1.35, 1.2], legR: [1.2, 1.35, 1.2] }),
  B05: Object.freeze({ torso: [1.35, 1.25, 1.3], armL: [1.2, 1.2, 1.2], armR: [1.2, 1.2, 1.2], legL: [1.25, 1.35, 1.25], legR: [1.25, 1.35, 1.25] }),
})

// 포즈 = 팔·몸통의 추가 회전(three XYZ, 라디안). 팔은 이미 쉬는 자세(MINI_ARM_REST_TILT)로 내려 둔 상태 기준이다.
// 값은 Blender 미리보기(스크립트 scripts/mini_boss/)와 같은 숫자다.
export const MINI_BOSS_POSES = Object.freeze({
  B10: Object.freeze({
    // 평상: 도장을 앞으로 내려 들고 걷는다(Mini는 머리가 커서 어깨에 메면 도장이 머리에 가려진다. 땅에 닿지 않게 앞으로 0.8).
    normal: Object.freeze({ armL: [-0.55, 0, 0], armR: [-0.8, 0, -0.15], torso: [0.04, 0, 0] }),
    // b10_p1 결재 도장 windup: 도장을 머리 위로.
    warn: Object.freeze({ armL: [-0.7, 0, 0], armR: [3.25, 0, 0.75], torso: [-0.12, 0, 0] }),
    // b10_p2 출석부 휘두르기 windup: 출석부를 뒤로 젖힌다.
    ledger: Object.freeze({ armL: [1.25, 0, -0.35], armR: [-0.8, 0, -0.15], torso: [0.08, 0, 0] }),
    // 교무회의 소집·격노 전환 정지: 두 팔 앞으로, 탁상 종.
    stun: Object.freeze({ armL: [-1.35, 0, 0.5], armR: [-1.05, 0, -0.5], torso: [0.18, 0, 0] }),
  }),
  B05: Object.freeze({
    // 평상: 손마이크를 입가에.
    normal: Object.freeze({ armL: [0.35, 0, 0], armR: [-1.2217, 0, 0.1], torso: [0, 0, 0] }),
    // 훈화 고리·교가 제창 windup(게임은 두 공격 모두 'warn'을 준다): 마이크 + 왼팔 들어 지휘.
    warn: Object.freeze({ armL: [-2.6, 0, -0.6], armR: [-1.2217, 0, 0.1], torso: [0, 0, 0] }),
    // 'charge'(현재 B05에는 오지 않음 — 들어오면 마이크에 몸을 기울인 자세).
    lean: Object.freeze({ armL: [-0.4, 0, 0], armR: [-1.2217, 0, 0.1], torso: [0, 0, 0] }),
    // 격노 전환·정지: 두 팔 위 + 호루라기.
    stun: Object.freeze({ armL: [-2.9, 0, -0.5], armR: [-2.9, 0, 0.5], torso: [0, 0, 0] }),
  }),
})

export const MINI_BOSS_VISUALS = Object.freeze({
  B10: Object.freeze({
    id: 'B10',
    studioItemId: 'zombie-b10',
    body: 'male-a',
    skin: 'zPale',
    skinParts: Object.freeze(['head', 'torso', 'armL', 'armR']),
    eye: 'zPale',
    // 셔츠 → 흰 소매, 안경테 → 검정, 머리카락 → 피부(벗어진 정수리), 바지 → 차콜, 신발 → 갈색, 입 조각 지움
    recolor: Object.freeze({ r2c9: 'white', r3c5: 'shadowBlack', r3c7: 'zPale', r1c1: 'suitCharcoal', r3c1: 'apronBrown', mouth: 'zPale' }),
    // 몸통 셔츠 칸 → 남색 조끼, 허리 → 검정 벨트, 다리의 피부 칸(양말) → 차콜
    partRecolor: Object.freeze({
      torso: Object.freeze({ r2c1: 'shadowBlack', r2c9: 'conductorNavy' }),
      legL: Object.freeze({ r2c3: 'suitCharcoal' }),
      legR: Object.freeze({ r2c3: 'suitCharcoal' }),
    }),
    splits: Object.freeze([]),
    partScale: BOSS_PART_SCALE.B10,
    face: 'tired',
    // Kenney 단위 → 기존 B10 메시 단위(EnemyVisual 그룹 0.888 안). 키를 기존 보스(약 1.86 월드)와 같게.
    fit: 2.6158,
    // 기존 B10 메시의 발바닥 높이(신발 밑창 −0.835). 새 몸 발바닥을 같은 높이에 둔다 → 땅 접지 그대로.
    legacyFootY: -0.835,
    poseFor(animPhase) {
      if (animPhase === 'warn' || animPhase === 'special') return MINI_BOSS_POSES.B10.warn
      if (animPhase === 'charge') return MINI_BOSS_POSES.B10.ledger
      if (animPhase === 'stun') return MINI_BOSS_POSES.B10.stun
      return MINI_BOSS_POSES.B10.normal
    },
  }),
  B05: Object.freeze({
    id: 'B05',
    studioItemId: 'zombie-b05',
    body: 'male-d',
    skin: 'zPale',
    skinParts: null,
    eye: 'zPale',
    // 정장 → 차콜, 넥타이 → 빨강, 입 조각 지움
    recolor: Object.freeze({ r3c7: 'suitCharcoal', r2c15: 'teamRed', mouth: 'zPale' }),
    partRecolor: Object.freeze({ torso: Object.freeze({ r3c15: 'white' }) }),
    // 머리카락 칸(r2c1)을 삼각형 높이로 나눈다: 정수리·앞머리 윗부분 = 피부(대머리), 옆·뒤 = 흰머리.
    // 기준은 모델 좌표(Kenney 단위, 머리 상자 y 0.343~0.661).
    splits: Object.freeze([
      Object.freeze({ part: 'head', cell: 'r2c1', when: Object.freeze([Object.freeze({ minY: 0.6 }), Object.freeze({ minY: 0.5, minZ: 0.1 })]), then: 'zPale', otherwise: 'white' }),
    ]),
    partScale: BOSS_PART_SCALE.B05,
    face: 'stern',
    fit: 2.2359,
    legacyFootY: -0.665,
    poseFor(animPhase) {
      if (animPhase === 'warn' || animPhase === 'special') return MINI_BOSS_POSES.B05.warn
      if (animPhase === 'charge') return MINI_BOSS_POSES.B05.lean
      if (animPhase === 'stun') return MINI_BOSS_POSES.B05.stun
      return MINI_BOSS_POSES.B05.normal
    },
  }),
})

export const MINI_BOSS_TYPES = Object.freeze(Object.keys(MINI_BOSS_VISUALS))
export function isMiniBossType(type) { return Object.hasOwn(MINI_BOSS_VISUALS, type) }
export function getMiniBossVisual(type) { return MINI_BOSS_VISUALS[type] ?? null }

// 삼각형 하나의 새 칸(없으면 null). 우선순위: 높이 나누기 > 파트별 > 공통 > 피부 > 눈 — Blender 빌드와 같다.
export function miniBossCellTarget(visual, part, cell, centroid, skinCell) {
  for (const s of visual.splits) {
    if (s.part !== part || s.cell !== cell) continue
    const hit = s.when.some((c) => (c.minY === undefined || centroid[1] > c.minY) && (c.minZ === undefined || centroid[2] > c.minZ))
    return hit ? s.then : s.otherwise
  }
  const partMap = visual.partRecolor[part]
  if (partMap && partMap[cell]) return partMap[cell]
  if (visual.recolor[cell]) return visual.recolor[cell]
  if (skinCell && cell === skinCell && (!visual.skinParts || visual.skinParts.includes(part))) return visual.skin
  if (cell === 'eye') return visual.eye
  return null
}
