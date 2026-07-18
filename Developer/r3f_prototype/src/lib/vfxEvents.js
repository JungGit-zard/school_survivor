// VFX 이벤트 큐. 게임플레이 컴포넌트는 emitVfx만 호출하고, VFXLayer가 렌더와 정리를 책임진다.
// 근거: Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md §4-2

const listeners = new Set()
let _vfxId = 0

// 이벤트 형태:
//   { type: 'hitSpark' | 'chargeWarningLine' | 'pickupPop' | ..., x, z, ...payload }
// emit이 자동으로 id, startMs를 채워 넣는다.
export function emitVfx(event) {
  const enriched = { ...event, id: ++_vfxId, startMs: performance.now() }
  listeners.forEach((fn) => fn(enriched))
}

export function subscribeVfx(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
