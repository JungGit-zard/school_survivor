// 감염 안 된 사람(학생·교직원) 구경꾼 — Kenney "Mini Characters 2.0"(CC0) 원래 색 그대로. 2026-11-15, threemini.
//
// 좀비(lib/miniZombieRoster.js)와 같은 GLB(assets/models/kenney_mini/mini_zombies_kenney.glb)·같은 파트 지오메트리를 쓴다.
// GLB 컬러맵은 팩 원래 색 그대로이고, 좀비 색은 런타임 UV 칸 옮기기로만 만든다. 그래서 사람 = 칸 옮기기 없음(원래 색)이고,
// GLB는 1바이트도 늘지 않는다. 눈·입 슬롯('eye'·'mouth')의 기본색도 팩 원래 진회색이다.
// 피부만 바꾼 변형(skin): 팩이 원래 쓰는 피부 칸 3개(MINI_HUMAN_SKIN_CELLS) 중 하나로 옮긴다 — 좀비 슬롯은 절대 안 쓴다.
//
// 구조만 있다(Terry 2026-11-15 "나올 수 있게 구조를 만들어. 지금까지 만든 내용에 더 넣을 필요는 없어"):
// MINI_HUMAN_PLACEMENTS의 타이틀·스테이지 목록은 비어 있다. 비어 있으면 MiniHumanLayer는 null이라 화면·드로콜이 그대로다.
//
// 게임플레이 중립: 콜라이더·피해·조준·스폰·적 풀과 무관한 그림뿐이다(MiniHumanLayer는 enemyPool·Rapier를 읽지도 쓰지도 않는다).
// 이 모듈은 순수 데이터다(three·React 의존 없음).
import { MINI_BODY_IDS } from './miniZombieRoster.js'

// 사람 몸 14명: 팩 몸 15명 중 원래부터 좀비인 'zombie'만 뺀다. 교과서 미믹(절차 몸)도 사람이 아니다.
export const MINI_HUMAN_BODY_IDS = Object.freeze(MINI_BODY_IDS.filter((id) => id !== 'zombie'))
// 팩이 사람 피부에 쓰는 칸(GLB extras.mini.skinCell — r2c1 진한 피부, r2c3 중간, r2c5 밝은 피부).
export const MINI_HUMAN_SKIN_CELLS = Object.freeze(['r2c1', 'r2c3', 'r2c5'])
export const MINI_HUMAN_POSES = Object.freeze(['idle', 'cower'])
// 장면 열쇠 = 타이틀 + 게임 스테이지 id(useGameStore.currentStageId).
export const MINI_HUMAN_SCENE_KEYS = Object.freeze(['title', 'stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'])
// 게임 기본 키(월드 단위, 발~머리 위) = 2차 좀비 기본 키(1.69 × ENEMY_VISUAL_WORLD_SCALE 0.333). 테스트가 대조한다.
export const MINI_HUMAN_STAGE_HEIGHT = 0.563
// 장면 하나의 상한: 사람 수와 서로 다른 모습 수. 모습 1개 = 파트 6 × (몸통 + 외곽선) = 드로콜 12.
export const MINI_HUMAN_MAX_PER_SCENE = 8
export const MINI_HUMAN_MAX_LOOKS_PER_SCENE = 4
export const MINI_HUMAN_DRAW_CALLS_PER_LOOK = 12

// 배치 한 줄의 모양:
//   { look: MINI_HUMAN_BODY_IDS 중 하나, skin?: MINI_HUMAN_SKIN_CELLS 중 하나(생략 = 원래 피부),
//     x, z (장면 좌표 — 스테이지는 월드, 타이틀은 TitleScene3D sceneRoot 좌표), y?: 바닥 높이(기본 0),
//     yaw?: 라디안(0 = 카메라 쪽 +Z를 본다), pose?: 'idle' | 'cower'(기본 'idle'), height?: 월드 키(기본 MINI_HUMAN_STAGE_HEIGHT) }
// 스테이지 배치는 lib/miniHumanPlacementSafety.js의 검사를 통과해야 한다(테스트가 전 목록을 돈다).
const EMPTY = Object.freeze([])
export const MINI_HUMAN_PLACEMENTS = Object.freeze(Object.fromEntries(MINI_HUMAN_SCENE_KEYS.map((key) => [key, EMPTY])))

export function getMiniHumanPlacements(sceneKey) {
  return MINI_HUMAN_PLACEMENTS[sceneKey] ?? EMPTY
}

// 배치의 모습 열쇠(같은 열쇠 = 같은 인스턴스 메시 세트). 좀비 visualId('n2-…')와 겹치지 않는다.
export function miniHumanLookKey(placement) {
  const skin = placement.skin && placement.skin !== miniHumanNativeSkin(placement.look) ? placement.skin : 'orig'
  return `human:${placement.look}:${skin}`
}

// 몸마다 원래 피부 칸(GLB extras와 같다 — 테스트가 실제 GLB와 대조한다).
const NATIVE_SKIN = Object.freeze({
  'female-a': 'r2c3', 'female-b': 'r2c5', 'female-c': 'r2c1', 'female-d': 'r2c5', 'female-e': 'r2c5', 'female-f': 'r2c5',
  'male-a': 'r2c3', 'male-b': 'r2c5', 'male-c': 'r2c5', 'male-d': 'r2c5', 'male-e': 'r2c5', 'male-f': 'r2c1', 'male-g': 'r2c5', worker: 'r2c3',
})
export function miniHumanNativeSkin(look) { return NATIVE_SKIN[look] ?? null }

// buildMiniVariant(lib/miniZombieGeometry.js)에 넘길 변형. 원래 색 = 칸 옮기기 없음(eye·mouth·recolor 없음).
export function miniHumanVariant(placement) {
  const variant = { body: placement.look }
  if (placement.skin && placement.skin !== miniHumanNativeSkin(placement.look)) variant.skin = placement.skin
  return variant
}

// 배치 한 줄의 모양 검사(위치 안전은 miniHumanPlacementSafety.js). 문제 문자열 목록, 없으면 [].
export function miniHumanPlacementShapeProblems(placement) {
  const problems = []
  if (!placement || typeof placement !== 'object') return ['not an object']
  if (!MINI_HUMAN_BODY_IDS.includes(placement.look)) problems.push(`look ${placement.look} is not a human body`)
  if (placement.skin !== undefined && !MINI_HUMAN_SKIN_CELLS.includes(placement.skin)) problems.push(`skin ${placement.skin} is not a pack skin cell`)
  if (placement.pose !== undefined && !MINI_HUMAN_POSES.includes(placement.pose)) problems.push(`pose ${placement.pose} unknown`)
  for (const key of ['x', 'z']) if (!Number.isFinite(placement[key])) problems.push(`${key} not finite`)
  for (const key of ['y', 'yaw']) if (placement[key] !== undefined && !Number.isFinite(placement[key])) problems.push(`${key} not finite`)
  if (placement.height !== undefined && !(placement.height > 0 && placement.height < 5)) problems.push('height out of range')
  return problems
}

// 장면 목록 검사: 줄마다 모양 + 수·모습 상한.
export function miniHumanSceneProblems(placements) {
  const problems = []
  placements.forEach((p, i) => { for (const problem of miniHumanPlacementShapeProblems(p)) problems.push(`#${i}: ${problem}`) })
  if (placements.length > MINI_HUMAN_MAX_PER_SCENE) problems.push(`more than ${MINI_HUMAN_MAX_PER_SCENE} humans`)
  const looks = new Set(placements.filter((p) => MINI_HUMAN_BODY_IDS.includes(p?.look)).map(miniHumanLookKey))
  if (looks.size > MINI_HUMAN_MAX_LOOKS_PER_SCENE) problems.push(`more than ${MINI_HUMAN_MAX_LOOKS_PER_SCENE} looks`)
  return problems
}
