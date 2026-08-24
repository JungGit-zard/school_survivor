import { useLayoutEffect, useRef } from 'react'
import { getStageLightingProfile } from '../lib/stageLightingProfile.js'

function StaticSpotLight({ light }) {
  const lightRef = useRef(null)
  const targetRef = useRef(null)

  useLayoutEffect(() => {
    if (!lightRef.current || !targetRef.current) return
    lightRef.current.target = targetRef.current
    targetRef.current.updateMatrixWorld()
  }, [])

  return (
    <>
      <spotLight
        ref={lightRef}
        position={light.position}
        color={light.color}
        intensity={light.intensity}
        distance={light.distance}
        angle={light.angle}
        penumbra={light.penumbra}
        castShadow={false}
      />
      <object3D ref={targetRef} position={light.target} />
    </>
  )
}

export default function StageLighting({ stageId }) {
  const lights = getStageLightingProfile(stageId)

  return (
    <group name={`stage-lighting-${stageId}`}>
      {lights.map((light) => (
        light.kind === 'spot'
          ? <StaticSpotLight key={`${stageId}:${light.kind}`} light={light} />
          : (
            <pointLight
              key={`${stageId}:${light.kind}`}
              position={light.position}
              color={light.color}
              intensity={light.intensity}
              distance={light.distance}
              decay={light.decay}
              castShadow={false}
            />
          )
      ))}
    </group>
  )
}
