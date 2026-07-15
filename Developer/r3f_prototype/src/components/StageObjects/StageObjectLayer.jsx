import { useMemo } from 'react'
import ClassroomDesk from './ClassroomDesk.jsx'
import ClassroomChair from './ClassroomChair.jsx'
import UnconsciousStudent from './UnconsciousStudent.jsx'
import { CorridorJanitorCart, CorridorLockerBank, CorridorLostFoundBoard } from './CorridorProps.jsx'
import {
  BallCart,
  BasketballCluster,
  BasketballHoop,
  GymBanner,
  GymBench,
  GymEquipmentSpill,
  GymExitDoor,
  GymMats,
  GymScoreboard,
  TrainingCones,
} from './GymProps.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { useStagePropPlacementsVersion } from '../../lib/stagePropPlacements.js'

const STAGE_OBJECT_COMPONENTS = {
  classroomChair: ClassroomChair,
  classroomDesk: ClassroomDesk,
  unconsciousStudent: UnconsciousStudent,
  corridorLockerBank: CorridorLockerBank,
  corridorJanitorCart: CorridorJanitorCart,
  corridorLostFoundBoard: CorridorLostFoundBoard,
  basketballHoop: BasketballHoop,
  basketballBallCart: BallCart,
  basketballCluster: BasketballCluster,
  gymBench: GymBench,
  gymTrainingCones: TrainingCones,
  gymMats: GymMats,
  gymScoreboard: GymScoreboard,
  gymBanner: GymBanner,
  gymExitDoor: GymExitDoor,
  gymEquipmentSpill: GymEquipmentSpill,
}

export default function StageObjectLayer({ stageId = 'stage1' }) {
  // 스튜디오 Apply 시 오버라이드가 바뀌면 version이 증가해 재계산·리렌더된다.
  const version = useStagePropPlacementsVersion()
  const placements = useMemo(() => getStageObjectPlacements(stageId), [stageId, version])

  return (
    <group name={`stage-object-layer-${stageId}`}>
      {placements.map(({ id, type, position, rotation = [0, 0, 0], scale = 1, props = {} }) => {
        const Component = STAGE_OBJECT_COMPONENTS[type]
        if (!Component) return null

        const normalizedRotation = Array.isArray(rotation) ? rotation : [0, rotation, 0]
        const normalizedScale = Array.isArray(scale) ? scale : [scale, scale, scale]

        return (
          <Component
            key={id}
            position={position}
            rotation={normalizedRotation}
            scale={normalizedScale}
            {...props}
          />
        )
      })}
    </group>
  )
}
