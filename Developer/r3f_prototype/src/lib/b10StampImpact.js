// Stage 5 보스 B10 교감 좀비 「결재 도장」(b10_p1) 타격 순간 화면 도장 자국 신호(2026-11-22 Terry).
// 비주얼 전용 — 피해·타이밍·판정 범위는 expansionAttackRuntime이 정하고, 여기서는 읽기만 한다.
// "타격 순간" = 스냅샷이 windup → active로 넘어간 첫 프레임. 피해 판정(advanceSnapshotPhase)과
// 바닥 "決" 데칼(expansionTelegraphs activeOpacity)과 도장 SFX(B10_SFX.b10_p1)가 모두 이 프레임에 일어난다.
// windup(노란 경고 원)에서는 절대 신호를 내지 않는다.
export const B10_STAMP_IMPACT_PATTERN_ID = 'b10_p1'

const listeners = new Set()
let version = 0

export function subscribeB10StampImpact(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function publishB10StampImpact(gameKey) {
  version += 1
  const event = { version, gameKey }
  for (const listener of [...listeners]) {
    try { listener(event) } catch { /* 연출은 선택 사항 — 게임 루프를 절대 멈추지 않는다 */ }
  }
  return event
}

export function createB10StampImpactTracker() {
  return { lastAttackId: null }
}

// 매 프레임 Enemy.jsx가 보스 스냅샷을 넘긴다. 이번 공격(attackId)이 처음 active가 된 프레임에만 true + 발행.
export function stepB10StampImpact(tracker, snapshot, gameKey) {
  if (!tracker || !snapshot) return false
  if (snapshot.patternId !== B10_STAMP_IMPACT_PATTERN_ID || snapshot.phase !== 'active') return false
  if (tracker.lastAttackId === snapshot.attackId) return false
  tracker.lastAttackId = snapshot.attackId
  publishB10StampImpact(gameKey)
  return true
}
