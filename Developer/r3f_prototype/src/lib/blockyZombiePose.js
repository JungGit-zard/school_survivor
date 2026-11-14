// 블록 좀비 18종(E71~E88)의 절차적 포즈. 2026-11-14.
//
// Kenney GLB에 든 27개 클립 대신 게임 고유의 절차적 포즈로 6파트(legL·legR·torso·armL·armR·head)를 돌린다 —
// 풀 경로에서 클립 믹서를 200개 돌리지 않고, 다른 풀 좀비(ZombieInstanceLayer)와 같은 "사인 보행 + 상태 델타" 문법을 쓴다.
// 좀비로 읽히게: 두 팔을 앞으로 뻗고(−1.35rad), 상체를 숙이고, 몸통이 좌우로 비틀거리고, 머리가 흔들린다.
//
// 회전 규칙(파트 피벗 기준 X축): 다리·팔은 음수가 앞, 몸통·머리는 양수가 앞으로 숙임. Z축은 옆으로 기울임.
// 상태(phase)는 ZombieInstanceLayer.phase와 같다: normal | warn(예고) | charge(공격·발사) | stun(회복).
// 순수 함수 모듈 — three·React 의존이 없다. out은 길이 18 Float32Array(파트 6 × XYZ)와 rootRoll·bob 2칸을 더한 20칸.

export const BLOCKY_POSE_PARTS = Object.freeze(['legL', 'legR', 'torso', 'armL', 'armR', 'head'])
export const BLOCKY_POSE_SIZE = 20
export const BLOCKY_POSE_ROOT_ROLL = 18
export const BLOCKY_POSE_BOB = 19
export const BLOCKY_ZOMBIE_ARM_REACH = -1.35

const LEG_L = 0; const LEG_R = 3; const TORSO = 6; const ARM_L = 9; const ARM_R = 12; const HEAD = 15

function set(out, part, x, y, z) { out[part] = x; out[part + 1] = y; out[part + 2] = z }

export function createBlockyPose() { return new Float32Array(BLOCKY_POSE_SIZE) }

/**
 * @param out    createBlockyPose()
 * @param style  BLOCKY_ZOMBIE_VISUALS[type].style
 * @param phase  'normal' | 'warn' | 'charge' | 'stun'
 * @param time   초(풀 애니메이션 시각)
 * @param fast   빠른 종(보폭 주기가 빠르다)
 * @param seed   개체별 위상(0..1) — 같은 종 여럿이 같은 박자로 흔들리지 않게
 */
export function fillBlockyZombiePose(out, style, phase, time, fast = false, seed = 0) {
  const t = time + seed * 3.7
  const stride = fast ? 10.5 : 7
  const planted = phase === 'warn' || phase === 'stun'
  const walk = planted ? 0 : Math.sin(t * (phase === 'charge' && (style === 'charge' || style === 'tumble') ? 16 : stride)) * (phase === 'charge' ? 0.7 : 0.55)
  // 평시: 좀비 걸음 — 팔을 앞으로 뻗고 상체를 숙이고 몸통이 비틀거린다.
  set(out, LEG_L, walk, 0, 0)
  set(out, LEG_R, -walk, 0, 0)
  set(out, TORSO, 0.14, Math.sin(t * 1.9) * 0.08, planted ? 0 : Math.sin(t * 3.5) * 0.07)
  const sway = planted ? 0 : Math.sin(t * 2.8) * 0.08
  set(out, ARM_L, BLOCKY_ZOMBIE_ARM_REACH + sway, 0, -0.10)
  set(out, ARM_R, BLOCKY_ZOMBIE_ARM_REACH - sway, 0, 0.10)
  set(out, HEAD, 0.16, Math.sin(t * 1.3) * 0.12, planted ? 0.05 : Math.sin(t * 1.6) * 0.13)
  out[BLOCKY_POSE_ROOT_ROLL] = 0
  out[BLOCKY_POSE_BOB] = planted ? 0 : Math.abs(Math.sin(t * stride)) * 0.06
  if (phase === 'normal') return out

  if (phase === 'stun') {
    // 회복: 축 늘어진다. 충돌실험 인형은 옆으로 굴러 넘어져 있다.
    set(out, TORSO, 0.32, 0, 0)
    set(out, HEAD, 0.48, 0, 0.18)
    set(out, ARM_L, -0.35, 0, -0.20)
    set(out, ARM_R, -0.35, 0, 0.20)
    if (style === 'tumble') {
      out[BLOCKY_POSE_ROOT_ROLL] = 1.25
      set(out, LEG_L, -0.4, 0, 0)
      set(out, LEG_R, 0.3, 0, 0)
    }
    return out
  }

  const warn = phase === 'warn'
  switch (style) {
    case 'punch':
      if (warn) { set(out, ARM_R, -0.45, 0, 0.15); set(out, ARM_L, -1.2, 0, -0.1); set(out, TORSO, -0.12, -0.35, 0) }
      else { set(out, ARM_R, -1.75, 0, -0.05); set(out, ARM_L, -0.6, 0, -0.1); set(out, TORSO, 0.32, 0.30, 0) }
      break
    case 'kick':
      if (warn) { set(out, LEG_R, 0.75, 0, 0); set(out, ARM_L, -1.0, 0, -0.3); set(out, ARM_R, -0.6, 0, 0.3); set(out, TORSO, -0.12, 0, 0) }
      else { set(out, LEG_R, -1.35, 0, 0); set(out, LEG_L, 0.15, 0, 0); set(out, TORSO, -0.28, 0, 0); set(out, ARM_L, -0.9, 0, -0.45); set(out, ARM_R, -0.9, 0, 0.45) }
      break
    case 'slam':
      if (warn) { set(out, ARM_L, -2.85, 0, -0.15); set(out, ARM_R, -2.85, 0, 0.15); set(out, TORSO, -0.18, 0, 0); set(out, HEAD, -0.1, 0, 0) }
      else { set(out, ARM_L, -1.0, 0, -0.1); set(out, ARM_R, -1.0, 0, 0.1); set(out, TORSO, 0.55, 0, 0); set(out, HEAD, 0.2, 0, 0) }
      break
    case 'charge':
    case 'tumble':
      if (warn) { set(out, TORSO, 0.45, 0, 0); set(out, HEAD, -0.25, 0, 0); set(out, ARM_L, -0.9, 0, -0.2); set(out, ARM_R, -0.9, 0, 0.2); set(out, LEG_L, -0.4, 0, 0); set(out, LEG_R, 0.35, 0, 0) }
      else { set(out, TORSO, 0.55, 0, 0); set(out, HEAD, -0.3, 0, 0); set(out, ARM_L, -1.6, 0, -0.1); set(out, ARM_R, -1.6, 0, 0.1) }
      break
    case 'throw':
      if (warn) { set(out, ARM_R, -2.9, 0, 0.1); set(out, ARM_L, -0.8, 0, -0.2); set(out, TORSO, -0.2, -0.3, 0) }
      else { set(out, ARM_R, -1.2, 0, 0); set(out, ARM_L, -0.6, 0, -0.2); set(out, TORSO, 0.3, 0.25, 0) }
      break
    case 'shoot':
      set(out, ARM_L, -1.57, 0, 0.12); set(out, ARM_R, -1.57, 0, -0.12)
      set(out, TORSO, warn ? 0 : -0.08 + Math.abs(Math.sin(t * 20)) * 0.08, 0, 0)
      set(out, HEAD, warn ? 0.05 : 0.1, 0, 0)
      break
    case 'fan':
      if (warn) { set(out, ARM_R, -1.3, 0, 1.15); set(out, TORSO, 0, -0.35, 0.12) }
      else { set(out, ARM_R, -1.3, 0, -0.9); set(out, TORSO, 0.1, 0.35, -0.15) }
      set(out, ARM_L, -1.0, 0, -0.3)
      break
    case 'whistle':
      set(out, ARM_R, -2.6, 0, -0.55); set(out, ARM_L, warn ? -1.1 : -1.6, 0, -0.2)
      set(out, HEAD, warn ? -0.12 : -0.2 + Math.sin(t * 18) * 0.05, 0, 0)
      set(out, TORSO, warn ? -0.1 : 0.12, 0, 0)
      break
    case 'cast':
      set(out, ARM_L, warn ? -2.6 : -2.95, 0, -0.4); set(out, ARM_R, warn ? -2.6 : -2.95, 0, 0.4)
      set(out, HEAD, -0.22, 0, 0); set(out, TORSO, -0.1, 0, 0)
      break
    case 'blink':
      if (warn) { set(out, TORSO, 0.5, 0, 0); set(out, HEAD, 0.32, 0, 0); set(out, ARM_L, -0.6, 0, -0.3); set(out, ARM_R, -0.6, 0, 0.3); set(out, LEG_L, -0.5, 0, 0); set(out, LEG_R, -0.5, 0, 0) }
      else { set(out, ARM_R, -1.7, 0, 0); set(out, ARM_L, -0.4, 0, -0.3); set(out, TORSO, 0.3, 0, 0) }
      break
    default:
      break
  }
  return out
}
