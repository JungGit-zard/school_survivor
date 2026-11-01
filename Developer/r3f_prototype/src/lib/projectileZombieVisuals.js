// 신규 투사체 좀비 15종(E46~E60, typeCode 49~63)의 타입 등록부와 비주얼 상수 정본.
// 설계: Developer/agent_room/zombie_15_design_20261031.md (v2.1) §2·§3·§4.
// 행동 런타임은 lib/projectileZombieBehavior.js(levelmini 소유)가 맡고, 이 모듈은 순수 데이터만 둔다.
// three·React·Firebase·storage 의존이 없다.
//
// 외형 원칙(Terry 2026-10-31): RZT 트렌치코트·RZG 경비·러닝크루처럼 공용 박스 몸통에
// "색 구성 + 컨셉 소품 1~2개(최대 3)"만 준다. 얼굴은 머리 ×1.25 위의 SDF 셰이더가 그린다.

export const PROJECTILE_ZOMBIE_TYPES = Object.freeze([
  'E46', 'E47', 'E48', 'E49', 'E50', 'E51', 'E52', 'E53', 'E54', 'E55', 'E56', 'E57', 'E58', 'E59', 'E60',
])
export const PROJECTILE_ZOMBIE_FIRST_TYPE_CODE = 49
export const PROJECTILE_ZOMBIE_LAST_TYPE_CODE = PROJECTILE_ZOMBIE_FIRST_TYPE_CODE + PROJECTILE_ZOMBIE_TYPES.length - 1

// 상태 코드 계약(pool.state). 14~ 대역은 novelZombieBehavior(7~13)와 겹치지 않는다.
// 행동 모듈은 예고에 들어갈 때 state=TELEGRAPH, stateTimer=telegraphMs(아래 표)를 넣기만 하면
// 몸 포즈·얼굴 경고색·얼굴 진행도가 같은 값으로 따라온다.
export const PROJECTILE_ZOMBIE_STATE = Object.freeze({
  APPROACH: 14,
  TELEGRAPH: 15,
  FIRE: 16,
  RECOVER: 17,
})

// 몸 포즈 phase: ZombieInstanceLayer.phase()가 이 표를 그대로 쓴다.
export function projectileZombieStatePhase(state) {
  if (state === PROJECTILE_ZOMBIE_STATE.TELEGRAPH) return 'warn'
  if (state === PROJECTILE_ZOMBIE_STATE.FIRE) return 'charge'
  if (state === PROJECTILE_ZOMBIE_STATE.RECOVER) return 'stun'
  return null
}

export function isProjectileZombieTypeCode(typeCode) {
  return Number.isInteger(typeCode) && typeCode >= PROJECTILE_ZOMBIE_FIRST_TYPE_CODE && typeCode <= PROJECTILE_ZOMBIE_LAST_TYPE_CODE
}

// 1-based 종 번호(= faceId). 0이면 신규 15종이 아니다.
export function projectileZombieIndex(typeCode) {
  return isProjectileZombieTypeCode(typeCode) ? typeCode - PROJECTILE_ZOMBIE_FIRST_TYPE_CODE + 1 : 0
}

// ── 공용 리그 ────────────────────────────────────────────────────────────────
// POSED(E34~E45)와 같은 리그 형식이다(buildPosedZombiePartsFromRig가 그대로 소비한다).
// 머리는 얼굴 판독을 위해 ×1.25(설계 §3.0). 팔 기본 회전은 공유 보행 기준(-1.15)과 같다.
const HEAD_SCALE = Object.freeze([1.25, 1.25, 1.25])
function rig(overrides = {}) {
  const base = {
    head: { scale: HEAD_SCALE, pivot: [0, 0.86, 0], rot: [0, 0, 0] },
    body: { scale: [1, 1, 1], pivot: [0, 0.28, 0], rot: [0, 0, 0] },
    armL: { scale: [1, 1, 1], pivot: [-0.40, 0.52, 0], rot: [-1.15, 0, 0.12] },
    armR: { scale: [1, 1, 1], pivot: [0.40, 0.52, 0], rot: [-1.15, 0, -0.12] },
    legL: { scale: [1, 1, 1], pivot: [-0.15, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [1, 1, 1], pivot: [0.15, 0, 0], rot: [0, 0, 0] },
    // 표식 슬롯은 쓰지 않는다(소품 형태 클래스가 대신한다). 빌더 형식만 맞춘다.
    mark: { parent: 'body', scale: [0, 0, 0], offset: [0, 0, 0] },
  }
  for (const key of Object.keys(overrides)) base[key] = { ...base[key], ...overrides[key] }
  return Object.freeze(base)
}

// 소품: shape = box | cylinder | cone | sphere (단위 지오메트리 1개를 비균등 스케일로 재사용).
// parent = 붙는 파트(head/body/armL/armR/legL/legR) 피벗·회전 프레임. size = 로컬 전체 치수,
// offset = 부모 프레임 위치, rot = 소품 자체 로컬 회전(XYZ 오일러, T×R×S 순서).
// 로컬 두께 0.06 이상(설계 §4.3-6).
function prop(shape, parent, size, offset, rot, color) {
  return Object.freeze({ shape, parent, size: Object.freeze(size), offset: Object.freeze(offset), rot: Object.freeze(rot), color })
}

const HALF_PI = Math.PI / 2
// 대걸레 자루: 앞으로 든 팔(-1.15) 프레임에서 월드 수직이 되도록 +1.15 되돌린다.
const MOP_TILT = 1.15
const MOP_UP = [0, Math.cos(MOP_TILT), Math.sin(MOP_TILT)]
function mopPoint(alongUp) { return [0, -0.58 + MOP_UP[1] * alongUp, MOP_UP[2] * alongUp] }
// 확성기: 밑면이 위·앞을 보게 어깨에 멘다.
const MEGAPHONE_TILT = Math.PI + 0.6
const MEGAPHONE_BASE_DIR = [0, -Math.cos(MEGAPHONE_TILT), -Math.sin(MEGAPHONE_TILT)]

// palette: skin(머리·손), top(몸통·팔), bottom(다리), shoe(발), accent(대표 소품색, 사망 파편 eye).
export const PROJECTILE_ZOMBIE_VISUALS = Object.freeze({
  E46: {
    key: 'eraserRicochet', label: '지우개튕김 좀비', telegraphMs: 500,
    feature: '분홍 지우개 블록 + 파란 띠를 든 오른손',
    palette: { skin: 0x8fb07e, top: 0x1f2a8a, bottom: 0x7c8494, shoe: 0x1a1a1a, accent: 0xf4a3b5 },
    rig: rig({ armR: { rot: [-1.60, 0, -0.12] } }),
    props: [
      prop('box', 'armR', [0.36, 0.24, 0.28], [0, -0.64, 0.02], [0, 0, 0], 0xf4a3b5),
      prop('box', 'armR', [0.14, 0.27, 0.31], [0, -0.64, 0.02], [0, 0, 0], 0x3b6fd1),
    ],
  },
  E47: {
    key: 'paperPlanePilot', label: '종이비행기 좀비', telegraphMs: 500,
    feature: '머리 위 종이비행기 모자 + 양팔 T자',
    palette: { skin: 0x8db07a, top: 0x7ec8e3, bottom: 0xf2f4f6, shoe: 0x1a1a1a, accent: 0xffffff },
    rig: rig({ armL: { rot: [0, 0, -1.45] }, armR: { rot: [0, 0, 1.45] } }),
    props: [
      prop('cone', 'head', [0.64, 0.74, 0.14], [0, 0.40, 0.04], [HALF_PI, 0, 0], 0xffffff),
      prop('box', 'head', [0.07, 0.12, 0.52], [0, 0.33, 0.02], [0, 0, 0], 0xdfe6ea),
    ],
  },
  E48: {
    key: 'rulerBoomerang', label: '부메랑자 좀비', telegraphMs: 500,
    feature: '등에 X자로 꽂은 긴 자 두 개',
    palette: { skin: 0x7fa06e, top: 0xc9a13b, bottom: 0x4e3b2a, shoe: 0x1a1a1a, accent: 0xe7e2c8 },
    rig: rig(),
    props: [
      // 앞에서도 읽히게 길게: 머리 위·어깨 밖으로 튀어나온다.
      prop('box', 'body', [0.12, 1.30, 0.07], [0, 0.34, -0.25], [0, 0, 0.62], 0xe7e2c8),
      prop('box', 'body', [0.12, 1.30, 0.07], [0, 0.34, -0.29], [0, 0, -0.62], 0xe7e2c8),
    ],
  },
  E49: {
    key: 'bucketJanitor', label: '양동이청소 좀비', telegraphMs: 500,
    feature: '머리에 쓴 주황 양동이 + 대걸레',
    palette: { skin: 0x7a9a70, top: 0x5f7f6a, bottom: 0x3e5348, shoe: 0x1a1a1a, accent: 0xe07a2e },
    rig: rig(),
    props: [
      prop('cylinder', 'head', [0.60, 0.38, 0.60], [0, 0.40, 0], [0, 0, 0.14], 0xe07a2e),
      prop('cylinder', 'armR', [0.08, 1.05, 0.08], mopPoint(0.18), [MOP_TILT, 0, 0], 0xc8a060),
      prop('box', 'armR', [0.34, 0.12, 0.20], mopPoint(-0.36), [MOP_TILT, 0, 0], 0xd8d2c0),
    ],
  },
  E50: {
    key: 'volleySpiker', label: '배구스파이크 좀비', telegraphMs: 500,
    feature: '번쩍 든 손 위의 배구공 + 흰 머리띠',
    palette: { skin: 0x86ac72, top: 0xd8423a, bottom: 0xf0eee6, shoe: 0xf0eee6, accent: 0xf6f1de },
    rig: rig({ armR: { rot: [-2.95, 0, -0.10] } }),
    props: [
      prop('sphere', 'armR', [0.36, 0.36, 0.36], [0, -0.84, 0], [0, 0, 0], 0xf6f1de),
      prop('box', 'head', [0.68, 0.09, 0.62], [0, 0.12, 0], [0, 0, 0], 0xffffff),
    ],
  },
  E51: {
    key: 'choirConductor', label: '합창지휘 좀비', telegraphMs: 500,
    feature: '다리를 덮는 합창 가운(원뿔) + 지휘봉, 두 팔을 든 지휘 자세',
    palette: { skin: 0x7e9c78, top: 0x9c2a5a, bottom: 0x6e1d40, shoe: 0x1a1a1a, accent: 0xffffff },
    rig: rig({ armL: { rot: [-2.05, 0, 0.32] }, armR: { rot: [-2.30, 0, -0.32] } }),
    props: [
      prop('cone', 'body', [0.82, 0.78, 0.64], [0, -0.32, 0], [0, 0, 0], 0x6e1d40),
      prop('box', 'armR', [0.06, 0.46, 0.06], [0, -0.78, 0], [0, 0, 0], 0xffffff),
    ],
  },
  E52: {
    key: 'flaskSplitter', label: '플라스크분열 좀비', telegraphMs: 500,
    feature: '흰 실험 가운 자락 + 손에 든 큰 연두 플라스크',
    palette: { skin: 0x7aa36c, top: 0xffffff, bottom: 0x3a4048, shoe: 0x1a1a1a, accent: 0x9bf04a },
    rig: rig({ armR: { rot: [-1.75, 0, -0.10] } }),
    props: [
      prop('box', 'body', [0.62, 0.38, 0.46], [0, -0.30, 0], [0, 0, 0], 0xffffff),
      prop('sphere', 'armR', [0.32, 0.32, 0.32], [0, -0.70, 0], [0, 0, 0], 0x9bf04a),
    ],
  },
  E53: {
    key: 'paintSpreader', label: '물감뿌림 좀비', telegraphMs: 500,
    feature: '크림색 앞치마 + 머리 위로 든 큰 붓(빨간 물감 끝)',
    palette: { skin: 0x84a877, top: 0x2bb5b0, bottom: 0x3a3a44, shoe: 0x1a1a1a, accent: 0xe8433b },
    rig: rig({ armR: { rot: [-2.60, 0, -0.20] } }),
    props: [
      prop('box', 'body', [0.52, 0.66, 0.06], [0, -0.08, 0.215], [0, 0, 0], 0xf2e6cf),
      prop('cylinder', 'armR', [0.08, 0.62, 0.08], [0, -0.82, 0], [0, 0, 0], 0x8a5a2a),
      prop('sphere', 'armR', [0.20, 0.28, 0.20], [0, -1.18, 0], [0, 0, 0], 0xe8433b),
    ],
  },
  E54: {
    key: 'megaphoneBroadcaster', label: '확성기방송 좀비', telegraphMs: 800,
    feature: '오른 어깨에 멘 흰 확성기(빨간 테)',
    palette: { skin: 0x7f9f70, top: 0x6a4bc4, bottom: 0x2b2f44, shoe: 0x1a1a1a, accent: 0xf4f4f4 },
    rig: rig(),
    props: [
      prop('cone', 'body', [0.42, 0.50, 0.42], [0.30, 0.44, 0.06], [MEGAPHONE_TILT, 0, 0], 0xf4f4f4),
      prop('cylinder', 'body', [0.47, 0.07, 0.47], [0.30, 0.44 + MEGAPHONE_BASE_DIR[1] * 0.25, 0.06 + MEGAPHONE_BASE_DIR[2] * 0.25], [MEGAPHONE_TILT, 0, 0], 0xd8423a),
    ],
  },
  E55: {
    key: 'baseballPitcher', label: '강속구 야구부 좀비', telegraphMs: 1100,
    feature: '남색 야구모자(챙) + 뒤로 젖혀 든 투구 팔',
    palette: { skin: 0x7fa770, top: 0xa9adb5, bottom: 0x2c3a6a, shoe: 0x1a1a1a, accent: 0x2c3a6a },
    rig: rig({ armR: { rot: [-3.30, 0, -0.25] }, armL: { rot: [-1.40, 0, 0.30] } }),
    props: [
      prop('box', 'head', [0.70, 0.17, 0.62], [0, 0.31, 0], [0, 0, 0], 0x2c3a6a),
      prop('box', 'head', [0.46, 0.06, 0.28], [0, 0.25, 0.40], [0, 0, 0], 0x2c3a6a),
    ],
  },
  E56: {
    key: 'nurseMedic', label: '보건실 좀비', telegraphMs: 500,
    feature: '분홍 간호복 + 흰 간호모 + 몸 옆으로 보이는 연두 배낭',
    palette: { skin: 0x88aa80, top: 0xf2a7c0, bottom: 0xf7c6d6, shoe: 0xf4f4f4, accent: 0x6fcf6a },
    rig: rig(),
    props: [
      prop('box', 'body', [0.72, 0.50, 0.24], [0, 0.04, -0.31], [0, 0, 0], 0x6fcf6a),
      prop('box', 'head', [0.46, 0.18, 0.32], [0, 0.36, 0.04], [0, 0, 0], 0xffffff),
    ],
  },
  E57: {
    key: 'attendanceGuard', label: '출석부 생활지도 좀비', telegraphMs: 500,
    feature: '두 손으로 앞에 든 두꺼운 남색 출석부',
    palette: { skin: 0x6f9866, top: 0x5a5550, bottom: 0x2e3036, shoe: 0x1a1a1a, accent: 0x2a3f7a },
    rig: rig({ armL: { rot: [-1.35, 0, 0.55] }, armR: { rot: [-1.35, 0, -0.55] } }),
    props: [
      prop('box', 'body', [0.50, 0.62, 0.10], [0, 0.04, 0.38], [0, 0, 0], 0x2a3f7a),
      prop('box', 'body', [0.38, 0.48, 0.06], [0, 0.04, 0.43], [0, 0, 0], 0xf4e8c8),
    ],
  },
  E58: {
    key: 'jumpRopeLasso', label: '줄넘기 매복 좀비', telegraphMs: 500,
    feature: '머리 위로 돌리는 노란 줄넘기 고리 + 벌린 팔',
    palette: { skin: 0x82a86c, top: 0x3dba4e, bottom: 0x2e7d40, shoe: 0x1a1a1a, accent: 0xf2d23a },
    rig: rig({ armL: { rot: [-0.30, 0, -0.50] }, armR: { rot: [-0.30, 0, 0.50] } }),
    props: [
      prop('box', 'body', [1.30, 0.07, 0.07], [0, 1.06, 0.06], [0, 0, 0], 0xf2d23a),
      prop('box', 'body', [0.07, 1.06, 0.07], [-0.62, 0.53, 0.06], [0, 0, 0], 0xf2d23a),
      prop('box', 'body', [0.07, 1.06, 0.07], [0.62, 0.53, 0.06], [0, 0, 0], 0xf2d23a),
    ],
  },
  E59: {
    key: 'milkCrateMonitor', label: '우유당번 좀비', telegraphMs: 500,
    feature: '가슴에 안은 파란 우유 상자 + 흰 우유갑',
    palette: { skin: 0x8cae7a, top: 0xf3de8a, bottom: 0x6b4a2e, shoe: 0x1a1a1a, accent: 0x2e7fd0 },
    rig: rig({ armL: { rot: [-1.35, 0, 0.55] }, armR: { rot: [-1.35, 0, -0.55] } }),
    props: [
      prop('box', 'body', [0.56, 0.36, 0.40], [0, 0.0, 0.38], [0, 0, 0], 0x2e7fd0),
      prop('box', 'body', [0.18, 0.30, 0.18], [0.10, 0.32, 0.38], [0, 0, 0], 0xfafaf6),
    ],
  },
  E60: {
    key: 'drainBurrower', label: '배수구잠복 좀비', telegraphMs: 500,
    feature: '흰 위생모(둥근 모자) + 노란 장화',
    palette: { skin: 0x6e9478, top: 0x2a86d8, bottom: 0x2a3a4a, shoe: 0xf2c230, accent: 0xf4f4f4 },
    rig: rig(),
    props: [
      prop('sphere', 'head', [0.74, 0.42, 0.68], [0, 0.25, -0.02], [0, 0, 0], 0xf4f4f4),
    ],
  },
})

export const PROJECTILE_ZOMBIE_MAX_PROPS = 3
export const PROJECTILE_ZOMBIE_PROP_SHAPES = Object.freeze(['box', 'cylinder', 'cone', 'sphere'])
export const PROJECTILE_ZOMBIE_PROP_PARENTS = Object.freeze(['head', 'body', 'armL', 'armR', 'legL', 'legR'])

// 예고(warn)·발사(charge) 몸 포즈 델타. 회복(stun)은 발사 델타를 감쇠해 쓴다(POSED와 같은 규칙).
// (a) 몸 포즈가 회피 판단의 필수 채널이므로 기본 문법을 하나로 둔다: 예고 = 상체를 젖히고 오른팔을
// 뒤로 당긴다, 발사 = 앞으로 내지른다. 종별 소품 위치에 맞춘 예외만 덮어쓴다.
const DEFAULT_STATE_POSE = Object.freeze({
  telegraph: { body: [-0.14, 0, 0], head: [-0.10, 0, 0], armR: [-0.85, 0, 0] },
  attack: { body: [0.20, 0, 0], head: [0.10, 0, 0], armR: [0.95, 0, 0] },
})
export const PROJECTILE_ZOMBIE_STATE_POSE_DELTAS = Object.freeze(Object.fromEntries(PROJECTILE_ZOMBIE_TYPES.map((type) => {
  if (type === 'E47') return [type, { telegraph: { armL: [-1.2, 0, 0], armR: [-1.2, 0, 0], body: [-0.12, 0, 0] }, attack: { armL: [0.9, 0, 0], armR: [0.9, 0, 0], body: [0.18, 0, 0] } }]
  if (type === 'E55') return [type, { telegraph: { body: [-0.10, 0.45, 0], head: [0, -0.30, 0], armR: [0.25, 0, 0] }, attack: { body: [0.25, -0.45, 0], armR: [2.2, 0, 0] } }]
  if (type === 'E57' || type === 'E59') return [type, { telegraph: { body: [-0.18, 0, 0], armL: [-0.45, 0, 0], armR: [-0.45, 0, 0] }, attack: { body: [0.22, 0, 0], armL: [0.40, 0, 0], armR: [0.40, 0, 0] } }]
  if (type === 'E58') return [type, { telegraph: { body: [0.35, 0, 0], legL: [0.55, 0, 0], legR: [0.55, 0, 0] }, attack: { body: [-0.15, 0, 0], armR: [-1.2, 0, 0] } }]
  return [type, DEFAULT_STATE_POSE]
})))

// 예고 진행도 0..1. 행동 모듈이 state=TELEGRAPH로 들어가며 stateTimer=telegraphMs를 넣고,
// 시뮬레이션이 stateTimer를 0까지 줄이면 진행도가 0→1로 간다. 그 밖의 상태는 0.
export function getProjectileZombieTelegraphProgress(typeCode, state, stateTimerMs) {
  if (state !== PROJECTILE_ZOMBIE_STATE.TELEGRAPH) return 0
  const index = projectileZombieIndex(typeCode)
  if (!index) return 0
  const total = PROJECTILE_ZOMBIE_VISUALS[PROJECTILE_ZOMBIE_TYPES[index - 1]].telegraphMs
  const t = 1 - (Number.isFinite(stateTimerMs) ? stateTimerMs : 0) / total
  return t < 0 ? 0 : t > 1 ? 1 : t
}

// POSED 13슬롯 순서(head, eyeL, eyeR, body, armL, handL, armR, handR, legL, footL, legR, footR, mark)의
// 슬롯별 색. 눈과 표식 슬롯은 신규 15종이 그리지 않는다(얼굴 셰이더가 대신한다).
export function getProjectileZombieSlotColors(type) {
  const pal = PROJECTILE_ZOMBIE_VISUALS[type]?.palette
  if (!pal) return null
  return [pal.skin, 0, 0, pal.top, pal.top, pal.skin, pal.top, pal.skin, pal.bottom, pal.shoe, pal.bottom, pal.shoe, 0]
}

// ZOMBIE_PALETTE 항목(사망 파편 EnemyDeathCollapse 등이 직접 조회한다).
export const PROJECTILE_ZOMBIE_PALETTE_ENTRIES = Object.freeze(Object.fromEntries(PROJECTILE_ZOMBIE_TYPES.map((type) => {
  const pal = PROJECTILE_ZOMBIE_VISUALS[type].palette
  return [type, Object.freeze({ body: pal.top, skin: pal.skin, eye: pal.accent, bottom: pal.bottom })]
})))
