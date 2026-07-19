// B04 주방장 보스 2페이즈 상태 판정 (순수 모듈)
// Phase 1(HP 100~50%): 원거리 포격. HP<=50%에서 텔레그래프(격노 윈드업) 후
// Phase 2: 격노 돌진(차저). 전환은 단방향 — 한 번 Phase 2면 복귀 없음.

export const CHEF_PHASE1 = 'phase1'         // 원거리 포격
export const CHEF_TELEGRAPH = 'telegraph'   // 격노 전환 윈드업(이동 정지 + 시각 신호)
export const CHEF_PHASE2 = 'phase2'         // 격노 돌진

// HP 비율 임계치: 이 값 "이하"면 격노 전환 시작.
export const CHEF_ENRAGE_HP_RATIO = 0.5
// 텔레그래프 지속시간(ms). 요구 범위 0.8~1.2s 안.
export const CHEF_TELEGRAPH_MS = 1000

// 현재 상태 + HP 비율 + 텔레그래프 경과시간으로 다음 상태를 결정한다.
// 단방향: phase2에 도달하면 hpRatio가 무엇이든 phase2 유지.
export function advanceChefBossPhase(state, { hpRatio = 1, telegraphElapsedMs = 0 } = {}) {
  if (state === CHEF_PHASE2) return CHEF_PHASE2
  if (state === CHEF_TELEGRAPH) {
    return telegraphElapsedMs >= CHEF_TELEGRAPH_MS ? CHEF_PHASE2 : CHEF_TELEGRAPH
  }
  // phase1
  if (hpRatio <= CHEF_ENRAGE_HP_RATIO) return CHEF_TELEGRAPH
  return CHEF_PHASE1
}

export function isChefTelegraph(state) {
  return state === CHEF_TELEGRAPH
}

// 격노 진입(텔레그래프 포함) 이후인지.
export function isChefEnraged(state) {
  return state === CHEF_TELEGRAPH || state === CHEF_PHASE2
}

// 페이즈에 따른 실효 스탯. phase2면 차저 블록, 그 외(phase1/telegraph)는 포격 블록을 병합한다.
// chefBoss가 아닌 스탯은 그대로 반환해 다른 적 거동에 영향을 주지 않는다.
export function resolveChefBossActiveStats(stats, state) {
  if (!stats?.chefBoss) return stats
  if (state === CHEF_PHASE2) return { ...stats, ...stats.chefPhase2 }
  return { ...stats, ...stats.chefPhase1 }
}
