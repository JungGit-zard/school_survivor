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

  it('Stage 5 교무실 자판기는 북벽 복사기를 피해 동벽 (8.55, −10.6)에 있고 레인 4 앞끝에서 닿는다', () => {
    const placement = getStageVendingPlacement('stage5')
    expect(placement).toMatchObject({ id: 'vending-stage5', wallSide: 'east', position: { x: 8.55, y: 0, z: -10.6 } })
    // 플레이어 이동 한계 x 7.36(= 9.36 − inset 2)에서 1.19u ≤ 반경 2.25u.
    const nearest = { x: 9.36 - 2, z: -10.6 }
    expect(isWithinStageVendingRange(nearest, placement)).toBe(true)
    // 몸체는 플레이어 이동 밖이라 레인을 막지 않는다.
    expect(placement.position.x).toBeGreaterThan(nearest.x)
    // 옛 위치(6.25, −14)는 복사기(6.0, −13.4) 원점과 0.65u — 겹쳐서 옮겼다.
    expect(Math.hypot(placement.position.x - 6.0, placement.position.z + 13.4)).toBeGreaterThan(2)
  })

  it('Stage 6 운동장 자판기는 서쪽 스탠드 아래 (−10.5, 6), stage7~10은 확장 공통 (6.25, −14) 그대로', () => {
    const s6 = getStageVendingPlacement('stage6')
    expect(s6).toMatchObject({ id: 'vending-stage6', wallSide: 'west', position: { x: -10.5, y: 0, z: 6 } })
    expect(isWithinStageVendingRange({ x: -10, z: 6 }, s6)).toBe(true)
    for (const id of ['stage7', 'stage8', 'stage9', 'stage10']) expect(getStageVendingPlacement(id).position).toMatchObject({ x: 6.25, z: -14 })
  })
})
