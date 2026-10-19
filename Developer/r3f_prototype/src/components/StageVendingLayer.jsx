import React from 'react'
import StageVendingMachine from './StageVendingMachine.jsx'
import { STAGE_VENDING_ITEM_IDS, getStageVendingPlacement } from '../lib/stageVending.js'
import { useGameStore } from '../store/useGameStore.js'

const WALL_ROTATION_Y = Object.freeze({
  north: 0,
  south: Math.PI,
  west: Math.PI / 9,
  east: -Math.PI / 12,
})

function placementToVector(placement) {
  return [placement.position.x, placement.position.y ?? 0, placement.position.z]
}

export function getStageVendingMachineTransform(stageId) {
  const placement = getStageVendingPlacement(stageId)
  if (!placement) return null
  return {
    id: placement.id,
    position: placementToVector(placement),
    rotation: [0, WALL_ROTATION_Y[placement.wallSide] ?? 0, 0],
  }
}

export default function StageVendingLayer({ stageId = 'stage1' }) {
  const purchasedItemIds = useGameStore((state) => state.stageVendingPurchasedItemIds)
  const transform = getStageVendingMachineTransform(stageId)
  if (!transform) return null

  return (
    <group name={`stage-vending-layer-${stageId}`}>
      <StageVendingMachine
        key={transform.id}
        position={transform.position}
        rotation={transform.rotation}
        soldOut={purchasedItemIds.includes(STAGE_VENDING_ITEM_IDS.RECOVERY_DRINK)}
      />
    </group>
  )
}
