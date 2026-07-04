// 이동 키 상태 트래커 — drei KeyboardControls 대체.
// 교체 이유: 키를 누른 채 창 포커스를 잃으면(알트탭·자리비움 자동일시정지) keyup이
// 다른 창에서 발생해 키 상태가 눌림으로 고착 → 복귀 후 캐릭터가 6시 방향 등으로
// 영구 자동 이동하는 버그. blur/visibilitychange에서 전 키 리셋으로 원천 차단.
const MOVE_KEY_CODES = {
  KeyW: 'up',    ArrowUp: 'up',
  KeyS: 'down',  ArrowDown: 'down',
  KeyA: 'left',  ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
}

export const moveKeys = { up: false, down: false, left: false, right: false }

export function resetMoveKeys() {
  moveKeys.up = false
  moveKeys.down = false
  moveKeys.left = false
  moveKeys.right = false
}

// code → 키 상태 반영. 이동 키였으면 true 반환.
export function applyMoveKey(code, pressed) {
  const name = MOVE_KEY_CODES[code]
  if (!name) return false
  moveKeys[name] = pressed
  return true
}

export function initKeyboardInput() {
  const onKeyDown = (e) => { applyMoveKey(e.code, true) }
  const onKeyUp = (e) => { applyMoveKey(e.code, false) }
  const onVisibility = () => { if (document.hidden) resetMoveKeys() }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', resetMoveKeys)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', resetMoveKeys)
    document.removeEventListener('visibilitychange', onVisibility)
    resetMoveKeys()
  }
}
