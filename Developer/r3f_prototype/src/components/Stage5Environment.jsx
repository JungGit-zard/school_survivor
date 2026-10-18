import ClassroomFloor from './ClassroomFloor.jsx'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'

// Reuse approved gym art only. Prop render/physics/sight queries must retain
// stage5 identity in Floor; aliasing Stage3 furniture here would hide blockers
// from gameplay's Stage5 placement queries.
export function getStage5EnvironmentScale() {
  if (getStageConfig('stage5').id !== 'stage5') return null
  const stage5 = getStageBounds('stage5')
  const gym = getStageBounds('stage3')
  if (![stage5.halfX, stage5.halfZ, gym.halfX, gym.halfZ]
    .every((value) => Number.isFinite(value) && value > 0)) return null
  return [stage5.halfX / gym.halfX, 1, stage5.halfZ / gym.halfZ]
}

export default function Stage5Environment() {
  const scale = getStage5EnvironmentScale()
  if (!scale) return null

  return (
    <group name="stage5-environment" scale={scale}>
      {/* Reuse the existing approved floor identity, never create a Studio item.
          Wood, painted lines, boundary walls and baked colour zones stay shared.
          The combat collider and vending placement remain Stage5-owned. */}
      <StudioTunedGroup itemId="stage-floor-stage3" materialTuning={false}>
        <ClassroomFloor stageId="stage3" />
      </StudioTunedGroup>
    </group>
  )
}
