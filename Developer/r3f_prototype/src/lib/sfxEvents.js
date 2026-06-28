// SFX 이벤트 버스. vfxEvents.js와 동일한 pub/sub 패턴.
// 게임플레이 코드는 emitSfx만 호출하고, SfxLayer가 Howler 재생을 책임진다.

const listeners = new Set()
let _sfxId = 0

// 이벤트 형태: { id: 'soundId', volume?: 0~1 }
export function emitSfx(event) {
  const enriched = { ...event, _id: ++_sfxId }
  listeners.forEach((fn) => fn(enriched))
}

export function subscribeSfx(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
