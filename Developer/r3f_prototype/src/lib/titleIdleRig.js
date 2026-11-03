// 2026-11-04 타이틀 Stage 2 보강(Terry 명시 지시, 타이틀 전용): 타이틀이 캐릭터 내부 파츠(머리·팔·눈)에
// 아주 작은 대기 동작을 "덧얹을" 수 있게 하는 선택적 리그. 메시 컴포넌트는 idleRig prop이 있을 때만 이것을 쓴다.
// 게임플레이와 Graphics Studio는 prop을 넘기지 않으므로 그쪽 동작·값은 그대로다.
//
// 원리(되돌리기 → 원래 애니메이션 → 다시 얹기):
// - 메시의 useFrame 시작에서 지난 프레임에 얹기 전 값으로 되돌린다. 단, 그 값이 그대로일 때만 뺀다.
//   (메시 애니메이션이나 Studio 적용이 그 사이 값을 새로 썼다면 이미 오프셋이 없는 값이므로 건드리지 않는다.)
// - 메시 원래 애니메이션이 평소처럼 돈다.
// - 끝에서 이번 프레임 오프셋을 더한다(scale은 곱한다).
// 그래서 오프셋을 0(곱은 1)으로 두면 다음 프레임에 정확히 원래 값으로 돌아온다. 프레임당 할당 없음.

export const TITLE_IDLE_ROTATION = 'rotation'
export const TITLE_IDLE_POSITION = 'position'
export const TITLE_IDLE_SCALE = 'scale'

// defs: [{ part: 'head', prop: 'rotation', axis: 'y' }, ...]. scale 채널은 곱(1=그대로), 나머지는 합(0=그대로).
export function createTitleIdleRig(defs) {
  return {
    parts: null,
    channels: defs.map(({ part, prop, axis }) => ({
      part,
      prop,
      axis,
      value: prop === TITLE_IDLE_SCALE ? 1 : 0,
      appliedValue: 0,
      baseValue: 0,
      appliedResult: 0,
      live: false,
    })),
  }
}

export function setTitleIdleRigValue(rig, index, value) {
  rig.channels[index].value = value
}

export function undoTitleIdleRig(rig) {
  if (!rig?.parts) return
  const channels = rig.channels
  for (let i = 0; i < channels.length; i += 1) {
    const ch = channels[i]
    if (!ch.live) continue
    ch.live = false
    const target = rig.parts[ch.part]?.[ch.prop]
    if (!target || target[ch.axis] !== ch.appliedResult) continue
    // 빼기/나누기 대신 얹기 직전 값을 그대로 되돌려 부동소수 오차 없이 정확히 원래 값이 된다.
    target[ch.axis] = ch.baseValue
  }
}

export function applyTitleIdleRig(rig) {
  if (!rig?.parts) return
  const channels = rig.channels
  for (let i = 0; i < channels.length; i += 1) {
    const ch = channels[i]
    const target = rig.parts[ch.part]?.[ch.prop]
    if (!target) continue
    ch.baseValue = target[ch.axis]
    if (ch.prop === TITLE_IDLE_SCALE) target[ch.axis] *= ch.value
    else target[ch.axis] += ch.value
    ch.appliedValue = ch.value
    ch.appliedResult = target[ch.axis]
    ch.live = true
  }
}

// 메시 useFrame 본문을 감싸는 도우미: rig가 없으면 본문만 그대로 실행한다.
export function runWithTitleIdleRig(rig, parts, step, state, delta) {
  if (!rig) {
    step(state, delta)
    return
  }
  rig.parts = parts
  undoTitleIdleRig(rig)
  step(state, delta)
  // 이번 프레임의 원래 값(오프셋 없음)을 보고 오프셋을 정해야 하는 채널(로자리 머리 기울기)용.
  if (rig.beforeApply) rig.beforeApply(rig)
  applyTitleIdleRig(rig)
}

// 좀비·보스·도지 공통 채널.
export const TITLE_ZOMBIE_RIG_CHANNELS = [
  { part: 'head', prop: TITLE_IDLE_ROTATION, axis: 'x' },
  { part: 'head', prop: TITLE_IDLE_ROTATION, axis: 'y' },
  { part: 'head', prop: TITLE_IDLE_ROTATION, axis: 'z' },
  { part: 'armL', prop: TITLE_IDLE_ROTATION, axis: 'x' },
  { part: 'armR', prop: TITLE_IDLE_ROTATION, axis: 'x' },
  { part: 'armL', prop: TITLE_IDLE_ROTATION, axis: 'z' },
  { part: 'armR', prop: TITLE_IDLE_ROTATION, axis: 'z' },
]
export const ZOMBIE_RIG = { headX: 0, headY: 1, headZ: 2, armLX: 3, armRX: 4, armLZ: 5, armRZ: 6 }

// 로자리: 머리 파츠(머리·머리카락·눈)는 형제 그룹이라 머리 중심 기준으로 함께 기울인다(z 회전 + 위치 보정).
// 눈 깜빡임은 눈 그룹 scale.y 곱.
export const TITLE_PLAYER_HEAD_PARTS = ['head', 'hairTop', 'hairFr', 'hairSL', 'hairSR', 'hairTail', 'hairClip', 'eyeL', 'eyeR']
export const TITLE_PLAYER_RIG_CHANNELS = [
  { part: 'eyeL', prop: TITLE_IDLE_SCALE, axis: 'y' },
  { part: 'eyeR', prop: TITLE_IDLE_SCALE, axis: 'y' },
  ...TITLE_PLAYER_HEAD_PARTS.flatMap((part) => [
    { part, prop: TITLE_IDLE_ROTATION, axis: 'z' },
    { part, prop: TITLE_IDLE_POSITION, axis: 'x' },
    { part, prop: TITLE_IDLE_POSITION, axis: 'y' },
  ]),
]
export const PLAYER_RIG = { eyeL: 0, eyeR: 1, headPartBase: 2 }

// 로자리 머리 기울기 θ를 머리 그룹 위치(cx, cy)를 중심으로 각 파츠에 나눠 준다(파츠 위치는 실제 값 사용).
// undo 직후(원래 위치) 호출해야 한다.
export function setTitlePlayerHeadTilt(rig, angle) {
  const parts = rig.parts
  const head = parts?.head
  if (!head) return
  const cx = head.position.x
  const cy = head.position.y
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  for (let i = 0; i < TITLE_PLAYER_HEAD_PARTS.length; i += 1) {
    const node = parts[TITLE_PLAYER_HEAD_PARTS[i]]
    const base = PLAYER_RIG.headPartBase + i * 3
    if (!node) {
      rig.channels[base].value = 0
      rig.channels[base + 1].value = 0
      rig.channels[base + 2].value = 0
      continue
    }
    const dx = node.position.x - cx
    const dy = node.position.y - cy
    rig.channels[base].value = angle
    rig.channels[base + 1].value = dx * c - dy * s - dx
    rig.channels[base + 2].value = dx * s + dy * c - dy
  }
}
