// 슬테라 즉시 출현(오너 치트) — Terry 2026-11-08 "내가 보면서 지시할수 있도록 슬테라 즉시 출현버튼을 만들어".
// 켜는 곳: 라이브(배포 빌드)에서는 프로젝트 마스터(Terry 구글 계정)로 로그인했을 때만 타이틀 왼쪽 아래에 뜨는
// 토글(SlteraMasterTitleToggle, 치트 코드 불필요). 개발 빌드에서는 타이틀 치트 메뉴(↑↓↑↓ASD) 안에도 있다.
// 게스트·일반 계정은 배포 빌드에서 토글도 버튼도 보지 못한다(SlteraInstantSpawn.jsx canUseSlteraInstantSpawn).
// 켜져 있으면 S1~S5 런 진행 중 화면에 작은 '슬테라' 버튼(SlteraInstantSpawn.jsx)이 뜨고, 누르면 그 판의
// SlteraEvent가 곧바로 질주를 시작한다(이미 질주 중이면 무시 — lib/slteraEvent.js requestSlteraInstantPassOn).
// 상태는 이 탭의 메모리에만 둔다(새로고침하면 꺼진다). 저장소·서버·랭킹에는 아무것도 쓰지 않는다.
// 타이틀 번들에 게임 코드를 끌어오지 않도록 이 파일은 아무것도 import하지 않는다.

let enabled = false
let target = null
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener()
}

export function isSlteraInstantSpawnEnabled() {
  return enabled
}

export function setSlteraInstantSpawnEnabled(next) {
  const value = next === true
  if (value === enabled) return
  enabled = value
  notify()
}

/** 지금 즉시 출현을 받을 SlteraEvent(S1~S5 런)가 마운트돼 있는가. */
export function hasSlteraInstantSpawnTarget() {
  return target !== null
}

export function subscribeSlteraInstantSpawn(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** SlteraEvent가 판마다 수신기를 건다. 반환 = 해제 함수(다른 수신기가 이미 갈아끼웠으면 건드리지 않는다). */
export function registerSlteraInstantSpawnTarget(receiver) {
  target = receiver
  notify()
  return () => {
    if (target !== receiver) return
    target = null
    notify()
  }
}

/** 즉시 출현 요청. 받아들여지면 true, 수신기가 없거나 이미 질주 중이면 false(무시). */
export function requestSlteraInstantPass() {
  return target ? target() === true : false
}
