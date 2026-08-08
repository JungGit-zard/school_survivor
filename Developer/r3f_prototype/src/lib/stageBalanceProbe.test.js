import { describe, it, expect } from 'vitest'
import { runStageBalanceRun, summarizeRuns } from './stageBalanceProbe.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'

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

// ── 초반 XP 스노볼 회귀 가드 (2026-08-08) ────────────────────────────────────
// 예전 곡선(start 4)은 첫 관문이 최약체 E01 한 마리 XP(당시 6)보다 낮아서 "1마리 = 레벨2"였다.
// E01을 대량으로 쏟아붓는 스테이지2에서 첫 레벨업 중앙값이 3.55초까지 내려갔다(스1은 33.75초, 9.5배 격차).
// 임계값은 프로브의 판별 노이즈를 감안해 느슨하게 잡되, 스노볼이 돌아오면 반드시 깨지도록 둔다.
describe('초반 XP 스노볼 회귀 가드', () => {
  const SEEDS = Array.from({ length: 8 }, (_, i) => 101 + i)

  function medianFirstLevelUp(stageId, seeds) {
    const values = seeds
      .map((seed) => runStageBalanceRun({ stageId, seed, maxSec: 240 }).firstLevelUpSec)
      .filter((v) => v !== null)
      .sort((a, b) => a - b)
    if (!values.length) return null
    const mid = Math.floor(values.length / 2)
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
  }

  it('첫 레벨업이 잡몹 한 마리로 터지지 않는다', () => {
    // 곡선 시작값은 최약체 한 마리 XP보다 확실히 커야 한다 — 스노볼의 근본 원인.
    expect(ENEMY_STATS.E01.xp * 2).toBeLessThan(9)
  })

  it('스테이지2 첫 레벨업 중앙값이 6초 이상이고, 스테이지1과의 격차가 5배 이내다', () => {
    const stage2 = medianFirstLevelUp('stage2', SEEDS)
    const stage1 = medianFirstLevelUp('stage1', SEEDS.map((s) => s + 100))
    console.log('[스노볼 가드]', JSON.stringify({ stage2, stage1 }))

    expect(stage2).not.toBeNull()
    expect(stage1).not.toBeNull()
    // 2026-08-09 사용자 지시로 stage2 첫 웨이브 간격을 30s→5s로 당겼다. 오프닝 물량이 5초에
    // 몰리면서 첫 레벨업 중앙값이 20.x초 → 8.3초로 내려갔다. 의도된 스노볼이므로 하한을
    // 6초로 낮춘다 — 잡몹 한 마리로 터지는 수준(≈2초)까지는 여전히 막는다.
    expect(stage2).toBeGreaterThanOrEqual(6)
    // 스테이지1은 앵커다. 너무 빨라져도(스노볼) 너무 늦어져도(전체 둔화) 안 된다.
    expect(stage1).toBeGreaterThanOrEqual(21)
    expect(stage1).toBeLessThanOrEqual(45)
    expect(Math.max(stage1, stage2) / Math.min(stage1, stage2)).toBeLessThanOrEqual(5)
  }, 10 * 60 * 1000)
})
