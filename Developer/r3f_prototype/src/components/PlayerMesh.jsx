import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bagSwingState, playerArmActionState } from '../lib/refs.js'
import { getActivePlayerArmAction, getPlayerArmPose } from '../lib/playerArmAction.js'
import { outlineMat, toonMat, inflateScale } from '../lib/toon.js'
import { PLAYER_MESH_SCALE } from '../lib/characterVisualScale.js'

function Block({ size, position, rotation, color, emissive = 0.14 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={2} geometry={geo} material={mat} />
    </group>
  )
}

function OutlineBlock({ size, position, rotation, scale = 1.08 }) {
  const mat = useMemo(() => outlineMat(0.98), [])
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const s = inflateScale(scale)
  return <mesh renderOrder={0} geometry={geo} material={mat} position={position} rotation={rotation} scale={[s, s, s]} />
}

function PlayerOuterOutline() {
  return (
    <group>
      <OutlineBlock size={[1.04, 0.94, 0.62]} position={[0, 0.35, 0]} />
      <OutlineBlock size={[1.04, 0.95, 0.82]} position={[0, 1.56, 0.04]} />
      <OutlineBlock size={[0.24, 1.05, 0.30]} position={[-0.68, 0.32, 0]} scale={1.07} />
      <OutlineBlock size={[0.24, 1.05, 0.30]} position={[0.68, 0.32, 0]} scale={1.07} />
      <OutlineBlock size={[0.28, 1.0, 0.36]} position={[-0.24, -0.68, 0.03]} scale={1.07} />
      <OutlineBlock size={[0.28, 1.0, 0.36]} position={[0.24, -0.68, 0.03]} scale={1.07} />
      <OutlineBlock size={[0.56, 0.78, 0.36]} position={[-0.54, 0.46, -0.22]} scale={1.07} />
    </group>
  )
}

export default function PlayerMesh({ groupRef, movingRef }) {
  const p = useRef({})
  const blend = useRef(0)
  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.34,
        depthTest: false,
        depthWrite: false,
      }),
    []
  )

  const reg = (key) => (el) => {
    if (el) p.current[key] = el
  }

  useFrame(({ clock }, delta) => {
    const parts = p.current
    if (!parts.legL) return

    const isMoving = movingRef?.current ?? false
    blend.current += ((isMoving ? 1 : 0) - blend.current) * Math.min(1, delta * 10)
    const b = blend.current
    const t = performance.now() * 0.001
    const sw = Math.sin(t * 8.0) * 0.45 * b

    const breathe = Math.sin(t * 1.8) * 0.018 * (1 - b)
    const walkBob = Math.abs(Math.sin(t * 8.0)) * 0.022 * b
    const bob = breathe + walkBob

    parts.legL.rotation.x = sw
    parts.legR.rotation.x = -sw
    const armAction = getActivePlayerArmAction(playerArmActionState, clock.elapsedTime * 1000)
    const armPose = getPlayerArmPose({ action: armAction, walkSwing: sw })
    parts.slvL.rotation.x = armPose.slvL.x
    parts.slvL.rotation.y = armPose.slvL.y
    parts.slvL.rotation.z = armPose.slvL.z
    parts.slvR.rotation.x = armPose.slvR.x
    parts.slvR.rotation.y = armPose.slvR.y
    parts.slvR.rotation.z = armPose.slvR.z
    if (bagSwingState.active) {
      const swingT = bagSwingState.progress
      const swingPower = Math.sin(swingT * Math.PI)
      const sweep = -1.25 + swingT * 2.5
      parts.slvR.rotation.x = -1.55 * swingPower
      parts.slvR.rotation.y = -0.35 * swingPower
      parts.slvR.rotation.z = -0.25 - sweep * 0.78
      parts.slvL.rotation.x = -0.35 * swingPower
      parts.slvL.rotation.z = 0.24 * swingPower
    } else {
      parts.bag.rotation.x = 0
    }
    if (!bagSwingState.active) {
      parts.bag.rotation.z = -0.05 + Math.sin(t * 5.5) * 0.03 * b
    }

    if (parts.head) {
      const baseY = 1.4
      parts.head.position.y = baseY + bob
      parts.hairTop.position.y = baseY + 0.48 + bob
      parts.hairFr.position.y = baseY + 0.22 + bob
      parts.hairSL.position.y = baseY + 0.05 + bob
      parts.hairSR.position.y = baseY + 0.08 + bob
      parts.hairTail.position.y = baseY - 0.38 + bob
      parts.hairClip.position.y = baseY + 0.6 + bob
      parts.eyeL.position.y = baseY - 0.08 + bob
      parts.eyeR.position.y = baseY - 0.08 + bob
    }
  })

  return (
    <group ref={groupRef} scale={[PLAYER_MESH_SCALE, PLAYER_MESH_SCALE, PLAYER_MESH_SCALE]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.08, 0.02]}
        scale={[1.08, 0.58, 1]}
        renderOrder={-1}
        material={shadowMat}
      >
        <circleGeometry args={[1, 36]} />
      </mesh>

      <PlayerOuterOutline />

      <Block size={[0.75, 0.72, 0.5]} position={[0, 0.46, 0]} color={0xd42020} emissive={0.2} />
      <Block size={[0.38, 0.18, 0.12]} position={[0, 0.82, 0.32]} color={0xf4f4f4} emissive={0.08} />
      <Block size={[0.8, 0.13, 0.5]} position={[0, 0.1, 0]} color={0xffd100} emissive={0.26} />

      <Block size={[0.94, 0.36, 0.56]} position={[0, -0.16, 0]} color={0x4a90d9} emissive={0.18} />

      <group ref={reg('head')} position={[0, 1.4, 0]}>
        <Block size={[0.72, 0.66, 0.56]} position={[0, 0, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('hairTop')} position={[0, 1.88, 0]}>
        <Block size={[0.94, 0.34, 0.8]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairFr')} position={[0, 1.62, 0.32]}>
        <Block size={[0.8, 0.26, 0.2]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairSL')} position={[-0.46, 1.45, 0]}>
        <Block size={[0.22, 0.58, 0.48]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairSR')} position={[0.46, 1.47, 0]}>
        <Block size={[0.22, 0.46, 0.44]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairTail')} position={[-0.5, 1.02, -0.06]}>
        <Block size={[0.2, 0.5, 0.18]} position={[0, 0, 0]} color={0xd94070} emissive={0.12} />
      </group>
      <group ref={reg('hairClip')} position={[0.34, 1.95, 0.28]}>
        <Block size={[0.25, 0.16, 0.2]} position={[0, 0, 0]} color={0xf4f4f4} emissive={0.08} />
      </group>

      <group ref={reg('eyeL')} position={[-0.18, 1.32, 0.28]}>
        <Block size={[0.13, 0.14, 0.08]} position={[0, 0, 0]} color={0xd94070} emissive={0.1} />
      </group>
      <group ref={reg('eyeR')} position={[0.18, 1.32, 0.28]}>
        <Block size={[0.13, 0.14, 0.08]} position={[0, 0, 0]} color={0xd94070} emissive={0.1} />
      </group>

      <group ref={reg('bag')} position={[-0.52, 0.46, -0.22]}>
        <Block size={[0.5, 0.7, 0.32]} position={[0, 0, 0]} color={0x38c8f0} emissive={0.2} />
        <Block size={[0.32, 0.22, 0.1]} position={[0, 0.24, 0.22]} color={0x1668a0} emissive={0.12} />
      </group>
      <Block size={[0.1, 0.6, 0.1]} position={[-0.22, 0.46, 0.3]} color={0x1668a0} emissive={0.12} />
      <Block size={[0.1, 0.6, 0.1]} position={[0.22, 0.46, 0.3]} color={0x1668a0} emissive={0.12} />

      <group ref={reg('slvL')} position={[-0.6, 0.72, 0]}>
        <Block size={[0.36, 0.66, 0.36]} position={[0, -0.33, 0]} color={0xd42020} emissive={0.2} />
        <Block size={[0.26, 0.26, 0.26]} position={[0, -0.76, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('slvR')} position={[0.6, 0.72, 0]}>
        <Block size={[0.36, 0.66, 0.36]} position={[0, -0.33, 0]} color={0xd42020} emissive={0.2} />
        <Block size={[0.26, 0.26, 0.26]} position={[0, -0.76, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('legL')} position={[-0.22, -0.34, 0]}>
        <Block size={[0.26, 0.7, 0.3]} position={[0, -0.35, 0]} color={0xebebf2} emissive={0.06} />
        <group position={[0, -0.76, 0.06]}>
          <Block size={[0.38, 0.2, 0.44]} position={[0, 0, 0]} color={0x8090a8} emissive={0.12} />
          <Block size={[0.4, 0.1, 0.46]} position={[0, -0.15, 0]} color={0x4a5566} emissive={0.08} />
        </group>
      </group>

      <group ref={reg('legR')} position={[0.22, -0.34, 0]}>
        <Block size={[0.26, 0.7, 0.3]} position={[0, -0.35, 0]} color={0xebebf2} emissive={0.06} />
        <group position={[0, -0.76, 0.06]}>
          <Block size={[0.38, 0.2, 0.44]} position={[0, 0, 0]} color={0x8090a8} emissive={0.12} />
          <Block size={[0.4, 0.1, 0.46]} position={[0, -0.15, 0]} color={0x4a5566} emissive={0.08} />
        </group>
      </group>
    </group>
  )
}
