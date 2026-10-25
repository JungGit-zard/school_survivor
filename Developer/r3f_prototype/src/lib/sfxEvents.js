// SFX 이벤트 버스. vfxEvents.js와 동일한 pub/sub 패턴.
// 게임플레이 코드는 emitSfx만 호출하고, SfxLayer가 Howler 재생을 책임진다.

const listeners = new Set()
let _sfxId = 0

// 이벤트 형태: { id: 'soundId', volume?: 0~1 }
//
// emitSfx는 절대 throw하지 않는다 — 이것이 오디오와 게임 로직 사이의 안전한 호출 경계다.
// 구독자(SfxLayer → Howler)는 동기로 호출되므로, 예외를 삼키지 않으면 오디오 실패가
// emit 호출 지점 "이후"의 게임 로직을 통째로 건너뛴다. 실제로 걸려 있던 경로:
//   useGameStore.clearStage / clearStageAndStartNext — stageClear emit이 _onRunEnd와
//     resetGame(다음 스테이지)보다 앞이라, throw하면 런 종료 기록·랭킹 제출·스테이지
//     진행이 전부 누락되고 포탈은 clearedRef로 이미 소비돼 재시도도 불가능하다.
//   Enemy.jsx 사망 처리 — bossDeath emit이 recordBossKill/recordBossDefeat보다 앞이라,
//     throw하면 "보스 사망만" 영구 해금(B04→Stage5)이 기록되지 않는다.
//   useGameStore.damagePlayer / killPlayer — playerDeath emit이 _onRunEnd보다 앞이다.
// 즉 muted/autoplay 차단/Howl 생성 실패가 판정과 진행을 제어할 수 있었다. 이 경계가
// 그걸 끊는다. 한 구독자가 실패해도 나머지 구독자는 계속 호출한다.
export function emitSfx(event) {
  const enriched = { ...event, _id: ++_sfxId }
  listeners.forEach((fn) => {
    // 오디오 실패는 조용히 버린다. 여기서 로깅하면 프레임당 수십 번 울리는 타격음이
    // 콘솔을 뒤덮고, 로거 자체가 다시 throw할 수 있다.
    try { fn(enriched) } catch { /* 누락된 소리가 게임을 차단해서는 안 된다. */ }
  })
}

export function subscribeSfx(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
