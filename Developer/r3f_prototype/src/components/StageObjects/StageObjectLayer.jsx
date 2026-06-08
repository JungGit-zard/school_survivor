import ClassroomDesk from './ClassroomDesk.jsx'
import ClassroomChair from './ClassroomChair.jsx'
import UnconsciousStudent from './UnconsciousStudent.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'

const STAGE_OBJECT_COMPONENTS = {
  classroomChair: ClassroomChair,
  classroomDesk: ClassroomDesk,
  unconsciousStudent: UnconsciousStudent,
}

export default function StageObjectLayer({ stageId = 'stage1' }) {
  const placements = getStageObjectPlacements(stageId)

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
