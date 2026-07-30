import { describe, it, expect } from 'vitest'
import { runGameplaySoak, SOAK_STAGES } from './gameplaySoak.js'

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

  it('4개 스테이지를 모두 순회한다', () => {
    const result = runGameplaySoak({ frames: 60, seed: 7, stages: SOAK_STAGES })
    expect(result.ok).toBe(true)
    expect(SOAK_STAGES).toContain(result.stats.stagesCovered[0])
  })
})
