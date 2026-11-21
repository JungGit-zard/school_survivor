import * as THREE from 'three'
import { cueStage6Celebration } from '../../lib/stage6ProgrammeSfx.js'
import { STAGE6_CELEBRATION_MOMENTS, STAGE6_PROGRAMME_STAGE_ID } from '../../lib/stage6Programme.js'
import { getSchoolyardOutlineMaterial, getSchoolyardPropMaterial } from './schoolyardProps.js'

// Stage 6 「운동장」 결승 테이프(2026-11-19, 지루함 해결 기획서 5번 — STAGE6_CELEBRATION_MOMENTS.finishTape).
// 탈출구(EscapePortal) 위에 건다: 탈출구 링 바깥 양옆에 짧은 기둥 두 개, 그 사이로 흰 테이프(가운데 빨간 줄)가
// 탈출구 중심을 화면 가로(world X) 방향으로 가로지른다. 위치는 EscapePortal이 실제로 고른 자리
// (refs.js portalTarget = pickPortalPosition 결과, publishPortalTarget)를 그대로 따른다 — 하드코딩하지 않는다.
// 순수 장식: 콜라이더·피해·판정이 없다(로사리·좀비·투사체 누구도 막지 않는다).
//
// 상태(게임 시계가 아니라 화면 프레임 delta로 움직인다 — 'cleared'에서는 게임 시계가 멈춘다):
//   hidden   — Stage 6이 아니거나 탈출구가 아직 없음(escapePortalActive false 또는 portalTarget 미발행). 인스턴스 0 = 드로콜 0.
//   intact   — 탈출구가 나타난 뒤. 기둥 2 + 테이프 반쪽 2 + 빨간 줄 2 = 인스턴스 6(1 드로콜) + 외곽선 4(1 드로콜).
//   snapping — 탈출로 phase가 'cleared'가 된 순간: 두 반쪽이 로사리가 온 쪽의 반대편으로 펄럭이며 0.6초 동안 바닥에 떨어진다.
//   down     — 떨어진 채 그대로(행렬 갱신 없음).
//   gone     — 동작 줄이기(reduced motion)면 펄럭임 대신 즉시 숨긴다.
// 축하 소리(cueStage6Celebration('finishTape'))는 판(stageId:gameKey)마다 정확히 한 번. 컴포넌트가 다시 마운트돼도
// 같은 판이면 다시 내지 않고 바로 'down'으로 둔다. 새 판(gameKey 증가)이면 처음부터.

export const STAGE6_FINISH_TAPE_STAGE_ID = STAGE6_PROGRAMME_STAGE_ID
export const STAGE6_FINISH_TAPE_MOMENT = STAGE6_CELEBRATION_MOMENTS.finishTape.id
export const STAGE6_FINISH_TAPE_SNAP_SECONDS = 0.6
export const STAGE6_FINISH_TAPE_MODES = Object.freeze({ hidden: 'hidden', intact: 'intact', snapping: 'snapping', down: 'down', gone: 'gone' })
const M = STAGE6_FINISH_TAPE_MODES

// EscapePortal.jsx PORTAL_RADIUS(시각 링 반지름, 1.5u = 0.375블록). 테스트가 원본 값과 같은지 확인한다.
export const STAGE6_FINISH_TAPE_PORTAL_RING_RADIUS = 1.5
// 이 거리보다 멀리 있을 때의 로사리 위치로 "어느 쪽에서 왔는지"를 기록한다(흡입 판정 0.6u보다 넉넉히 바깥).
const APPROACH_SAMPLE_RADIUS = 1.2

// 인스턴스 순서: 0 왼 기둥, 1 오른 기둥, 2 왼 테이프, 3 오른 테이프, 4 왼 빨간 줄, 5 오른 빨간 줄. 외곽선은 0~3.
export const STAGE6_FINISH_TAPE_SOLID_COUNT = 6
export const STAGE6_FINISH_TAPE_HULL_COUNT = 4
export const STAGE6_FINISH_TAPE_COLORS = Object.freeze({ post: '#E04B4B', ribbon: '#FFFDF5', stripe: '#E04B4B' })
const SNAP_YAW = 0.9          // 반쪽이 기둥을 축으로 도는 각(rad, 약 52°)
const FLUTTER_AMP = 0.9       // 긴 축 비틀림 펄럭임 진폭(rad), 끝으로 갈수록 줄어 0
const FLUTTER_WAVES = 3       // 0.6초 동안 펄럭임 반주기 수

// 크기는 게임 units(1블록 = 4 units), 탈출구 중심 기준. 기둥은 링(1.5u) 바깥 ±1.9u, 높이 0.6u(0.15블록)로 낮게.
export function getStage6FinishTapeLayout() {
  return Object.freeze({
    postX: STAGE6_FINISH_TAPE_PORTAL_RING_RADIUS + 0.4, // 기둥 중심(링 바깥 + 기둥·외곽선 두께)
    postW: 0.08, postH: 0.6,
    ribbonY: 0.5, ribbonH: 0.1, ribbonD: 0.02,
    stripeH: 0.035, stripeD: 0.03,
    restY: 0.035,                  // 떨어진 뒤 테이프 중심 높이(눕힌 줄·외곽선 두께가 바닥에 안 묻힘)
    outline: 0.02,
  })
}

// 판마다 한 번만 소리를 내기 위한 기록(모듈 수준: 컴포넌트 재마운트에도 유지). 테스트는 새 ledger를 넘긴다.
const _ledger = { cuedRunKey: null }
export function createStage6FinishTapeLedger() { return { cuedRunKey: null } }
export function resetStage6FinishTapeLedger() { _ledger.cuedRunKey = null }

export function createStage6FinishTapeState() {
  return { stageId: undefined, gameKey: undefined, mode: M.hidden, t: 0, x: 0, z: 0, push: 1, writtenU: -1, writtenShown: null, writtenX: NaN, writtenZ: NaN }
}

function cueOnce(ledger, runKey, cue) {
  if (ledger.cuedRunKey === runKey) return false
  ledger.cuedRunKey = runKey
  try { cue(STAGE6_FINISH_TAPE_MOMENT) } catch { /* 오디오는 선택 사항 */ }
  return true
}

/**
 * 한 프레임 진행. input = { stageId, gameKey, portalActive, portalKnown, portalX, portalZ, playerX, playerZ, phase, deltaSec, reducedMotion }.
 * portalKnown/portalX/portalZ = refs.js portalTarget(active/x/z) — EscapePortal이 실제로 놓은 자리.
 * cue = 축하 소리 함수(기본 cueStage6Celebration), ledger = 판별 한 번 기록(기본 모듈 ledger). state를 고쳐 돌려준다.
 */
export function stepStage6FinishTape(state, input, cue = cueStage6Celebration, ledger = _ledger) {
  const { stageId, gameKey, portalActive = false, portalKnown = false, portalX, portalZ, playerX, playerZ, phase, deltaSec = 0, reducedMotion = false } = input ?? {}
  if (stageId !== state.stageId || gameKey !== state.gameKey) {
    state.stageId = stageId
    state.gameKey = gameKey
    state.mode = M.hidden
    state.t = 0
    state.push = 1
  }
  if (stageId !== STAGE6_FINISH_TAPE_STAGE_ID) { state.mode = M.hidden; return state }

  const located = portalActive === true && portalKnown === true && Number.isFinite(portalX) && Number.isFinite(portalZ)
  if (state.mode === M.hidden && located) state.mode = M.intact
  else if (state.mode === M.intact && portalActive !== true) state.mode = M.hidden
  if (state.mode === M.intact && located) { state.x = portalX; state.z = portalZ }

  // 로사리가 다가오는 쪽: 링 근처 밖에서 마지막으로 본 위치의 z 쪽. 테이프는 그 반대편으로 밀려 떨어진다.
  if (state.mode === M.intact && Number.isFinite(playerX) && Number.isFinite(playerZ)
    && Math.hypot(playerX - state.x, playerZ - state.z) > APPROACH_SAMPLE_RADIUS) {
    state.push = playerZ <= state.z ? 1 : -1
  }

  if (state.mode === M.intact && phase === 'cleared') {
    const fresh = cueOnce(ledger, `${stageId}:${gameKey}`, cue)
    // 같은 판에서 이미 끊었으면(재마운트) 펄럭임 없이 떨어진 상태로.
    state.mode = reducedMotion ? M.gone : fresh ? M.snapping : M.down
    state.t = fresh ? 0 : STAGE6_FINISH_TAPE_SNAP_SECONDS
    return state
  }
  if (state.mode === M.snapping) {
    if (reducedMotion) { state.mode = M.gone; return state }
    const dt = Number.isFinite(deltaSec) && deltaSec > 0 ? deltaSec : 0
    state.t = Math.min(STAGE6_FINISH_TAPE_SNAP_SECONDS, state.t + dt)
    if (state.t >= STAGE6_FINISH_TAPE_SNAP_SECONDS) state.mode = M.down
  }
  return state
}

export function isStage6FinishTapeShown(state) {
  return state.mode === M.intact || state.mode === M.snapping || state.mode === M.down
}

// 0 = 걸려 있음, 1 = 다 떨어짐.
export function getStage6FinishTapeSnapProgress(state) {
  if (state.mode === M.down) return 1
  if (state.mode === M.snapping) return Math.min(1, state.t / STAGE6_FINISH_TAPE_SNAP_SECONDS)
  return 0
}

// ── 메시(InstancedMesh 2개 = 보일 때 드로콜 2, 숨기면 count 0 = 드로콜 0) ──
// 재질은 운동장 손수 만든 소품과 같은 정점색 툰 + 스텐실 없는 외곽선(schoolyardProps.js 공유 재질; dispose하지 않는다).
export function createStage6FinishTapeMeshes(layout) {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3).fill(1), 3))
  const solid = new THREE.InstancedMesh(geometry, getSchoolyardPropMaterial(), STAGE6_FINISH_TAPE_SOLID_COUNT)
  solid.name = 'stage6-finish-tape-solid'
  const hull = new THREE.InstancedMesh(geometry, getSchoolyardOutlineMaterial(), STAGE6_FINISH_TAPE_HULL_COUNT)
  hull.name = 'stage6-finish-tape-outline'
  hull.renderOrder = 1
  const color = new THREE.Color()
  const colors = [STAGE6_FINISH_TAPE_COLORS.post, STAGE6_FINISH_TAPE_COLORS.post, STAGE6_FINISH_TAPE_COLORS.ribbon, STAGE6_FINISH_TAPE_COLORS.ribbon, STAGE6_FINISH_TAPE_COLORS.stripe, STAGE6_FINISH_TAPE_COLORS.stripe]
  colors.forEach((hex, i) => solid.setColorAt(i, color.set(hex)))
  // 걸린 자세와 떨어진 자세를 모두 덮는 구(중심은 탈출구 자리로 옮긴다; 반지름 고정 → 화면 밖이면 컬링).
  const sphere = new THREE.Sphere(new THREE.Vector3(0, layout.postH / 2, 0), layout.postX * 1.35 + 0.5)
  for (const mesh of [solid, hull]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.boundingSphere = sphere
    mesh.matrixAutoUpdate = false
    mesh.raycast = () => {} // 장식: 레이캐스트·선택 대상 아님
    mesh.count = 0
  }
  return { solid, hull, geometry, sphere }
}

export function disposeStage6FinishTapeMeshes(meshes) {
  if (!meshes) return
  meshes.geometry.dispose()
  meshes.solid.dispose?.()
  meshes.hull.dispose?.()
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion()
const _p = new THREE.Vector3(), _o = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Vector3()
const _Y = new THREE.Vector3(0, 1, 0), _X = new THREE.Vector3(1, 0, 0), _NO_ROT = new THREE.Quaternion()

// side −1 = 왼 반쪽(기둥 x = −postX에서 가운데까지), +1 = 오른 반쪽. push = 떨어지는 쪽(+1 = +z, 화면 아래). u = 0..1.
// 결과는 _c(중심, 탈출구 기준 로컬)와 _q(회전).
function halfPose(layout, side, push, u) {
  const e = 1 - (1 - u) ** 3
  _qa.setFromAxisAngle(_Y, side * push * SNAP_YAW * e)
  _qb.setFromAxisAngle(_X, side * (Math.PI / 2 * e + FLUTTER_AMP * Math.sin(u * Math.PI * FLUTTER_WAVES) * (1 - u)))
  _q.multiplyQuaternions(_qa, _qb)
  const y = layout.ribbonY + (layout.restY - layout.ribbonY) * u * u
  _o.set(-side * layout.postX / 2, 0, 0).applyQuaternion(_q)
  _c.set(side * layout.postX, y, 0).add(_o)
}

/**
 * 상태 → 인스턴스 행렬·개수·visible. 자세(u)·자리·표시 여부가 바뀐 프레임에만 버퍼를 고친다(할당 없음).
 * prewarm = 스테이지 진입 셰이더 예열(compileAsync는 visible만 돈다) 동안 count 0인 채로 visible을 켜 둔다.
 */
export function writeStage6FinishTapePose(state, layout, meshes, prewarm = false) {
  const { solid, hull } = meshes
  const shown = isStage6FinishTapeShown(state)
  solid.visible = hull.visible = shown || prewarm
  if (!shown) {
    solid.count = hull.count = 0
    state.writtenShown = false
    state.writtenU = -1
    return false
  }
  const u = getStage6FinishTapeSnapProgress(state)
  if (state.writtenShown === true && state.writtenU === u && state.writtenX === state.x && state.writtenZ === state.z) return false
  solid.count = STAGE6_FINISH_TAPE_SOLID_COUNT
  hull.count = STAGE6_FINISH_TAPE_HULL_COUNT
  meshes.sphere.center.set(state.x, layout.postH / 2, state.z)
  const t2 = layout.outline * 2
  for (let i = 0; i < 2; i += 1) {
    const side = i === 0 ? -1 : 1
    _p.set(state.x + side * layout.postX, layout.postH / 2, state.z)
    solid.setMatrixAt(i, _m.compose(_p, _NO_ROT, _s.set(layout.postW, layout.postH, layout.postW)))
    _p.y += layout.outline / 2 // 기둥 외곽선은 바닥(y 0)에서 시작해 위로만 두껍게
    hull.setMatrixAt(i, _m.compose(_p, _NO_ROT, _s.set(layout.postW + t2, layout.postH + layout.outline, layout.postW + t2)))
    halfPose(layout, side, state.push, u)
    _c.x += state.x
    _c.z += state.z
    solid.setMatrixAt(2 + i, _m.compose(_c, _q, _s.set(layout.postX, layout.ribbonH, layout.ribbonD)))
    solid.setMatrixAt(4 + i, _m.compose(_c, _q, _s.set(layout.postX, layout.stripeH, layout.stripeD)))
    hull.setMatrixAt(2 + i, _m.compose(_c, _q, _s.set(layout.postX + t2, layout.ribbonH + t2, layout.ribbonD + t2)))
  }
  solid.instanceMatrix.needsUpdate = true
  hull.instanceMatrix.needsUpdate = true
  state.writtenShown = true
  state.writtenU = u
  state.writtenX = state.x
  state.writtenZ = state.z
  return true
}
