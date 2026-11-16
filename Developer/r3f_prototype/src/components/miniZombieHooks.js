// MiniZombieLayer의 두 훅(pickVariant · propScale)에 2차 신규 좀비 행동 런타임 값을 넘기는 데이터 출처. Level_Mini 소유.
// 몸·포즈·소품 정본(miniZombieRoster / miniZombiePose / MiniZombieLayer)은 threemini 소유라 여기서 고치지 않는다 —
// GameCanvas가 이 두 함수를 MiniZombieLayer props로 넘길 뿐이다.
import { enemySimulationRuntime } from '../lib/refs.js'
import { cavalryRiderCapScale } from '../lib/novelZombie2Wave3Visuals.js'
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
 * 소품 배율. 'bagScale' = E90 숙제 가방(책마다 +8%, 최대 8권 → 1.64배).
 * 'ballHeld' = E104 큰 공: 들고 있거나 겨누는 동안 1, 굴러가거나 바닥에 놓였으면 0(손의 공을 숨긴다 — 굴러가는 공은
 * runtime.novel2.ballStateInto(pool, index, out)의 x·z로 따로 그린다. threemini 다음 차례).
 * 'riderCap' = E106 기마전 기수의 운동회 모자(2026-11-17, threemini): 네 몸이 한 변형을 나눠 쓰므로 모자는 머리 loose 소품이고,
 * 행동 런타임 cavalryStateInto의 역할이 말(2)이면 0(숨김), 기수(말 위·낙마)·편대 전이면 1.
 */
export function novel2PropScale(hook, pool, index, runtime = enemySimulationRuntime) {
  if (hook === 'bagScale') return runtime?.novel2?.bagScale?.(pool, index) ?? 1
  if (hook === 'ballHeld') return runtime?.novel2?.ballHeldScale?.(pool, index) ?? 1
  if (hook === 'riderCap') return cavalryRiderCapScale(pool, index, runtime)
  return 1
}
