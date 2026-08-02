import { describe, it, expect } from 'vitest'
import { runStageBalanceRun, summarizeRuns } from './stageBalanceProbe.js'

// 측정 전용. 판정 임계값은 밸런스 목표라 CI를 깨지 않도록 느슨하게만 잡고,
// 실제 수치는 콘솔로 출력해 보고에 사용한다.
const SEEDS = Array.from({ length: 10 }, (_, i) => 101 + i)

// 변경 전 정본 수치 — 같은 하네스로 A/B를 비교하기 위한 기준선.
const BEFORE_WEAPON = { damage: 1.5, cooldown: 550, pierce: 1 }
const BEFORE_COLLECT_RADIUS_SQ = 0.38 * 0.38

describe('스테이지 초반 밸런스 측정', () => {
  it('stage2 변경 전 기준선 10판', () => {
    const runs = SEEDS.map((seed) => ({
      seed,
      ...runStageBalanceRun({
        stageId: 'stage2', seed, maxSec: 240,
        weaponOverride: BEFORE_WEAPON, collectRadiusSq: BEFORE_COLLECT_RADIUS_SQ,
      }),
    }))
    for (const r of runs) console.log('[stage2-before]', JSON.stringify(r))
    console.log('[stage2-before 요약]', JSON.stringify(summarizeRuns(runs)))
    expect(runs).toHaveLength(10)
  }, 10 * 60 * 1000)

  it('stage2 10판', () => {
    const runs = SEEDS.map((seed) => ({ seed, ...runStageBalanceRun({ stageId: 'stage2', seed, maxSec: 240 }) }))
    for (const r of runs) console.log('[stage2]', JSON.stringify(r))
    const s = summarizeRuns(runs)
    console.log('[stage2 요약]', JSON.stringify(s))
    expect(runs).toHaveLength(10)
  }, 10 * 60 * 1000)

  it('stage1 회귀 3판', () => {
    const runs = [201, 202, 203].map((seed) => ({ seed, ...runStageBalanceRun({ stageId: 'stage1', seed, maxSec: 240 }) }))
    for (const r of runs) console.log('[stage1]', JSON.stringify(r))
    console.log('[stage1 요약]', JSON.stringify(summarizeRuns(runs)))
    expect(runs).toHaveLength(3)
  }, 10 * 60 * 1000)
})
