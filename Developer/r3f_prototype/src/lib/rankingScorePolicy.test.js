import { describe, expect, it } from 'vitest'
import {
  ESCAPE_BONUS_RATE,
  STAGE_BONUS,
  compareRankingEntries,
  getBossClearBonus,
  getRankingScore,
  getRankingScorePolicy,
  getStagePriority,
} from './rankingScorePolicy.js'

describe('ranking score policy', () => {
  it('scores survival seconds with stage and escape bonuses', () => {
    expect(STAGE_BONUS.stage1).toBe(0)
    expect(STAGE_BONUS.stage2).toBe(60)
    expect(STAGE_BONUS.stage3).toBe(120)
    expect(STAGE_BONUS.stage4).toBe(180)
    expect(ESCAPE_BONUS_RATE).toBe(0.15)

    // 탈출 보너스는 고정 점수가 아니라 (생존 초 + 스테이지 보너스)의 15%다.
    // 오래 버틸수록 탈출의 가치도 같이 커져야 "더 버틸까 / 지금 나갈까"가 저울질이 된다.
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 180, cleared: false })).toBe(180)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 240, cleared: true })).toBe(276) // 240 + 36
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 180, cleared: false })).toBe(240)
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 240, cleared: true })).toBe(345) // 300 + 45
    expect(getRankingScore({ stageId: 'stage3', survivalSeconds: 180, cleared: false })).toBe(300)
    expect(getRankingScore({ stageId: 'stage3', survivalSeconds: 240, cleared: true })).toBe(414) // 360 + 54
    expect(getRankingScore({ stageId: 'stage4', survivalSeconds: 180, cleared: false })).toBe(360)
    expect(getRankingScore({ stageId: 'stage4', survivalSeconds: 240, cleared: true })).toBe(483) // 420 + 63
  })

  it('records arbitrarily long runs without any ceiling', () => {
    // 무한모드 경합이 핵심 컨텐츠다. 100시간이든 3년이든 버틴 그대로 점수가 나와야 한다.
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 360_000, cleared: false })).toBe(360_000)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 360_000, cleared: true })).toBe(414_000)
    const threeYearsSec = 94_608_000
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: threeYearsSec, cleared: false })).toBe(threeYearsSec)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: threeYearsSec, cleared: true })).toBe(108_799_200)
    // 정수 정밀도가 살아 있어야 한다 - 여기서 깨지면 기록이 소리 없이 틀어진다.
    expect(Number.isSafeInteger(getRankingScore({ stageId: 'stage4', survivalSeconds: threeYearsSec, cleared: true }))).toBe(true)
  })

  it('exposes monotonically increasing stage priority through stage4', () => {
    expect(getStagePriority('stage1')).toBe(1)
    expect(getStagePriority('stage2')).toBe(2)
    expect(getStagePriority('stage3')).toBe(3)
    expect(getStagePriority('stage4')).toBe(4)
  })

  it('includes the boss-clear bonus only after a portal clear', () => {
    const prePortalBonus = getBossClearBonus({
      stageId: 'stage1', survivalSeconds: 192, cleared: false, bossDefeated: true,
    })
    const portalBonus = getBossClearBonus({
      stageId: 'stage1', survivalSeconds: 240, cleared: true, bossDefeated: true,
    })

    expect(prePortalBonus).toBe(0)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 192, cleared: false, bossBonus: 44 })).toBe(192)
    // base 240 + 탈출 15%(36) = 276, 그 20% = 55. 두 보너스는 순차 적용된다.
    expect(portalBonus).toBe(55)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 240, cleared: true, bossBonus: portalBonus })).toBe(331)
  })

  it('breaks equal score/clear/survival ties by higher stage priority (stage4 > stage1)', () => {
    const rows = [
      { displayName: '초급', score: 300, stageId: 'stage1', survivalSeconds: 200, cleared: false, kills: 50 },
      { displayName: '고급', score: 300, stageId: 'stage4', survivalSeconds: 200, cleared: false, kills: 50 },
    ].sort(compareRankingEntries)

    expect(rows.map((row) => row.displayName)).toEqual(['고급', '초급'])
  })

  it('sorts ties by clear, stage, survival, kills, achieved time, then nickname', () => {
    const rows = [
      { displayName: '하린', score: 270, stageId: 'stage1', survivalSeconds: 240, cleared: true, kills: 80, submittedAt: '2026-06-21T09:00:00.000Z' },
      { displayName: '민수', score: 270, stageId: 'stage2', survivalSeconds: 210, cleared: false, kills: 100, submittedAt: '2026-06-21T08:00:00.000Z' },
      { displayName: '지안', score: 270, stageId: 'stage1', survivalSeconds: 240, cleared: true, kills: 120, submittedAt: '2026-06-21T10:00:00.000Z' },
    ].sort(compareRankingEntries)

    expect(rows.map((row) => row.displayName)).toEqual(['지안', '하린', '민수'])
  })

  it('can score runs with an admin-configured ranking season policy', () => {
    const policy = getRankingScorePolicy({
      scorePolicy: {
        stageBonus: { stage1: 0, stage2: 90 },
      },
    })

    expect(policy.stageBonus.stage2).toBe(90)
    // 240 + 90 = 330, 탈출 보너스 15% = 49
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 240, cleared: true }, policy)).toBe(379)
  })
})
