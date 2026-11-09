import { describe, it, expect } from 'vitest'
import { runGameplaySoak, runSoakScenario, SOAK_RUN_SECONDS, SOAK_SCENARIOS, SOAK_STAGES } from './gameplaySoak.js'

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

  // Stage 5 교무실 수용 시나리오(스펙 Part B §14-3). 기본은 시드 1 한 판, 수용 판정은
  //   SOAK_SCENARIO_SEEDS=1,2,...,36 npx vitest run src/lib/gameplaySoak.test.js -t stage5-full-run
  const SCENARIO_SEEDS = (process.env.SOAK_SCENARIO_SEEDS ?? '1').split(',').map((value) => Number(value.trim()))
  for (const seed of SCENARIO_SEEDS) {
    it(`stage5-full-run · seed ${seed} · 자연 밀도 0~${SOAK_RUN_SECONDS}초에서 크래시·스턱·상한 초과가 없다`, () => {
      expect(SOAK_SCENARIOS['stage5-full-run'].stages).toEqual(['stage5'])
      const result = runSoakScenario('stage5-full-run', { seed })
      console.log(`[soak:stage5-full-run:${seed}]`, JSON.stringify(result.stats))
      expect(result.failure, JSON.stringify(result.failure)).toBeNull()
      expect(result.ok).toBe(true)
      expect(result.stats.stagesCovered).toEqual(['stage5'])
      expect(result.stats.runs).toBe(1)
      expect(result.stats.saturationRuns).toBe(0)
      expect(result.stats.spawns).toBeGreaterThan(0)
      expect(result.stats.kills).toBeGreaterThan(0)
      expect(result.stats.errorEvents).toBe(0)
      expect(result.stats.maxActive).toBeLessThanOrEqual(150)
      // 보스 구간 잡몹 유지 4 tick + 전교 호출 3 tick = 반복 descriptor 4건 × tick이 실제로 돈다.
      expect(result.stats.repeatBurstTicks).toBeGreaterThan(0)
      // 12초 게이트라 사수가 실제로 쏜다.
      expect(result.stats.rangedFires).toBeGreaterThan(0)
      // 전교 호출 3회(73·133·193)가 레인 양끝 펄스로 나온다(회당 5펄스 × 2기 = 10기, 천장에 잘린 만큼만 적다).
      expect(result.stats.callLaneTicks).toBe(6)
      expect(result.stats.callLanePulses).toBe(15)
      expect(result.stats.callLaneAdmitted).toBeGreaterThan(0)
      // 가상 B10: 소집 85/50/25% 3회 + 패턴 공격이 실제로 돈다.
      expect(result.stats.virtualBosses).toBe(1)
      expect(result.stats.bossSummons).toBe(3)
      expect(result.stats.bossAttacks).toBeGreaterThan(0)
    }, 10 * 60 * 1000)
  }

  // Stage 6 운동장 수용 시나리오(스펙 Part C C-14-3). 기본은 시드 1 한 판, 수용 판정은
  //   SOAK_SCENARIO_SEEDS=1,2,...,72 npx vitest run src/lib/gameplaySoak.test.js -t stage6-default
  // 2026-11-08 수용 기준 변경(Advisor 승인): 훈화 고리 수용은 "건너뛴 고리 < 10%"(시드 묶음 전체)로 본다.
  //   인증 시도 실패율은 재시도까지 세어 부풀고(소크의 무작위 이동 플레이어가 E20 고리·B05 패턴 경고 안에 서 있으면
  //   탈출 인증이 정당하게 거부한다), 플레이어가 겪는 결과는 "고리가 나왔는가"이기 때문이다. 시도 실패율은 정보로만 남긴다.
  //   게임 동작은 바뀌지 않는다.
  const speechTotals = { seeds: 0, attempts: 0, certFailures: 0, emitted: 0, skipped: 0 }
  for (const seed of SCENARIO_SEEDS) {
    it(`stage6-default · seed ${seed} · 0~${SOAK_RUN_SECONDS}초 크래시 0·동시 적 ≤150·훈화 고리 8개 처리`, () => {
      expect(SOAK_SCENARIOS['stage6-default'].stages).toEqual(['stage6'])
      const result = runSoakScenario('stage6-default', { seed })
      console.log(`[soak:stage6-default:${seed}]`, JSON.stringify(result.stats))
      expect(result.failure, JSON.stringify(result.failure)).toBeNull()
      expect(result.ok).toBe(true)
      expect(result.stats.stagesCovered).toEqual(['stage6'])
      expect(result.stats.errorEvents).toBe(0)
      expect(result.stats.maxActive).toBeLessThanOrEqual(150)
      expect(result.stats.spawns).toBeGreaterThan(0)
      // 훈화 고리 4회차 × 2고리 = 8고리가 전부 처리된다(발신 또는 재시도 4회 뒤 건너뜀).
      expect(result.stats.speechEmitted + result.stats.speechSkipped).toBe(8)
      speechTotals.seeds += 1
      speechTotals.attempts += result.stats.speechAttempts
      speechTotals.certFailures += result.stats.speechCertFailures
      speechTotals.emitted += result.stats.speechEmitted
      speechTotals.skipped += result.stats.speechSkipped
      // 가상 B05: 운동장 10바퀴 소환이 실제로 돈다.
      expect(result.stats.virtualBosses).toBe(1)
      expect(result.stats.bossSummons).toBeGreaterThan(0)
    }, 10 * 60 * 1000)
  }

  // 수용 판정(SOAK_ACCEPTANCE=1): 위 시드 묶음 전체에서 건너뛴 훈화 고리 < 10%. 인증 시도 실패율은 정보로만 출력한다.
  it('stage6-default · 시드 묶음 전체 훈화 고리 건너뜀 < 10%(수용 측정), 인증 시도 실패율은 정보', () => {
    const rings = speechTotals.emitted + speechTotals.skipped
    const skipRate = speechTotals.skipped / Math.max(1, rings)
    const attemptFailureRate = speechTotals.certFailures / Math.max(1, speechTotals.attempts)
    console.log('[soak:stage6-default:speech]', JSON.stringify({ ...speechTotals, skipRate, attemptFailureRate }))
    expect(speechTotals.seeds).toBe(SCENARIO_SEEDS.length)
    expect(rings).toBe(8 * SCENARIO_SEEDS.length)
    if (process.env.SOAK_ACCEPTANCE === '1') expect(skipRate).toBeLessThan(0.1)
  })
})
