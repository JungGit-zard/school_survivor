import { describe, it, expect } from 'vitest'
import { runGameplaySoak, SOAK_RUN_SECONDS, SOAK_STAGES } from './gameplaySoak.js'

// 기본 12,000프레임(=200초, 풀 포화 구간 포함)은 기본 `npm test`에서 회귀를 잡을 최소선이다.
// 5만 프레임 이상 장시간 소크는 SOAK_FRAMES 환경변수로 올린다.
//   SOAK_FRAMES=60000 SOAK_SEEDS=1,2,3 npx vitest run src/lib/gameplaySoak.test.js
const FRAMES = Number(process.env.SOAK_FRAMES ?? 12000)
const SEEDS = (process.env.SOAK_SEEDS ?? '1').split(',').map((value) => Number(value.trim()))

describe('인게임 플레이 소크', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} · ${FRAMES} 프레임 동안 불변식을 유지한다`, () => {
      const result = runGameplaySoak({ frames: FRAMES, seed })
      // QA 하네스이므로 실행 통계를 항상 남긴다(어떤 경로가 얼마나 돌았는지 확인용).
      console.log('[soak]', JSON.stringify(result.stats))
      expect(result.failure, JSON.stringify(result.failure)).toBeNull()
      expect(result.ok).toBe(true)
      expect(result.frames).toBe(FRAMES)
      // 실제로 몬스터·무기·이동·리스폰이 돌았는지 확인한다(빈 루프 통과 방지).
      expect(result.stats.spawns).toBeGreaterThan(0)
      expect(result.stats.hits).toBeGreaterThan(0)
      expect(result.stats.kills).toBeGreaterThan(0)
      expect(result.stats.errorEvents).toBe(0)
      expect(result.stats.playerDamageEvents).toBeGreaterThan(0)
      // 누수 카나리아: 고정 크기 풀만 쓰므로 프레임 수와 무관하게 힙이 크게 늘면 안 된다.
      expect(result.stats.heapGrowthMb).toBeLessThan(96)
    }, 30 * 60 * 1000)
  }

  // 출시 스테이지 1~5를 각각 0~300초 두 런(포화 런 → 실제 웨이브만 쓰는 자연 런) 끝까지 돌린다.
  // 포화 런은 필드가 동시 천장(150)에 붙은 채 탈출구 개방(210초) 뒤 오버타임 증원(240·270초)과
  // 반복 버스트 증가분이 천장에 잘리는 경로를, 자연 런은 실제 밀도에서 같은 경로를 지난다.
  // Stage 2 런좀비(RZT/RZG)처럼 장애물 통과 타입이 나오는 구간도 여기서 매번 확인한다.
  const STAGE_SEED = Number(process.env.SOAK_STAGE_SEED ?? 1)
  for (const stageId of SOAK_STAGES) {
    it(`${stageId} · 0~${SOAK_RUN_SECONDS}초 포화+자연 두 런, 탈출 후 증원 경로에서 불변식을 유지한다`, () => {
      const result = runGameplaySoak({
        frames: Math.round(SOAK_RUN_SECONDS * 60) * 2, seed: STAGE_SEED, stages: [stageId], saturateRuns: 'odd',
      })
      console.log(`[soak:${stageId}]`, JSON.stringify(result.stats))
      expect(result.failure, JSON.stringify(result.failure)).toBeNull()
      expect(result.stats.stagesCovered).toEqual([stageId])
      expect(result.stats.runs).toBe(2)
      expect(result.stats.saturationRuns).toBe(1)
      expect(result.stats.spawns).toBeGreaterThan(0)
      expect(result.stats.kills).toBeGreaterThan(0)
      expect(result.stats.errorEvents).toBe(0)
      // 탈출 후 오버타임 증원이 실제로 회차를 넘기며 늘어났는지(빈 경로 통과 방지).
      expect(result.stats.overtimeTicks).toBeGreaterThanOrEqual(4)
      expect(result.stats.overtimeMaxRequested).toBeGreaterThan(30)
      // 포화 상태라 적어도 한 번은 동시 천장으로 잘려야 한다.
      expect(result.stats.capClampedRequests).toBeGreaterThan(0)
      expect(result.stats.maxActive).toBeLessThanOrEqual(150)
    }, 10 * 60 * 1000)
  }

  it('5개 출시 스테이지를 모두 순회한다', () => {
    expect(SOAK_STAGES).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])
    const result = runGameplaySoak({ frames: 60, seed: 7, stages: SOAK_STAGES })
    expect(result.ok).toBe(true)
    expect(SOAK_STAGES).toContain(result.stats.stagesCovered[0])
  })
})
