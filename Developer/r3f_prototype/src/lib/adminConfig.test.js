// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_ADMIN_CONFIG,
  loadAdminConfig,
  normalizeAdminConfig,
  resetAdminConfig,
  saveAdminConfig,
} from './adminConfig.js'

describe('admin operations config', () => {
  beforeEach(() => {
    resetAdminConfig()
  })

  it('loads the default operations config when nothing is saved', () => {
    const config = loadAdminConfig()

    expect(config.balance.stageDurationSec.stage1).toBe(240)
    expect(config.balance.player.speedMultiplier).toBe(1)
    expect(config.operations.cheatMenuButtonVisible).toBe(true)
    expect(config.rankingSeason.scorePolicy.stageBonus.stage2).toBe(60)
    expect(config.rankingSeason.scorePolicy.stageBonus.stage3).toBe(120)
    expect(config.rankingSeason.scorePolicy.stageBonus.stage4).toBe(180)
    expect(config.rankingSeason.rewardTiers).toHaveLength(3)
  })

  it('normalizes unsafe values into the allowed operations range', () => {
    const config = normalizeAdminConfig({
      balance: {
        stageDurationSec: { stage1: 20, stage2: 900 },
        player: { maxHpBonus: -50, speedMultiplier: 9 },
        rewards: { goldMultiplier: -1 },
      },
      operations: {
        cheatMenuButtonVisible: false,
      },
      rankingSeason: {
        seasonId: '',
        status: 'unknown',
        scorePolicy: { stageBonus: { stage2: -20 }, clearBonus: 999 },  // clearBonus는 폐지된 키 - 무시되어야 한다
        rewardTiers: [{ rankTo: 0, gold: -5, badge: '' }],
      },
    })

    expect(config.balance.stageDurationSec.stage1).toBe(120)
    expect(config.balance.stageDurationSec.stage2).toBe(420)
    expect(config.balance.player.maxHpBonus).toBe(0)
    expect(config.balance.player.speedMultiplier).toBe(1.5)
    expect(config.balance.rewards.goldMultiplier).toBe(0)
    expect(config.operations.cheatMenuButtonVisible).toBe(false)
    expect(config.rankingSeason.seasonId).toBe(DEFAULT_ADMIN_CONFIG.rankingSeason.seasonId)
    expect(config.rankingSeason.status).toBe('draft')
    expect(config.rankingSeason.scorePolicy.stageBonus.stage2).toBe(0)
    // stage3/stage4 bonuses fall back to defaults when omitted (admin must not silently zero them).
    expect(config.rankingSeason.scorePolicy.stageBonus.stage3).toBe(120)
    expect(config.rankingSeason.scorePolicy.stageBonus.stage4).toBe(180)
    // 탈출 보너스가 총점의 15%로 바뀌면서 고정 클리어 보너스 노브는 사라졌다.
    // 옛 설정에 남아 있어도 정책에 실려선 안 된다.
    expect(config.rankingSeason.scorePolicy.clearBonus).toBeUndefined()
    expect(config.rankingSeason.rewardTiers[0].rankTo).toBe(1)
  })

  it('keeps saved admin config in runtime memory without browser durable storage', () => {
    saveAdminConfig({
      balance: {
        stageDurationSec: { stage1: 180 },
        player: { maxHpBonus: 20 },
      },
      operations: {
        cheatMenuButtonVisible: false,
      },
      rankingSeason: {
        seasonName: '방학 생존 시즌',
      },
    })

    expect(loadAdminConfig().balance.player.maxHpBonus).toBe(20)
    expect(loadAdminConfig().operations.cheatMenuButtonVisible).toBe(false)
    expect(loadAdminConfig().rankingSeason.seasonName).toBe('방학 생존 시즌')

    resetAdminConfig()
    expect(loadAdminConfig().balance.stageDurationSec.stage1).toBe(240)
  })
})
