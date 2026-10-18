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
  stage5: Object.freeze({
    id: 'vending-stage5', stageId: 'stage5', wallSide: 'east',
    position: Object.freeze({ x: 6.25, y: 0, z: -14 }),
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
