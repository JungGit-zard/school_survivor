// MiniZombieLayer의 두 훅(pickVariant · propScale)에 2차 신규 좀비 행동 런타임 값을 넘기는 데이터 출처. Level_Mini 소유.
// 몸·포즈·소품 정본(miniZombieRoster / miniZombiePose / MiniZombieLayer)은 threemini 소유라 여기서 고치지 않는다 —
// GameCanvas가 이 두 함수를 MiniZombieLayer props로 넘길 뿐이다.
import { enemySimulationRuntime } from '../lib/refs.js'
import { pickMiniVariant } from './MiniZombieLayer.jsx'

/**
 * 같은 typeCode 안 몸 고르기. E95 긴줄넘기 듀오도 E105 2인3각처럼 짝(behavior partner)의 두 몸이 서로 다른 몸이 된다
 * (낮은 슬롯 = 줄 주인 = 몸 0). 나머지는 MiniZombieLayer 기본 규칙 그대로.
 */
export function novel2PickVariant(pool, index, visualId, count, runtime = enemySimulationRuntime) {
  if (visualId === 'n2-long-rope-duo' && count > 1) {
    const partner = runtime?.novel2?.partnerOf?.(pool, index) ?? -1
    if (partner >= 0) return index < partner ? 0 : 1
  }
  return pickMiniVariant(pool, index, visualId, count, runtime)
}

/**
 * 소품 배율. 'bagScale' = E90 숙제 가방(책마다 +8%, 최대 8권 → 1.64배). 'ballHeld'(E104, 3차)는 아직 행동이 없어 1.
 */
export function novel2PropScale(hook, pool, index, runtime = enemySimulationRuntime) {
  if (hook === 'bagScale') return runtime?.novel2?.bagScale?.(pool, index) ?? 1
  return 1
}
