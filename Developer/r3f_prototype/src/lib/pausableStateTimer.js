// pause를 건너뛰지 않으면서 **저fps에서도 실시간을 따라가는** 상태 타이머.
//
// 고친 결함 1 (soundmini 진단 C):
//   돌진 상태기계는 `stateTimer.current = performance.now()`로 기한을 잡고
//   `performance.now() - stateTimer.current >= warnDuration`으로 만료를 봤다.
//   그런데 Enemy의 useFrame은 `phase !== 'playing'`이면 일찍 return하는 반면
//   **벽시계는 pause 동안에도 계속 흐른다.** 그래서 경고(warn) 도중 일시정지하면
//   재개 첫 프레임에 이미 800ms가 지난 것으로 계산돼, 예고 없이 돌진이 터졌다.
//
// 고친 결함 2 (이 파일의 1차 수정이 만든 회귀):
//   처음에는 상한을 1/30s로 두고 "긴 재개 delta를 잘라" pause를 막았다. 그런데 그건
//   `gameplayFrameTime.js`가 명시한 계약(`MAX_GAMEPLAY_FRAME_DELTA = 0.5`, Rapier와
//   동일)을 정면으로 어겼다. `<Physics timeStep={1/60}>`는 실시간을 따라가는데
//   타이머만 프레임당 33.33ms로 묶이면 **30fps 미만에서 공칭 지속이 늘어난다** —
//   20fps에서 warn 800→1200ms, charge 2200→3300ms, 돌진 거리 +50%. 15fps면 +100%.
//
//   그래서 상한은 레포 계약값(0.5s)으로 되돌리고, pause 보호는 **상한이 아니라
//   "재개 첫 프레임 식별"**로 한다. playing으로 막 전환된 프레임의 delta는 믿을 수
//   없으므로(정지 길이가 그대로 들어온다) 고정 스텝 한 칸으로 치환한다. 그 다음
//   프레임부터는 실제 delta를 0.5s 계약 상한까지 그대로 쓴다.
//
//   측정 방법만 바꾼다. warn 800 / charge 2200 / stun 1200 / 접촉 500 / 격노 1000 /
//   웃음 900은 전부 그대로다.
import { GAMEPLAY_FIXED_STEP, MAX_GAMEPLAY_FRAME_DELTA, clampGameplayFrameDelta } from './gameplayFrameTime.js'

// 게임플레이 프레임 delta 상한은 단일 정본(= Rapier와 같은 0.5s)을 그대로 쓴다.
export const MAX_PAUSABLE_FRAME_DELTA_SEC = MAX_GAMEPLAY_FRAME_DELTA
// 재개 첫 프레임에 인정하는 게임시간. 고정 스텝 한 칸이라 어떤 예고도 삼키지 못한다.
export const RESUME_FRAME_DELTA_SEC = GAMEPLAY_FIXED_STEP

export function getPausableFrameDeltaMs(deltaSeconds) {
  return clampGameplayFrameDelta(deltaSeconds) * 1000
}

// 재개 첫 프레임이면 고정 스텝 한 칸, 그 외에는 계약 상한까지의 실제 delta.
// `resumed`는 호출자가 "이 프레임에 phase가 playing으로 바뀌었다"를 알려주는 플래그다.
export function getGameplayFrameDeltaMs(deltaSeconds, resumed = false) {
  if (resumed) return RESUME_FRAME_DELTA_SEC * 1000
  return getPausableFrameDeltaMs(deltaSeconds)
}

// 상태에 머문 시간을 쌓는다(경과형: warn/charge/stun/격노 윈드업).
export function advancePausableElapsed(elapsedMs, deltaSeconds, resumed = false) {
  return elapsedMs + getGameplayFrameDeltaMs(deltaSeconds, resumed)
}

// 남은 시간을 깎는다(잔량형: 넉백/접촉 쿨다운).
export function consumePausableRemaining(remainingMs, deltaSeconds, resumed = false) {
  return remainingMs - getGameplayFrameDeltaMs(deltaSeconds, resumed)
}
