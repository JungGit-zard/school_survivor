// Terry 2026-11-15: 이누콘이 주인공 대신 맞을 때(가드) 아주 깔끔한 가드 이펙트를 띄운다.
// store(damagePlayer)가 가드마다 inuconBark emit과 같은 자리에서 triggerInuconGuard를 부르고,
// Inucon.jsx가 구독해 이펙트를 그린다. 짖음 소리의 간격 조절은 sfxRegistry 쿨다운이 맡는다.

const listeners = new Set()

// 가드 1회를 구독자에게 알린다. 구독자 예외는 삼킨다(이펙트 실패가 피해 판정을 막으면 안 된다).
export function triggerInuconGuard() {
  listeners.forEach((fn) => {
    try { fn() } catch { /* 이펙트 실패는 조용히 버린다. */ }
  })
}

export function subscribeInuconGuard(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
