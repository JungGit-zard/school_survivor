import { describe, expect, it } from 'vitest'
import {
  CLEAR_BONUS,
  STAGE_BONUS,
  compareRankingEntries,
  getRankingScore,
  getRankingScorePolicy,
  getStagePriority,
} from './rankingScorePolicy.js'

describe('ranking score policy', () => {
  it('scores survival seconds with stage and clear bonuses', () => {
    expect(STAGE_BONUS.stage1).toBe(0)
    expect(STAGE_BONUS.stage2).toBe(60)
    expect(STAGE_BONUS.stage3).toBe(120)
    expect(STAGE_BONUS.stage4).toBe(180)
    expect(CLEAR_BONUS).toBe(30)

    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 180, cleared: false })).toBe(180)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 240, cleared: true })).toBe(270)
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 180, cleared: false })).toBe(240)
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 240, cleared: true })).toBe(330)
    // stage3: survival + 120 (+30 clear)
    expect(getRankingScore({ stageId: 'stage3', survivalSeconds: 180, cleared: false })).toBe(300)
    expect(getRankingScore({ stageId: 'stage3', survivalSeconds: 240, cleared: true })).toBe(390)
    // stage4: survival + 180 (+30 clear)
    expect(getRankingScore({ stageId: 'stage4', survivalSeconds: 180, cleared: false })).toBe(360)
    expect(getRankingScore({ stageId: 'stage4', survivalSeconds: 240, cleared: true })).toBe(450)
  })

  it('exposes monotonically increasing stage priority through stage4', () => {
    expect(getStagePriority('stage1')).toBe(1)
    expect(getStagePriority('stage2')).toBe(2)
    expect(getStagePriority('stage3')).toBe(3)
    expect(getStagePriority('stage4')).toBe(4)
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
        clearBonus: 45,
      },
    })

    expect(policy.stageBonus.stage2).toBe(90)
    expect(policy.clearBonus).toBe(45)
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 240, cleared: true }, policy)).toBe(375)
  })
})
