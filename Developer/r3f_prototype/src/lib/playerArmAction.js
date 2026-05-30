export const PLAYER_ARM_ACTIONS = {
  boxCutter: {
    // 슬래시 이펙트(240ms)보다 길게 잡아 '앞으로→위로' 2단 동작이 또렷이 보이게 한다.
    durationMs: 460,
  },
  guidedMissileThrow: {
    durationMs: 360,
  },
}

export function createPlayerArmActionState() {
  return {
    type: null,
    startMs: 0,
    durationMs: 0,
  }
}

export function startPlayerArmAction(state, type, startMs, durationMs = PLAYER_ARM_ACTIONS[type]?.durationMs ?? 280) {
  state.type = type
  state.startMs = startMs
  state.durationMs = durationMs
}

export function clearPlayerArmAction(state) {
  state.type = null
  state.startMs = 0
  state.durationMs = 0
}

export function getActivePlayerArmAction(state, nowMs) {
  if (!state?.type || state.durationMs <= 0) return null
  const elapsedMs = nowMs - state.startMs
  if (elapsedMs < 0) return null
  if (elapsedMs >= state.durationMs) {
    clearPlayerArmAction(state)
    return null
  }

  return {
    type: state.type,
    progress: elapsedMs / state.durationMs,
  }
}

export function getPlayerArmPose({ action, walkSwing = 0 }) {
  const cleanZero = (value) => Object.is(value, -0) ? 0 : value
  const pose = {
    slvL: { x: cleanZero(-walkSwing * 0.55), y: 0, z: 0 },
    slvR: { x: cleanZero(walkSwing * 0.55), y: 0, z: 0 },
  }
  if (!action) return pose

  const p = Math.max(0, Math.min(1, action.progress))
  const power = Math.sin(p * Math.PI)

  if (action.type === 'boxCutter') {
    // 2단 동작: (1) 팔을 앞으로 빠르게 쭉 내밀고 → (2) 팔을 머리 위로 크게 든다.
    // slvR.x 음수가 클수록 어깨가 앞→위로 회전(-1.5 ≈ 전방 수평, -2.75 ≈ 머리 위).
    const t1 = Math.min(1, p / 0.22)                       // 1단: 전방 찌르기 (빠르게)
    const t2 = Math.min(1, Math.max(0, (p - 0.26) / 0.42)) // 2단: 위로 들기 (p≈0.68에 정점)
    const settle = Math.min(1, Math.max(0, (p - 0.86) / 0.14)) // 마지막에만 복귀(정점에서 잠깐 유지)
    const thrust = 1 - (1 - t1) * (1 - t1)    // easeOut — 빠른 시작
    const raise = t2 * t2 * (3 - 2 * t2)      // smoothstep
    const env = 1 - settle
    pose.slvR.x = (-1.5 * thrust - 1.25 * raise) * env  // 전방 수평 → 머리 위
    pose.slvR.y = (-0.2 * thrust + 0.15 * raise) * env
    pose.slvR.z = (-0.45 * thrust + 0.3 * raise) * env
    pose.slvL.x = -0.2 * thrust * env
    pose.slvL.z = 0.1 * thrust * env
  }

  if (action.type === 'guidedMissileThrow') {
    pose.slvR.x = -1.35 * power
    pose.slvR.y = -0.12 * power
    pose.slvR.z = -0.22 * power
    pose.slvL.x = -0.12 * power
    pose.slvL.z = 0.06 * power
  }

  return pose
}
