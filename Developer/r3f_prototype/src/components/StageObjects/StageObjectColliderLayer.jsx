import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { getStageObjectColliders } from './stageObjectColliders.js'
import { useStagePropPlacementsVersion } from '../../lib/stagePropPlacements.js'

export default function StageObjectColliderLayer({ stageId = 'stage1' }) {
  const version = useStagePropPlacementsVersion()
  const colliders = useMemo(() => getStageObjectColliders(stageId), [stageId, version])

  return (
    <group name={`stage-object-collider-layer-${stageId}`}>
      {colliders.map(({ id, position, rotation, parts }) => (
        <RigidBody
          key={id}
          type="fixed"
          position={position}
          rotation={rotation}
          colliders={false}
          restitution={0}
          friction={1}
        >
          {parts.map((part) => (
            <CuboidCollider
              key={part.key}
              args={part.args}
              position={part.position}
              rotation={part.rotation}
            />
          ))}
        </RigidBody>
      ))}
    </group>
  )
}
