// Stage Vending MVP gameplay contract.
// Balance values are provisional until owner-approved tuning lands.
import { EXPANSION_STAGES } from './expansionContent.js'

export const STAGE_VENDING_ITEM_IDS = Object.freeze({
  RECOVERY_DRINK: 'recoveryDrink',
})

export const STAGE_VENDING_INTERACTION_RADIUS_UNITS = 2.25
// Bang_Rules.md unit convention: 1 block = 4 world units.
export const STAGE_VENDING_INTERACTION_RADIUS_BLOCKS = STAGE_VENDING_INTERACTION_RADIUS_UNITS / 4

export const STAGE_VENDING_ITEMS = Object.freeze({
  [STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK]: Object.freeze({
    id: STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK,
    label: 'Recovery Drink',
    priceGold: 5,
    effectType: 'heal',
    healHp: 35,
    // 승인된 기존 규칙(level-result 2026-10-19): 동일 아이템 스테이지당 1회, 퇴장·재시도·다음 스테이지 초기화.
    purchaseLimitPerStage: 1,
    balanceStatus: 'provisional-not-owner-approved',
  }),
})

export const STAGE_VENDING_PLACEMENTS = Object.freeze({
  // Preserve the accepted vending contract on the existing expansion maps.
  ...Object.fromEntries(Object.keys(EXPANSION_STAGES).map(stageId => [stageId, Object.freeze({
    id: `vending-${stageId}`, stageId, wallSide: 'east',
    position: Object.freeze({ x: 6.25, y: 0, z: -14 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  })])),
  // Stage 5 교무실(2026-11-08 스펙 §3-5): 옛 (6.25, −14)는 북벽 복사기(6.0, −13.4)와 겹친다 → L4 앞쪽 끝 동벽.
  // 플레이어 최근접점 (7.36, −10.6)까지 1.19u ≤ 상호작용 반경 2.25u. 몸체는 플레이어 이동 밖(x > 7.36)이라 레인을 막지 않는다.
  // Stage 6 운동장(2026-11-08 스펙 Part C C-9-2): 조회대(−Z) 쪽 옛 확장 공통 위치 대신 서쪽 스탠드 아래 매점.
  // 플레이어 최소 x −10(= −12 + inset 2)에서 0.5u, 상호작용 반경 2.25u 안. stage7~10은 위 공통 위치 그대로.
  stage6: Object.freeze({
    id: 'vending-stage6', stageId: 'stage6', wallSide: 'west',
    position: Object.freeze({ x: -10.5, y: 0, z: 6 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  }),
  stage5: Object.freeze({
    id: 'vending-stage5', stageId: 'stage5', wallSide: 'east',
    position: Object.freeze({ x: 8.55, y: 0, z: -10.6 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  }),

  stage1: Object.freeze({
    id: 'vending-stage1',
    stageId: 'stage1',
    wallSide: 'west',
    position: Object.freeze({ x: -8.5, y: 0, z: -8 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  }),
  stage2: Object.freeze({
    id: 'vending-stage2',
    stageId: 'stage2',
    wallSide: 'west',
    position: Object.freeze({ x: -6.25, y: 0, z: -14 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  }),
  stage3: Object.freeze({
    id: 'vending-stage3',
    stageId: 'stage3',
    wallSide: 'east',
    position: Object.freeze({ x: 6.25, y: 0, z: -14 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  }),
  stage4: Object.freeze({
    id: 'vending-stage4',
    stageId: 'stage4',
    wallSide: 'west',
    // Crate corner blocked the old approach. Keep the visual in the wall gap
    // between the refrigerator and crate without moving existing furniture.
    position: Object.freeze({ x: -8.5, y: 0, z: -12.4 }),
    interactionRadiusUnits: STAGE_VENDING_INTERACTION_RADIUS_UNITS,
    interactionRadiusBlocks: STAGE_VENDING_INTERACTION_RADIUS_BLOCKS,
  }),
})


export function getStageVendingItem(itemId) {
  if (!Object.prototype.hasOwnProperty.call(STAGE_VENDING_ITEMS, itemId)) return null
  return STAGE_VENDING_ITEMS[itemId]
}

// 이번 런(스테이지)에서 해당 아이템을 더 살 수 있는 횟수. 구매 기록은 런 메모리에만 있다.
export function getStageVendingRemainingPurchases(item, purchasedItemIds = []) {
  const limit = Math.max(0, Math.floor(Number(item?.purchaseLimitPerStage ?? 1)) || 0)
  const used = Array.isArray(purchasedItemIds) ? purchasedItemIds.filter((id) => id === item?.id).length : 0
  return Math.max(0, limit - used)
}

export function getStageVendingPlacement(stageId) {
  if (!Object.prototype.hasOwnProperty.call(STAGE_VENDING_PLACEMENTS, stageId)) return null
  return STAGE_VENDING_PLACEMENTS[stageId]
}

export function isWithinStageVendingRange(playerPosition, placement, radius = placement?.interactionRadiusUnits) {
  if (!playerPosition || !placement?.position) return false
  const px = Number(playerPosition.x)
  const pz = Number(playerPosition.z)
  const x = Number(placement.position.x)
  const z = Number(placement.position.z)
  const r = Number(radius)
  if (![px, pz, x, z, r].every(Number.isFinite) || r < 0) return false
  const dx = px - x
  const dz = pz - z
  return (dx * dx + dz * dz) <= (r * r)
}
