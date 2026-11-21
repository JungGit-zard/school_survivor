import { describe, expect, it } from 'vitest'
import {
  ESCAPE_BONUS_RATE,
  STAGE_BONUS,
  compareRankingEntries,
  BOSS_BONUS_RATE,
  getBossKillBonus,
  getBossKillBonusFromTotal,
  getEscapeBonus,
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

  // Terry 2026-11-21: 점수는 런 전체 누적 점수 하나. 보스 처치 순간 누적의 20%를 고정 보너스로 더하고,
  // 탈출하면 탈출 순간 누적(보스 보너스 포함)의 15%를 더한다.
  it('applies Terry 2026-11-21 examples: 1000 -> boss 1200 -> escape 1380, escape without boss 1150', () => {
    expect(BOSS_BONUS_RATE).toBe(0.2)
    expect(getBossKillBonusFromTotal(1000)).toBe(200)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 1000, bossBonus: 200 })).toBe(1200)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 1000, cleared: true, bossBonus: 200 })).toBe(1380)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 1000, cleared: true })).toBe(1150)
    expect(getEscapeBonus(1200)).toBe(180)
  })

  it('keeps the boss bonus on a non-cleared run (death, quit, pagehide)', () => {
    const bossBonus = getBossKillBonus({ stageId: 'stage1', survivalSeconds: 192 })
    expect(bossBonus).toBe(38) // floor(192 * 0.2)
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 192, cleared: false, bossBonus })).toBe(230)
  })

  it('never multiplies score earned after the kill by the boss rate', () => {
    // 192초에 처치(보너스 38) 후 240초까지 생존: 240 + 38 = 278. 240의 20%(48)가 아니다.
    const bossBonus = getBossKillBonus({ stageId: 'stage1', survivalSeconds: 192 })
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 240, bossBonus })).toBe(278)
    // 탈출 15%는 탈출 순간 누적(278)에 붙는다: 278 + 41 = 319.
    expect(getRankingScore({ stageId: 'stage1', survivalSeconds: 240, cleared: true, bossBonus })).toBe(319)
  })

  it('treats carried score from earlier stages as part of the running total', () => {
    // 이월 600 + stage2(340초 + 60) = 1000 에서 처치 -> 1200 -> 탈출 1380.
    const bossBonus = getBossKillBonus({ stageId: 'stage2', survivalSeconds: 340, carriedScore: 600 })
    expect(bossBonus).toBe(200)
    expect(getRankingScore({ stageId: 'stage2', survivalSeconds: 340, cleared: true, bossBonus, carriedScore: 600 })).toBe(1380)
  })

  it('agrees with the server reference formula (functions/src/ranking.js expectedScore)', async () => {
    const server = await import('../../functions/src/ranking.js')
    expect(server.SERVER_ESCAPE_BONUS_RATE).toBe(ESCAPE_BONUS_RATE)
    expect(server.BOSS_BONUS_RATE).toBe(BOSS_BONUS_RATE)
    const cases = [
      { stageId: 'stage1', timeSec: 0, cleared: false },
      { stageId: 'stage1', timeSec: 1000, cleared: true },
      { stageId: 'stage1', timeSec: 1000, cleared: true, killSec: 1000 },
      { stageId: 'stage3', timeSec: 245, cleared: false, killSec: 151 },
      { stageId: 'stage4', timeSec: 240, cleared: true, killSec: 200 },
      { stageId: 'stage6', timeSec: 377, cleared: true, killSec: 300, carried: 1789 },
      { stageId: 'stage10', timeSec: 94_608_000, cleared: true, killSec: 94_000_000, carried: 12_345 },
    ]
    for (const { stageId, timeSec, cleared, killSec, carried = 0 } of cases) {
      const bossBonus = killSec == null ? 0 : getBossKillBonus({ stageId, survivalSeconds: killSec, carriedScore: carried })
      const client = getRankingScore({ stageId, survivalSeconds: timeSec, cleared, bossBonus, carriedScore: carried })
      const serverScore = server.expectedScore(stageId, timeSec * 1000, cleared, {
        bossKillTimeMs: killSec == null ? null : killSec * 1000, carriedScore: carried,
      })
      expect(serverScore).toBe(client)
    }
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

  // 2026-11-08: 확장 스테이지(6~10) 보너스는 데이터 scoreStageBonus가 정본이다. 서버 표와 1:1로 같아야 한다.
  it('확장 스테이지 보너스는 데이터 scoreStageBonus이고 서버 SERVER_STAGE_BONUS와 같다', async () => {
    const { EXPANSION_STAGES } = await import('./expansionContent.js')
    const { SERVER_STAGE_BONUS } = await import('../../functions/src/ranking.js')
    for (const stage of Object.values(EXPANSION_STAGES)) expect(STAGE_BONUS[stage.id]).toBe(stage.scoreStageBonus)
    expect(STAGE_BONUS).toEqual(SERVER_STAGE_BONUS)
  })
})
