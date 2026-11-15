// 사람 구경꾼(lib/miniHumanRoster.js) 절차적 포즈 + 파트 행렬. 2026-11-15, threemini.
//
// 좀비 포즈(lib/miniZombiePose.js)와 같은 배열 칸(파트 6 × XYZ, 18 rootRoll, 19 bob)을 쓴다. 각도 뜻도 같다:
// 팔·다리 X 음수 = 앞, 몸통·머리 X 양수 = 숙임, 팔 Z = armL 양수/armR 음수가 바깥으로 들기. 팔 0 = 쉬는 자세(내린 팔).
// 'idle' = 숨쉬기·고개 두리번·몸무게 옮기기, 'cower' = 웅크려 두 손으로 머리 감싸고 떨기.
// 시간과 배치 순번만 쓴다(Math.random 없음) — 같은 시각이면 같은 행렬이다.
import * as THREE from 'three'
import { MINI_HEAD_LIFT, MINI_POSE_BOB, MINI_POSE_OFFSET, MINI_POSE_ROOT_ROLL, createMiniPose } from './miniZombiePose.js'
import { MINI_MODEL_HEIGHT } from './miniZombieRoster.js'
import { MINI_HUMAN_STAGE_HEIGHT } from './miniHumanRoster.js'

export { createMiniPose as createMiniHumanPose }
const LEG_L = 0; const LEG_R = 3; const TORSO = 6; const ARM_L = 9; const ARM_R = 12; const HEAD = 15
function set(out, part, x, y, z) { out[part] = x; out[part + 1] = y; out[part + 2] = z }

// 배치 순번 → 개체 위상 0..1(황금비 — 이웃이 같은 박자로 움직이지 않게).
export function miniHumanSeed(index) { return (index * 0.6180339887) % 1 }

export function fillMiniHumanPose(out, pose, time, seed = 0) {
  out.fill(0)
  const t = time + seed * 5.3
  if (pose === 'cower') {
    set(out, TORSO, 0.5, 0, 0)
    set(out, HEAD, 0.35, 0, 0)
    set(out, ARM_L, -2.45, 0, -0.5)
    set(out, ARM_R, -2.45, 0, 0.5)
    set(out, LEG_L, -0.18, 0, 0.04); set(out, LEG_R, 0.12, 0, -0.04)
    out[MINI_POSE_ROOT_ROLL] = Math.sin(t * 31) * 0.025
    out[MINI_POSE_BOB] = -0.02
  } else {
    const breathe = Math.sin(t * 1.8)
    set(out, TORSO, 0.03 * breathe, Math.sin(t * 0.37) * 0.06, 0)
    set(out, HEAD, 0.04 * Math.sin(t * 0.9), Math.sin(t * 0.45) * 0.35, 0)
    set(out, ARM_L, 0.05 * Math.sin(t * 1.1), 0, 0.05 + 0.03 * breathe)
    set(out, ARM_R, -0.05 * Math.sin(t * 1.1), 0, -0.05 - 0.03 * breathe)
    out[MINI_POSE_ROOT_ROLL] = Math.sin(t * 0.9) * 0.02
    out[MINI_POSE_BOB] = 0.004 * breathe
  }
  // 2등신이라 고개를 들어야 게임 카메라(45°)에서 얼굴이 보인다 — 좀비와 같은 보정.
  out[HEAD] -= MINI_HEAD_LIFT
  return out
}

const _base = new THREE.Matrix4(); const _torso = new THREE.Matrix4(); const _tmp = new THREE.Matrix4(); const _rot = new THREE.Matrix4()
const _euler = new THREE.Euler(0, 0, 0, 'XYZ'); const _pos = new THREE.Vector3(); const _quat = new THREE.Quaternion(); const _scl = new THREE.Vector3()

function composePart(out, parent, part, pose) {
  const offset = MINI_POSE_OFFSET[part.key]
  _euler.set(pose[offset], pose[offset + 1], pose[offset + 2])
  _rot.makeRotationFromEuler(_euler)
  return out.copy(parent).multiply(_tmp.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2])).multiply(_rot)
}

/**
 * 배치 1개의 파트 행렬(장면 좌표). built = buildMiniVariant() 결과(parts 순서 그대로 out[k]에 쓴다).
 * 몸 바닥(발)이 (x, y, z)에 서고, 키가 placement.height(기본 MINI_HUMAN_STAGE_HEIGHT)가 된다.
 */
export function composeMiniHumanParts(built, placement, pose, out) {
  const s = (placement.height ?? MINI_HUMAN_STAGE_HEIGHT) / MINI_MODEL_HEIGHT
  _pos.set(placement.x, placement.y ?? 0, placement.z)
  _euler.set(0, placement.yaw ?? 0, 0); _quat.setFromEuler(_euler); _scl.set(s, s, s)
  _base.compose(_pos, _quat, _scl)
  if (pose[MINI_POSE_ROOT_ROLL]) _base.multiply(_rot.makeRotationZ(pose[MINI_POSE_ROOT_ROLL]))
  if (pose[MINI_POSE_BOB]) _base.multiply(_tmp.makeTranslation(0, pose[MINI_POSE_BOB], 0))
  const torsoIndex = built.parts.findIndex((p) => p.key === 'torso')
  if (torsoIndex >= 0) composePart(_torso, _base, built.parts[torsoIndex], pose)
  built.parts.forEach((part, k) => {
    const target = out[k] ?? (out[k] = new THREE.Matrix4())
    if (k === torsoIndex) target.copy(_torso)
    else composePart(target, part.parentIsTorso ? _torso : _base, part, pose)
  })
  return out
}
