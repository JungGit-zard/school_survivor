// 슬테라 레이서(SlteraRunOverlay)가 열려 있는 동안 게임 Canvas 렌더를 멈추기 위한 작은 플래그.
// 레이서 iframe이 자기 WebGL 컨텍스트를 쓰므로, 폰에서 WebGL 두 개가 동시에 돌지 않게 한다.
let open = false
const listeners = new Set()

export function isRacerOverlayOpen() {
  return open
}

export function setRacerOverlayOpen(next) {
  const value = Boolean(next)
  if (value === open) return
  open = value
  for (const listener of [...listeners]) listener()
}

export function subscribeRacerOverlay(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
