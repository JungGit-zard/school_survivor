import { describe, expect, it } from 'vitest'
import { STAGE_CONFIGS } from './stageConfig.js'

import {
  STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  STAGE_VENDING_INTERACTION_RADIUS_UNITS,
  STAGE_VENDING_ITEM_IDS,
  STAGE_VENDING_PLACEMENTS,
  getStageVendingItem,
  getStageVendingPlacement,
  isWithinStageVendingRange,
} from './stageVending.js'

describe('stageVending gameplay contract', () => {
  it('현재 플레이 가능 스테이지마다 벽면 접근형 자판기 배치를 1개씩 노출한다', () => {
    expect(Object.keys(STAGE_VENDING_PLACEMENTS).sort()).toEqual(Object.keys(STAGE_CONFIGS).sort())

    for (const stageId of Object.keys(STAGE_CONFIGS)) {
      const placement = getStageVendingPlacement(stageId)
      expect(placement).toMatchObject({ stageId, id: `vending-${stageId}` })
      expect(Number.isFinite(placement.position.x)).toBe(true)
      expect(Number.isFinite(placement.position.z)).toBe(true)
      expect(placement.wallSide).toMatch(/west|east|north|south/)
    }
  })

  it('MVP 회복 음료 가격/회복량과 상호작용 반경을 단일 API로 노출한다', () => {
    const drink = getStageVendingItem(STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK)

    expect(drink).toMatchObject({
      id: 'recoveryDrink',
      effectType: 'heal',
      priceGold: 5,
      healHp: 35,
    })
    expect(STAGE_VENDING_INTERACTION_RADIUS_UNITS).toBe(2.25)
    expect(STAGE_VENDING_INTERACTION_RADIUS_BLOCKS).toBe(0.5625)
    expect(getStageVendingItem('bad-item')).toBeNull()
  })

  it('프로토타입 키를 자판기 아이템/배치로 오인하지 않는다', () => {
    expect(getStageVendingItem('toString')).toBeNull()
    expect(getStageVendingPlacement('constructor')).toBeNull()
  })

  it('XZ 평면 거리로 상호작용 가능 여부를 판정한다', () => {
    const placement = getStageVendingPlacement('stage1')

    expect(isWithinStageVendingRange({ x: placement.position.x, z: placement.position.z }, placement)).toBe(true)
    expect(isWithinStageVendingRange({ x: placement.position.x + 2.25, z: placement.position.z }, placement)).toBe(true)
    expect(isWithinStageVendingRange({ x: placement.position.x + 2.26, z: placement.position.z }, placement)).toBe(false)
  })
})
